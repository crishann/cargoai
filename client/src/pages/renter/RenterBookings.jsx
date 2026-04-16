import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

function statusTone(status) {
  if (status === "confirmed" || status === "ongoing") return "bg-emerald-50 text-emerald-700";
  if (status === "pending") return "bg-amber-50 text-amber-700";
  if (status === "completed") return "bg-sky-50 text-sky-700";
  if (status === "cancelled") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

function formatMoney(value) {
  return `P${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function RenterBookings({ mode = "current" }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payingBookingId, setPayingBookingId] = useState(null);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    setLoading(true);
    try {
      const { data } = await api.get("/renter/bookings");
      setBookings(data.bookings || []);
      setError("");
    } catch (fetchError) {
      setError(fetchError?.response?.data?.message || "Failed to load renter bookings");
    } finally {
      setLoading(false);
    }
  }

  async function selectPaymentMethod(bookingId, method) {
    setPayingBookingId(bookingId);
    try {
      const { data } = await api.post(`/renter/bookings/${bookingId}/payment`, { method });
      setBookings((current) =>
        current.map((booking) =>
          booking.bookingId === bookingId
            ? {
                ...booking,
                payment: {
                  paymentId: data.payment.paymentId,
                  method: data.payment.method,
                  amount: Number(data.payment.amount),
                  status: data.payment.status,
                  paidAt: data.payment.paidAt,
                },
              }
            : booking
        )
      );
      setError("");
    } catch (paymentError) {
      setError(paymentError?.response?.data?.message || "Failed to save payment method");
    } finally {
      setPayingBookingId(null);
    }
  }

  const filteredBookings = useMemo(() => {
    if (mode === "history") {
      return bookings.filter((item) => ["completed", "cancelled"].includes(item.bookingStatus));
    }

    return bookings.filter((item) => ["pending", "confirmed", "ongoing"].includes(item.bookingStatus));
  }, [bookings, mode]);

  const summary = useMemo(() => {
    return {
      total: filteredBookings.length,
      active: bookings.filter((item) => ["pending", "confirmed", "ongoing"].includes(item.bookingStatus)).length,
      paid: bookings.filter((item) => item.payment?.status === "paid").length,
      unpaid: bookings.filter((item) => !item.payment || item.payment.status !== "paid").length,
    };
  }, [bookings, filteredBookings]);

  const pageLabel = mode === "history" ? "Booking History" : "My Bookings";
  const pageTitle =
    mode === "history"
      ? "Review your completed and cancelled reservations"
      : "Track your active reservations, invoices, and payment status";

  return (
    <div className="space-y-6 text-[var(--cargo-ink)]">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">{pageLabel}</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{pageTitle}</h1>
        </div>
        <button type="button" onClick={loadBookings} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
          Refresh
        </button>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: mode === "history" ? "History items" : "Current bookings", value: summary.total },
          { label: "Active", value: summary.active },
          { label: "Paid", value: summary.paid },
          { label: "Unpaid", value: summary.unpaid },
        ].map((item) => (
          <article key={item.label} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</p>
          </article>
        ))}
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">
              {mode === "history" ? "Trip history" : "Reservation list"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              {mode === "history" ? "Completed and cancelled bookings" : "Current renter reservations"}
            </h2>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="rounded-[1.25rem] bg-slate-50 px-4 py-8 text-sm text-slate-500">Loading bookings...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
              {mode === "history" ? "No booking history found yet." : "No active bookings found right now."}
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <article key={booking.bookingId} className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff,_#f8fafc)] p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold text-slate-900">{booking.vehicleLabel}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(booking.bookingStatus)}`}>
                        {booking.bookingStatus}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()} • Plate {booking.plateNumber}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Pickup: {booking.pickupLocation} • Dropoff: {booking.dropoffLocation}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                    <div className="rounded-[1rem] bg-white p-3 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Total cost</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{formatMoney(booking.totalCost)}</p>
                    </div>
                    <div className="rounded-[1rem] bg-white p-3 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Payment</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {booking.payment ? `${booking.payment.method} • ${booking.payment.status}` : "Not paid"}
                      </p>
                      {!booking.payment && booking.bookingStatus === "confirmed" && mode !== "history" && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={payingBookingId === booking.bookingId}
                            onClick={() => selectPaymentMethod(booking.bookingId, "cash")}
                            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {payingBookingId === booking.bookingId ? "Saving..." : "Pay Cash"}
                          </button>
                          <button
                            type="button"
                            disabled={payingBookingId === booking.bookingId}
                            onClick={() => selectPaymentMethod(booking.bookingId, "gcash")}
                            className="rounded-full bg-[var(--cargo-blue-deep)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {payingBookingId === booking.bookingId ? "Saving..." : "Pay GCash"}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="rounded-[1rem] bg-white p-3 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Invoice</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {booking.invoice ? booking.invoice.status : "No invoice"}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
