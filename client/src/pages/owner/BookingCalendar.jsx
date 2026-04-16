import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function shiftMonth(monthKey, delta) {
  const [year, month] = monthKey.split("-").map(Number);
  const next = new Date(year, month - 1 + delta, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

function buildCalendarDays(monthKey, bookings, blockouts) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const days = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    days.push({ key: `blank-start-${index}`, isCurrentMonth: false, dayNumber: "" });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const currentDate = new Date(year, month - 1, day);
    const dateKey = currentDate.toISOString().slice(0, 10);
    const dayBookings = bookings.filter((item) => dateKey >= item.startDate.slice(0, 10) && dateKey <= item.endDate.slice(0, 10));
    const dayBlockouts = blockouts.filter((item) => dateKey >= item.startDate.slice(0, 10) && dateKey <= item.endDate.slice(0, 10));

    days.push({
      key: dateKey,
      isCurrentMonth: true,
      dayNumber: String(day),
      bookings: dayBookings,
      blockouts: dayBlockouts,
    });
  }

  while (days.length % 7 !== 0) {
    days.push({ key: `blank-end-${days.length}`, isCurrentMonth: false, dayNumber: "" });
  }

  return days;
}

function badgeTone(status) {
  if (status === "confirmed" || status === "ongoing") return "bg-emerald-50 text-emerald-700";
  if (status === "pending") return "bg-amber-50 text-amber-700";
  if (status === "completed") return "bg-sky-50 text-sky-700";
  return "bg-slate-100 text-slate-600";
}

export default function BookingCalendar() {
  const [monthKey, setMonthKey] = useState(new Date().toISOString().slice(0, 7));
  const [bookings, setBookings] = useState([]);
  const [blockouts, setBlockouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCalendar(monthKey);
  }, [monthKey]);

  async function loadCalendar(nextMonth) {
    setLoading(true);
    try {
      const { data } = await api.get(`/owner/calendar?month=${nextMonth}`);
      setBookings(data.bookings || []);
      setBlockouts(data.blockouts || []);
      setError("");
    } catch (fetchError) {
      setError(fetchError?.response?.data?.message || "Failed to load booking calendar");
    } finally {
      setLoading(false);
    }
  }

  const calendarDays = useMemo(
    () => buildCalendarDays(monthKey, bookings, blockouts),
    [monthKey, bookings, blockouts]
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-[1.5rem] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.85)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Booking calendar</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">Availability and reservation flow</h1>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMonthKey((current) => shiftMonth(current, -1))}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Previous
              </button>
              <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">
                {formatMonthLabel(monthKey)}
              </button>
              <button
                type="button"
                onClick={() => setMonthKey((current) => shiftMonth(current, 1))}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Next
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-5 overflow-hidden rounded-[1.25rem] border border-slate-200">
            <div className="grid grid-cols-7 bg-slate-50 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {weekdayLabels.map((day) => (
                <div key={day} className="border-b border-slate-200 px-2 py-3">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {calendarDays.map((day) => (
                <div
                  key={day.key}
                  className={`min-h-[112px] border-b border-r border-slate-200 p-2 last:border-r-0 ${
                    day.isCurrentMonth ? "bg-white" : "bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm font-medium ${day.isCurrentMonth ? "text-slate-700" : "text-slate-300"}`}>
                      {day.dayNumber}
                    </span>
                    {day.bookings?.length > 0 && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[var(--cargo-blue-deep)]">
                        {day.bookings.length} booking{day.bookings.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 space-y-1">
                    {(day.bookings || []).slice(0, 2).map((item) => (
                      <div key={`booking-${item.bookingId}`} className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                        {item.vehicleLabel}
                      </div>
                    ))}
                    {(day.blockouts || []).slice(0, 1).map((item) => (
                      <div key={`blockout-${item.blockoutId}`} className="rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                        Blockout
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="rounded-[1.5rem] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.85)]">
          <p className="text-sm text-slate-500">Upcoming schedule</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Bookings and blockouts this month</h2>

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                Loading calendar...
              </div>
            ) : bookings.length === 0 ? (
              <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                No bookings found for this month.
              </div>
            ) : (
              bookings.map((item) => (
                <div key={item.bookingId} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{item.vehicleLabel}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.renterName} • {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeTone(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 rounded-[1.25rem] bg-[linear-gradient(135deg,_#f8fafc,_#eff6ff)] p-4">
            <p className="text-sm font-semibold text-slate-900">Vehicle blockouts</p>
            <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
              {blockouts.length === 0 ? (
                <p>No blockouts found for this month.</p>
              ) : (
                blockouts.map((item) => (
                  <p key={item.blockoutId}>
                    {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}: {item.vehicleLabel} ({item.reason})
                  </p>
                ))
              )}
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
