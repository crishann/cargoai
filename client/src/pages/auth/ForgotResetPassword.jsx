import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";

export default function ForgotResetPassword() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const token = String(searchParams.get("token") || "").trim();

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Reset token is missing.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const { data } = await api.post("/auth/reset-password", {
        token,
        password,
      });
      setMessage(data?.message || "Password reset successful.");
      setPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || "Reset failed.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cargo-cream)] px-4 py-12 text-[var(--cargo-ink)]">
      <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <img
          src="/cargoailogo.png"
          alt="CarGoAI logo"
          className="mx-auto h-16 w-16 rounded-2xl border border-slate-200 bg-white object-cover shadow-sm"
        />
        <h1 className="mt-5 text-center text-2xl font-semibold text-slate-900">Reset password</h1>
        <p className="mt-2 text-center text-sm leading-6 text-slate-500">
          Set a new password for your CarGoAI account.
        </p>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            New password
            <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 transition focus-within:border-[var(--cargo-blue-bright)]">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full bg-transparent py-0.5 outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Confirm password
            <input
              type={showPassword ? "text" : "password"}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--cargo-blue-bright)]"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your new password"
            />
          </label>

          <button className="w-full rounded-2xl bg-[var(--cargo-blue-deep)] py-3 font-semibold text-white shadow-[0_14px_30px_rgba(29,78,216,0.22)] transition hover:opacity-95">
            Reset password
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
