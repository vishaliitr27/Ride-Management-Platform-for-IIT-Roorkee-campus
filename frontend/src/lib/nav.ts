import { Role } from "./types";

// The landing route for a user once authenticated, keyed by their role.
export function homePathFor(role?: Role | null): string {
  if (role === "ADMIN") return "/admin";
  if (role === "DRIVER") return "/driver";
  return "/passenger";
}
