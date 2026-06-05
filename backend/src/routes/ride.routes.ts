import { Router } from "express";
import { paymentSchema, ratingSchema, rideRequestSchema } from "../lib/validation";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/error";
import * as paymentService from "../services/payment.service";
import * as rideService from "../services/ride.service";

const router = Router();

// Literal routes are declared before "/:id" so they are not swallowed by it.

router.post(
  "/",
  authenticate,
  requireRole("PASSENGER"),
  asyncHandler(async (req, res) => {
    const data = rideRequestSchema.parse(req.body);
    const ride = await rideService.createRide(req.user!.userId, data);
    res.status(201).json({ ride });
  })
);

router.get(
  "/active",
  authenticate,
  asyncHandler(async (req, res) => {
    const ride = await rideService.getActiveRide(req.user!.userId, req.user!.role);
    res.json({ ride });
  })
);

router.get(
  "/requests",
  authenticate,
  requireRole("DRIVER"),
  asyncHandler(async (_req, res) => {
    res.json({ rides: await rideService.getOpenRequests() });
  })
);

router.get(
  "/scheduled",
  authenticate,
  requireRole("PASSENGER"),
  asyncHandler(async (req, res) => {
    res.json({ rides: await rideService.getScheduledRides(req.user!.userId) });
  })
);

// Upcoming scheduled rides drivers can claim ahead of time.
router.get(
  "/scheduled/open",
  authenticate,
  requireRole("DRIVER"),
  asyncHandler(async (_req, res) => {
    res.json({ rides: await rideService.getOpenScheduledRides() });
  })
);

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;
    res.json({
      rides: await rideService.listRides(
        req.user!.userId,
        req.user!.role,
        status
      ),
    });
  })
);

router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ ride: await rideService.getRideById(req.params.id) });
  })
);

router.patch(
  "/:id/accept",
  authenticate,
  requireRole("DRIVER"),
  asyncHandler(async (req, res) => {
    res.json({ ride: await rideService.acceptRide(req.params.id, req.user!.userId) });
  })
);

// Rejecting just hides the request on that driver's side; no shared state changes.
router.patch(
  "/:id/reject",
  authenticate,
  requireRole("DRIVER"),
  asyncHandler(async (_req, res) => {
    res.json({ ok: true });
  })
);

router.patch(
  "/:id/start",
  authenticate,
  requireRole("DRIVER"),
  asyncHandler(async (req, res) => {
    res.json({
      ride: await rideService.transitionRide(
        req.params.id,
        { userId: req.user!.userId, role: req.user!.role },
        "IN_PROGRESS"
      ),
    });
  })
);

router.patch(
  "/:id/complete",
  authenticate,
  requireRole("DRIVER"),
  asyncHandler(async (req, res) => {
    res.json({
      ride: await rideService.transitionRide(
        req.params.id,
        { userId: req.user!.userId, role: req.user!.role },
        "COMPLETED"
      ),
    });
  })
);

router.patch(
  "/:id/cancel",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({
      ride: await rideService.transitionRide(
        req.params.id,
        { userId: req.user!.userId, role: req.user!.role },
        "CANCELLED"
      ),
    });
  })
);

router.post(
  "/:id/rating",
  authenticate,
  requireRole("PASSENGER"),
  asyncHandler(async (req, res) => {
    const data = ratingSchema.parse(req.body);
    res.status(201).json({
      rating: await rideService.rateRide(req.params.id, req.user!.userId, data),
    });
  })
);

router.get(
  "/:id/payment",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({
      payment: await paymentService.getRidePayment(req.params.id, req.user!.userId),
    });
  })
);

router.post(
  "/:id/payment",
  authenticate,
  requireRole("PASSENGER"),
  asyncHandler(async (req, res) => {
    const { method } = paymentSchema.parse(req.body);
    res.status(201).json({
      payment: await paymentService.recordPayment(
        req.params.id,
        req.user!.userId,
        method
      ),
    });
  })
);

export default router;
