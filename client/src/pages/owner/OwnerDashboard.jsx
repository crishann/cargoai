import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearToken, getAuthUser } from "../../lib/auth";

const ownerNavItems = [
  { label: "Dashboard", to: "/owner" },
  { label: "Vehicle Management", to: "/owner/vehicle-management" },
  { label: "Vehicle List", to: "/owner/vehicle-list" },
  { label: "Booking Calendar", to: "/owner/booking-calendar" },
  { label: "Payment Records", to: "/owner/payment-records" },
  { label: "Contract Releasing", to: "/owner/contract-releasing" },
  { label: "Subscription Management", to: "/owner/subscription-management" },
  { label: "Transaction History", to: "/owner/transaction-history" },
  { label: "Account Status", to: "/owner/account-status" },
];

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const currentUserLabel = authUser?.username || "User";

  function handleLogout() {
    clearToken();
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[var(--cargo-cream)] text-[var(--cargo-ink)]">
      <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-slate-200 bg-white lg:min-h-screen lg:border-b-0 lg:border-r">
          <div className="px-5 py-5">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">CarGoAI</h1>
              <p className="mt-1 text-sm text-slate-500">{currentUserLabel} workspace</p>
            </div>

            {/* <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <input
                type="text"
                placeholder="Search"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div> */}

            <nav className="mt-5">
              <ul className="space-y-1.5">
                {ownerNavItems.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === "/owner"}
                      className={({ isActive }) =>
                        `block w-full rounded-2xl px-4 py-3 text-left text-sm transition ${
                          isActive
                            ? "border border-blue-100 bg-[linear-gradient(135deg,_#ffffff,_#eff6ff)] font-semibold text-[var(--cargo-blue-deep)] shadow-[0_10px_24px_rgba(37,99,235,0.08)]"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-6 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-100"
              >
                Logout
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.5)_0%,_transparent_100%)]">
          <div className="p-5 sm:p-6">
            <div className="min-h-[calc(100vh-140px)] rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
