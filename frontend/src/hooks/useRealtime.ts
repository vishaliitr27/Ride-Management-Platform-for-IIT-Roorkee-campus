import { useEffect } from "react";
import { ensureSocket } from "../lib/socket";
import { Ride } from "../lib/types";
import { useAuth } from "../store/auth";
import { useUI } from "../store/ui";

// Mounted once in the authenticated layout. Opens the shared socket and surfaces
// the cross-cutting notifications (assignment, ratings) as toasts. Page-specific
// listeners live in the pages themselves.
export function useRealtime() {
  const token = useAuth((s) => s.token);
  const toast = useUI((s) => s.toast);

  useEffect(() => {
    if (!token) return;
    const socket = ensureSocket();

    const onAssigned = (ride: Ride) => {
      toast(`${ride.driver?.name ?? "A driver"} accepted your ride`, "success");
    };
    const onRating = () => toast("You received a new rating", "success");
    const onPayment = (p: { amount?: number; method?: string }) =>
      toast(
        `Payment received${p?.amount != null ? ` · ₹${p.amount}` : ""}${
          p?.method ? ` (${p.method})` : ""
        }`,
        "success"
      );

    socket.on("ride:assigned", onAssigned);
    socket.on("rating:received", onRating);
    socket.on("payment:received", onPayment);

    return () => {
      socket.off("ride:assigned", onAssigned);
      socket.off("rating:received", onRating);
      socket.off("payment:received", onPayment);
    };
  }, [token, toast]);
}
