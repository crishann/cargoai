import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/public/LandingPage.jsx";
import RenterDash from "./pages/renter/RenterDashboard.jsx";
import OwnerDash from "./pages/owner/OwnerDashboard.jsx";
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
      />
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
