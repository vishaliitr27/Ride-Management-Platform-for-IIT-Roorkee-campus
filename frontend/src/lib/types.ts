export type Role = "PASSENGER" | "DRIVER" | "ADMIN";

export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export type RideStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface DriverProfile {
  vehicleType: string;
  vehicleNumber: string;
  vehicleModel?: string | null;
  licenseNumber?: string;
  upiId?: string | null;
  verificationStatus?: string;
  isOnline?: boolean;
  currentLat?: number | null;
  currentLng?: number | null;
  ratingAvg?: number;
  ratingCount?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: Role;
  driverProfile?: DriverProfile | null;
}

export interface RidePerson {
  id: string;
  name: string;
  phone?: string | null;
  driverProfile?: DriverProfile | null;
}

export interface Rating {
  id: string;
  rideId: string;
  score: number;
  feedback?: string | null;
  createdAt: string;
}

export interface Ride {
  id: string;
  passengerId: string;
  driverId?: string | null;
  status: RideStatus;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  destLat: number;
  destLng: number;
  destAddress: string;
  distanceKm?: number | null;
  fareEstimate?: number | null;
  scheduledFor?: string | null;
  dispatchedAt?: string | null;
  requestedAt: string;
  acceptedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  passenger?: RidePerson;
  driver?: RidePerson | null;
  rating?: Rating | null;
  distanceToPickupKm?: number;
}

export interface RidePayment {
  rideId: string;
  status: RideStatus;
  amount: number | null;
  driverName: string;
  upiId: string | null;
  upiLink: string | null;
  paid: boolean;
  method: string | null;
  paidAt: string | null;
}

export interface AvailableDriver {
  id: string;
  name: string;
  vehicleType: string;
  vehicleNumber: string;
  ratingAvg: number;
  ratingCount: number;
  lat: number | null;
  lng: number | null;
  lastLocationAt: string | null;
}

export interface AdminDriver {
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  vehicleType: string;
  vehicleNumber: string;
  vehicleModel?: string | null;
  licenseNumber: string;
  verificationStatus: VerificationStatus;
  isOnline: boolean;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
}

export interface DriverStats {
  totalCompleted: number;
  activeRides: number;
  cancelled: number;
  earnings: number;
  ratingAvg: number;
  ratingCount: number;
  ridesPerDay: { date: string; rides: number }[];
}

export interface DriverRating extends Rating {
  passenger?: { name: string };
  ride?: { pickupAddress: string; destAddress: string; completedAt: string | null };
}

export interface DemandAnalytics {
  rangeDays: number;
  totals: {
    totalRides: number;
    completed: number;
    cancelled: number;
    completionRate: number;
    avgFare: number;
    totalDistanceKm: number;
  };
  peakHour: { hour: number; rides: number } | null;
  byHour: { hour: number; rides: number }[];
  byWeekday: { day: string; rides: number }[];
  byDay: { date: string; rides: number }[];
  topPickups: { name: string; rides: number }[];
  topDestinations: { name: string; rides: number }[];
  topRoutes: { name: string; rides: number }[];
}
