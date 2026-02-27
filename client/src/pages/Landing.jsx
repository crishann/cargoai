import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { saveToken } from "../lib/auth";

const renterBenefits = [
  "Find verified cars in minutes",
  "Transparent pricing with no surprises",
  "Flexible pickup options for any schedule",
];

const ownerBenefits = [
  "Turn idle cars into steady income",
  "Smart tools to manage bookings",
  "Reliable renter screening and support",
];

export default function Landing({ initialAuthMode = null }) {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [authMode, setAuthMode] = useState(initialAuthMode);
  const [role, setRole] = useState(searchParams.get("role") === "owner" ? "owner" : "renter");
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setAuthMode(initialAuthMode);
  }, [initialAuthMode]);

  useEffect(() => {
    const nextRole = searchParams.get("role");
    if (nextRole === "owner" || nextRole === "renter") setRole(nextRole);
  }, [searchParams]);

  function closeModal() {
    setErr("");
    nav("/");
  }

  async function onLogin(e) {
    e.preventDefault();
    setErr("");
    try {
      const res = await api.post("/auth/login", { usernameOrEmail, password });
      saveToken(res.data.token);
      const nextRole = res.data.user?.role;
      if (nextRole === "owner") nav("/owner");
      else if (nextRole === "admin") nav("/admin");
      else nav("/renter");
    } catch (error) {
      setErr(error?.response?.data?.message || "Login failed");
    }
  }

  async function onRegister(e) {
    e.preventDefault();
    setErr("");
    try {
      const res = await api.post("/auth/register", { username, email, password: regPassword, role });
      saveToken(res.data.token);
      nav(role === "owner" ? "/owner" : "/renter");
    } catch (error) {
      setErr(error?.response?.data?.message || "Register failed");
    }
  }

  return (
    <div className="min-h-screen bg-[var(--cargo-blue)] text-white">
      <div className="mx-auto max-w-7xl px-6 pb-16 pt-8 sm:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="text-2xl font-black tracking-tight text-white">
            CarGoAI
          </Link>
          <nav className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => nav("/login")}
              className="rounded-full border border-white/70 bg-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => nav("/register")}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[var(--cargo-blue)] hover:bg-slate-100"
            >
              Get started
            </button>
          </nav>
        </header>

        <section className="mt-14 grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <p className="inline-flex rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              Car rental marketplace
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl">
              Better trips for renters.
              <br />
              Better returns for owners.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-100 sm:text-lg">
              CarGoAI connects people who need a car with owners who want to
              monetize their vehicles. Fast booking, simple management, and a
              customer experience built for trust.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => nav("/register?role=renter")}
                className="rounded-full bg-white px-6 py-3 text-sm font-bold text-[var(--cargo-blue)] hover:bg-slate-100"
              >
                Start as renter
              </button>
              <button
                type="button"
                onClick={() => nav("/register?role=owner")}
                className="rounded-full border border-white bg-transparent px-6 py-3 text-sm font-bold text-white hover:bg-white/15"
              >
                List your car
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-white/90">
              Why customers choose CarGoAI
            </p>
            <div className="mt-5 space-y-4 text-sm text-white">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="font-semibold text-white">Renter-first booking</p>
                <p className="mt-1 text-slate-200">
                  Search quickly, compare clearly, and book with confidence.
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="font-semibold text-white">Owner growth tools</p>
                <p className="mt-1 text-slate-200">
                  Manage listings, calendars, and requests from one dashboard.
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="font-semibold text-white">Built-in trust</p>
                <p className="mt-1 text-slate-200">
                  Clear communication and a smoother rental experience end to
                  end.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-2">
          <article className="rounded-3xl border border-white/20 bg-white p-6 text-[var(--cargo-blue)]">
            <h2 className="text-xl font-bold text-[var(--cargo-blue)]">For renters</h2>
            <ul className="mt-4 space-y-2 text-sm text-[var(--cargo-gray)]">
              {renterBenefits.map((benefit) => (
                <li key={benefit} className="flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[var(--cargo-blue)]" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => nav("/register?role=renter")}
              className="mt-6 inline-block rounded-full bg-[var(--cargo-blue)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Create renter account
            </button>
          </article>

          <article className="rounded-3xl border border-white/20 bg-white p-6 text-[var(--cargo-blue)]">
            <h2 className="text-xl font-bold text-[var(--cargo-blue)]">For car owners</h2>
            <ul className="mt-4 space-y-2 text-sm text-[var(--cargo-gray)]">
              {ownerBenefits.map((benefit) => (
                <li key={benefit} className="flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[var(--cargo-blue)]" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => nav("/register?role=owner")}
              className="mt-6 inline-block rounded-full bg-[var(--cargo-blue)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Create owner account
            </button>
          </article>
        </section>
      </div>

      {authMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-[var(--cargo-blue)] shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {authMode === "login" ? "Sign in" : "Create account"}
                </h2>
                <p className="mt-1 text-sm text-[var(--cargo-gray)]">
                  {authMode === "login"
                    ? "Welcome back to CarGoAI"
                    : "Join CarGoAI as a renter or owner"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md px-2 py-1 text-xl leading-none text-[var(--cargo-gray)] hover:bg-slate-100"
                aria-label="Close modal"
              >
                x
              </button>
            </div>

            {err && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {err}
              </div>
            )}

            {authMode === "login" ? (
              <form onSubmit={onLogin} className="mt-5 space-y-4">
                <div>
                  <label className="text-sm font-medium">Username or Email</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-[#8d8d8d]/40 px-3 py-2 outline-none focus:border-[var(--cargo-blue)]"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="e.g. owner1 or owner1@mail.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Password</label>
                  <input
                    type="password"
                    className="mt-1 w-full rounded-xl border border-[#8d8d8d]/40 px-3 py-2 outline-none focus:border-[var(--cargo-blue)]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                  />
                </div>
                <button className="w-full rounded-xl bg-[var(--cargo-blue)] py-2 font-semibold text-white hover:opacity-90">
                  Sign in
                </button>
              </form>
            ) : (
              <form onSubmit={onRegister} className="mt-5 space-y-4">
                <div>
                  <label className="text-sm font-medium">Role</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-[#8d8d8d]/40 px-3 py-2 outline-none focus:border-[var(--cargo-blue)]"
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
                    className="mt-1 w-full rounded-xl border border-[#8d8d8d]/40 px-3 py-2 outline-none focus:border-[var(--cargo-blue)]"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. cristian"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-[#8d8d8d]/40 px-3 py-2 outline-none focus:border-[var(--cargo-blue)]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Password</label>
                  <input
                    type="password"
                    className="mt-1 w-full rounded-xl border border-[#8d8d8d]/40 px-3 py-2 outline-none focus:border-[var(--cargo-blue)]"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 6 characters"
                  />
                </div>
                <button className="w-full rounded-xl bg-[var(--cargo-blue)] py-2 font-semibold text-white hover:opacity-90">
                  Create account
                </button>
              </form>
            )}

            <p className="mt-4 text-sm text-[var(--cargo-gray)]">
              {authMode === "login" ? "No account yet?" : "Already have an account?"}{" "}
              <button
                type="button"
                className="font-semibold text-[var(--cargo-blue)] underline"
                onClick={() => nav(authMode === "login" ? "/register" : "/login")}
              >
                {authMode === "login" ? "Register" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
