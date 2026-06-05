import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeFare, distanceKm } from "../src/lib/geo";

const prisma = new PrismaClient();

// Representative campus points used to synthesise a realistic history of ride
// demand, so the admin demand-analytics dashboard has something to show.
type Spot = { address: string; lat: number; lng: number };

const HOSTELS: Spot[] = [
  { address: "Cautley Bhawan", lat: 29.8702, lng: 77.8968 },
  { address: "Ganga Bhawan", lat: 29.8695, lng: 77.8978 },
  { address: "Rajendra Bhawan", lat: 29.8715, lng: 77.8982 },
  { address: "Kasturba Bhawan", lat: 29.8678, lng: 77.8925 },
  { address: "Govind Bhawan", lat: 29.8688, lng: 77.8985 },
  { address: "Rajiv Bhawan", lat: 29.87, lng: 77.8995 },
];
const ACADEMIC: Spot[] = [
  { address: "Main Building", lat: 29.8651, lng: 77.8961 },
  { address: "Lecture Hall Complex (LHC)", lat: 29.8643, lng: 77.8965 },
  { address: "Dept. of Computer Science (CSE)", lat: 29.862, lng: 77.8978 },
  { address: "Central Library (MGCL)", lat: 29.8649, lng: 77.8959 },
  { address: "Dept. of Electronics (ECE)", lat: 29.8635, lng: 77.8972 },
];
const FACILITIES: Spot[] = [
  { address: "Institute Hospital", lat: 29.8662, lng: 77.899 },
  { address: "Students' Activity Centre (SAC)", lat: 29.8668, lng: 77.8945 },
  { address: "Convocation Hall", lat: 29.8656, lng: 77.8968 },
];
const OUTSIDE: Spot[] = [
  { address: "Roorkee Railway Station", lat: 29.8607, lng: 77.877 },
  { address: "BT Ganj Market", lat: 29.8645, lng: 77.888 },
  { address: "Roorkee Bus Stand", lat: 29.858, lng: 77.881 },
];

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Hourly demand weights (campus-local / IST): quiet overnight, a morning peak
// around 9 and a stronger evening peak around 18.
const HOUR_WEIGHTS = [
  1, 1, 1, 1, 1, 2, 3, 5, 9, 12, 8, 5, 7, 8, 5, 4, 6, 10, 13, 11, 8, 6, 4, 2,
];

function weightedHour(): number {
  const total = HOUR_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let h = 0; h < 24; h++) {
    r -= HOUR_WEIGHTS[h];
    if (r < 0) return h;
  }
  return 18;
}

// Route demand mirrors the daily rhythm: into the departments in the morning,
// back to the hostels in the evening, errands to town later on.
function routeForHour(hour: number): { pickup: Spot; dest: Spot } {
  const roll = Math.random();
  if (hour >= 7 && hour <= 11) {
    return roll < 0.8
      ? { pickup: pick(HOSTELS), dest: pick(ACADEMIC) }
      : { pickup: pick(HOSTELS), dest: pick(FACILITIES) };
  }
  if (hour >= 12 && hour <= 15) {
    return roll < 0.5
      ? { pickup: pick(ACADEMIC), dest: pick(FACILITIES) }
      : { pickup: pick(HOSTELS), dest: pick(ACADEMIC) };
  }
  if (hour >= 16 && hour <= 20) {
    if (roll < 0.65) return { pickup: pick(ACADEMIC), dest: pick(HOSTELS) };
    if (roll < 0.85) return { pickup: pick(HOSTELS), dest: pick(OUTSIDE) };
    return { pickup: pick(HOSTELS), dest: pick(FACILITIES) };
  }
  // Late evening / overnight: trips to and from town.
  return roll < 0.5
    ? { pickup: pick(HOSTELS), dest: pick(OUTSIDE) }
    : { pickup: pick(OUTSIDE), dest: pick(HOSTELS) };
}

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

// Build the real UTC instant for "`daysAgo` days ago at `hour`:`minute` IST", so
// the analytics service (which buckets in IST) reads back the intended local time.
function istInstant(daysAgo: number, hour: number, minute: number): Date {
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const istMidnight = Date.UTC(
    nowIst.getUTCFullYear(),
    nowIst.getUTCMonth(),
    nowIst.getUTCDate() - daysAgo,
    0,
    0,
    0
  );
  return new Date(istMidnight + (hour * 60 + minute) * 60_000 - IST_OFFSET_MS);
}

