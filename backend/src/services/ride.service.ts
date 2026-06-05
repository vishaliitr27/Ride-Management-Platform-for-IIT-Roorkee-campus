import { Prisma } from "@prisma/client";
import { computeFare, distanceKm } from "../lib/geo";
import { prisma } from "../lib/prisma";
import { Role } from "../lib/jwt";
import { RIDE_TRANSITIONS, RideStatus } from "../lib/validation";
import { AppError } from "../middleware/error";
import {
  broadcastRideTaken,
  broadcastToOnlineDrivers,
  emitToRide,
  emitToUser,
  notifyNearbyDriversOfRide,
} from "../realtime";

// Shared shape returned to clients: ride plus the people involved.
const rideInclude = Prisma.validator<Prisma.RideInclude>()({
  passenger: { select: { id: true, name: true, phone: true } },
  driver: {
    select: {
      id: true,
      name: true,
      phone: true,
      driverProfile: {
        select: {
          vehicleType: true,
          vehicleNumber: true,
          vehicleModel: true,
          upiId: true,
          ratingAvg: true,
          currentLat: true,
          currentLng: true,
        },
      },
    },
  },
  rating: true,
});

const ACTIVE_DRIVER_STATES: RideStatus[] = ["ACCEPTED", "IN_PROGRESS"];

interface Actor {
  userId: string;
  role: Role;
}

interface RideRequestInput {
  pickup: { lat: number; lng: number; address: string };
  destination: { lat: number; lng: number; address: string };
  scheduledFor?: string;
}

export async function createRide(passengerId: string, input: RideRequestInput) {
  const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;
  // A time in the past (or none) means "ride now".
  const isImmediate = !scheduledFor || scheduledFor.getTime() <= Date.now();

  // Only an immediate booking is blocked by an existing live ride. Future
  // scheduled rides can stack up; they aren't "live" until their slot arrives.
  if (isImmediate) {
    const existing = await prisma.ride.findFirst({
      where: { passengerId, ...liveRideFilter() },
    });
    if (existing) {
      throw new AppError(409, "RIDE_IN_PROGRESS", "You already have an active ride");
    }
  }

  const dist = distanceKm(
    input.pickup.lat,
    input.pickup.lng,
    input.destination.lat,
    input.destination.lng
  );

  const ride = await prisma.ride.create({
    data: {
      passengerId,
      status: "REQUESTED",
      pickupLat: input.pickup.lat,
      pickupLng: input.pickup.lng,
      pickupAddress: input.pickup.address,
      destLat: input.destination.lat,
      destLng: input.destination.lng,
      destAddress: input.destination.address,
      distanceKm: Math.round(dist * 10) / 10,
      fareEstimate: computeFare(input.pickup, input.destination),
      scheduledFor,
      dispatchedAt: isImmediate ? new Date() : null,
      statusEvents: { create: { status: "REQUESTED", changedBy: passengerId } },
    },
    include: rideInclude,
  });

  // Immediate rides go straight to nearby drivers. A scheduled ride is announced
  // to online drivers so they can claim it ahead of time; if no one does, the
  // scheduler dispatches it to nearby drivers at its slot (see promoteDueRides).
  if (isImmediate) {
    await notifyNearbyDriversOfRide(ride);
  } else {
    broadcastToOnlineDrivers("ride:scheduled-new", ride);
  }

  return ride;
}

// A REQUESTED ride only counts as "live" — offered to drivers, blocking the
// passenger, shown in tracking — once it has been dispatched. This is what keeps
// a future scheduled ride out of the way until its slot arrives.
function liveRideFilter(): Prisma.RideWhereInput {
  return {
    OR: [
      { status: { in: ["ACCEPTED", "IN_PROGRESS"] } },
      { status: "REQUESTED", dispatchedAt: { not: null } },
    ],
  };
}

