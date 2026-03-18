const adminMetrics = [
  { value: "128", label: "Active Accounts" },
  { value: "19", label: "Pending Approvals" },
  { value: "5", label: "Open Complaints" },
  { value: "99.9%", label: "Platform Uptime" },
];

const adminModules = [
  "Subscription Approval",
  "Payment Monitoring",
  "Account Management",
  "Complaint Management",
  "Role and Permissions",
  "Audit Logs",
];

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-[var(--cargo-cream)] px-4 py-6 text-[var(--cargo-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-8 text-white shadow-[0_24px_60px_rgba(15,23,42,0.22)] sm:px-8 sm:py-10 lg:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">
            Admin Dashboard
          </p>
          <div className="mt-4 grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
            <div>
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
                Oversee the platform with a calmer, clearer admin view
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Responsive layout keeps critical metrics readable on small screens and gives you
                more operational space on larger displays.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {adminMetrics.map((metric) => (
                <div key={metric.label} className="rounded-[1.5rem] bg-white/10 px-4 py-4 backdrop-blur">
                  <p className="text-2xl font-semibold text-white">{metric.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-300">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">
                  Operations
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  Admin modules ready for expansion
                </h2>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Review queue
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {adminModules.map((module) => (
                <div
                  key={module}
                  className="rounded-[1.5rem] bg-slate-50 px-4 py-5"
                >
                  <h3 className="text-base font-semibold text-slate-900">{module}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    This section can host dashboards, filters, and action tables as the system grows.
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">
              Priority Snapshot
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              What needs attention today
            </h2>

            <div className="mt-6 space-y-3">
              {[
                "Review pending subscription requests before approving owner access.",
                "Check flagged accounts and unresolved complaints.",
                "Monitor payment anomalies and recent platform events.",
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                  {item}
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
