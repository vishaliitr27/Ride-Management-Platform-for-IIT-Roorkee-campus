import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "../../components/Icon";
import { MapMarker, MapView } from "../../components/MapView";
import { Stars } from "../../components/Stars";
import { StatusBadge } from "../../components/StatusBadge";
import { Button, Card } from "../../components/ui";
import { api, apiError } from "../../lib/api";
import { rupees, timeOnly } from "../../lib/format";
import { etaMinutes, haversineKm } from "../../lib/geo";
import { ensureSocket } from "../../lib/socket";
import { Ride, RidePayment } from "../../lib/types";
import { useUI } from "../../store/ui";

const STEPS = ["REQUESTED", "ACCEPTED", "IN_PROGRESS", "COMPLETED"];

export default function RideTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useUI((s) => s.toast);
  const [ride, setRide] = useState<Ride | null>(null);
  const [payment, setPayment] = useState<RidePayment | null>(null);
  const [driverLoc, setDriverLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [score, setScore] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    if (!id) return;
    try {
      const { data } = await api.get(`/api/rides/${id}`);
      setRide(data.ride);
    } catch (err) {
      toast(apiError(err), "error");
    }
  }

  // Pull the payment summary once the ride is done (and refresh on focus, so a
  // payment made on the dedicated page is reflected here on return).
  useEffect(() => {
    if (!id || ride?.status !== "COMPLETED") return;
    let cancelled = false;
    const fetchPayment = () =>
      api
        .get(`/api/rides/${id}/payment`)
        .then(({ data }) => !cancelled && setPayment(data.payment))
        .catch(() => {});
    fetchPayment();
    window.addEventListener("focus", fetchPayment);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", fetchPayment);
    };
  }, [id, ride?.status]);

  useEffect(() => {
    load();
    const socket = ensureSocket();
    socket.emit("ride:join", id);

    const onStatus = (r: Ride) => {
      if (r.id === id) setRide(r);
    };
    const onLocation = (p: { lat: number; lng: number }) =>
      setDriverLoc({ lat: p.lat, lng: p.lng });
    // On reconnect, re-sync from the server (the socket is notify-only).
    const onConnect = () => {
      load();
      socket.emit("ride:join", id);
    };

    socket.on("ride:status", onStatus);
    socket.on("ride:assigned", onStatus);
    socket.on("driver:location", onLocation);
    socket.on("connect", onConnect);

    return () => {
      socket.emit("ride:leave", id);
      socket.off("ride:status", onStatus);
      socket.off("ride:assigned", onStatus);
      socket.off("driver:location", onLocation);
      socket.off("connect", onConnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cancelRide() {
    try {
      const { data } = await api.patch(`/api/rides/${id}/cancel`);
      setRide(data.ride);
      toast("Ride cancelled", "info");
    } catch (err) {
      toast(apiError(err), "error");
    }
  }

  async function submitRating() {
    setSubmitting(true);
    try {
      await api.post(`/api/rides/${id}/rating`, {
        score,
        feedback: feedback || undefined,
      });
      toast("Thanks for your feedback!", "success");
      await load();
    } catch (err) {
      toast(apiError(err), "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ride) {
    return <div className="py-20 text-center text-slate-500">Loading ride…</div>;
  }

  const driverProfile = ride.driver?.driverProfile;
  const liveLat = driverLoc?.lat ?? driverProfile?.currentLat ?? null;
  const liveLng = driverLoc?.lng ?? driverProfile?.currentLng ?? null;

  const markers: MapMarker[] = [
    {
      lat: ride.pickupLat,
      lng: ride.pickupLng,
      label: `Pickup · ${ride.pickupAddress}`,
      kind: "pickup",
    },
    {
      lat: ride.destLat,
      lng: ride.destLng,
      label: `Destination · ${ride.destAddress}`,
      kind: "dest",
    },
  ];
  if (liveLat != null && liveLng != null) {
    markers.push({
      lat: liveLat,
      lng: liveLng,
      label: ride.driver?.name ?? "Driver",
      kind: "driver",
    });
  }

  const activeStep = STEPS.indexOf(ride.status);
  const cancelled = ride.status === "CANCELLED";
  const cancellable = ride.status === "REQUESTED" || ride.status === "ACCEPTED";
  const canRate = ride.status === "COMPLETED" && !ride.rating;

  // Live arrival estimate from the driver's position to the next target.
  const live = liveLat != null && liveLng != null ? { lat: liveLat, lng: liveLng } : null;
  let eta: { heading: string; line: string } | null = null;
  if (ride.status === "ACCEPTED") {
    const km = live
      ? haversineKm(live, { lat: ride.pickupLat, lng: ride.pickupLng })
      : null;
    eta = {
      heading: "Driver arriving",
      line: km != null ? `~${etaMinutes(km)} min to pickup` : "On the way to pickup",
    };
  } else if (ride.status === "IN_PROGRESS") {
    const km = live
      ? haversineKm(live, { lat: ride.destLat, lng: ride.destLng })
      : ride.distanceKm ?? null;
    eta = {
      heading: "On the way",
      line:
        km != null ? `~${etaMinutes(km)} min to destination` : "Heading to destination",
    };
  }

  const timeline = [
    { key: "REQUESTED", label: "Ride requested", at: ride.requestedAt },
    {
      key: "ACCEPTED",
      label: ride.driver ? `Accepted by ${ride.driver.name}` : "Driver accepted",
      at: ride.acceptedAt,
    },
    { key: "IN_PROGRESS", label: "Ride started", at: ride.startedAt },
    { key: "COMPLETED", label: "Arrived at destination", at: ride.completedAt },
    ...(cancelled
      ? [{ key: "CANCELLED", label: "Ride cancelled", at: ride.cancelledAt }]
      : []),
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        {eta && (
          <div className="flex items-center gap-3 rounded-xl bg-brand-600 px-4 py-3 text-white shadow-sm">
            <Icon name="eta" size={24} className="shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-100">
                {eta.heading}
              </p>
              <p className="text-lg font-semibold leading-tight">{eta.line}</p>
            </div>
          </div>
        )}

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your ride</h2>
            <StatusBadge status={ride.status} />
          </div>

          <ol className="mb-4 flex items-center">
            {STEPS.map((s, i) => (
              <li key={s} className="flex flex-1 items-center last:flex-none">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
                    i <= activeStep && !cancelled
                      ? "bg-brand-600 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {i + 1}
                </span>
                {i < STEPS.length - 1 && (
                  <span
                    className={`h-0.5 flex-1 ${
                      i < activeStep && !cancelled ? "bg-brand-600" : "bg-slate-200"
                    }`}
                  />
                )}
              </li>
            ))}
          </ol>

          <div className="space-y-1 text-sm">
            <p>
              <span className="text-slate-500">From</span> · {ride.pickupAddress}
            </p>
            <p>
              <span className="text-slate-500">To</span> · {ride.destAddress}
            </p>
            <p>
              <span className="text-slate-500">Distance</span> ·{" "}
              {ride.distanceKm ?? "—"} km · <span className="text-slate-500">Fare</span>{" "}
              {rupees(ride.fareEstimate)}
            </p>
          </div>

          {cancelled && (
            <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
              This ride was cancelled
              {ride.cancelledBy ? ` by the ${ride.cancelledBy.toLowerCase()}` : ""}.
            </p>
          )}

          {cancellable && (
            <Button variant="danger" className="mt-4 w-full" onClick={cancelRide}>
              Cancel ride
            </Button>
          )}
        </Card>

        {ride.driver ? (
          <Card>
            <h3 className="mb-2 font-semibold">Your driver</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{ride.driver.name}</p>
                <p className="text-sm text-slate-500">
                  {driverProfile?.vehicleType} · {driverProfile?.vehicleNumber}
                </p>
                {ride.driver.phone && (
                  <p className="text-sm text-slate-500">{ride.driver.phone}</p>
                )}
              </div>
              <span className="text-sm text-amber-500">
                ★ {(driverProfile?.ratingAvg ?? 0).toFixed(1)}
              </span>
            </div>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-slate-500">Looking for a nearby driver…</p>
          </Card>
        )}

        <Card>
          <h3 className="mb-3 font-semibold">Trip timeline</h3>
          <ol className="space-y-3">
            {timeline.map((t) => {
              const done = !!t.at;
              return (
                <li key={t.key} className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      t.key === "CANCELLED"
                        ? "bg-rose-500"
                        : done
                        ? "bg-brand-600"
                        : "bg-slate-300"
                    }`}
                  />
                  <span
                    className={`flex-1 text-sm ${
                      done ? "text-slate-700" : "text-slate-400"
                    }`}
                  >
                    {t.label}
                  </span>
                  <span className="text-xs text-slate-400">
                    {t.at ? timeOnly(t.at) : "—"}
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>

        {ride.status === "COMPLETED" && (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">
                  {payment?.paid ? "Payment complete" : "Payment"}
                </h3>
                <p className="text-sm text-slate-500">
                  {payment?.paid
                    ? `${rupees(ride.fareEstimate)} paid${
                        payment.method ? ` via ${payment.method}` : ""
                      }`
                    : `Pay ${rupees(ride.fareEstimate)} to ${ride.driver?.name ?? "your driver"}`}
                </p>
              </div>
              {payment?.paid ? (
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                  Paid
                </span>
              ) : (
                <Button onClick={() => navigate(`/passenger/ride/${id}/pay`)}>
                  Pay now
                </Button>
              )}
            </div>
          </Card>
        )}

        {canRate && (
          <Card>
            <h3 className="mb-2 font-semibold">Rate your ride</h3>
            <Stars value={score} onChange={setScore} />
            <textarea
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              rows={2}
              placeholder="Optional feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <Button className="mt-3 w-full" onClick={submitRating} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit rating"}
            </Button>
          </Card>
        )}

        {ride.rating && (
          <Card>
            <h3 className="mb-1 font-semibold">Your rating</h3>
            <Stars value={ride.rating.score} />
            {ride.rating.feedback && (
              <p className="mt-1 text-sm text-slate-500">“{ride.rating.feedback}”</p>
            )}
          </Card>
        )}

        <Button variant="ghost" onClick={() => navigate("/passenger")}>
          ← Back to booking
        </Button>
      </div>

      <div className="h-[420px] md:h-[560px]">
        <MapView
          markers={markers}
          center={
            liveLat != null && liveLng != null
              ? { lat: liveLat, lng: liveLng }
              : { lat: ride.pickupLat, lng: ride.pickupLng }
          }
          follow={!!driverLoc}
        />
      </div>
    </div>
  );
}
