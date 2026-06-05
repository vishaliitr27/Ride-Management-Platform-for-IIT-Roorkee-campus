import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LocationPicker } from "../../components/LocationPicker";
import { MapMarker, MapView } from "../../components/MapView";
import { Button, Card, EmptyState, Input } from "../../components/ui";
import { api, apiError } from "../../lib/api";
import { CAMPUS_CENTER, CAMPUS_LOCATIONS, CampusSpot } from "../../lib/constants";
import { previewFare } from "../../lib/fares";
import { rupees, shortDateTime } from "../../lib/format";
import { ensureSocket } from "../../lib/socket";
import { AvailableDriver, Ride } from "../../lib/types";
import { useUI } from "../../store/ui";

const findSpot = (q: string) =>
  CAMPUS_LOCATIONS.find((s) => s.name.includes(q)) ?? null;

// datetime-local string a minute from now, used as the input min and default.
function soonLocal(): string {
  const d = new Date(Date.now() + 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function PassengerHome() {
  const navigate = useNavigate();
  const toast = useUI((s) => s.toast);
  const [drivers, setDrivers] = useState<AvailableDriver[]>([]);
  const [pickup, setPickup] = useState<CampusSpot | null>(
    () => findSpot("Cautley Bhawan") ?? CAMPUS_LOCATIONS[0]
  );
  const [dest, setDest] = useState<CampusSpot | null>(
    () => findSpot("Central Library")
  );
  const [mode, setMode] = useState<"NOW" | "LATER">("NOW");
  const [when, setWhen] = useState(soonLocal);
  const [scheduled, setScheduled] = useState<Ride[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function loadDrivers() {
    try {
      const { data } = await api.get("/api/drivers/available");
      setDrivers(data.drivers);
    } catch {
      /* non-critical */
    }
  }

  async function loadScheduled() {
    try {
      const { data } = await api.get("/api/rides/scheduled");
      setScheduled(data.rides);
    } catch {
      /* non-critical */
    }
  }

  useEffect(() => {
    // If there is already an active ride, jump straight to tracking it.
    api
      .get("/api/rides/active")
      .then(({ data }) => {
        if (data.ride) navigate(`/passenger/ride/${data.ride.id}`);
      })
      .catch(() => {});

    loadDrivers();
    loadScheduled();
    const socket = ensureSocket();
    const onAvailability = () => loadDrivers();
    // A scheduled ride reached its time and is now live — go track it.
    const onDispatched = (ride: Ride) => {
      toast("Your scheduled ride is now searching for a driver", "info");
      navigate(`/passenger/ride/${ride.id}`);
    };
    socket.on("driver:availability", onAvailability);
    socket.on("ride:scheduled-dispatched", onDispatched);
    return () => {
      socket.off("driver:availability", onAvailability);
      socket.off("ride:scheduled-dispatched", onDispatched);
    };
  }, [navigate, toast]);

  async function requestRide() {
    if (!pickup || !dest) {
      setError("Choose both a pickup and a destination");
      return;
    }
    if (pickup.name === dest.name) {
      setError("Pickup and destination must be different");
      return;
    }
    let scheduledFor: string | undefined;
    if (mode === "LATER") {
      const ts = new Date(when).getTime();
      if (Number.isNaN(ts) || ts <= Date.now()) {
        setError("Pick a time in the future");
        return;
      }
      scheduledFor = new Date(when).toISOString();
    }
    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/api/rides", {
        pickup: { lat: pickup.lat, lng: pickup.lng, address: pickup.name },
        destination: { lat: dest.lat, lng: dest.lng, address: dest.name },
        scheduledFor,
      });
      if (mode === "LATER") {
        toast(`Ride scheduled for ${shortDateTime(scheduledFor)}`, "success");
        setWhen(soonLocal());
        loadScheduled();
      } else {
        navigate(`/passenger/ride/${data.ride.id}`);
      }
    } catch (err) {
      toast(apiError(err), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelScheduled(rideId: string) {
    try {
      await api.patch(`/api/rides/${rideId}/cancel`);
      setScheduled((prev) => prev.filter((r) => r.id !== rideId));
      toast("Scheduled ride cancelled", "info");
    } catch (err) {
      toast(apiError(err), "error");
    }
  }

  const fare =
    pickup && dest && pickup.name !== dest.name ? previewFare(pickup, dest) : null;

  const markers: MapMarker[] = drivers
    .filter((d) => d.lat != null && d.lng != null)
    .map((d) => ({
      lat: d.lat!,
      lng: d.lng!,
      label: `${d.name} · ${d.vehicleType}`,
      kind: "driver" as const,
    }));
  if (pickup) {
    markers.push({ lat: pickup.lat, lng: pickup.lng, label: "Pickup", kind: "pickup" });
  }
  if (dest) {
    markers.push({ lat: dest.lat, lng: dest.lng, label: "Destination", kind: "dest" });
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Request a ride</h2>
          <div className="space-y-3">
            <LocationPicker
              label="Pickup"
              value={pickup}
              onChange={setPickup}
              excludeName={dest?.name}
              placeholder="Search pickup point…"
            />
            <LocationPicker
              label="Destination"
              value={dest}
              onChange={setDest}
              excludeName={pickup?.name}
              placeholder="Search destination…"
            />
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
              {(["NOW", "LATER"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-md py-1.5 text-sm font-medium transition ${
                    mode === m ? "bg-white text-brand-700 shadow-sm" : "text-slate-500"
                  }`}
                >
                  {m === "NOW" ? "Ride now" : "Schedule"}
                </button>
              ))}
            </div>

            {mode === "LATER" && (
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-600">Pickup time</span>
                <Input
                  type="datetime-local"
                  value={when}
                  min={soonLocal()}
                  onChange={(e) => setWhen(e.target.value)}
                />
              </label>
            )}

            {fare != null && (
              <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-sm">
                <span className="text-slate-600">Estimated fare</span>
                <span className="font-semibold text-brand-700">{rupees(fare)}</span>
              </div>
            )}
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button className="w-full" onClick={requestRide} disabled={submitting}>
              {submitting
                ? "Saving…"
                : mode === "LATER"
                ? "Schedule ride"
                : "Request ride"}
            </Button>
          </div>
        </Card>

        {scheduled.length > 0 && (
          <Card>
            <h3 className="mb-3 font-semibold">Scheduled rides</h3>
            <ul className="space-y-2">
              {scheduled.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {r.pickupAddress} → {r.destAddress}
                    </p>
                    <p className="text-xs text-slate-500">
                      {shortDateTime(r.scheduledFor)} · {rupees(r.fareEstimate)}
                    </p>
                  </div>
                  <button
                    onClick={() => cancelScheduled(r.id)}
                    className="text-sm font-medium text-slate-500 hover:text-rose-600"
                  >
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Drivers online</h3>
            <span className="text-sm text-slate-500">{drivers.length} available</span>
          </div>
          {drivers.length === 0 ? (
            <EmptyState title="No drivers online right now" hint="Please try again shortly." />
          ) : (
            <ul className="space-y-2">
              {drivers.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-slate-500">
                      {d.vehicleType} · {d.vehicleNumber}
                    </p>
                  </div>
                  <span className="text-sm text-amber-500">
                    ★ {d.ratingAvg.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="h-[420px] md:h-[560px]">
        <MapView markers={markers} center={pickup ?? CAMPUS_CENTER} />
      </div>
    </div>
  );
}