// A driver claims a ride. The conditional update is the single source of
// correctness: only the first driver whose update still matches REQUESTED wins,
// everyone else gets a 409. SQLite serialises the writes so there is no race.
export async function acceptRide(rideId: string, driverId: string) {
  const profile = await prisma.driverProfile.findUnique({
    where: { userId: driverId },
  });
  if (!profile || profile.verificationStatus !== "VERIFIED") {
    throw new AppError(
      403,
      "NOT_VERIFIED",
      "Your profile must be verified by an admin before you can accept rides"
    );
  }

  const claim = await prisma.ride.updateMany({
    where: { id: rideId, status: "REQUESTED", driverId: null },
    data: { status: "ACCEPTED", driverId, acceptedAt: new Date() },
  });

  if (claim.count === 0) {
    const exists = await prisma.ride.findUnique({ where: { id: rideId } });
    if (!exists) throw new AppError(404, "RIDE_NOT_FOUND", "Ride not found");
    throw new AppError(409, "RIDE_TAKEN", "This ride was already assigned");
  }

  await prisma.rideStatusEvent.create({
    data: { rideId, status: "ACCEPTED", changedBy: driverId },
  });

  const ride = await getRideById(rideId);
  emitToUser(ride.passengerId, "ride:assigned", ride);
  emitToRide(ride.id, "ride:status", ride);
  broadcastRideTaken(ride.id);
  return ride;
}

export async function transitionRide(
  rideId: string,
  actor: Actor,
  target: RideStatus
) {
  const updated = await prisma.$transaction(async (tx) => {
    const ride = await tx.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new AppError(404, "RIDE_NOT_FOUND", "Ride not found");

    const allowed = RIDE_TRANSITIONS[ride.status as RideStatus] ?? [];
    if (!allowed.includes(target)) {
      throw new AppError(
        409,
        "INVALID_TRANSITION",
        `Cannot move ride from ${ride.status} to ${target}`
      );
    }
    assertPermitted(ride, actor, target);

    const data: Prisma.RideUpdateInput = { status: target };
    const now = new Date();
    if (target === "IN_PROGRESS") data.startedAt = now;
    if (target === "COMPLETED") data.completedAt = now;
    if (target === "CANCELLED") {
      data.cancelledAt = now;
      data.cancelledBy = actor.role;
    }

    await tx.rideStatusEvent.create({
      data: { rideId, status: target, changedBy: actor.userId },
    });
    return tx.ride.update({
      where: { id: rideId },
      data,
      include: rideInclude,
    });
  });

  emitToRide(updated.id, "ride:status", updated);
  emitToUser(updated.passengerId, "ride:status", updated);
  if (updated.driverId) emitToUser(updated.driverId, "ride:status", updated);
  return updated;
}

function assertPermitted(
  ride: { passengerId: string; driverId: string | null },
  actor: Actor,
  target: RideStatus
) {
  if (target === "IN_PROGRESS" || target === "COMPLETED") {
    if (actor.role !== "DRIVER" || ride.driverId !== actor.userId) {
      throw new AppError(403, "FORBIDDEN", "Only the assigned driver can do this");
    }
  }
  if (target === "CANCELLED") {
    const isParticipant =
      ride.passengerId === actor.userId || ride.driverId === actor.userId;
    if (!isParticipant) {
      throw new AppError(403, "FORBIDDEN", "You are not part of this ride");
    }
  }
}

export async function getRideById(id: string) {
  const ride = await prisma.ride.findUnique({ where: { id }, include: rideInclude });
  if (!ride) throw new AppError(404, "RIDE_NOT_FOUND", "Ride not found");
  return ride;
}

export async function getActiveRide(userId: string, role: Role) {
  const where: Prisma.RideWhereInput =
    role === "DRIVER"
      ? { driverId: userId, status: { in: ACTIVE_DRIVER_STATES } }
      : { passengerId: userId, ...liveRideFilter() };
  return prisma.ride.findFirst({
    where,
    include: rideInclude,
    orderBy: { requestedAt: "desc" },
  });
}

