import { prisma } from "../lib/prisma";
import { emitToUser } from "../realtime";
import { AppError } from "../middleware/error";

// Build a standard UPI deep link. Opening it on a phone launches the user's
// UPI app (GPay / PhonePe / Paytm…) pre-filled with the driver's VPA and amount.
export function buildUpiLink(
  upiId: string,
  payeeName: string,
  amount?: number | null,
  note?: string
): string {
  const params = new URLSearchParams({ pa: upiId, pn: payeeName, cu: "INR" });
  if (amount != null) params.set("am", String(amount));
  if (note) params.set("tn", note);
  return `upi://pay?${params.toString()}`;
}

async function loadRideForPayment(rideId: string) {
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: {
      driver: {
        select: { id: true, name: true, driverProfile: { select: { upiId: true } } },
      },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!ride) throw new AppError(404, "RIDE_NOT_FOUND", "Ride not found");
  return ride;
}

// Payment summary for a completed ride: amount, the driver's UPI details, a
// ready-to-open UPI link, and whether it has been marked paid. Visible to the
// two people on the ride.
export async function getRidePayment(rideId: string, actorId: string) {
  const ride = await loadRideForPayment(rideId);
  if (ride.passengerId !== actorId && ride.driverId !== actorId) {
    throw new AppError(403, "FORBIDDEN", "You are not part of this ride");
  }

  const upiId = ride.driver?.driverProfile?.upiId ?? null;
  const driverName = ride.driver?.name ?? "Driver";
  const amount = ride.fareEstimate ?? null;
  const payment = ride.payments[0] ?? null;

  return {
    rideId: ride.id,
    status: ride.status,
    amount,
    driverName,
    upiId,
    upiLink: upiId
      ? buildUpiLink(upiId, driverName, amount, `Ride ${ride.id.slice(0, 8)}`)
      : null,
    paid: payment?.status === "SUCCESS",
    method: payment?.method ?? null,
    paidAt: payment?.status === "SUCCESS" ? payment.createdAt : null,
  };
}

// The passenger marks the ride paid. We record it and notify the driver.
export async function recordPayment(
  rideId: string,
  passengerId: string,
  method: "QR" | "UPI" | "CASH"
) {
  const ride = await loadRideForPayment(rideId);
  if (ride.passengerId !== passengerId) {
    throw new AppError(403, "FORBIDDEN", "Only the passenger can pay for this ride");
  }
  if (ride.status !== "COMPLETED") {
    throw new AppError(409, "RIDE_NOT_COMPLETED", "Only completed rides can be paid");
  }

  const existing = ride.payments[0];
  if (existing?.status === "SUCCESS") {
    throw new AppError(409, "ALREADY_PAID", "This ride is already paid");
  }

  const amount = ride.fareEstimate ?? 0;
  const payment = existing
    ? await prisma.payment.update({
        where: { id: existing.id },
        data: { amount, method, status: "SUCCESS" },
      })
    : await prisma.payment.create({
        data: { rideId, amount, method, status: "SUCCESS" },
      });

  if (ride.driverId) {
    emitToUser(ride.driverId, "payment:received", {
      rideId,
      amount,
      method,
    });
  }
  return payment;
}
