import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/error";
import adminRoutes from "./routes/admin.routes";
import authRoutes from "./routes/auth.routes";
import driverRoutes from "./routes/driver.routes";
import rideRoutes from "./routes/ride.routes";

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/drivers", driverRoutes);
  app.use("/api/rides", rideRoutes);
  app.use("/api/admin", adminRoutes);

  app.use(errorHandler);

  return app;
}
