import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { saveAuthSession } from "../../lib/auth";
import { api } from "../../lib/api";
import BrandLogo from "../../components/BrandLogo";

const highlights = [
  {
    title: "Easy Booking",
    text: "Reserve a car in a few steps with clear pricing and fast confirmation.",
    icon: CalendarIcon,
  },
  {
    title: "Verified Vehicles",
    text: "Browse trusted listings with inspection-ready details and cleaner comparisons.",
    icon: ShieldIcon,
  },
  {
    title: "24/7 Chatbot Support",
    text: "Get help anytime with guided assistance before, during, and after every trip.",
    icon: SupportIcon,
  },
];

const renterBenefits = [
  "Search by location, type, or budget",
  "See clear terms before you book",
  "Choose cars suited for work, family, or travel",
];

const ownerBenefits = [
  "Create listings with simple management tools",
  "Track bookings and availability in one place",
  "Reach more renters with a cleaner storefront",
];

export default function LandingPage({ initialAuthMode = null }) {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [authMode, setAuthMode] = useState(initialAuthMode);
  const [role, setRole] = useState(searchParams.get("role") === "owner" ? "owner" : "renter");
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [err, setErr] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [auxModal, setAuxModal] = useState("");
  const [featuredVehicles, setFeaturedVehicles] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState("");

  useEffect(() => {
    setAuthMode(initialAuthMode);
  }, [initialAuthMode]);

  useEffect(() => {
    const nextRole = searchParams.get("role");
    if (nextRole === "owner" || nextRole === "renter") setRole(nextRole);
  }, [searchParams]);

  useEffect(() => {
    async function loadFeaturedVehicles() {
      setFeaturedLoading(true);
      try {
        const { data } = await api.get("/renter/public/vehicles");
        setFeaturedVehicles(data?.vehicles || []);
        setFeaturedError("");
      } catch (error) {
        setFeaturedVehicles([]);
        setFeaturedError(error?.response?.data?.message || "Failed to load rentable vehicles");
      } finally {
        setFeaturedLoading(false);
      }
    }

    loadFeaturedVehicles();
  }, []);

  const visibleFeaturedVehicles = useMemo(() => featuredVehicles.slice(0, 3), [featuredVehicles]);

  function closeModal() {
    setErr("");
    setVerificationMessage("");
    setAuxModal("");
    nav("/");
  }

  async function onLogin(e) {
    e.preventDefault();
    setErr("");

    try {
      const { data } = await api.post("/auth/login", {
        usernameOrEmail: usernameOrEmail.trim(),
        password,
      });
      const nextUser = data.user;
      const nextRole = nextUser?.role;

      saveAuthSession({
        token: data.token || "",
        user: {
          id: nextUser?.id,
          username: nextUser?.username || nextUser?.email || "User",
          role: nextRole || "renter",
          email: nextUser?.email || "",
        },
      });

      if (nextRole === "owner") nav("/owner");
      else if (nextRole === "admin") nav("/admin");
      else nav("/renter");
    } catch (error) {
      const responseData = error?.response?.data;
      if (responseData?.requiresEmailVerification && responseData?.email) {
        setVerificationEmail(responseData.email);
      }
      setErr(responseData?.message || error?.message || "Login failed");
    }
  }

  async function onRegister(e) {
    e.preventDefault();
    setErr("");

    try {
      const { data } = await api.post("/auth/register", {
        username: String(username).trim(),
        email: String(email).trim().toLowerCase(),
        password: regPassword,
        role,
      });
      setVerificationEmail(data?.email || String(email).trim().toLowerCase());
      setVerificationMessage(data?.message || "Check your email to verify your account.");
      setAuthMode("login");
      setPassword("");
      setRegPassword("");
    } catch (error) {
      setErr(error?.response?.data?.message || error?.message || "Register failed");
    }
  }

  async function onResendVerification() {
    setErr("");
    setVerificationMessage("");

    if (!verificationEmail.trim()) {
      setErr("Enter your email to resend the verification link.");
      return;
    }

    try {
      const { data } = await api.post("/auth/resend-verification", {
        email: verificationEmail.trim().toLowerCase(),
      });
      setVerificationMessage(data?.message || "Verification email sent.");
    } catch (error) {
      setErr(error?.response?.data?.message || error?.message || "Could not resend verification email");
    }
  }

  async function onForgotPassword() {
    setErr("");
    setVerificationMessage("");

    if (!forgotPasswordEmail.trim()) {
      setErr("Enter your email to receive a reset link.");
      return;
    }

    try {
      const { data } = await api.post("/auth/forgot-password", {
        email: forgotPasswordEmail.trim().toLowerCase(),
      });
      setVerificationMessage(data?.message || "If that email exists, a reset link has been sent.");
      setAuxModal("");
    } catch (error) {
      setErr(error?.response?.data?.message || error?.message || "Could not send password reset email");
    }
  }

  return (
    <div className="min-h-screen bg-[var(--cargo-cream)] text-[var(--cargo-ink)]">
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,_#2563eb_0%,_#1d4ed8_50%,_#1e40af_100%)] text-white">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_center,_rgba(255,255,255,0.22)_1px,_transparent_1px)] [background-size:22px_22px]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.18)_100%)]" />

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-8 sm:pb-24 sm:pt-8 lg:px-12">
          <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <Link to="/" className="flex items-center gap-3 text-white">
              <BrandLogo
                label="CarGoAI"
                subtitle="Clean rentals, simple booking"
                imageClassName="border-white/70 bg-white"
                className="text-white"
              />
            </Link>

            <nav className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => nav("/login")}
                className="rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/18"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => nav("/register")}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[var(--cargo-blue-deep)] shadow-lg shadow-blue-950/15 hover:bg-blue-50"
              >
                Get started
              </button>
            </nav>
          </header>

          <div className="mt-12 grid gap-8 sm:mt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="max-w-3xl">
              {/* <span className="inline-flex rounded-full border border-white/20 bg-white/12 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-blue-50 backdrop-blur">
                Premium Car Rental Service
              </span> */}
              <h1 className="mt-6 text-3xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                Find your perfect ride
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-blue-50/92 sm:text-lg">
                A cleaner way to browse, compare, and reserve verified vehicles.
                Built to feel fast, easy to scan, and reassuring from the first click.
              </p>

              <div className="mt-8 rounded-[2rem] bg-white p-3 text-[var(--cargo-ink)] shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
                <div className="grid gap-3 lg:grid-cols-[1.5fr_0.8fr_0.8fr_auto]">
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <SearchIcon className="h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by location, car type, or brand"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                    />
                  </label>

                  <select className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 outline-none">
                    <option>Any type</option>
                    <option>Sedan</option>
                    <option>SUV</option>
                    <option>Van</option>
                  </select>

                  <select className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 outline-none">
                    <option>Any budget</option>
                    <option>Under P2,000</option>
                    <option>P2,000 - P3,500</option>
                    <option>Above P3,500</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => nav("/register?role=renter")}
                    className="rounded-2xl bg-[var(--cargo-blue-bright)] px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-[var(--cargo-blue-deep)]"
                  >
                    Search Cars
                  </button>
                </div>
              </div>
{/* 
              <div className="mt-8 grid gap-3 sm:grid-cols-3 sm:gap-4">
                <Stat label="Verified vehicles" value="2.5k+" />
                <Stat label="Cities served" value="60+" />
                <Stat label="Chabot Support coverage" value="24/7" />
              </div> */}
            </div>

            <div className="rounded-[2rem] border border-white/18 bg-white/12 p-6 shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur-md">
              <div className="rounded-[1.75rem] bg-white p-6 text-[var(--cargo-ink)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--cargo-blue-bright)]">
                      Quick Match
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                      Ready for business, weekends, or family trips
                    </h2>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[var(--cargo-blue-bright)]">
                    Smooth booking
                  </span>
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    "Easy comparison cards with clearer details",
                    "Consistent support for renters and owners",
                    "Cleaner dashboard flow after sign in",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                    >
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--cargo-blue-bright)]" />
                      <p className="text-sm leading-6 text-slate-600">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => nav("/register?role=renter")}
                    className="rounded-2xl bg-[var(--cargo-blue-deep)] px-4 py-3 text-sm font-semibold text-white hover:opacity-95"
                  >
                    Book as renter
                  </button>
                  <button
                    type="button"
                    onClick={() => nav("/register?role=owner")}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    List your car
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-8 sm:py-16 lg:px-12">
        <section className="grid gap-5 md:grid-cols-3">
          {highlights.map(({ title, text, icon: Icon }) => (
            <article
              key={title}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition hover:-translate-y-1"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[var(--cargo-blue-bright)]">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </article>
          ))}
        </section>

        <section className="mt-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">
                Featured Vehicles
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">
                Clean cards. Easy to compare.
              </h2>
            </div>
            <button
              type="button"
              onClick={() => nav("/register?role=renter")}
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Browse all cars
            </button>
          </div>

          {featuredError ? (
            <div className="mt-8 rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {featuredError}
            </div>
          ) : null}

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {featuredLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <article
                  key={`loading-${index}`}
                  className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]"
                >
                  <div className="h-44 animate-pulse bg-slate-100" />
                  <div className="space-y-3 p-6">
                    <div className="h-5 w-2/3 animate-pulse rounded bg-slate-100" />
                    <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
                    <div className="flex items-center justify-between pt-2">
                      <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
                      <div className="h-9 w-24 animate-pulse rounded-full bg-slate-100" />
                    </div>
                  </div>
                </article>
              ))
            ) : visibleFeaturedVehicles.length > 0 ? (
              visibleFeaturedVehicles.map((vehicle, index) => (
              <article
                key={vehicle.vehicleId}
                className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]"
              >
                <div
                  className={`h-44 ${
                    index === 0
                      ? "bg-[linear-gradient(135deg,_#dbeafe,_#93c5fd)]"
                      : index === 1
                        ? "bg-[linear-gradient(135deg,_#e0f2fe,_#bae6fd)]"
                        : "bg-[linear-gradient(135deg,_#ede9fe,_#c4b5fd)]"
                  }`}
                >
                  {vehicle.imageUrl ? (
                    <img
                      src={`http://localhost:5000${vehicle.imageUrl}`}
                      alt={vehicle.title}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  <div className="flex h-full items-end p-5">
                    <div className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-slate-700 backdrop-blur">
                      {index === 0 ? "Popular" : index === 1 ? "Ready to book" : "Available now"}
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">{vehicle.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {vehicle.year}
                        {vehicle.seatCapacity ? ` • ${vehicle.seatCapacity} seats` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {vehicle.status}
                    </span>
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--cargo-blue-deep)]">
                      From P{Number(vehicle.ratePerDay || 0).toLocaleString()}/day
                    </p>
                    <button
                      type="button"
                      onClick={() => nav("/register?role=renter")}
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Reserve
                    </button>
                  </div>
                </div>
              </article>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500 lg:col-span-3">
                No rentable vehicles are available right now.
              </div>
            )}
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-2">
          <InfoCard
            eyebrow="For renters"
            title="Book faster with a page that is easier to scan"
            points={renterBenefits}
            actionLabel="Create renter account"
            onAction={() => nav("/register?role=renter")}
          />
          <InfoCard
            eyebrow="For owners"
            title="Show your listings in a cleaner and more polished way"
            points={ownerBenefits}
            actionLabel="Create owner account"
            onAction={() => nav("/register?role=owner")}
          />
        </section>
      </main>

      {authMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="my-6 w-full max-w-md rounded-[1.75rem] bg-white p-5 text-[var(--cargo-ink)] shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {authMode === "login" ? "Sign in" : "Create account"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {authMode === "login"
                    ? "Welcome back to CarGoAI"
                    : "Join CarGoAI as a renter or owner"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl px-3 py-1.5 text-lg text-slate-400 hover:bg-slate-100"
                aria-label="Close modal"
              >
                x
              </button>
            </div>

            {err && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {err}
              </div>
            )}

            {verificationMessage && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {verificationMessage}
              </div>
            )}

            {authMode === "login" ? (
              <form onSubmit={onLogin} className="mt-5 space-y-4">
                <Field label="Username or Email">
                  <input
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--cargo-blue-bright)]"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="username or you@email.com"
                  />
                </Field>
                <Field label="Password">
                  <PasswordField
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    showPassword={showLoginPassword}
                    onTogglePassword={() => setShowLoginPassword((current) => !current)}
                    placeholder="Your password"
                  />
                </Field>
                <button className="w-full rounded-2xl bg-[var(--cargo-blue-deep)] py-3 font-semibold text-white shadow-[0_14px_30px_rgba(29,78,216,0.22)] transition hover:opacity-95">
                  Sign in
                </button>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <button
                    type="button"
                    className="font-medium text-slate-500 transition hover:text-[var(--cargo-blue-deep)]"
                    onClick={() => {
                      setForgotPasswordEmail(usernameOrEmail.includes("@") ? usernameOrEmail : "");
                      setAuxModal("forgot-password");
                      setErr("");
                    }}
                  >
                    Forgot password?
                  </button>
                  <button
                    type="button"
                    className="font-medium text-slate-500 transition hover:text-[var(--cargo-blue-deep)]"
                    onClick={() => {
                      setAuxModal("resend-verification");
                      setErr("");
                    }}
                  >
                    Resend verification email
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={onRegister} className="mt-5 space-y-4">
                <Field label="Role">
                  <RoleSelector value={role} onChange={setRole} />
                </Field>
                <Field label="Username">
                  <input
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--cargo-blue-bright)]"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. cristian"
                  />
                </Field>
                <Field label="Email">
                  <input
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--cargo-blue-bright)]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                  />
                </Field>
                <Field label="Password">
                  <PasswordField
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    showPassword={showRegisterPassword}
                    onTogglePassword={() => setShowRegisterPassword((current) => !current)}
                    placeholder="Min 6 characters"
                  />
                </Field>
                <button className="w-full rounded-2xl bg-[var(--cargo-blue-deep)] py-3 font-semibold text-white shadow-[0_14px_30px_rgba(29,78,216,0.22)] transition hover:opacity-95">
                  Create account
                </button>
              </form>
            )}

            <p className="mt-5 text-sm text-slate-500">
              {authMode === "login" ? "No account yet?" : "Already have an account?"}{" "}
              <button
                type="button"
                className="font-semibold text-[var(--cargo-blue-deep)] underline"
                onClick={() => nav(authMode === "login" ? "/register" : "/login")}
              >
                {authMode === "login" ? "Register" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      )}

      {authMode === "login" && auxModal ? (
        <AuxiliaryAuthModal
          title={auxModal === "resend-verification" ? "Resend verification email" : "Forgot password"}
          description={
            auxModal === "resend-verification"
              ? "Enter the email you used when creating the account. We will send a fresh verification link."
              : "Enter your account email and we will send a password reset link."
          }
          value={auxModal === "resend-verification" ? verificationEmail : forgotPasswordEmail}
          onChange={(nextValue) =>
            auxModal === "resend-verification"
              ? setVerificationEmail(nextValue)
              : setForgotPasswordEmail(nextValue)
          }
          onClose={() => setAuxModal("")}
          onSubmit={auxModal === "resend-verification" ? onResendVerification : onForgotPassword}
          submitLabel={auxModal === "resend-verification" ? "Send verification link" : "Send reset link"}
        />
      ) : null}
    </div>
  );
}

