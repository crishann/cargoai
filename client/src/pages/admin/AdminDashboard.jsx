import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearToken, getAuthUser } from "../../lib/auth";
import BrandLogo from "../../components/BrandLogo";

const adminNavItems = [
  { label: "Dashboard Overview", to: "/admin" },
  { label: "Car Inventory Overview", to: "/admin/car-inventory" },
  { label: "User Management", to: "/admin/user-management" },
  { label: "System Settings", to: "/admin/system-settings" },
  { label: "Complaints & Issues", to: "/admin/booking-management" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const adminLabel = authUser?.username || "Super Admin";

  function handleLogout() {
    clearToken();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#eef1f4] p-3 text-slate-900 sm:p-4">
      <div className="mx-auto max-w-[1500px] overflow-hidden rounded-[2rem] border border-slate-200 bg-[#f8f8f7] shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-200 bg-[#f3f3f1] p-4 lg:hidden">
          <MobileHeader title="CarGoAI" subtitle={`${adminLabel} admin workspace`} />
          <SearchBar />
          <MobileNav items={adminNavItems} />
        </div>

        <div className="lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="hidden border-r border-slate-200 bg-[#f3f3f1] p-4 lg:block">
            <DesktopSidebar title="CarGoAI" subtitle={`${adminLabel} admin workspace`} items={adminNavItems} />
            <div className="mt-5 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-between rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
              >
                <span>Logout</span>
                <span>{">"}</span>
              </button>
            </div>
          </aside>

          <main className="p-4 sm:p-5 lg:p-6">
            <div className="min-h-[620px] rounded-[1.75rem] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)] sm:p-5">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function MobileHeader({ title, subtitle }) {
  return (
    <div className="flex items-center justify-between">
      <BrandLogo
        label={title}
        subtitle={subtitle}
        imageClassName="h-9 w-9 rounded-xl border-slate-300"
      />
      <span className="text-slate-400">+</span>
    </div>
  );
}

function SearchBar() {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
      <input
        type="text"
        placeholder="Search"
        className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
      />
    </div>
  );
}

function MobileNav({ items }) {
  return (
    <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/admin"}
          className={({ isActive }) =>
            `whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
              isActive ? "bg-white text-slate-900 shadow-sm" : "bg-transparent text-slate-500"
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}

function DesktopSidebar({ title, subtitle, items }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <BrandLogo
          label={title}
          subtitle={subtitle}
          imageClassName="h-9 w-9 rounded-xl border-slate-300"
        />
        <span className="text-slate-400">+</span>
      </div>

      <SearchBar />

      <nav className="mt-4">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/admin"}
                className={({ isActive }) =>
                  `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    isActive
                      ? "bg-white font-semibold text-slate-900 shadow-sm"
                      : "text-slate-500 hover:bg-white hover:text-slate-900"
                  }`
                }
              >
                <span className="h-2 w-2 rounded-full bg-current opacity-70" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
