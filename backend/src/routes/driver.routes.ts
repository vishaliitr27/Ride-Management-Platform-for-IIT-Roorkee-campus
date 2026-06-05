import { Router } from "express";
import { z } from "zod";
import { onboardSchema } from "../lib/validation";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/error";
import { broadcastDriverAvailability } from "../realtime";
import * as driverService from "../services/driver.service";
import * as rideService from "../services/ride.service";

const router = Router();

router.post(
  "/onboard",
  authenticate,
  requireRole("DRIVER"),
  asyncHandler(async (req, res) => {
    const data = onboardSchema.parse(req.body);
    const profile = await driverService.onboardDriver(req.user!.userId, data);
    res.json({ profile });
  })
);

router.get(
  "/me",
  authenticate,
  requireRole("DRIVER"),
  asyncHandler(async (req, res) => {
    const profile = await driverService.getDriverProfile(req.user!.userId);
    res.json({ profile });
  })
);

const statusSchema = z.object({ isOnline: z.boolean() });

router.patch(
  "/me/status",
  authenticate,
  requireRole("DRIVER"),
  asyncHandler(async (req, res) => {
    const { isOnline } = statusSchema.parse(req.body);
    const profile = await driverService.setAvailability(req.user!.userId, isOnline);
    broadcastDriverAvailability({ driverId: req.user!.userId, isOnline });
    res.json({ profile });
  })
);

router.get(
  "/available",
  authenticate,
  asyncHandler(async (_req, res) => {
    res.json({ drivers: await driverService.getAvailableDrivers() });
  })
);

router.get(
  "/me/stats",
  authenticate,
  requireRole("DRIVER"),
  asyncHandler(async (req, res) => {
    res.json({ stats: await driverService.getDriverStats(req.user!.userId) });
  })
);

router.get(
  "/me/history",
  authenticate,
  requireRole("DRIVER"),
  asyncHandler(async (req, res) => {
    res.json({ rides: await rideService.listRides(req.user!.userId, "DRIVER") });
  })
);

router.get(
  "/me/ratings",
  authenticate,
  requireRole("DRIVER"),
  asyncHandler(async (req, res) => {
    res.json({ ratings: await driverService.getDriverRatings(req.user!.userId) });
  })
);

export default router;
