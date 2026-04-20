import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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

function formatBookingDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startMonth = start.toLocaleString("en-US", { month: "long" });
  const endMonth = end.toLocaleString("en-US", { month: "long" });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (startYear === endYear && startMonth === endMonth) {
    if (startDay === endDay) {
      return `${startMonth} ${startDay}, ${startYear}`;
    }

    return `${startMonth} ${startDay}–${endDay}, ${startYear}`;
  }

  if (startYear === endYear) {
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${startYear}`;
  }

  return `${startMonth} ${startDay}, ${startYear} – ${endMonth} ${endDay}, ${endYear}`;
}

function canMarkPayment(booking) {
  return Boolean(
    booking.payment &&
      booking.payment.status !== "paid" &&
      ["confirmed", "ongoing", "completed"].includes(booking.bookingStatus)
  );
}

const tabs = [
  { key: "all", label: "All bookings" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "unpaid", label: "Unpaid" },
];

export default function OwnerBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [paymentReceiverModal, setPaymentReceiverModal] = useState({ open: false, bookingId: null, value: "" });

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

  async function markPaymentPaid(bookingId, receivedByName) {
    setPayingId(bookingId);
    try {
      await api.patch(`/owner/bookings/${bookingId}/payment-status`, {
        status: "paid",
        receivedByName: receivedByName.trim(),
      });
      setBookings((current) =>
        current.map((booking) =>
          booking.bookingId === bookingId && booking.payment
            ? {
                ...booking,
                payment: {
                  ...booking.payment,
                  status: "paid",
                  paidAt: new Date().toISOString(),
                  receivedByName: receivedByName.trim(),
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

  function openPaymentReceiverModal(bookingId) {
    setPaymentReceiverModal({ open: true, bookingId, value: "" });
  }

  async function submitPaymentReceiver() {
    if (!paymentReceiverModal.value.trim() || !paymentReceiverModal.bookingId) return;
    const bookingId = paymentReceiverModal.bookingId;
    const receivedByName = paymentReceiverModal.value.trim();
    setPaymentReceiverModal({ open: false, bookingId: null, value: "" });
    await markPaymentPaid(bookingId, receivedByName);
  }

  const counts = useMemo(
    () => ({
      all: bookings.length,
      pending: bookings.filter((booking) => booking.bookingStatus === "pending").length,
      confirmed: bookings.filter((booking) => booking.bookingStatus === "confirmed").length,
      unpaid: bookings.filter((booking) => !booking.payment || booking.payment.status !== "paid").length,
    }),
    [bookings]
  );

  const visibleBookings = useMemo(() => {
    if (activeTab === "pending") {
      return bookings.filter((booking) => booking.bookingStatus === "pending");
    }

    if (activeTab === "confirmed") {
      return bookings.filter((booking) => booking.bookingStatus === "confirmed");
    }

    if (activeTab === "unpaid") {
      return bookings.filter((booking) => !booking.payment || booking.payment.status !== "paid");
    }

    return bookings;
  }, [activeTab, bookings]);

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

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section>
        <div className="relative z-10 flex flex-wrap gap-3">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = counts[tab.key];

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative -mb-[2px] rounded-t-[1.35rem] border px-5 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "z-20 border-slate-200 border-b-white bg-white text-slate-900 shadow-none after:absolute after:inset-x-[10px] after:-bottom-[3px] after:h-[6px] after:rounded-t-full after:bg-white after:content-['']"
                    : "border-blue-100 bg-[linear-gradient(180deg,_#eef5ff,_#dbeafe)] text-[var(--cargo-blue-deep)] shadow-[0_8px_20px_rgba(37,99,235,0.08)] hover:border-blue-200 hover:bg-[linear-gradient(180deg,_#f4f8ff,_#e0edff)]"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                    isActive ? "bg-slate-100 text-slate-700" : "bg-white/90 text-[var(--cargo-blue-deep)]"
                  }`}
                >
                  {count}
                </span>
                {isActive && <span className="absolute inset-x-0 -bottom-[2px] h-[3px] bg-white" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        <div className="-mt-px rounded-b-[1.75rem] rounded-tr-[1.75rem] border border-slate-200 border-t-0 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">Owner Queue</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                {activeTab === "all" && "All booking activity"}
                {activeTab === "pending" && "Bookings waiting for your action"}
                {activeTab === "confirmed" && "Confirmed bookings ready for operations"}
                {activeTab === "unpaid" && "Bookings with unpaid or missing payment records"}
              </h2>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {loading ? (
              <div className="rounded-[1.25rem] bg-slate-50 px-4 py-8 text-sm text-slate-500">Loading bookings...</div>
            ) : visibleBookings.length === 0 ? (
              <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                No bookings found in this tab.
              </div>
            ) : (
              visibleBookings.map((booking) => (
                <article
                  key={booking.bookingId}
                  className="rounded-[1.35rem] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff,_#fbfdff)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:shadow-[0_16px_36px_rgba(15,23,42,0.07)]"
                >
                  <div className="flex flex-col gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-[1.45rem] font-semibold leading-tight tracking-tight text-slate-950">{booking.vehicleLabel}</h3>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${statusTone(booking.bookingStatus)}`}>
                          {booking.bookingStatus}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {formatBookingDateRange(booking.startDate, booking.endDate)} • Plate {booking.plateNumber} • {booking.pickupLocation} → {booking.dropoffLocation}
                      </p>
                      <p className="text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">{booking.renterName}</span> • {booking.renterEmail}
                      </p>
                    </div>

                    <div className="grid items-center gap-4 border-t border-slate-100 pt-3 sm:grid-cols-3">
                      <div>
                        <p className="text-[1.8rem] font-semibold leading-none tracking-tight text-slate-950">{formatMoney(booking.totalCost)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {booking.payment
                            ? `${booking.payment.status === "paid" ? "Paid" : "Pending"} • ${booking.payment.method}`
                            : "Not selected"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{new Date(booking.createdAt).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3 pt-0.5">
                      {canMarkPayment(booking) && (
                        <button
                          type="button"
                          disabled={payingId === booking.bookingId}
                          onClick={() => openPaymentReceiverModal(booking.bookingId)}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {payingId === booking.bookingId ? "Updating..." : "Mark Payment Paid"}
                        </button>
                      )}

                      {booking.bookingStatus === "pending" && (
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
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      {paymentReceiverModal.open
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
              <div className="w-full max-w-md rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">Payment Receiver</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Who accepted the payment?</h2>
                <p className="mt-2 text-sm text-slate-500">Enter the name that should appear on the invoice and payment record.</p>
                <input
                  type="text"
                  autoFocus
                  value={paymentReceiverModal.value}
                  onChange={(event) => setPaymentReceiverModal((current) => ({ ...current, value: event.target.value }))}
                  placeholder="Full name"
                  className="mt-5 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--cargo-blue-deep)]"
                />
                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentReceiverModal({ open: false, bookingId: null, value: "" })}
                    className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitPaymentReceiver}
                    disabled={!paymentReceiverModal.value.trim()}
                    className="rounded-full bg-[var(--cargo-blue-deep)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Confirm Payment
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
