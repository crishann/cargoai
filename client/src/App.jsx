import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/public/LandingPage.jsx";
import RenterDash from "./pages/renter/RenterDashboard.jsx";
import RenterBookings from "./pages/renter/RenterBookings.jsx";
import RenterCarList from "./pages/renter/RenterCarList.jsx";
import RenterNotifications from "./pages/renter/RenterNotifications.jsx";
import RenterAccount from "./pages/renter/RenterAccount.jsx";
import RenterComplaints from "./pages/renter/RenterComplaints.jsx";
import OwnerDash from "./pages/owner/OwnerDashboard.jsx";
import OwnerHome from "./pages/owner/Dashboard.jsx";
import VehicleList from "./pages/owner/VehicleList.jsx";
import OwnerBookings from "./pages/owner/OwnerBookings.jsx";
import OwnerReviews from "./pages/owner/OwnerReviews.jsx";
import BookingCalendar from "./pages/owner/BookingCalendar.jsx";
import PaymentRecords from "./pages/owner/PaymentRecords.jsx";
import ContractReleasing from "./pages/owner/ContractReleasing.jsx";
import SubscriptionManagement from "./pages/owner/SubscriptionManagement.jsx";
import TransactionHistory from "./pages/owner/TransactionHistory.jsx";
import AccountStatus from "./pages/owner/AccountStatus.jsx";
import AdminDash from "./pages/admin/AdminDashboard.jsx";
import AdminOverview from "./pages/admin/Overview.jsx";
import AdminCarInventoryOverview from "./pages/admin/CarInventoryOverview.jsx";
import AdminUserManagement from "./pages/admin/UserManagement.jsx";
import AdminSystemSettings from "./pages/admin/SystemSettings.jsx";
import AdminBookingManagement from "./pages/admin/BookingManagement.jsx";
import { clearToken, getAuthUser, initAuth, getToken } from "./lib/auth";
import VerifyEmail from "./pages/auth/VerifyEmail.jsx";
import ForgotResetPassword from "./pages/auth/ForgotResetPassword.jsx";

initAuth();

function Protected({ children, allowedRoles = [] }) {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;

  if (allowedRoles.length > 0) {
    const user = getAuthUser();
    if (!user?.role || !allowedRoles.includes(user.role)) {
      clearToken();
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/login" element={<Landing initialAuthMode="login" />} />
      <Route path="/register" element={<Landing initialAuthMode="register" />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/reset-password" element={<ForgotResetPassword />} />

      <Route
        path="/renter"
        element={
          <Protected>
            <RenterDash />
          </Protected>
        }
      >
        <Route index element={<RenterCarList />} />
        <Route path="account" element={<RenterAccount />} />
        <Route path="complaints" element={<RenterComplaints />} />
        <Route path="bookings" element={<RenterBookings mode="current" />} />
        <Route path="notifications" element={<RenterNotifications />} />
        <Route path="history" element={<RenterBookings mode="history" />} />
      </Route>
      <Route
        path="/owner"
        element={
          <Protected>
            <OwnerDash />
          </Protected>
        }
      >
        <Route index element={<OwnerHome />} />
        <Route path="bookings" element={<OwnerBookings />} />
        <Route path="reviews" element={<OwnerReviews />} />
        <Route path="vehicle-management" element={<Navigate to="/owner/vehicle-list" replace />} />
        <Route path="vehicle-list" element={<VehicleList />} />
        <Route path="booking-calendar" element={<BookingCalendar />} />
        <Route path="payment-records" element={<PaymentRecords />} />
        <Route path="contract-releasing" element={<ContractReleasing />} />
        <Route path="subscription-management" element={<SubscriptionManagement />} />
        <Route path="transaction-history" element={<TransactionHistory />} />
        <Route path="account-status" element={<AccountStatus />} />
      </Route>
      <Route
        path="/admin"
        element={
          <Protected allowedRoles={["admin"]}>
            <AdminDash />
          </Protected>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="car-inventory" element={<AdminCarInventoryOverview />} />
        <Route path="user-management" element={<AdminUserManagement />} />
        <Route path="system-settings" element={<AdminSystemSettings />} />
        <Route path="booking-management" element={<AdminBookingManagement />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
