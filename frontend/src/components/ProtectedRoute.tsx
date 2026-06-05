import { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { homePathFor } from "../lib/nav";
import { Role } from "../lib/types";
import { useAuth } from "../store/auth";

export function ProtectedRoute({
  children,
  role,
}: {
  children: ReactElement;
  role?: Role;
}) {
  const { user, token, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="grid h-screen place-items-center text-slate-500">Loading…</div>
    );
  }
  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (role && user.role !== role) {
    return <Navigate to={homePathFor(user.role)} replace />;
  }
  return children;
}
