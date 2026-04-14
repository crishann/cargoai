const adminNavItems = [
  "Dashboard",
  "Subscription Approval",
  "Payment Monitoring",
  "Account Management",
  "Complaint Management",
  "Role Permissions",
  "Audit Logs",
  "Restricted Accounts",
];

const adminStats = [
  { label: "Active Accounts", value: "128" },
  { label: "Pending Reviews", value: "19" },
  { label: "Open Complaints", value: "5" },
];

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-[#eef1f4] p-3 text-slate-900 sm:p-4">
      <div className="mx-auto max-w-[1500px] overflow-hidden rounded-[2rem] border border-slate-200 bg-[#f8f8f7] shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-200 bg-[#f3f3f1] p-4 lg:hidden">
          <MobileHeader title="CarGoAI" subtitle="Admin workspace" />
          <SearchBar />
          <MobileNav items={adminNavItems} />
        </div>

        <div className="lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="hidden border-r border-slate-200 bg-[#f3f3f1] p-4 lg:block">
            <DesktopSidebar title="CarGoAI" subtitle="Admin workspace" items={adminNavItems} />
          </aside>

          <main className="p-4 sm:p-5 lg:p-6">
            <header className="flex flex-col gap-4 rounded-[1.5rem] bg-white p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-semibold">Hey, Admin</p>
                <p className="text-xs text-slate-500">Review approvals, payments, and platform health.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600">
                  This month
                </button>
                <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white">
                  Review queue
                </button>
              </div>
            </header>

            <section className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_0.75fr]">
              <article className="rounded-[1.75rem] bg-[linear-gradient(135deg,_#f8fafc,_#fff7f2)] p-5 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Platform activity</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight">99.9%</h1>
                  </div>
                  <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                    View reports
                  </button>
                </div>

                <div className="mt-6 grid h-48 grid-cols-6 items-end gap-3 sm:h-56 sm:grid-cols-8">
                  {[28, 64, 42, 76, 36, 82, 58, 70].map((height, index) => (
                    <div key={height + index} className="flex h-full items-end">
                      <div
                        className={`w-full rounded-t-2xl ${index === 5 ? "bg-[#ff6a3d]" : "bg-slate-200"}`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[1.75rem] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">Priority</p>
                  <button className="text-sm font-medium text-slate-700">View more</button>
                </div>

                <div className="mt-5 space-y-4">
                  {adminStats.map((stat, index) => (
                    <div key={stat.label}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-slate-500">{stat.label}</p>
                        <p className="text-lg font-semibold">{stat.value}</p>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            index === 0 ? "bg-emerald-400" : index === 1 ? "bg-[#ff6a3d]" : "bg-sky-400"
                          }`}
                          style={{ width: `${index === 0 ? 88 : index === 1 ? 48 : 34}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="mt-4 rounded-[1.75rem] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-500">Oversight activity</p>
                  <h2 className="mt-1 text-xl font-semibold">Approvals and monitoring</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                    Approvals
                  </button>
                  <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                    Payments
                  </button>
                </div>
              </div>

              <div className="mt-6 h-56 rounded-[1.5rem] bg-[linear-gradient(180deg,_#ffffff,_#f8fafc)] p-4 sm:h-72">
                <svg viewBox="0 0 600 220" className="h-full w-full">
                  <path
                    d="M0 160 C50 138, 95 162, 145 134 S240 146, 295 122 S390 138, 445 110 S540 135, 600 98"
                    fill="none"
                    stroke="#ff6a6a"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M0 176 C45 180, 90 132, 150 156 S240 118, 305 148 S385 112, 450 124 S535 88, 600 118"
                    fill="none"
                    stroke="#2dd4bf"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

function MobileHeader({ title, subtitle }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-xs font-bold">
          AD
        </span>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
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
      {items.map((item, index) => (
        <button
          key={item}
          type="button"
          className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
            index === 0 ? "bg-white text-slate-900 shadow-sm" : "bg-transparent text-slate-500"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function DesktopSidebar({ title, subtitle, items }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-xs font-bold">
            AD
          </span>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <span className="text-slate-400">+</span>
      </div>

      <SearchBar />

      <nav className="mt-4">
        <ul className="space-y-1">
          {items.map((item, index) => (
            <li key={item}>
              <button
                type="button"
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  index === 0
                    ? "bg-white font-semibold text-slate-900 shadow-sm"
                    : "text-slate-500 hover:bg-white hover:text-slate-900"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-current opacity-70" />
                <span>{item}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
