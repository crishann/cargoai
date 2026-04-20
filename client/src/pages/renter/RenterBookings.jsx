import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";

function formatMoney(value) {
  return `P${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function parseDateOnlyParts(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth() + 1,
    day: parsed.getDate(),
  };
}

function formatDate(value) {
  const parts = parseDateOnlyParts(value);
  if (!parts) return "Not available";

  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getDateOnlyValue(value) {
  const parts = parseDateOnlyParts(value);
  if (!parts) return "";
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function getRentalDayCount(startDate, endDate) {
  const startValue = getDateOnlyValue(startDate);
  const endValue = getDateOnlyValue(endDate);
  if (!startValue || !endValue) return 0;

  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T00:00:00`);
  const diffDays = Math.round((end - start) / 86400000) + 1;
  return diffDays > 0 ? diffDays : 0;
}

function getRentalDays(startDate, endDate) {
  const dayCount = getRentalDayCount(startDate, endDate);
  if (dayCount <= 1) return "1 day rental";
  return `${dayCount} days rental`;
}

function getPaymentMethodLabel(method) {
  if (String(method || "").toLowerCase() === "cash") return "Cash";
  if (String(method || "").toLowerCase() === "gcash") return "GCash";
  return "Payment pending";
}

function getPaymentHelpText(booking) {
  const method = String(booking.payment?.method || "").toLowerCase();
  const status = String(booking.payment?.status || "pending").toLowerCase();

  if (status === "paid") {
    return booking.payment?.paidAt ? `Paid ${formatDate(booking.payment.paidAt)}` : "Payment completed";
  }

  if (method === "cash") {
    return booking.bookingStatus === "confirmed"
      ? "Pay in person during pickup."
      : "Cash payment will be collected in person once the booking is confirmed.";
  }

  if (method === "gcash") {
    return booking.bookingStatus === "confirmed"
      ? "GCash selected for this booking."
      : "Waiting for owner confirmation before payment is finalized.";
  }

  return "Needs attention";
}

function statusBadge(status) {
  if (status === "confirmed" || status === "ongoing") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  if (status === "pending") return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
  if (status === "completed") return "bg-sky-50 text-sky-700 ring-1 ring-sky-100";
  if (status === "cancelled") return "bg-rose-50 text-rose-700 ring-1 ring-rose-100";
  return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
}

function paymentBadge(payment) {
  if (payment?.status === "paid") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  return "bg-orange-50 text-orange-700 ring-1 ring-orange-100";
}

function invoiceBadge(invoice) {
  if (invoice) return "bg-sky-50 text-sky-700 ring-1 ring-sky-100";
  return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
}

const CURRENT_STATUS_OPTIONS = ["pending", "confirmed", "ongoing", "cancelled"];
const HISTORY_STATUS_OPTIONS = ["completed", "cancelled"];
const PAYMENT_FILTER_OPTIONS = ["paid", "pending", "cancelled", "missing"];

