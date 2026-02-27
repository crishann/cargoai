import { useState } from "react";
import { api } from "../lib/api";
import { saveToken } from "../lib/auth";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("renter"); // owner or renter only
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      const res = await api.post("/auth/register", { username, email, password, role });
      saveToken(res.data.token);
      nav(role === "owner" ? "/owner" : "/renter");
    } catch (e) {
      setErr(e?.response?.data?.message || "Register failed");
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-bold">Register</h1>
        <p className="text-sm text-gray-600 mt-1">Create your CarGoAI account</p>

        {err && (
          <div className="mt-4 rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Role</label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="renter">Renter</option>
              <option value="owner">Owner</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Username</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. cristian"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
            />
          </div>

          <button className="w-full rounded-xl bg-black text-white py-2 font-semibold hover:opacity-90">
            Create account
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-600">
          Already have an account?{" "}
          <Link className="font-semibold text-black underline" to="/login">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}