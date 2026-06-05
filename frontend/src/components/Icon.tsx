import { SVGProps } from "react";

// Stroke icon set for IITR Rides — paths lifted from the design sheet
// (frontend/IITR Rides Icons.html). All 24×24, 1.75 stroke, inherit `currentColor`.
export const ICON_PATHS = {
  // Rides & map
  rickshaw: `<path d="M3.5 13a8.5 8.5 0 0 1 17 0"/><path d="M3.5 13V16H6"/><path d="M9 16h6"/><path d="M18 16h2.5V13"/><path d="M12 5v8"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/>`,
  pickup: `<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>`,
  destination: `<path d="M12 21s-6.5-5.8-6.5-10.5A6.5 6.5 0 0 1 18.5 10.5C18.5 15.2 12 21 12 21z"/><circle cx="12" cy="10.4" r="2.4"/>`,
  route: `<circle cx="6" cy="6" r="2"/><circle cx="18" cy="16" r="2"/><path d="M6 8v4a4 4 0 0 0 4 4h6"/>`,
  map: `<path d="M9 4 3 6.2v14l6-2.2 6 2.2 6-2.2V4l-6 2.2z"/><path d="M9 4v14.2M15 6.2v14"/>`,
  navigation: `<path d="M12 3 19 21l-7-3.6L5 21z"/>`,
  compass: `<circle cx="12" cy="12" r="9"/><path d="M15.6 8.4l-2.3 4.9-4.9 2.3 2.3-4.9z"/>`,
  eta: `<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>`,
  bolt: `<path d="M13 3 5 13.2h5l-1 7.8 9-11.2h-6z"/>`,

  // Navigation
  home: `<path d="M4 11 12 4l8 7"/><path d="M6 10v9h12v-9"/>`,
  search: `<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>`,
  history: `<path d="M3.6 12a8.4 8.4 0 1 0 2.6-6.1L3 8.4"/><path d="M3 3.6v4.8h4.8"/><path d="M12 7.8v4.4l3 1.8"/>`,
  profile: `<circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>`,
  riders: `<circle cx="9" cy="8" r="3.4"/><path d="M3 19a6 6 0 0 1 12 0"/><path d="M16 4.9a3.4 3.4 0 0 1 0 6.2M17.5 14a6 6 0 0 1 3.5 5"/>`,
  back: `<path d="M19 12H5M12 5l-7 7 7 7"/>`,
  chevron: `<path d="M9 5l7 7-7 7"/>`,
  expand: `<path d="M5 9l7 7 7-7"/>`,
  grid: `<rect x="4" y="4" width="6" height="6" rx="1.6"/><rect x="14" y="4" width="6" height="6" rx="1.6"/><rect x="4" y="14" width="6" height="6" rx="1.6"/><rect x="14" y="14" width="6" height="6" rx="1.6"/>`,
  chart: `<path d="M3 21h18"/><rect x="5" y="11" width="3.2" height="7" rx="1"/><rect x="10.4" y="6" width="3.2" height="12" rx="1"/><rect x="15.8" y="13" width="3.2" height="5" rx="1"/>`,

  // Status & actions
  check: `<path d="M5 12.5l4.5 4.5L19 6.5"/>`,
  "check-circle": `<circle cx="12" cy="12" r="9"/><path d="M8 12l2.8 2.8L16 9"/>`,
  close: `<path d="M6 6l12 12M18 6 6 18"/>`,
  info: `<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.6h.01"/>`,
  alert: `<path d="M12 4 2.5 20.5h19z"/><path d="M12 10v4"/><path d="M12 17.5h.01"/>`,
  star: `<path d="M12 3.5l2.6 5.7 6.2.7-4.6 4.2 1.2 6.1L12 17.3l-5.6 2.9 1.2-6.1-4.6-4.2 6.2-.7z"/>`,
  shield: `<path d="M12 3.5l7.5 2.8v5.4c0 4.6-3.5 7.4-7.5 8.5-4-1.1-7.5-3.9-7.5-8.5V6.3z"/><path d="M9 12l2 2 4-4"/>`,

  // Comms
  phone: `<path d="M5 4h3.5l1.8 4.5-2.3 1.6a11 11 0 0 0 4.9 4.9l1.6-2.3 4.5 1.8V18a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 3 6.2 2 2 0 0 1 5 4z"/>`,
  qr: `<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><path d="M14 14h3v3M20 14v6M14 20h6"/>`,

  // Payments
  wallet: `<path d="M4 7a2 2 0 0 1 2-2h11v4"/><path d="M4 7v10a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-3"/><path d="M21 11h-4a2 2 0 0 0 0 4h4z"/>`,
  rupee: `<path d="M8 5h8M8 9h8M16 5c0 3-2.5 4.5-6 4.5H8l7.5 8"/>`,
} as const;

export type IconName = keyof typeof ICON_PATHS;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] }}
      {...props}
    />
  );
}
