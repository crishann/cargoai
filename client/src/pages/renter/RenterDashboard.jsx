const quickActions = [
  { title: "Browse Vehicles", text: "Compare clean listings by type, budget, and availability." },
  { title: "Continue Booking", text: "Pick up where you left off and confirm your next ride." },
  { title: "Payment Methods", text: "Manage saved payment options for faster checkout." },
];

const bookings = [
  { name: "Toyota Raize", date: "Mar 24 - Mar 27", status: "Upcoming" },
  { name: "Honda City", date: "Apr 02 - Apr 05", status: "Pending" },
];

export default function RenterDashboard() {
  return (
    <div className="min-h-screen bg-[var(--cargo-cream)] px-4 py-6 text-[var(--cargo-ink)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,_#2563eb_0%,_#1d4ed8_55%,_#1e3a8a_100%)] px-5 py-8 text-white shadow-[0_24px_60px_rgba(37,99,235,0.2)] sm:px-8 sm:py-10 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">
                Renter Dashboard
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
                Plan your next ride with less friction
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-blue-50/90 sm:text-base">
                Keep your bookings, saved options, and next actions in one place with the
                same clean, easy-to-scan layout as the landing page.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <StatCard value="3" label="Active Bookings" />
              <StatCard value="2" label="Saved Vehicles" />
              <StatCard value="24/7" label="Support Access" />
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => (
            <article
              key={action.title}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]"
            >
              <h2 className="text-lg font-semibold text-slate-900">{action.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{action.text}</p>
              <button
                type="button"
                className="mt-5 rounded-full bg-[var(--cargo-blue-deep)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
              >
                Open
              </button>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">
                  Booking Timeline
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  Your current reservations
                </h2>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                View history
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking.name + booking.date}
                  className="flex flex-col gap-4 rounded-[1.5rem] bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{booking.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{booking.date}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-[var(--cargo-blue-deep)]">
                      {booking.status}
                    </span>
                    <button
                      type="button"
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      View details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">
              Suggested Next Steps
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              Keep your trip flow simple
            </h2>

            <div className="mt-6 space-y-3">
              {[
                "Review upcoming booking details before pickup.",
                "Save a preferred payment method for quicker checkout.",
                "Use support anytime if you need schedule changes.",
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

function StatCard({ value, label }) {
  return (
    <div className="rounded-[1.5rem] border border-white/15 bg-white/12 px-4 py-4 backdrop-blur">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-blue-100">{label}</p>
    </div>
  );
}