function AuxiliaryAuthModal({
  title,
  description,
  value,
  onChange,
  onClose,
  onSubmit,
  submitLabel,
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-1.5 text-lg text-slate-400 hover:bg-slate-100"
            aria-label="Close dialog"
          >
            x
          </button>
        </div>

        <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[var(--cargo-blue-deep)] shadow-sm">
              <MailIcon className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium text-slate-600">Email address</p>
          </div>
          <input
            type="email"
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-[var(--cargo-blue-bright)]"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="you@email.com"
          />
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="flex-1 rounded-2xl bg-[var(--cargo-blue-deep)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(29,78,216,0.22)] transition hover:opacity-95"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  showPassword,
  onTogglePassword,
  placeholder,
}) {
  return (
    <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 transition focus-within:border-[var(--cargo-blue-bright)]">
      <input
        type={showPassword ? "text" : "password"}
        className="w-full bg-transparent py-0.5 outline-none"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={onTogglePassword}
        className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? "Hide" : "Show"}
      </button>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="rounded-2xl border border-white/16 bg-white/10 px-4 py-3 backdrop-blur">
      <p className="text-lg font-semibold text-white">{value}</p>
      <p className="text-xs uppercase tracking-[0.18em] text-blue-100">{label}</p>
    </div>
  );
}

