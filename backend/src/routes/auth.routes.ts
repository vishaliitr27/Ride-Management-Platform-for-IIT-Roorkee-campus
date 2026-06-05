import bcrypt from "bcryptjs";
import { Router } from "express";
import { Role, signToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from "../lib/validation";
import { authenticate } from "../middleware/auth";
import { AppError, asyncHandler } from "../middleware/error";

const router = Router();

function publicUser(u: {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
}) {
  return { id: u.id, email: u.email, name: u.name, phone: u.phone, role: u.role };
}

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError(409, "EMAIL_TAKEN", "Email already registered");

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        phone: data.phone,
        role: data.role,
        ...(data.role === "DRIVER" && {
          driverProfile: {
            create: {
              vehicleType: data.vehicleType!,
              vehicleNumber: data.vehicleNumber!,
              vehicleModel: data.vehicleModel,
              licenseNumber: data.licenseNumber!,
              upiId: data.upiId,
            },
          },
        }),
      },
    });

    const token = signToken({ userId: user.id, role: user.role as Role });
    res.status(201).json({ token, user: publicUser(user) });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }
    const token = signToken({ userId: user.id, role: user.role as Role });
    res.json({ token, user: publicUser(user) });
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { driverProfile: true },
    });
    if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found");
    res.json({ user: { ...publicUser(user), driverProfile: user.driverProfile } });
  })
);

router.patch(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const data = updateProfileSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data,
    });
    res.json({ user: publicUser(user) });
  })
);

export default router;
