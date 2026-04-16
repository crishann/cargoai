import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

function statusTone(status) {
  if (status === "confirmed") return "bg-emerald-50 text-emerald-700";
  if (status === "ongoing") return "bg-sky-50 text-sky-700";
  if (status === "pending") return "bg-amber-50 text-amber-700";
  if (status === "completed") return "bg-slate-100 text-slate-700";
  if (status === "cancelled") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

function formatMoney(value) {
  return `P${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function OwnerBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [payingId, setPayingId] = useState(null);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    setLoading(true);
    try {
      const { data } = await api.get("/owner/bookings");
      setBookings(data.bookings || []);
      setError("");
    } catch (fetchError) {
      setError(fetchError?.response?.data?.message || "Failed to load owner bookings");
    } finally {
      setLoading(false);
    }
  }

  async function updateBookingStatus(bookingId, status) {
    setUpdatingId(bookingId);
    try {
      await api.patch(`/owner/bookings/${bookingId}/status`, { status });
      setBookings((current) =>
        current.map((booking) => (booking.bookingId === bookingId ? { ...booking, bookingStatus: status } : booking))
      );
      setError("");
    } catch (updateError) {
      setError(updateError?.response?.data?.message || "Failed to update booking status");
    } finally {
      setUpdatingId(null);
    }
  }

  async function markPaymentPaid(bookingId) {
    setPayingId(bookingId);
    try {
      await api.patch(`/owner/bookings/${bookingId}/payment-status`, { status: "paid" });
      setBookings((current) =>
        current.map((booking) =>
          booking.bookingId === bookingId && booking.payment
            ? {
                ...booking,
                payment: {
                  ...booking.payment,
                  status: "paid",
                  paidAt: new Date().toISOString(),
                },
              }
            : booking
        )
      );
      setError("");
    } catch (updateError) {
      setError(updateError?.response?.data?.message || "Failed to update payment status");
    } finally {
      setPayingId(null);
    }
  }

  const summary = useMemo(
    () => ({
      total: bookings.length,
      pending: bookings.filter((booking) => booking.bookingStatus === "pending").length,
      confirmed: bookings.filter((booking) => booking.bookingStatus === "confirmed").length,
      paid: bookings.filter((booking) => booking.payment?.status === "paid").length,
    }),
    [bookings]
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">Booking Review</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Review renter requests and confirm schedules</h1>
        </div>
        <button
          type="button"
          onClick={loadBookings}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
        >
          Refresh
        </button>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "All bookings", value: summary.total },
          { label: "Pending", value: summary.pending },
          { label: "Confirmed", value: summary.confirmed },
          { label: "Paid", value: summary.paid },
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
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">Owner Queue</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Pending requests first, then the rest of your bookings</h2>
        </div>

        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="rounded-[1.25rem] bg-slate-50 px-4 py-8 text-sm text-slate-500">Loading bookings...</div>
          ) : bookings.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
              No bookings found yet.
            </div>
          ) : (
            bookings.map((booking) => (
              <article key={booking.bookingId} className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff,_#f8fafc)] p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
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
                    <p className="mt-3 text-sm text-slate-700">
                      <span className="font-semibold">{booking.renterName}</span> • {booking.renterEmail}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[620px]">
                    <div className="rounded-[1rem] bg-white p-3 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Request total</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{formatMoney(booking.totalCost)}</p>
                    </div>
                    <div className="rounded-[1rem] bg-white p-3 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Payment</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {booking.payment ? `${booking.payment.method} • ${booking.payment.status}` : "No payment selected"}
                      </p>
                    </div>
                    <div className="rounded-[1rem] bg-white p-3 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Requested on</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{new Date(booking.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-3">
                  {booking.payment && booking.payment.status !== "paid" && (
                    <button
                      type="button"
                      disabled={payingId === booking.bookingId}
                      onClick={() => markPaymentPaid(booking.bookingId)}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {payingId === booking.bookingId ? "Updating..." : "Mark Payment Paid"}
                    </button>
                  )}

                  {booking.bookingStatus === "pending" ? (
                    <>
                      <button
                        type="button"
                        disabled={updatingId === booking.bookingId}
                        onClick={() => updateBookingStatus(booking.bookingId, "cancelled")}
                        className="rounded-full border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingId === booking.bookingId ? "Updating..." : "Reject"}
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === booking.bookingId}
                        onClick={() => updateBookingStatus(booking.bookingId, "confirmed")}
                        className="rounded-full bg-[var(--cargo-blue-deep)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingId === booking.bookingId ? "Updating..." : "Confirm Booking"}
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">This booking is already {booking.bookingStatus}.</p>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
