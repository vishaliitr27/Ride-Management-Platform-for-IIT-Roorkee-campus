import L from "leaflet";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { CAMPUS_CENTER } from "../lib/constants";
import { ICON_PATHS, IconName } from "./Icon";

export interface MapMarker {
  lat: number;
  lng: number;
  label: string;
  kind?: "driver" | "pickup" | "dest" | "me";
}

// Build a circular map pin from one of our stroke icons, so map markers match
// the rest of the app and don't depend on Leaflet's (bundler-fragile) PNG icons.
function pin(bg: string, icon: IconName): L.DivIcon {
  const svg = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[icon]}</svg>`;
  return L.divIcon({
    className: "cr-pin",
    html: `<div style="width:28px;height:28px;border-radius:9999px;background:${bg};display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,.35)">${svg}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

const PICKUP_ICON = pin("#22c55e", "pickup");
const DEST_ICON = pin("#f43f5e", "destination");
// The driver's own position — a brand-blue rickshaw pin so it stands apart from
// other drivers' plain blue dots and the green/red trip markers.
const ME_ICON = pin("#1f63d6", "rickshaw");

function markerIcon(kind: MapMarker["kind"]): L.DivIcon {
  if (kind === "dest") return DEST_ICON;
  if (kind === "me") return ME_ICON;
  return PICKUP_ICON;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

export function MapView({
  markers,
  center,
  follow = false,
  height = "100%",
}: {
  markers: MapMarker[];
  center?: { lat: number; lng: number };
  follow?: boolean;
  height?: string;
}) {
  const c = center ?? CAMPUS_CENTER;
  return (
    <div
      style={{ height }}
      className="overflow-hidden rounded-xl border border-slate-200"
    >
      <MapContainer center={[c.lat, c.lng]} zoom={15} scrollWheelZoom>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {follow && center && <Recenter lat={center.lat} lng={center.lng} />}
        {markers.map((m, i) =>
          m.kind === "driver" ? (
            <CircleMarker
              key={i}
              center={[m.lat, m.lng]}
              radius={8}
              pathOptions={{ color: "#1f63d6", fillColor: "#2f7df6", fillOpacity: 0.9 }}
            >
              <Popup>{m.label}</Popup>
            </CircleMarker>
          ) : (
            <Marker key={i} position={[m.lat, m.lng]} icon={markerIcon(m.kind)}>
              <Popup>{m.label}</Popup>
            </Marker>
          )
        )}
      </MapContainer>
    </div>
  );
}