async function main() {
  // Reset so the seed can be run repeatedly.
  await prisma.rating.deleteMany();
  await prisma.rideStatusEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.ride.deleteMany();
  await prisma.driverProfile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // Admin who reviews and verifies driver profiles.
  await prisma.user.create({
    data: {
      email: "admin@iitr.ac.in",
      passwordHash,
      name: "Campus Admin",
      phone: "9000000000",
      role: "ADMIN",
    },
  });

  // Students sign in with their institute (@iitr.ac.in) email.
  const aarav = await prisma.user.create({
    data: {
      email: "aarav@iitr.ac.in",
      passwordHash,
      name: "Aarav Sharma",
      phone: "9000000001",
      role: "PASSENGER",
    },
  });
  const diya = await prisma.user.create({
    data: {
      email: "diya@iitr.ac.in",
      passwordHash,
      name: "Diya Patel",
      phone: "9000000002",
      role: "PASSENGER",
    },
  });

  const rohan = await prisma.user.create({
    data: {
      email: "rohan@campusrides.in",
      passwordHash,
      name: "Rohan Mehta",
      phone: "9000000010",
      role: "DRIVER",
      driverProfile: {
        create: {
          vehicleType: "E_RICKSHAW",
          vehicleNumber: "UK07 1234",
          vehicleModel: "Mahindra Treo",
          licenseNumber: "DL-UK-2021-0010",
          upiId: "rohan@okhdfcbank",
          verificationStatus: "VERIFIED",
          isOnline: true,
          currentLat: 29.8651,
          currentLng: 77.8961,
          lastLocationAt: new Date(),
        },
      },
    },
  });
  const sneha = await prisma.user.create({
    data: {
      email: "sneha@campusrides.in",
      passwordHash,
      name: "Sneha Rao",
      phone: "9000000011",
      role: "DRIVER",
      driverProfile: {
        create: {
          vehicleType: "E_RICKSHAW",
          vehicleNumber: "UK07 5678",
          vehicleModel: "Piaggio Ape",
          licenseNumber: "DL-UK-2021-0011",
          upiId: "sneha@okaxis",
          verificationStatus: "VERIFIED",
          isOnline: true,
          currentLat: 29.8668,
          currentLng: 77.8949,
          lastLocationAt: new Date(),
        },
      },
    },
  });
  // A freshly signed-up driver still awaiting admin verification.
  await prisma.user.create({
    data: {
      email: "vikram@campusrides.in",
      passwordHash,
      name: "Vikram Singh",
      phone: "9000000012",
      role: "DRIVER",
      driverProfile: {
        create: {
          vehicleType: "CAR",
          vehicleNumber: "UK07 9090",
          vehicleModel: "Tata Tigor EV",
          licenseNumber: "DL-UK-2021-0012",
          verificationStatus: "PENDING",
          isOnline: false,
        },
      },
    },
  });

  // Synthesise two weeks of ride history so the demand-analytics dashboard,
  // driver dashboards and ratings all have realistic data. Demand is heavier on
  // weekdays and clusters around the morning and evening peaks.
  const passengers = [aarav, diya];
  const drivers = [rohan, sneha];
  const ratedDrivers = new Set<string>();

  for (let daysAgo = 0; daysAgo < 14; daysAgo++) {
    const weekday = new Date(
      Date.now() + IST_OFFSET_MS - daysAgo * 86_400_000
    ).getUTCDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const ridesToday = (isWeekend ? 6 : 12) + Math.floor(Math.random() * 5);

    for (let n = 0; n < ridesToday; n++) {
      const hour = weightedHour();
      const minute = Math.floor(Math.random() * 60);
      const requestedAt = istInstant(daysAgo, hour, minute);
      const { pickup, dest } = routeForHour(hour);
      const passenger = pick(passengers);
      const fare = computeFare(pickup, dest);
      const dist =
        Math.round(distanceKm(pickup.lat, pickup.lng, dest.lat, dest.lng) * 10) /
        10;

      // Most requests complete; a few are cancelled before a driver is assigned.
      if (Math.random() < 0.12) {
        await prisma.ride.create({
          data: {
            passengerId: passenger.id,
            status: "CANCELLED",
            pickupLat: pickup.lat,
            pickupLng: pickup.lng,
            pickupAddress: pickup.address,
            destLat: dest.lat,
            destLng: dest.lng,
            destAddress: dest.address,
            distanceKm: dist,
            fareEstimate: fare,
            dispatchedAt: requestedAt,
            requestedAt,
            cancelledAt: new Date(requestedAt.getTime() + 90_000),
            cancelledBy: "PASSENGER",
          },
        });
        continue;
      }

      const driver = pick(drivers);
      const acceptedAt = new Date(requestedAt.getTime() + 60_000);
      const startedAt = new Date(requestedAt.getTime() + 4 * 60_000);
      const completedAt = new Date(
        startedAt.getTime() + (5 + Math.floor(Math.random() * 10)) * 60_000
      );

      const ride = await prisma.ride.create({
        data: {
          passengerId: passenger.id,
          driverId: driver.id,
          status: "COMPLETED",
          pickupLat: pickup.lat,
          pickupLng: pickup.lng,
          pickupAddress: pickup.address,
          destLat: dest.lat,
          destLng: dest.lng,
          destAddress: dest.address,
          distanceKm: dist,
          fareEstimate: fare,
          dispatchedAt: requestedAt,
          requestedAt,
          acceptedAt,
          startedAt,
          completedAt,
        },
      });

      // Most completed rides get rated, mostly 4–5 stars.
      if (Math.random() < 0.8) {
        const score = Math.random() < 0.7 ? 5 : Math.random() < 0.7 ? 4 : 3;
        await prisma.rating.create({
          data: {
            rideId: ride.id,
            passengerId: passenger.id,
            driverId: driver.id,
            score,
            feedback:
              score >= 4 && Math.random() < 0.4
                ? pick([
                    "Smooth ride, on time.",
                    "Friendly driver.",
                    "Quick and safe.",
                    "Reached before class.",
                  ])
                : undefined,
          },
        });
        ratedDrivers.add(driver.id);
      }
    }
  }

  // Refresh each driver's cached rating average and count.
  for (const driverId of ratedDrivers) {
    const agg = await prisma.rating.aggregate({
      where: { driverId },
      _avg: { score: true },
      _count: true,
    });
    await prisma.driverProfile.update({
      where: { userId: driverId },
      data: {
        ratingAvg: Math.round((agg._avg.score ?? 0) * 10) / 10,
        ratingCount: agg._count,
      },
    });
  }

  console.log("Seed complete.");
  console.log("Admin:      admin@iitr.ac.in");
  console.log("Passengers: aarav@iitr.ac.in / diya@iitr.ac.in");
  console.log(
    "Drivers:    rohan@campusrides.in / sneha@campusrides.in (verified) · vikram@campusrides.in (pending)"
  );
  console.log("Password for everyone: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
