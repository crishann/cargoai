import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../../lib/api";

function formatMoney(value) {
  return `P${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function paymentTone(status) {
  if (status === "paid") return "bg-emerald-50 text-emerald-700";
  return "bg-amber-50 text-amber-700";
}

function canMarkPayment(record) {
  return Boolean(
    record.payment &&
      record.payment.status !== "paid" &&
      ["confirmed", "ongoing", "completed"].includes(record.bookingStatus)
  );
}

export default function PaymentRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [bookingFilter, setBookingFilter] = useState("all");
  const [updatingBookingId, setUpdatingBookingId] = useState(null);
  const [paymentReceiverModal, setPaymentReceiverModal] = useState({ open: false, bookingId: null, value: "" });

  useEffect(() => {
    loadRecords();
  }, []);

  async function loadRecords() {
    setLoading(true);
    try {
      const { data } = await api.get("/owner/bookings/payment-records");
      setRecords(data.records || []);
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to load payment records");
    } finally {
      setLoading(false);
    }
  }

  async function markAsPaid(bookingId, receivedByName) {
    setUpdatingBookingId(bookingId);
    try {
      await api.patch(`/owner/bookings/${bookingId}/payment-status`, {
        status: "paid",
        receivedByName: receivedByName.trim(),
      });
      await loadRecords();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to update payment status");
    } finally {
      setUpdatingBookingId(null);
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
    await markAsPaid(bookingId, receivedByName);
  }

  async function downloadInvoice(bookingId) {
    try {
      const response = await api.get(`/owner/bookings/${bookingId}/invoice`, {
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
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to download invoice");
    }
  }

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const haystack = [
        record.vehicleLabel,
        record.plateNumber,
        record.renterName,
        record.renterEmail,
        record.invoice?.invoiceId,
        record.bookingId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = haystack.includes(searchTerm.trim().toLowerCase());
      const currentPaymentStatus = record.payment?.status || "pending";
      const matchesPayment = paymentFilter === "all" || currentPaymentStatus === paymentFilter;
      const matchesBooking = bookingFilter === "all" || record.bookingStatus === bookingFilter;
      return matchesSearch && matchesPayment && matchesBooking;
    });
  }, [records, searchTerm, paymentFilter, bookingFilter]);

  const summary = useMemo(() => {
    const paid = records.filter((item) => item.payment?.status === "paid");
    const pending = records.filter((item) => item.payment?.status !== "paid");
    const invoices = records.filter((item) => item.invoice);

    return {
      paidAmount: paid.reduce((sum, item) => sum + Number(item.payment?.amount || item.totalCost || 0), 0),
      pendingAmount: pending.reduce((sum, item) => sum + Number(item.payment?.amount || item.totalCost || 0), 0),
      issuedInvoices: invoices.length,
      paidInvoices: invoices.filter((item) => item.invoice?.status === "paid").length,
    };
  }, [records]);

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[1.5rem] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.85)]">
          <p className="text-sm text-slate-500">Payment overview</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Owner payment records</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Review paid and pending booking collections, invoice issuance, and renter payment status from one screen.
          </p>

          <div className="mt-5 space-y-4">
            <SummaryRow
              label="Paid collections"
              value={formatMoney(summary.paidAmount)}
              count={`${records.filter((item) => item.payment?.status === "paid").length} records`}
              tone="bg-emerald-400"
              width={records.length ? `${(records.filter((item) => item.payment?.status === "paid").length / records.length) * 100}%` : "0%"}
            />
            <SummaryRow
              label="Pending collections"
              value={formatMoney(summary.pendingAmount)}
              count={`${records.filter((item) => item.payment?.status !== "paid").length} records`}
              tone="bg-amber-400"
              width={records.length ? `${(records.filter((item) => item.payment?.status !== "paid").length / records.length) * 100}%` : "0%"}
            />
            <SummaryRow
              label="Invoices issued"
              value={String(summary.issuedInvoices)}
              count={`${summary.paidInvoices} marked paid`}
              tone="bg-sky-400"
              width={records.length ? `${(summary.issuedInvoices / records.length) * 100}%` : "0%"}
            />
          </div>
        </article>

        <article className="rounded-[1.5rem] bg-[linear-gradient(135deg,_#f8fbff,_#ffffff_60%,_#eef5ff)] p-5 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.85)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Record tools</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Search and filter payment history</h2>
            </div>
            <button
              type="button"
              onClick={loadRecords}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Refresh
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            <label className="flex items-center gap-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-slate-500 focus-within:border-[var(--cargo-blue-bright)]">
              <SearchIcon className="h-4 w-4 shrink-0" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by renter, vehicle, plate, or record ID"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={paymentFilter}
                onChange={(event) => setPaymentFilter(event.target.value)}
                className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none"
              >
                <option value="all">All payment states</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
              <select
                value={bookingFilter}
                onChange={(event) => setBookingFilter(event.target.value)}
                className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none"
              >
                <option value="all">All booking statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-[var(--cargo-blue-deep)]">
                {filteredRecords.length} {filteredRecords.length === 1 ? "record" : "records"}
              </span>
              {(searchTerm || paymentFilter !== "all" || bookingFilter !== "all") ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setPaymentFilter("all");
                    setBookingFilter("all");
                  }}
                  className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-[1.5rem] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.85)]">
        <div>
          <p className="text-sm text-slate-500">Payment records</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Invoices, bookings, and renter payments</h2>
        </div>

        <div className="mt-5 overflow-hidden rounded-[1.25rem] border border-slate-200">
          <div className="hidden grid-cols-[1fr_0.85fr_1fr_0.8fr_0.8fr_0.9fr] gap-4 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 lg:grid">
            <span>Invoice</span>
            <span>Booking</span>
            <span>Renter</span>
            <span>Amount</span>
            <span>Payment</span>
            <span>Actions</span>
          </div>

          {loading ? (
            <div className="px-5 py-8 text-sm text-slate-500">Loading payment records...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="px-5 py-8 text-sm text-slate-500">No payment records matched the current filters.</div>
          ) : (
            filteredRecords.map((record) => {
              const invoiceLabel = record.invoice?.invoiceNumber || "Not issued";
              const bookingLabel = `BK-${String(record.bookingId).padStart(6, "0")}`;
              const paymentStatus = record.payment?.status || "pending";
              const invoiceStatus = record.invoice?.status || "not issued";
              const amount = record.payment?.amount || record.invoice?.amount || record.totalCost;

              return (
                <article key={record.bookingId} className="border-t border-slate-200 px-5 py-4">
                  <div className="hidden grid-cols-[1fr_0.85fr_1fr_0.8fr_0.8fr_0.9fr] gap-4 lg:grid lg:items-start">
                    <div>
                      <p className="font-semibold text-slate-900">{invoiceLabel}</p>
                      <p className="mt-1 text-xs text-slate-500">Invoice status: {invoiceStatus}</p>
                      <p className="mt-1 text-xs text-slate-500">Issued: {formatDate(record.invoice?.issuedAt)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{bookingLabel}</p>
                      <p className="mt-1 text-xs text-slate-500">{record.vehicleLabel}</p>
                      <p className="mt-1 text-xs text-slate-500">Status: {record.bookingStatus}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{record.renterName}</p>
                      <p className="mt-1 text-xs text-slate-500">{record.renterEmail}</p>
                      <p className="mt-1 text-xs text-slate-500">Plate {record.plateNumber}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{formatMoney(amount)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {record.payment?.method ? record.payment.method.toUpperCase() : "Payment method pending"}
                      </p>
                    </div>
                    <div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${paymentTone(paymentStatus)}`}>
                        {paymentStatus}
                      </span>
                      <p className="mt-2 text-xs text-slate-500">Paid: {formatDate(record.payment?.paidAt)}</p>
                      <p className="mt-1 text-xs text-slate-500">Received by: {record.payment?.receivedByName || "Not recorded"}</p>
                    </div>
                    <div className="flex flex-col items-start gap-2">
                      <button
                        type="button"
                        disabled={!record.invoice}
                        onClick={() => downloadInvoice(record.bookingId)}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Download invoice
                      </button>
                      {canMarkPayment(record) ? (
                        <button
                          type="button"
                          onClick={() => openPaymentReceiverModal(record.bookingId)}
                          disabled={updatingBookingId === record.bookingId}
                          className="rounded-full bg-[var(--cargo-blue-deep)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updatingBookingId === record.bookingId ? "Saving..." : "Mark as paid"}
                        </button>
                      ) : paymentStatus === "paid" ? (
                        <span className="text-sm font-semibold text-emerald-700">Settled</span>
                      ) : (
                        <span className="text-sm font-semibold text-slate-500">Waiting for booking confirmation</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 lg:hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{invoiceLabel}</p>
                        <p className="mt-1 text-sm text-slate-500">{bookingLabel} • {record.vehicleLabel}</p>
                      </div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${paymentTone(paymentStatus)}`}>
                        {paymentStatus}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-slate-600">
                      <p><span className="font-semibold text-slate-900">Renter:</span> {record.renterName}</p>
                      <p><span className="font-semibold text-slate-900">Amount:</span> {formatMoney(amount)}</p>
                      <p><span className="font-semibold text-slate-900">Invoice:</span> {invoiceStatus}</p>
                      <p><span className="font-semibold text-slate-900">Paid:</span> {formatDate(record.payment?.paidAt)}</p>
                      <p><span className="font-semibold text-slate-900">Received by:</span> {record.payment?.receivedByName || "Not recorded"}</p>
                    </div>
                    <button
                      type="button"
                      disabled={!record.invoice}
                      onClick={() => downloadInvoice(record.bookingId)}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Download invoice
                    </button>
                    {canMarkPayment(record) ? (
                      <button
                        type="button"
                        onClick={() => openPaymentReceiverModal(record.bookingId)}
                        disabled={updatingBookingId === record.bookingId}
                        className="rounded-full bg-[var(--cargo-blue-deep)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingBookingId === record.bookingId ? "Saving..." : "Mark as paid"}
                      </button>
                    ) : paymentStatus === "paid" ? (
                      <span className="text-sm font-semibold text-emerald-700">Settled</span>
                    ) : (
                      <span className="text-sm font-semibold text-slate-500">Waiting for booking confirmation</span>
                    )}
                  </div>
                </article>
              );
            })
          )}
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

function SummaryRow({ label, value, count, tone, width }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-xs text-slate-400">{count}</p>
        </div>
        <p className="text-lg font-semibold text-slate-900">{value}</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width }} />
      </div>
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
