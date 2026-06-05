import { NextFunction, Request, Response } from "express";
import { Role, verifyToken } from "../lib/jwt";
import { AppError } from "./error";

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError(401, "UNAUTHENTICATED", "Missing authentication token");
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    throw new AppError(401, "INVALID_TOKEN", "Invalid or expired token");
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, "FORBIDDEN", "You cannot perform this action");
    }
    next();
  };
}
