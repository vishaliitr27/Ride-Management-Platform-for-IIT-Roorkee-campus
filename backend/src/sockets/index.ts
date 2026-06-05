import { Server, Socket } from "socket.io";
import { ZodError } from "zod";
import { verifyToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { locationSchema, rideRequestSchema } from "../lib/validation";
import { AppError } from "../middleware/error";
import {
  broadcastDriverAvailability,
  emitToRide,
  rooms,
} from "../realtime";
import * as driverService from "../services/driver.service";
import * as rideService from "../services/ride.service";

type Ack = (response: unknown) => void;

function toError(e: unknown) {
  if (e instanceof AppError) return { error: e.code, message: e.message };
  if (e instanceof ZodError) {
    return { error: "VALIDATION_ERROR", message: "Invalid data" };
  }
  console.error("Socket handler error:", e);
  return { error: "INTERNAL_ERROR", message: "Something went wrong" };
}

export function registerSocketHandlers(io: Server): void {
  // Authenticate the handshake with the same JWT used by the REST API.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("UNAUTHENTICATED"));
    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error("INVALID_TOKEN"));
    }
  });

  io.on("connection", async (socket: Socket) => {
    const userId: string = socket.data.userId;
    const role: string = socket.data.role;

    // Personal room for direct notifications across all of a user's tabs.
    socket.join(rooms.user(userId));

    if (role === "DRIVER") {
      const profile = await prisma.driverProfile.findUnique({ where: { userId } });
      if (profile?.isOnline) socket.join(rooms.onlineDrivers);
    }

    // Clients join a ride's room to receive its live updates (passenger tracking
    // its ride, driver watching the one it is running).
    socket.on("ride:join", (rideId: string) => {
      if (typeof rideId === "string") socket.join(rooms.ride(rideId));
    });
    socket.on("ride:leave", (rideId: string) => {
      if (typeof rideId === "string") socket.leave(rooms.ride(rideId));
    });

    socket.on("driver:online", async (_payload, ack: Ack) => {
      try {
        if (role !== "DRIVER") throw new AppError(403, "FORBIDDEN", "Drivers only");
        await driverService.setAvailability(userId, true);
        socket.join(rooms.onlineDrivers);
        broadcastDriverAvailability({ driverId: userId, isOnline: true });
        ack?.({ ok: true });
      } catch (e) {
        ack?.(toError(e));
      }
    });

    socket.on("driver:offline", async (_payload, ack: Ack) => {
      try {
        if (role !== "DRIVER") throw new AppError(403, "FORBIDDEN", "Drivers only");
        await driverService.setAvailability(userId, false);
        socket.leave(rooms.onlineDrivers);
        broadcastDriverAvailability({ driverId: userId, isOnline: false });
        ack?.({ ok: true });
      } catch (e) {
        ack?.(toError(e));
      }
    });

    // Location pings are throttled on the client side (~every 4s).
    socket.on("driver:location", async (payload, ack: Ack) => {
      try {
        if (role !== "DRIVER") return;
        const loc = locationSchema.parse(payload);
        await driverService.updateDriverLocation(userId, loc.lat, loc.lng);
        const active = await rideService.getActiveRide(userId, "DRIVER");
        if (active) {
          emitToRide(active.id, "driver:location", { driverId: userId, ...loc });
        }
        broadcastDriverAvailability({ driverId: userId, isOnline: true, ...loc });
        ack?.({ ok: true });
      } catch (e) {
        ack?.(toError(e));
      }
    });

    socket.on("ride:request", async (payload, ack: Ack) => {
      try {
        if (role !== "PASSENGER") throw new AppError(403, "FORBIDDEN", "Passengers only");
        const data = rideRequestSchema.parse(payload);
        const ride = await rideService.createRide(userId, data);
        socket.join(rooms.ride(ride.id));
        ack?.({ ok: true, ride });
      } catch (e) {
        ack?.(toError(e));
      }
    });

    socket.on("ride:accept", async (payload: { rideId: string }, ack: Ack) => {
      try {
        if (role !== "DRIVER") throw new AppError(403, "FORBIDDEN", "Drivers only");
        const ride = await rideService.acceptRide(payload.rideId, userId);
        socket.join(rooms.ride(ride.id));
        ack?.({ ok: true, ride });
      } catch (e) {
        ack?.(toError(e));
      }
    });

    socket.on("ride:reject", (_payload, ack: Ack) => ack?.({ ok: true }));

    socket.on("ride:start", (payload: { rideId: string }, ack: Ack) =>
      runTransition(payload, ack, "IN_PROGRESS", userId, role)
    );
    socket.on("ride:complete", (payload: { rideId: string }, ack: Ack) =>
      runTransition(payload, ack, "COMPLETED", userId, role)
    );
    socket.on("ride:cancel", (payload: { rideId: string }, ack: Ack) =>
      runTransition(payload, ack, "CANCELLED", userId, role)
    );
  });
}

async function runTransition(
  payload: { rideId: string },
  ack: Ack,
  target: "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
  userId: string,
  role: string
) {
  try {
    const ride = await rideService.transitionRide(
      payload.rideId,
      { userId, role: role as "PASSENGER" | "DRIVER" },
      target
    );
    ack?.({ ok: true, ride });
  } catch (e) {
    ack?.(toError(e));
  }
}
