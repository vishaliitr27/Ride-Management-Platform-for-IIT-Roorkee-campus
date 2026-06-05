import { Server } from "socket.io";
import { distanceKm } from "./lib/geo";
import { prisma } from "./lib/prisma";

// Single Socket.IO instance shared by the REST and socket layers so that a
// state change made over HTTP still broadcasts in real time, and vice versa.
let io: Server | null = null;

export function setIo(server: Server): void {
  io = server;
}

export function getIo(): Server {
  if (!io) throw new Error("Socket.IO has not been initialised");
  return io;
}

export const rooms = {
  user: (id: string) => `user:${id}`,
  ride: (id: string) => `ride:${id}`,
  onlineDrivers: "drivers:online",
};

export function emitToUser(userId: string, event: string, payload: unknown): void {
  getIo().to(rooms.user(userId)).emit(event, payload);
}

export function emitToRide(rideId: string, event: string, payload: unknown): void {
  getIo().to(rooms.ride(rideId)).emit(event, payload);
}

// Tells every online driver a request is gone so it disappears from their list.
export function broadcastRideTaken(rideId: string): void {
  getIo().to(rooms.onlineDrivers).emit("ride:taken", { rideId });
}

// Generic push to every online driver (e.g. a newly scheduled ride to claim).
export function broadcastToOnlineDrivers(event: string, payload: unknown): void {
  getIo().to(rooms.onlineDrivers).emit(event, payload);
}

// Passengers watching the live map get availability changes pushed to them.
export function broadcastDriverAvailability(payload: unknown): void {
  getIo().emit("driver:availability", payload);
}

const DEFAULT_RADIUS_KM = 5;

// Pushes a new request to nearby online drivers. Drivers without a location yet
// still receive it so the flow works before the first location ping.
export async function notifyNearbyDriversOfRide(
  ride: {
    id: string;
    pickupLat: number;
    pickupLng: number;
  } & Record<string, unknown>,
  radiusKm = DEFAULT_RADIUS_KM
): Promise<void> {
  const drivers = await prisma.driverProfile.findMany({
    where: { isOnline: true },
  });

  for (const driver of drivers) {
    if (driver.currentLat != null && driver.currentLng != null) {
      const dist = distanceKm(
        ride.pickupLat,
        ride.pickupLng,
        driver.currentLat,
        driver.currentLng
      );
      if (dist > radiusKm) continue;
      emitToUser(driver.userId, "ride:new", {
        ...ride,
        distanceToPickupKm: Math.round(dist * 10) / 10,
      });
    } else {
      emitToUser(driver.userId, "ride:new", ride);
    }
  }
}
