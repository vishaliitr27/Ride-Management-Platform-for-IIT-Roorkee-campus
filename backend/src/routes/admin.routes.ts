import { Router } from "express";
import { verificationActionSchema } from "../lib/validation";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/error";
import { broadcastDriverAvailability } from "../realtime";
import * as analyticsService from "../services/analytics.service";
import * as driverService from "../services/driver.service";

const router = Router();

// Every route here is admin-only.
router.use(authenticate, requireRole("ADMIN"));

router.get(
  "/analytics",
  asyncHandler(async (_req, res) => {
    res.json({ analytics: await analyticsService.getDemandAnalytics() });
  })
);

router.get(
  "/drivers",
  asyncHandler(async (req, res) => {
    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;
    res.json({ drivers: await driverService.listDriversForReview(status) });
  })
);

router.patch(
  "/drivers/:userId/verification",
  asyncHandler(async (req, res) => {
    const { status } = verificationActionSchema.parse(req.body);
    const profile = await driverService.setVerificationStatus(
      req.params.userId,
      status
    );
    // A rejected driver is taken offline, so refresh the public availability map.
    if (status === "REJECTED") {
      broadcastDriverAvailability({ driverId: req.params.userId, isOnline: false });
    }
    res.json({ profile });
  })
);

export default router;