function Pill({ children, tone }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${tone}`}>
      {children}
    </span>
  );
}

function BookingRow({
  booking,
  mode,
  viewingBookingId,
  downloadingInvoiceId,
  cancellingBookingId,
  onCancel,
  onRebook,
  onReview,
  onViewDetails,
  onDownloadInvoice,
}) {
  const paymentIsPaid = booking.payment?.status === "paid";
  const canCancel =
    mode !== "history" &&
    ["pending", "confirmed"].includes(booking.bookingStatus) &&
    new Date(booking.startDate).getTime() > Date.now();
  const canRebook = mode === "history" && ["completed", "cancelled"].includes(booking.bookingStatus);

  return (
    <article className="border-t border-slate-200 px-5 py-5 transition hover:bg-slate-50/70 sm:px-6">
      <div className="hidden grid-cols-[1.9fr_1fr_0.95fr_0.95fr_0.9fr_0.95fr] gap-4 lg:grid lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold text-slate-950">{booking.vehicleLabel}</h3>
            <Pill tone={statusBadge(booking.bookingStatus)}>{booking.bookingStatus}</Pill>
          </div>
          <div className="mt-2 space-y-1.5 text-sm text-slate-600">
            <p className="font-medium text-slate-500">Plate {booking.plateNumber}</p>
            <p>
              <span className="font-medium text-slate-900">Pickup:</span> {booking.pickupLocation}
            </p>
            <p>
              <span className="font-medium text-slate-900">Dropoff:</span> {booking.dropoffLocation}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">{formatDate(booking.startDate)}</p>
          <p className="mt-1 text-sm text-slate-500">to {formatDate(booking.endDate)}</p>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">{getRentalDays(booking.startDate, booking.endDate)}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Amount</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{formatMoney(booking.totalCost)}</p>
          <p className="mt-1 text-xs text-slate-500">Booked {formatDate(booking.createdAt || booking.startDate)}</p>
        </div>

        <div>
          <Pill tone={paymentBadge(booking.payment)}>{paymentIsPaid ? "Paid" : "Unpaid"}</Pill>
          <p className="mt-2 text-sm font-semibold text-slate-900">{getPaymentMethodLabel(booking.payment?.method)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {getPaymentHelpText(booking)}
          </p>
        </div>

        <div>
          <Pill tone={invoiceBadge(booking.invoice)}>{booking.invoice ? "Issued" : "Not issued"}</Pill>
          <p className="mt-2 text-sm font-semibold text-slate-900">{booking.invoice ? formatMoney(booking.invoice.amount) : "No invoice"}</p>
          <p className="mt-1 text-xs text-slate-500">
            {booking.invoice ? `Status: ${booking.invoice.status}` : "Invoice not available yet"}
          </p>
        </div>

        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={() => onViewDetails(booking.bookingId)}
            className="rounded-full border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {viewingBookingId === booking.bookingId ? "Loading..." : "View Details"}
          </button>
          <button
            type="button"
            disabled={!booking.invoice}
            onClick={() => onDownloadInvoice(booking.bookingId)}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {downloadingInvoiceId === booking.bookingId ? "Preparing..." : "Download Invoice"}
          </button>
          {mode === "history" && booking.bookingStatus === "completed" && !booking.review ? (
            <button
              type="button"
              onClick={() => onReview(booking)}
              className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Leave Review
            </button>
          ) : null}
          {canCancel ? (
            <button
              type="button"
              disabled={cancellingBookingId === booking.bookingId}
              onClick={() => onCancel(booking)}
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancellingBookingId === booking.bookingId ? "Cancelling..." : "Cancel Booking"}
            </button>
          ) : null}
          {canRebook ? (
            <button
              type="button"
              onClick={() => onRebook(booking)}
              className="rounded-full border border-[var(--cargo-blue-bright)] bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[var(--cargo-blue-deep)] transition hover:bg-blue-100"
            >
              Rebook
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 lg:hidden">
        <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-950">{booking.vehicleLabel}</h3>
            <Pill tone={statusBadge(booking.bookingStatus)}>{booking.bookingStatus}</Pill>
          </div>

          <div className="mt-3 space-y-1.5 text-sm text-slate-600">
            <p className="font-medium text-slate-500">Plate {booking.plateNumber}</p>
            <p><span className="font-medium text-slate-900">Pickup:</span> {booking.pickupLocation}</p>
            <p><span className="font-medium text-slate-900">Dropoff:</span> {booking.dropoffLocation}</p>
            <p><span className="font-medium text-slate-900">Schedule:</span> {formatDate(booking.startDate)} to {formatDate(booking.endDate)}</p>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">{getRentalDays(booking.startDate, booking.endDate)}</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Amount</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{formatMoney(booking.totalCost)}</p>
              <p className="mt-1 text-xs text-slate-500">Booked {formatDate(booking.createdAt || booking.startDate)}</p>
            </div>
            <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
              <Pill tone={paymentBadge(booking.payment)}>{paymentIsPaid ? "Paid" : "Unpaid"}</Pill>
              <p className="mt-2 text-sm font-semibold text-slate-900">{getPaymentMethodLabel(booking.payment?.method)}</p>
              <p className="mt-1 text-xs text-slate-500">
                {getPaymentHelpText(booking)}
              </p>
            </div>
            <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
              <Pill tone={invoiceBadge(booking.invoice)}>{booking.invoice ? "Issued" : "Not issued"}</Pill>
              <p className="mt-2 text-sm font-semibold text-slate-900">{booking.invoice ? formatMoney(booking.invoice.amount) : "No invoice"}</p>
              <p className="mt-1 text-xs text-slate-500">{booking.invoice ? `Status: ${booking.invoice.status}` : "Invoice not available yet"}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onViewDetails(booking.bookingId)}
              className="rounded-full border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {viewingBookingId === booking.bookingId ? "Loading..." : "View Details"}
            </button>
            <button
              type="button"
              disabled={!booking.invoice}
              onClick={() => onDownloadInvoice(booking.bookingId)}
              className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {downloadingInvoiceId === booking.bookingId ? "Preparing..." : "Download Invoice"}
            </button>
            {mode === "history" && booking.bookingStatus === "completed" && !booking.review ? (
              <button
                type="button"
                onClick={() => onReview(booking)}
                className="rounded-full bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Leave Review
              </button>
            ) : null}
            {canCancel ? (
              <button
                type="button"
                disabled={cancellingBookingId === booking.bookingId}
                onClick={() => onCancel(booking)}
                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancellingBookingId === booking.bookingId ? "Cancelling..." : "Cancel Booking"}
              </button>
            ) : null}
            {canRebook ? (
              <button
                type="button"
                onClick={() => onRebook(booking)}
                className="rounded-full border border-[var(--cargo-blue-bright)] bg-blue-50 px-3 py-2 text-sm font-semibold text-[var(--cargo-blue-deep)] transition hover:bg-blue-100"
              >
                Rebook
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {mode === "history" && booking.bookingStatus === "completed" && booking.review ? (
        <div className="mt-4 rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-sm font-semibold text-slate-900">Your review</p>
          <p className="mt-2 text-sm text-slate-600">
            Car: {booking.review.carRating}/5 • Experience: {booking.review.experienceRating}/5
          </p>
          <p className="mt-2 text-sm text-slate-600">{booking.review.reviewText || "No written feedback."}</p>
          {booking.review.ownerResponse ? (
            <div className="mt-3 rounded-[0.9rem] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Owner response:</span> {booking.review.ownerResponse}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export default function RenterBookings({ mode = "current" }) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewingBookingId, setViewingBookingId] = useState(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
  const [showingInvoiceId, setShowingInvoiceId] = useState(null);
  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [invoicePreview, setInvoicePreview] = useState("");
  const [reviewingBooking, setReviewingBooking] = useState(null);
  const [carRating, setCarRating] = useState(5);
  const [experienceRating, setExperienceRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    setStatusFilter("all");
    setPaymentFilter("all");
    setSearchTerm("");
    setSortBy("latest");
  }, [mode]);

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

  async function openBookingDetails(bookingId) {
    setViewingBookingId(bookingId);
    try {
      const { data } = await api.get(`/renter/bookings/${bookingId}`);
      setSelectedBooking(data.booking || null);
      setInvoicePreview("");
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to load booking details");
    } finally {
      setViewingBookingId(null);
    }
  }

  async function downloadInvoice(bookingId) {
    setDownloadingInvoiceId(bookingId);
    try {
      const response = await api.get(`/renter/bookings/${bookingId}/invoice`, {
        responseType: "blob",
      });
      const contentDisposition = response.headers["content-disposition"] || "";
      const fileNameMatch = contentDisposition.match(/filename="([^"]+)"/i);
      const fileName = fileNameMatch?.[1] || `invoice-${bookingId}.txt`;
      const blobUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to download invoice");
    } finally {
      setDownloadingInvoiceId(null);
    }
  }

  async function showInvoice(bookingId) {
    setShowingInvoiceId(bookingId);
    try {
      const response = await api.get(`/renter/bookings/${bookingId}/invoice`, {
        responseType: "text",
      });
      setInvoicePreview(typeof response.data === "string" ? response.data : "");
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to load invoice");
    } finally {
      setShowingInvoiceId(null);
    }
  }

  async function cancelBooking(booking) {
    const confirmed = window.confirm(`Cancel booking for ${booking.vehicleLabel}?`);
    if (!confirmed) return;

    setCancellingBookingId(booking.bookingId);
    try {
      await api.patch(`/renter/bookings/${booking.bookingId}/cancel`);
      setBookings((current) =>
        current.map((item) =>
          item.bookingId === booking.bookingId
            ? {
                ...item,
                bookingStatus: "cancelled",
                payment: item.payment && item.payment.status !== "paid"
                  ? { ...item.payment, status: "cancelled", paidAt: null }
                  : item.payment,
                invoice: item.invoice ? { ...item.invoice, status: "cancelled" } : item.invoice,
              }
            : item
        )
      );
      setSelectedBooking((current) =>
        current?.bookingId === booking.bookingId
          ? {
              ...current,
              bookingStatus: "cancelled",
              payment: current.payment && current.payment.status !== "paid"
                ? { ...current.payment, status: "cancelled", paidAt: null }
                : current.payment,
              invoice: current.invoice ? { ...current.invoice, status: "cancelled" } : current.invoice,
            }
          : current
      );
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to cancel booking");
    } finally {
      setCancellingBookingId(null);
    }
  }

  function rebook(booking) {
    navigate("/renter", {
      state: {
        rebookBooking: {
          vehicleId: booking.vehicleId,
          startDate: booking.startDate,
          endDate: booking.endDate,
          pickupLocation: booking.pickupLocation,
          dropoffLocation: booking.dropoffLocation,
          paymentMethod: booking.payment?.method || "gcash",
        },
      },
    });
  }

  async function submitReview() {
    if (!reviewingBooking) return;

    try {
      const { data } = await api.post(`/renter/bookings/${reviewingBooking.bookingId}/review`, {
        carRating,
        experienceRating,
        reviewText,
      });

      setBookings((current) =>
        current.map((booking) =>
          booking.bookingId === reviewingBooking.bookingId
            ? {
                ...booking,
                review: {
                  reviewId: data.review.reviewId,
                  carRating,
                  experienceRating,
                  reviewText,
                  ownerResponse: "",
                  ownerRespondedAt: null,
                },
              }
            : booking
        )
      );
      setReviewingBooking(null);
      setReviewText("");
      setCarRating(5);
      setExperienceRating(5);
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to submit review");
    }
  }

  const visibleBookings = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const modeFiltered =
      mode === "history"
        ? bookings.filter((item) => ["completed", "cancelled"].includes(item.bookingStatus))
        : bookings.filter((item) => ["pending", "confirmed", "ongoing", "cancelled"].includes(item.bookingStatus));

    const searched = modeFiltered.filter((item) => {
      const haystack = [
        item.vehicleLabel,
        item.plateNumber,
        item.pickupLocation,
        item.dropoffLocation,
        item.bookingId ? `bk-${String(item.bookingId).padStart(6, "0")}` : "",
        item.bookingStatus,
        item.payment?.method || "",
        item.payment?.status || "",
        item.invoice?.status || "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      const matchesStatus = statusFilter === "all" || item.bookingStatus === statusFilter;
      const paymentState = item.payment
        ? item.payment.status === "paid"
          ? "paid"
          : item.payment.status === "cancelled"
            ? "cancelled"
            : "pending"
        : "missing";
      const matchesPayment = paymentFilter === "all" || paymentState === paymentFilter;
      return matchesSearch && matchesStatus && matchesPayment;
    });

    return [...searched].sort((a, b) => {
      if (sortBy === "pickup") {
        return new Date(a.startDate) - new Date(b.startDate);
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [bookings, mode, searchTerm, statusFilter, paymentFilter, sortBy]);

  const allowedStatusOptions = mode === "history" ? HISTORY_STATUS_OPTIONS : CURRENT_STATUS_OPTIONS;

  return (
    <div className="space-y-4 text-[var(--cargo-ink)] sm:space-y-5">
      {/* <section className="rounded-[1.4rem] border border-slate-200 bg-[linear-gradient(135deg,_#f8fbff,_#ffffff_58%,_#eef5ff)] px-5 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--cargo-blue-bright)]">
          {mode === "history" ? "Booking history" : "My bookings"}
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              {mode === "history" ? "Booking archive" : "Reservation history"}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              {mode === "history"
                ? "Search past trips, review payment records, and revisit completed or cancelled bookings."
                : "Track active reservations, pending payments, and upcoming pickup schedules."}
            </p>
          </div>
          <button
            type="button"
            onClick={loadBookings}
            className="rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-[var(--cargo-blue-deep)] transition hover:bg-blue-50"
          >
            Refresh
          </button>
        </div>
      </section> */}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-[0_16px_44px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">
                {mode === "history" ? "Archive tools" : "Reservation tools"}
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
                {mode === "history" ? "Find a past booking quickly" : "Filter your active bookings"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Narrow the list by vehicle, booking status, payment state, or pickup timing.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,0.9fr))]">
            <label className="flex items-center gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 transition focus-within:border-[var(--cargo-blue-bright)] focus-within:bg-white">
              <SearchIcon className="h-4 w-4 shrink-0" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by vehicle, plate, location, booking ID, or payment"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[var(--cargo-blue-bright)] focus:bg-white"
            >
              <option value="all">All booking statuses</option>
              {allowedStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value)}
              className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[var(--cargo-blue-bright)] focus:bg-white"
            >
              <option value="all">All payment states</option>
              {PAYMENT_FILTER_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status === "missing" ? "No payment record" : status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[var(--cargo-blue-bright)] focus:bg-white"
            >
              <option value="latest">Latest</option>
              <option value="pickup">Pickup date</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-[var(--cargo-blue-deep)]">
              {visibleBookings.length} {visibleBookings.length === 1 ? "record" : "records"}
            </span>
            {(searchTerm || statusFilter !== "all" || paymentFilter !== "all" || sortBy !== "latest") ? (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setPaymentFilter("all");
                  setSortBy("latest");
                }}
                className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>

        <div className="bg-slate-50/55 px-4 py-4 sm:px-6 sm:py-5">
          {loading ? (
            <div className="rounded-[1.25rem] border border-slate-200 bg-white px-5 py-10 text-sm text-slate-500">
              Loading bookings...
            </div>
          ) : visibleBookings.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-blue-200 bg-[linear-gradient(180deg,_#f8fbff,_#ffffff)] px-5 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[var(--cargo-blue-deep)]">
                <ArchiveIcon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {mode === "history" ? "No archived bookings found" : "No bookings match this view"}
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                {mode === "history"
                  ? "Try adjusting your search or filters to find a completed or cancelled booking. Your past reservations will appear here once they are recorded."
                  : "There are no active reservations matching your current search and filter settings. Clear the filters or check back after your next booking."}
              </p>
              {(searchTerm || statusFilter !== "all" || paymentFilter !== "all" || sortBy !== "latest") ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setPaymentFilter("all");
                    setSortBy("latest");
                  }}
                  className="mt-5 rounded-full bg-[var(--cargo-blue-deep)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
                >
                  Reset search and filters
                </button>
              ) : null}
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white">
              <div className="hidden grid-cols-[1.9fr_1fr_0.95fr_0.95fr_0.9fr_0.95fr] gap-4 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:grid lg:px-6">
                <span>Reservation</span>
                <span>Schedule</span>
                <span>Amount</span>
                <span>Payment</span>
                <span>Invoice</span>
                <span>Actions</span>
              </div>

              {visibleBookings.map((booking, index) => (
                <div key={booking.bookingId} className={index === 0 ? "" : ""}>
                  <BookingRow
                    booking={booking}
                    mode={mode}
                    viewingBookingId={viewingBookingId}
                    downloadingInvoiceId={downloadingInvoiceId}
                    cancellingBookingId={cancellingBookingId}
                    onCancel={cancelBooking}
                    onRebook={rebook}
                    onReview={setReviewingBooking}
                    onViewDetails={openBookingDetails}
                    onDownloadInvoice={downloadInvoice}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {reviewingBooking ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-xl rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <h2 className="text-2xl font-semibold text-slate-900">Review your rental</h2>
            <p className="mt-2 text-sm text-slate-500">{reviewingBooking.vehicleLabel}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-slate-700">Car rating</p>
                <StarRating value={carRating} onChange={setCarRating} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Rental experience</p>
                <StarRating value={experienceRating} onChange={setExperienceRating} />
              </div>
            </div>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Feedback
              <textarea
                rows="5"
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--cargo-blue-bright)]"
                placeholder="Share what went well or what should improve."
              />
            </label>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setReviewingBooking(null)}
                className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReview}
                className="rounded-full bg-[var(--cargo-blue-deep)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95"
              >
                Submit review
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedBooking
        ? createPortal(
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-3 sm:p-4">
              <div className="flex min-h-full items-start justify-center">
                <div className="cargo-scrollbar my-2 w-full max-w-3xl overflow-y-auto rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.22)] sm:my-4 sm:max-h-[calc(100vh-2rem)] sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">
                        Booking details
                      </p>
                      <h2 className="mt-1 text-2xl font-semibold text-slate-900">{selectedBooking.vehicleLabel}</h2>
                      <p className="mt-2 text-sm text-slate-500">
                        Plate {selectedBooking.plateNumber} • {selectedBooking.carType || "Vehicle"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBooking(null);
                        setInvoicePreview("");
                      }}
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <DetailCard label="Booking status" value={selectedBooking.bookingStatus} />
                    <DetailCard label="Total amount" value={formatMoney(selectedBooking.totalCost)} />
                    <DetailCard label="Payment" value={selectedBooking.payment?.status || "pending"} />
                    <DetailCard label="Invoice" value={selectedBooking.invoice?.status || "not issued"} />
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="space-y-4">
                      <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Trip information</p>
                        <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                          <p><span className="font-semibold text-slate-900">Pickup date:</span> {formatDate(selectedBooking.startDate)}</p>
                          <p><span className="font-semibold text-slate-900">Return date:</span> {formatDate(selectedBooking.endDate)}</p>
                          <p><span className="font-semibold text-slate-900">Pickup location:</span> {selectedBooking.pickupLocation}</p>
                          <p><span className="font-semibold text-slate-900">Dropoff location:</span> {selectedBooking.dropoffLocation}</p>
                          <p className="sm:col-span-2"><span className="font-semibold text-slate-900">Duration:</span> {getRentalDays(selectedBooking.startDate, selectedBooking.endDate)}</p>
                        </div>
                      </div>

                      <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Booking reference</p>
                        <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                          <p><span className="font-semibold text-slate-900">Booking ID:</span> BK-{String(selectedBooking.bookingId).padStart(6, "0")}</p>
                          <p><span className="font-semibold text-slate-900">Booked on:</span> {formatDate(selectedBooking.createdAt)}</p>
                          <p><span className="font-semibold text-slate-900">Agreement name:</span> {selectedBooking.contract?.renterAgreementName || "Not available"}</p>
                          <p><span className="font-semibold text-slate-900">Contract no.:</span> {selectedBooking.contract?.contractNumber || "Not available"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Owner</p>
                        <div className="mt-3 space-y-2 text-sm text-slate-600">
                          <p><span className="font-semibold text-slate-900">Name:</span> {selectedBooking.owner?.name || "Not available"}</p>
                          <p><span className="font-semibold text-slate-900">Email:</span> {selectedBooking.owner?.email || "Not available"}</p>
                        </div>
                      </div>

                      <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Billing</p>
                        <div className="mt-3 space-y-2 text-sm text-slate-600">
                          <p><span className="font-semibold text-slate-900">Payment method:</span> {selectedBooking.payment?.method ? selectedBooking.payment.method.toUpperCase() : "Pending"}</p>
                          <p><span className="font-semibold text-slate-900">Payment status:</span> {selectedBooking.payment?.status || "pending"}</p>
                          <p><span className="font-semibold text-slate-900">Invoice amount:</span> {selectedBooking.invoice ? formatMoney(selectedBooking.invoice.amount) : "Not available"}</p>
                          <p><span className="font-semibold text-slate-900">Invoice issued:</span> {selectedBooking.invoice?.issuedAt ? formatDate(selectedBooking.invoice.issuedAt) : "Not available"}</p>
                        </div>
                        {selectedBooking.invoice ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => showInvoice(selectedBooking.bookingId)}
                              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              {showingInvoiceId === selectedBooking.bookingId ? "Loading invoice..." : "Show invoice"}
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadInvoice(selectedBooking.bookingId)}
                              className="rounded-full bg-[var(--cargo-blue-deep)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
                            >
                              {downloadingInvoiceId === selectedBooking.bookingId ? "Preparing invoice..." : "Download invoice"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {invoicePreview ? (
                    <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Invoice preview</p>
                        <button
                          type="button"
                          onClick={() => setInvoicePreview("")}
                          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white"
                        >
                          Hide invoice
                        </button>
                      </div>
                      <pre className="cargo-scrollbar mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-[1rem] bg-white px-4 py-4 text-sm leading-6 text-slate-700">
                        {invoicePreview}
                      </pre>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function SearchIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16 21 21" strokeLinecap="round" />
    </svg>
  );
}

function ArchiveIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 7.5h16" strokeLinecap="round" />
      <path d="M5.5 7.5h13v10a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-10Z" />
      <path d="M7 4.5h10a1.5 1.5 0 0 1 1.5 1.5v1.5h-13V6A1.5 1.5 0 0 1 7 4.5Z" />
      <path d="M10 12h4" strokeLinecap="round" />
    </svg>
  );
}

function DetailCard({ label, value }) {
  return (
    <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold capitalize text-slate-900">{value}</p>
    </div>
  );
}

function StarRating({ value, onChange }) {
  return (
    <div className="mt-2 rounded-2xl border border-slate-200 px-4 py-3">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((starValue) => {
          const active = starValue <= value;
          return (
            <button
              key={starValue}
              type="button"
              onClick={() => onChange(starValue)}
              className="transition hover:scale-105"
              aria-label={`Rate ${starValue} out of 5`}
            >
              <svg
                viewBox="0 0 24 24"
                className={`h-8 w-8 ${active ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`}
              >
                <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4.1 5.8-.8L12 3.6Z" />
              </svg>
            </button>
          );
        })}
        <span className="ml-2 text-sm font-semibold text-slate-600">{value}/5</span>
      </div>
    </div>
  );
}
