import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import RenterDash from "./pages/RenterDash.jsx";
import OwnerDash from "./pages/OwnerDash.jsx";
import AdminDash from "./pages/AdminDash.jsx";
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

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

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