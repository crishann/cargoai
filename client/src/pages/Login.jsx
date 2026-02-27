import { useState } from "react";
import { api } from "../lib/api";
import { saveToken } from "../lib/auth";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      const res = await api.post("/auth/login", { usernameOrEmail, password });
      saveToken(res.data.token);
      const role = res.data.user?.role;

      // Role redirect (MVP)
      if (role === "owner") nav("/owner");
      else if (role === "admin") nav("/admin");
      else nav("/renter");
    } catch (e) {
      setErr(e?.response?.data?.message || "Login failed");
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-bold">Login</h1>
        <p className="text-sm text-gray-600 mt-1">Welcome back to CarGoAI</p>

        {err && (
          <div className="mt-4 rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Username or Email</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder="e.g. owner1 or owner1@mail.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
            />
          </div>

          <button className="w-full rounded-xl bg-black text-white py-2 font-semibold hover:opacity-90">
            Sign in
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-600">
          No account?{" "}
          <Link className="font-semibold text-black underline" to="/register">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}