function InfoCard({ eyebrow, title, points, actionLabel, onAction }) {
  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-2xl font-semibold text-slate-900">{title}</h3>
      <div className="mt-6 space-y-3">
        {points.map((point) => (
          <div key={point} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--cargo-blue-bright)]" />
            <p className="text-sm leading-6 text-slate-600">{point}</p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onAction}
        className="mt-6 rounded-full bg-[var(--cargo-blue-deep)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95"
      >
        {actionLabel}
      </button>
    </article>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

function MailIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <path d="m5.5 7 6.5 5 6.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RoleSelector({ value, onChange }) {
  const roles = [
    { value: "renter", label: "Renter" },
    { value: "owner", label: "Owner" },
  ];

  return (
    <div className="mt-1 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
      {roles.map((roleOption) => {
        const isActive = value === roleOption.value;

        return (
          <button
            key={roleOption.value}
            type="button"
            onClick={() => onChange(roleOption.value)}
            className={`rounded-[1rem] px-4 py-3 text-sm font-semibold transition ${
              isActive
                ? "bg-[var(--cargo-blue-deep)] text-white shadow-sm"
                : "bg-transparent text-slate-600 hover:bg-white/80"
            }`}
          >
            {roleOption.label}
          </button>
        );
      })}
    </div>
  );
}

function SearchIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16 21 21" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 3.5 18.5 6v5.8c0 4.2-2.6 7.3-6.5 8.7-3.9-1.4-6.5-4.5-6.5-8.7V6L12 3.5Z" />
      <path d="m9.5 11.8 1.7 1.7 3.5-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SupportIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4.5 12a7.5 7.5 0 1 1 15 0" />
      <path d="M6 15.5h1.5a2 2 0 0 0 2-2V12a2 2 0 0 0-2-2H6a1.5 1.5 0 0 0-1.5 1.5V14A1.5 1.5 0 0 0 6 15.5Zm12 0h-1.5a2 2 0 0 1-2-2V12a2 2 0 0 1 2-2H18a1.5 1.5 0 0 1 1.5 1.5V14a1.5 1.5 0 0 1-1.5 1.5Z" />
      <path d="M12 19.5c1.3 0 2.5-.4 3.5-1.2" strokeLinecap="round" />
    </svg>
  );
}
