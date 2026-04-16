import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearToken, getAuthUser } from "../../lib/auth";

export default function RenterDashboard() {
  const nav = useNavigate();
  const authUser = getAuthUser();
  const currentUserLabel = authUser?.username || "Renter";
  const currentUserEmail = authUser?.email || "No email saved";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleLogout() {
    clearToken();
    nav("/login");
  }

  const renterNavItems = [
    { label: "Cars", to: "/renter" },
    { label: "My Bookings", to: "/renter/bookings" },
    { label: "History", to: "/renter/history" },
  ];

  return (
    <div className="min-h-screen bg-[var(--cargo-cream)] text-[var(--cargo-ink)]">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
              <NavLink to="/renter" end className="flex items-center gap-3 text-[var(--cargo-ink)]">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#2563eb,_#1e3a8a)] text-sm font-semibold text-white shadow-lg shadow-blue-200/70">
                  CA
                </span>
                <div>
                  <p className="text-base font-semibold tracking-tight">CarGoAI Renter</p>
                  <p className="text-xs text-slate-500">Cars, bookings, and trip history in one place</p>
                </div>
              </NavLink>

              <nav className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {renterNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/renter"}
                    className={({ isActive }) =>
                      `rounded-full px-4 py-2 transition ${
                        isActive
                          ? "bg-[var(--cargo-blue-deep)] text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div ref={menuRef} className="relative ml-auto">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex min-w-[240px] items-center justify-between gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-slate-300 hover:bg-white"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#dbeafe,_#bfdbfe)] text-sm font-semibold text-[var(--cargo-blue-deep)]">
                    {currentUserLabel.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{currentUserLabel}</p>
                    <p className="text-xs text-slate-500">{currentUserEmail}</p>
                  </div>
                </div>
                <span className={`text-slate-400 transition ${menuOpen ? "rotate-180" : ""}`}>▾</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-3 w-[280px] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
                  <div className="border-b border-slate-100 bg-[linear-gradient(135deg,_#eff6ff,_#ffffff)] px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">
                      Signed in
                    </p>
                    <p className="mt-2 text-base font-semibold text-slate-900">{currentUserLabel}</p>
                    <p className="text-sm text-slate-500">{currentUserEmail}</p>
                  </div>

                  <div className="p-2">
                    {[
                      { label: "Cars", hint: "Browse available vehicles", onClick: () => nav("/renter") },
                      { label: "My Bookings", hint: "Check active reservations", onClick: () => nav("/renter/bookings") },
                      { label: "History", hint: "Review completed and cancelled trips", onClick: () => nav("/renter/history") },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          item.onClick();
                        }}
                        className="flex w-full items-start justify-between rounded-[1rem] px-3 py-3 text-left hover:bg-slate-50"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                          <p className="text-xs text-slate-500">{item.hint}</p>
                        </div>
                        <span className="mt-0.5 text-slate-300">›</span>
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 p-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center justify-between rounded-[1rem] px-3 py-3 text-left text-red-600 hover:bg-red-50"
                    >
                      <span className="text-sm font-semibold">Logout</span>
                      <span>{">"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