// A passenger's upcoming scheduled rides — booked for the future, not yet
// dispatched to drivers.
export async function getScheduledRides(passengerId: string) {
  return prisma.ride.findMany({
    where: {
      passengerId,
      status: "REQUESTED",
      dispatchedAt: null,
      scheduledFor: { not: null },
    },
    include: rideInclude,
    orderBy: { scheduledFor: "asc" },
  });
}

// Open requests a driver can still accept (only dispatched ones).
export async function getOpenRequests() {
  return prisma.ride.findMany({
    where: { status: "REQUESTED", driverId: null, dispatchedAt: { not: null } },
    include: rideInclude,
    orderBy: { requestedAt: "desc" },
  });
}

// Upcoming scheduled rides a driver can claim ahead of time (not yet dispatched
// to the open market, still unassigned).
export async function getOpenScheduledRides() {
  return prisma.ride.findMany({
    where: {
      status: "REQUESTED",
      driverId: null,
      dispatchedAt: null,
      scheduledFor: { not: null },
    },
    include: rideInclude,
    orderBy: { scheduledFor: "asc" },
  });
}

// Called on an interval by the scheduler. Dispatches any scheduled ride whose
// time has arrived: marks it dispatched, offers it to nearby drivers, and tells
// the passenger their ride is now searching.
export async function promoteDueRides(): Promise<number> {
  const due = await prisma.ride.findMany({
    where: {
      status: "REQUESTED",
      driverId: null,
      dispatchedAt: null,
      scheduledFor: { lte: new Date() },
    },
    include: rideInclude,
  });

  let dispatched = 0;
  for (const ride of due) {
    // Don't dispatch while the passenger is still on another live ride — defer
    // to a later tick so they never end up with two active rides at once.
    const live = await prisma.ride.findFirst({
      where: { passengerId: ride.passengerId, ...liveRideFilter() },
    });
    if (live) continue;

    await prisma.ride.update({
      where: { id: ride.id },
      data: { dispatchedAt: new Date() },
    });
    await notifyNearbyDriversOfRide(ride);
    emitToUser(ride.passengerId, "ride:scheduled-dispatched", ride);
    dispatched += 1;
  }
  return dispatched;
}

export async function listRides(userId: string, role: Role, status?: string) {
  const base: Prisma.RideWhereInput =
    role === "DRIVER" ? { driverId: userId } : { passengerId: userId };
  return prisma.ride.findMany({
    where: { ...base, ...(status ? { status } : {}) },
    include: rideInclude,
    orderBy: { requestedAt: "desc" },
  });
}

export async function rateRide(
  rideId: string,
  passengerId: string,
  input: { score: number; feedback?: string }
) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) throw new AppError(404, "RIDE_NOT_FOUND", "Ride not found");
  if (ride.passengerId !== passengerId) {
    throw new AppError(403, "FORBIDDEN", "You can only rate your own rides");
  }
  if (ride.status !== "COMPLETED" || !ride.driverId) {
    throw new AppError(409, "RIDE_NOT_COMPLETED", "Only completed rides can be rated");
  }
  const already = await prisma.rating.findUnique({ where: { rideId } });
  if (already) throw new AppError(409, "ALREADY_RATED", "This ride is already rated");

  const driverId = ride.driverId;
  const rating = await prisma.$transaction(async (tx) => {
    const created = await tx.rating.create({
      data: {
        rideId,
        passengerId,
        driverId,
        score: input.score,
        feedback: input.feedback,
      },
    });
    const agg = await tx.rating.aggregate({
      where: { driverId },
      _avg: { score: true },
      _count: true,
    });
    await tx.driverProfile.update({
      where: { userId: driverId },
      data: {
        ratingAvg: Math.round((agg._avg.score ?? 0) * 10) / 10,
        ratingCount: agg._count,
      },
    });
    return created;
  });

  emitToUser(driverId, "rating:received", rating);
  return rating;
}
