const ownerStats = [
  { value: "8", label: "Listed Vehicles" },
  { value: "14", label: "Open Requests" },
  { value: "P48k", label: "Monthly Revenue" },
];

const ownerActions = [
  "Add or update vehicle details with cleaner listing cards.",
  "Review pending bookings and confirm trip schedules faster.",
  "Track earnings, records, and account health from one dashboard.",
];

export default function OwnerDashboard() {
  return (
    <div className="min-h-screen bg-[var(--cargo-cream)] px-4 py-6 text-[var(--cargo-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[2rem] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-8 lg:p-10">
          <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--cargo-blue-bright)]">
                Owner Dashboard
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Manage listings and bookings with a cleaner control panel
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                This dashboard is designed to stay easy to scan on mobile while giving you more
                room for metrics, actions, and business visibility on desktop.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-3">
              {ownerStats.map((stat) => (
                <article
                  key={stat.label}
                  className="rounded-[1.5rem] bg-[linear-gradient(135deg,_#eff6ff,_#dbeafe)] p-5"
                >
                  <p className="text-2xl font-semibold text-[var(--cargo-blue-deep)]">{stat.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {stat.label}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">
              What to focus on
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">High-impact actions</h2>

            <div className="mt-6 space-y-3">
              {ownerActions.map((item) => (
                <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                  {item}
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">
                  Owner Tools
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  Keep the workflow organized
                </h2>
              </div>
              <button
                type="button"
                className="rounded-full bg-[var(--cargo-blue-deep)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
              >
                Add vehicle
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                "Vehicle Management",
                "Booking Calendar",
                "Payment Records",
                "Subscription Status",
              ].map((tool) => (
                <div
                  key={tool}
                  className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-5"
                >
                  <h3 className="text-base font-semibold text-slate-900">{tool}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    A dedicated area for this module can expand here as you build the next pages.
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
