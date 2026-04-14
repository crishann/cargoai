import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/public/LandingPage.jsx";
import RenterDash from "./pages/renter/RenterDashboard.jsx";
import OwnerDash from "./pages/owner/OwnerDashboard.jsx";
import OwnerHome from "./pages/owner/Dashboard.jsx";
import VehicleManagement from "./pages/owner/VehicleManagement.jsx";
import VehicleList from "./pages/owner/VehicleList.jsx";
import BookingCalendar from "./pages/owner/BookingCalendar.jsx";
import PaymentRecords from "./pages/owner/PaymentRecords.jsx";
import ContractReleasing from "./pages/owner/ContractReleasing.jsx";
import SubscriptionManagement from "./pages/owner/SubscriptionManagement.jsx";
import TransactionHistory from "./pages/owner/TransactionHistory.jsx";
import AccountStatus from "./pages/owner/AccountStatus.jsx";
import AdminDash from "./pages/admin/AdminDashboard.jsx";
import { initAuth, getToken } from "./lib/auth";

initAuth();

function Protected({ children }) {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/login" element={<Landing initialAuthMode="login" />} />
      <Route path="/register" element={<Landing initialAuthMode="register" />} />

      <Route
        path="/renter"
        element={
          <Protected>
            <RenterDash />
          </Protected>
        }
      />
      <Route
        path="/owner"
        element={
          <Protected>
            <OwnerDash />
          </Protected>
        }
      >
        <Route index element={<OwnerHome />} />
        <Route path="vehicle-management" element={<VehicleManagement />} />
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
          <Protected>
            <AdminDash />
          </Protected>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
