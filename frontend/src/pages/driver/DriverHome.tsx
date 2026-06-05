import { useEffect, useRef, useState } from "react";
import { MapMarker, MapView } from "../../components/MapView";
import { StatusBadge } from "../../components/StatusBadge";
import { Button, Card, EmptyState } from "../../components/ui";
import { api, apiError } from "../../lib/api";
import { CAMPUS_CENTER } from "../../lib/constants";
import { rupees, shortDateTime, timeOnly } from "../../lib/format";
import { etaMinutes, haversineKm } from "../../lib/geo";
import { ensureSocket } from "../../lib/socket";
import { Ride, VerificationStatus } from "../../lib/types";
import { useUI } from "../../store/ui";

const ENDED = ["COMPLETED", "CANCELLED"];

export default function DriverHome() {
  const toast = useUI((s) => s.toast);
  const [online, setOnline] = useState(false);
  const [verification, setVerification] = useState<VerificationStatus>("PENDING");
  const [requests, setRequests] = useState<Ride[]>([]);
  const [scheduled, setScheduled] = useState<Ride[]>([]);
  const [active, setActive] = useState<Ride | null>(null);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);
  const watchId = useRef<number | null>(null);
  const lastEmit = useRef(0);

  async function loadRequests() {
    try {
      const { data } = await api.get("/api/rides/requests");
      setRequests(data.rides);
    } catch {
      /* ignore */
    }
  }
  async function loadActive() {
    try {
      const { data } = await api.get("/api/rides/active");
      setActive(data.ride);
    } catch {
      /* ignore */
    }
  }
  async function loadScheduled() {
    try {
      const { data } = await api.get("/api/rides/scheduled/open");
      setScheduled(data.rides);
    } catch {
      /* ignore */
    }
  }

  const byScheduled = (a: Ride, b: Ride) =>
    new Date(a.scheduledFor ?? 0).getTime() - new Date(b.scheduledFor ?? 0).getTime();

  useEffect(() => {
    api
      .get("/api/drivers/me")
      .then(({ data }) => {
        setOnline(!!data.profile.isOnline);
        setVerification(data.profile.verificationStatus);
        if (data.profile.isOnline) startLocation();
      })
      .catch(() => {});
    loadActive();
    loadRequests();
    loadScheduled();

    const socket = ensureSocket();
    const onNew = (ride: Ride) =>
      setRequests((prev) => (prev.some((r) => r.id === ride.id) ? prev : [ride, ...prev]));
    // A scheduled ride was just booked — show it so a driver can claim it early.
    const onScheduledNew = (ride: Ride) =>
      setScheduled((prev) =>
        prev.some((r) => r.id === ride.id) ? prev : [...prev, ride].sort(byScheduled)
      );
    const onTaken = ({ rideId }: { rideId: string }) => {
      setRequests((prev) => prev.filter((r) => r.id !== rideId));
      setScheduled((prev) => prev.filter((r) => r.id !== rideId));
    };
    const onStatus = (ride: Ride) => {
      setActive((cur) =>
        cur && cur.id === ride.id ? (ENDED.includes(ride.status) ? null : ride) : cur
      );
      if (ride.status === "CANCELLED") toast("Passenger cancelled the ride", "info");
    };
    const onConnect = () => {
      loadActive();
      loadRequests();
      loadScheduled();
    };

    socket.on("ride:new", onNew);
    socket.on("ride:scheduled-new", onScheduledNew);
    socket.on("ride:taken", onTaken);
    socket.on("ride:status", onStatus);
    socket.on("connect", onConnect);

    return () => {
      socket.off("ride:new", onNew);
      socket.off("ride:scheduled-new", onScheduledNew);
      socket.off("ride:taken", onTaken);
      socket.off("ride:status", onStatus);
      socket.off("connect", onConnect);
      stopLocation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startLocation() {
    if (!navigator.geolocation || watchId.current != null) return;
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setMyLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        const now = Date.now();
        if (now - lastEmit.current < 4000) return; // throttle
        lastEmit.current = now;
        ensureSocket().emit("driver:location", {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 4000 }
    );
  }
  function stopLocation() {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }

  function toggleOnline() {
    if (verification !== "VERIFIED" && !online) {
      toast("Your profile is awaiting admin verification", "info");
      return;
    }
    const socket = ensureSocket();
    const next = !online;
    socket.emit(next ? "driver:online" : "driver:offline", {}, (res: { error?: string; message?: string }) => {
      if (res?.error) {
        toast(res.message || "Could not update status", "error");
        return;
      }
      setOnline(next);
      if (next) {
        startLocation();
        loadRequests();
        toast("You are online", "success");
      } else {
        stopLocation();
        setRequests([]);
        toast("You are offline", "info");
      }
    });
  }

  async function accept(rideId: string) {
    try {
      const { data } = await api.patch(`/api/rides/${rideId}/accept`);
      setActive(data.ride);
      setRequests([]);
      setScheduled((prev) => prev.filter((r) => r.id !== rideId));
      ensureSocket().emit("ride:join", rideId);
      toast("Ride accepted", "success");
    } catch (err) {
      toast(apiError(err), "error");
      setRequests((prev) => prev.filter((r) => r.id !== rideId));
      setScheduled((prev) => prev.filter((r) => r.id !== rideId));
    }
  }

  function dismiss(rideId: string) {
    setRequests((prev) => prev.filter((r) => r.id !== rideId));
  }

  async function transition(path: "start" | "complete" | "cancel") {
    if (!active) return;
    try {
      const { data } = await api.patch(`/api/rides/${active.id}/${path}`);
      setActive(ENDED.includes(data.ride.status) ? null : data.ride);
      if (path === "complete") toast("Ride completed", "success");
    } catch (err) {
      toast(apiError(err), "error");
    }
  }

  const verified = verification === "VERIFIED";

  // Live map data: always show the driver's own position; on an active ride show
  // the pickup/destination, otherwise drop a pin on each incoming request so the
  // driver can see where the demand is.
  const mapMarkers: MapMarker[] = [];
  if (myLoc) mapMarkers.push({ ...myLoc, label: "You", kind: "me" });
  if (active) {
    mapMarkers.push({
      lat: active.pickupLat,
      lng: active.pickupLng,
      label: `Pickup · ${active.pickupAddress}`,
      kind: "pickup",
    });
    mapMarkers.push({
      lat: active.destLat,
      lng: active.destLng,
      label: `Destination · ${active.destAddress}`,
      kind: "dest",
    });
  } else {
    for (const r of requests) {
      mapMarkers.push({
        lat: r.pickupLat,
        lng: r.pickupLng,
        label: `${r.passenger?.name ?? "Pickup"} · ${r.pickupAddress}`,
        kind: "pickup",
      });
    }
  }
  const showMap = !!active || online;
  const mapCenter =
    myLoc ??
    (active ? { lat: active.pickupLat, lng: active.pickupLng } : CAMPUS_CENTER);

  return (
    <div className="space-y-6">
      {!verified && (
        <Card
          className={
            verification === "REJECTED"
              ? "border-rose-200 bg-rose-50"
              : "border-amber-200 bg-amber-50"
          }
        >
          <p className="font-medium text-slate-700">
            {verification === "REJECTED"
              ? "Your profile was not approved"
              : "Your profile is awaiting verification"}
          </p>
          <p className="text-sm text-slate-500">
            {verification === "REJECTED"
              ? "An admin rejected your application. Update your vehicle details and contact support to re-apply."
              : "An admin needs to verify your profile before you can go online and accept rides."}
          </p>
        </Card>
      )}

      <Card className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {online ? "You're online" : "You're offline"}
          </h2>
          <p className="text-sm text-slate-500">
            {!verified
              ? "Available once your profile is verified"
              : online
                ? "Receiving ride requests in real time"
                : "Go online to receive requests"}
          </p>
        </div>
        <button
          onClick={toggleOnline}
          disabled={!verified}
          aria-label="Toggle availability"
          className={`relative h-8 w-14 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
            online ? "bg-green-500" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
              online ? "left-7" : "left-1"
            }`}
          />
        </button>
      </Card>

      {showMap && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {active ? "Trip map" : "Requests nearby"}
            </h3>
            {!active && (
              <span className="text-sm text-slate-500">
                {requests.length} request{requests.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className="h-[320px] md:h-[420px]">
            <MapView markers={mapMarkers} center={mapCenter} follow={!!myLoc} />
          </div>
        </div>
      )}

      {active ? (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Active ride</h3>
            <StatusBadge status={active.status} />
          </div>
          <div className="space-y-1 text-sm">
            <p>
              {active.pickupAddress} → {active.destAddress}
            </p>
            <p className="text-slate-500">
              Passenger: {active.passenger?.name}
              {active.passenger?.phone ? ` · ${active.passenger.phone}` : ""}
            </p>
            <p className="text-slate-500">
              {active.distanceKm ?? "—"} km · {rupees(active.fareEstimate)}
            </p>
            {active.scheduledFor && (
              <p className="font-medium text-amber-600">
                Scheduled · {shortDateTime(active.scheduledFor)}
              </p>
            )}
            {myLoc && active.status === "ACCEPTED" && (
              <p className="font-medium text-brand-700">
                ~
                {etaMinutes(
                  haversineKm(myLoc, { lat: active.pickupLat, lng: active.pickupLng })
                )}{" "}
                min to pickup
              </p>
            )}
            {myLoc && active.status === "IN_PROGRESS" && (
              <p className="font-medium text-brand-700">
                ~
                {etaMinutes(
                  haversineKm(myLoc, { lat: active.destLat, lng: active.destLng })
                )}{" "}
                min to destination
              </p>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            {active.status === "ACCEPTED" && (
              <Button onClick={() => transition("start")}>Start ride</Button>
            )}
            {active.status === "IN_PROGRESS" && (
              <Button onClick={() => transition("complete")}>Complete ride</Button>
            )}
            <Button variant="secondary" onClick={() => transition("cancel")}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : (
        <div>
          <h3 className="mb-3 font-semibold">Incoming requests</h3>
          {!online ? (
            <EmptyState title="You're offline" hint="Go online to see ride requests." />
          ) : requests.length === 0 ? (
            <EmptyState
              title="No requests yet"
              hint="New requests appear here instantly."
            />
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <Card
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-medium">
                      {r.pickupAddress} → {r.destAddress}
                    </p>
                    <p className="text-sm text-slate-500">
                      {r.passenger?.name} · {r.distanceKm ?? "—"} km ·{" "}
                      {rupees(r.fareEstimate)}
                      {r.distanceToPickupKm != null
                        ? ` · ${r.distanceToPickupKm} km away`
                        : ""}{" "}
                      · {timeOnly(r.requestedAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => accept(r.id)}>Accept</Button>
                    <Button variant="ghost" onClick={() => dismiss(r.id)}>
                      Dismiss
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {verified && scheduled.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold">Scheduled rides</h3>
          <p className="mb-3 -mt-1 text-sm text-slate-500">
            Upcoming bookings you can claim ahead of time.
          </p>
          <div className="space-y-3">
            {scheduled.map((r) => (
              <Card
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="font-medium">
                    {r.pickupAddress} → {r.destAddress}
                  </p>
                  <p className="text-sm text-slate-500">
                    {r.passenger?.name} · {r.distanceKm ?? "—"} km ·{" "}
                    {rupees(r.fareEstimate)}
                  </p>
                  <p className="text-sm font-medium text-amber-600">
                    {shortDateTime(r.scheduledFor)}
                  </p>
                </div>
                <Button onClick={() => accept(r.id)}>Accept</Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
