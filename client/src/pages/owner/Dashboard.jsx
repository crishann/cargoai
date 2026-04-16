import { useNavigate } from "react-router-dom";

const latestBookings = [
  { renter: "Aly Reyes", vehicle: "Toyota Raize 2024", date: "Apr 18 - Apr 20", status: "Confirmed" },
  { renter: "Marco Diaz", vehicle: "Honda City RS", date: "Apr 21 - Apr 24", status: "Awaiting payment" },
  { renter: "Sam Lim", vehicle: "Ford Everest Titanium", date: "Apr 25 - Apr 27", status: "Pickup ready" },
];

const operationsQueue = [
  "2 vehicle submissions need photo verification before they go live.",
  "1 booking has a pickup date within the next 24 hours.",
  "3 invoices are ready to be reconciled against recent payments.",
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-[1.5rem] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.85)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Recent bookings</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">What needs owner attention now</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate("/owner/bookings")}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Open all bookings
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {latestBookings.map((booking) => (
              <div key={`${booking.renter}-${booking.vehicle}`} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{booking.vehicle}</p>
                    <p className="mt-1 text-sm text-slate-500">{booking.renter} • {booking.date}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--cargo-blue-deep)] shadow-sm">
                    {booking.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[1.5rem] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.85)]">
          <p className="text-sm text-slate-500">Operations queue</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Today&apos;s focus</h2>
          <div className="mt-5 space-y-3">
            {operationsQueue.map((item) => (
              <div key={item} className="rounded-[1.25rem] bg-[linear-gradient(135deg,_#f8fafc,_#eff6ff)] px-4 py-4 text-sm leading-6 text-slate-600">
                {item}
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
