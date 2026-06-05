import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error";

interface VehicleInput {
  vehicleType: string;
  vehicleNumber: string;
  vehicleModel?: string;
  licenseNumber: string;
  upiId?: string;
}

export async function onboardDriver(userId: string, input: VehicleInput) {
  // Treat an empty UPI string as "leave unset".
  const data = { ...input, upiId: input.upiId || null };
  return prisma.driverProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

export async function getDriverProfile(userId: string) {
  const profile = await prisma.driverProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(404, "PROFILE_NOT_FOUND", "Driver profile not found");
  return profile;
}

export async function setAvailability(userId: string, isOnline: boolean) {
  // A driver can only appear online once an admin has verified their profile.
  if (isOnline) {
    const profile = await prisma.driverProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new AppError(404, "PROFILE_NOT_FOUND", "Driver profile not found");
    }
    if (profile.verificationStatus !== "VERIFIED") {
      throw new AppError(
        403,
        "NOT_VERIFIED",
        "Your profile is awaiting admin verification"
      );
    }
  }
  return prisma.driverProfile.update({
    where: { userId },
    data: { isOnline },
  });
}

export async function updateDriverLocation(
  userId: string,
  lat: number,
  lng: number
) {
  return prisma.driverProfile.update({
    where: { userId },
    data: { currentLat: lat, currentLng: lng, lastLocationAt: new Date() },
  });
}

export async function getAvailableDrivers() {
  // Only verified drivers are exposed publicly to passengers.
  const profiles = await prisma.driverProfile.findMany({
    where: { isOnline: true, verificationStatus: "VERIFIED" },
    include: { user: { select: { id: true, name: true } } },
  });
  return profiles.map((p) => ({
    id: p.userId,
    name: p.user.name,
    vehicleType: p.vehicleType,
    vehicleNumber: p.vehicleNumber,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    lat: p.currentLat,
    lng: p.currentLng,
    lastLocationAt: p.lastLocationAt,
  }));
}

export async function getDriverStats(userId: string) {
  const [completed, active, cancelled, profile, completedRides] =
    await Promise.all([
      prisma.ride.count({ where: { driverId: userId, status: "COMPLETED" } }),
      prisma.ride.count({
        where: { driverId: userId, status: { in: ["ACCEPTED", "IN_PROGRESS"] } },
      }),
      prisma.ride.count({ where: { driverId: userId, status: "CANCELLED" } }),
      prisma.driverProfile.findUnique({ where: { userId } }),
      prisma.ride.findMany({
        where: { driverId: userId, status: "COMPLETED" },
        select: { fareEstimate: true, completedAt: true },
      }),
    ]);

  const earnings = completedRides.reduce((sum, r) => sum + (r.fareEstimate ?? 0), 0);

  return {
    totalCompleted: completed,
    activeRides: active,
    cancelled,
    earnings,
    ratingAvg: profile?.ratingAvg ?? 0,
    ratingCount: profile?.ratingCount ?? 0,
    ridesPerDay: bucketLastSevenDays(completedRides),
  };
}

export async function getDriverRatings(userId: string) {
  return prisma.rating.findMany({
    where: { driverId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      ride: { select: { pickupAddress: true, destAddress: true, completedAt: true } },
      passenger: { select: { name: true } },
    },
  });
}

// --- Admin: driver verification ---

export async function listDriversForReview(status?: string) {
  const profiles = await prisma.driverProfile.findMany({
    where: status ? { verificationStatus: status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
  return profiles.map((p) => ({
    userId: p.userId,
    name: p.user.name,
    email: p.user.email,
    phone: p.user.phone,
    vehicleType: p.vehicleType,
    vehicleNumber: p.vehicleNumber,
    vehicleModel: p.vehicleModel,
    licenseNumber: p.licenseNumber,
    verificationStatus: p.verificationStatus,
    isOnline: p.isOnline,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    createdAt: p.createdAt,
  }));
}

export async function setVerificationStatus(
  userId: string,
  status: "VERIFIED" | "REJECTED"
) {
  const profile = await prisma.driverProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new AppError(404, "PROFILE_NOT_FOUND", "Driver profile not found");
  }
  // A rejected driver is forced offline so they cannot keep taking rides.
  return prisma.driverProfile.update({
    where: { userId },
    data: {
      verificationStatus: status,
      ...(status === "REJECTED" && { isOnline: false }),
    },
  });
}

function bucketLastSevenDays(rides: { completedAt: Date | null }[]) {
  const days: { date: string; rides: number }[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = rides.filter(
      (r) => r.completedAt && r.completedAt.toISOString().slice(0, 10) === key
    ).length;
    days.push({ date: key, rides: count });
  }
  return days;
}
