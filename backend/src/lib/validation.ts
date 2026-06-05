import { z } from "zod";

export const RIDE_STATUSES = [
  "REQUESTED",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export type RideStatus = (typeof RIDE_STATUSES)[number];

// Allowed state transitions. Anything not listed here is rejected.
export const RIDE_TRANSITIONS: Record<RideStatus, RideStatus[]> = {
  REQUESTED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

const location = {
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
};

// A UPI VPA, e.g. "name@okhdfcbank". Loose check — banks vary.
export const upiId = z
  .string()
  .regex(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/, "Enter a valid UPI ID");

// Passengers are students and must sign up with their institute email.
// Drivers are vehicle operators, so they are exempt from the domain rule.
export const STUDENT_EMAIL_DOMAIN = "@iitr.ac.in";

export const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(2),
    phone: z.string().optional(),
    role: z.enum(["PASSENGER", "DRIVER"]),
    // Driver-only fields, required when role is DRIVER (checked below).
    vehicleType: z.enum(["E_RICKSHAW", "CAR", "BIKE"]).optional(),
    vehicleNumber: z.string().optional(),
    vehicleModel: z.string().optional(),
    licenseNumber: z.string().optional(),
    upiId: upiId.optional(),
  })
  .refine(
    (d) =>
      d.role !== "DRIVER" ||
      (d.vehicleType && d.vehicleNumber && d.licenseNumber),
    { message: "Drivers must provide vehicle type, number and license" }
  )
  .refine(
    (d) =>
      d.role !== "PASSENGER" ||
      d.email.toLowerCase().endsWith(STUDENT_EMAIL_DOMAIN),
    {
      path: ["email"],
      message: `Students must sign up with a ${STUDENT_EMAIL_DOMAIN} email`,
    }
  );

export const verificationActionSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
});

export const onboardSchema = z.object({
  vehicleType: z.enum(["E_RICKSHAW", "CAR", "BIKE"]),
  vehicleNumber: z.string().min(2),
  vehicleModel: z.string().optional(),
  licenseNumber: z.string().min(2),
  upiId: upiId.optional().or(z.literal("")),
});

export const paymentSchema = z.object({
  method: z.enum(["QR", "UPI", "CASH"]).default("UPI"),
});

export const rideRequestSchema = z.object({
  pickup: z.object({ ...location, address: z.string().min(1) }),
  destination: z.object({ ...location, address: z.string().min(1) }),
  scheduledFor: z.string().datetime().optional(),
});

export const ratingSchema = z.object({
  score: z.number().int().min(1).max(5),
  feedback: z.string().max(500).optional(),
});

export const locationSchema = z.object(location);
