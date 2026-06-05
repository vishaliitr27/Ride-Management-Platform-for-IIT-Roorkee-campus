import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminDrivers from "./pages/admin/AdminDrivers";
import DriverDashboard from "./pages/driver/DriverDashboard";
import DriverHome from "./pages/driver/DriverHome";
import DriverProfile from "./pages/driver/DriverProfile";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import PassengerHistory from "./pages/passenger/PassengerHistory";
import PassengerHome from "./pages/passenger/PassengerHome";
import PaymentPage from "./pages/passenger/PaymentPage";
import RideTracking from "./pages/passenger/RideTracking";
import Register from "./pages/Register";
import { useAuth } from "./store/auth";

export default function App() {
  const { ready, loadMe } = useAuth();

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  if (!ready) {
    return (
      <div className="grid h-screen place-items-center text-slate-500">Loading…</div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/passenger"
          element={
            <ProtectedRoute role="PASSENGER">
              <PassengerHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/passenger/ride/:id"
          element={
            <ProtectedRoute role="PASSENGER">
              <RideTracking />
            </ProtectedRoute>
          }
        />
        <Route
          path="/passenger/ride/:id/pay"
          element={
            <ProtectedRoute role="PASSENGER">
              <PaymentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/passenger/history"
          element={
            <ProtectedRoute role="PASSENGER">
              <PassengerHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver"
          element={
            <ProtectedRoute role="DRIVER">
              <DriverHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver/dashboard"
          element={
            <ProtectedRoute role="DRIVER">
              <DriverDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver/profile"
          element={
            <ProtectedRoute role="DRIVER">
              <DriverProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="ADMIN">
              <AdminDrivers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute role="ADMIN">
              <AdminAnalytics />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
