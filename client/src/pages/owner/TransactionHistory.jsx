import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

export default function TransactionHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [transactionFilter, setTransactionFilter] = useState("all");

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    try {
      const { data } = await api.get("/owner/bookings/payment-records");
      setRecords(data.records || []);
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to load transaction history");
    } finally {
      setLoading(false);
    }
  }

  const transactions = useMemo(() => {
    const items = [];

    records.forEach((record) => {
      items.push({
        id: `booking-${record.bookingId}`,
        type: "booking",
        bookingId: record.bookingId,
        title: "Booking created",
        amount: record.totalCost,
        date: record.bookingCreatedAt,
        status: record.bookingStatus,
        vehicleLabel: record.vehicleLabel,
        plateNumber: record.plateNumber,
        renterName: record.renterName,
        renterEmail: record.renterEmail,
        subtitle: `${record.vehicleLabel} for ${record.renterName}`,
      });

      if (record.invoice) {
        items.push({
          id: `invoice-${record.invoice.invoiceId}`,
          type: "invoice",
          bookingId: record.bookingId,
          title: "Invoice issued",
          amount: record.invoice.amount,
          date: record.invoice.issuedAt,
          status: record.invoice.status,
          vehicleLabel: record.vehicleLabel,
          plateNumber: record.plateNumber,
          renterName: record.renterName,
          renterEmail: record.renterEmail,
          subtitle: record.invoice.invoiceNumber || `INV-${String(record.invoice.invoiceId).padStart(6, "0")}`,
        });
      }

      if (record.payment) {
        items.push({
          id: `payment-${record.payment.paymentId}`,
          type: "payment",
          bookingId: record.bookingId,
          title: record.payment.status === "paid" ? "Payment received" : "Payment pending",
          amount: record.payment.amount,
          date: record.payment.paidAt || record.bookingCreatedAt,
          status: record.payment.status,
          vehicleLabel: record.vehicleLabel,
          plateNumber: record.plateNumber,
          renterName: record.renterName,
          renterEmail: record.renterEmail,
          subtitle: record.payment.method ? `${record.payment.method.toUpperCase()} payment` : "Payment record",
        });
      }
    });

    return items.sort((left, right) => {
      const leftTime = new Date(left.date || 0).getTime();
      const rightTime = new Date(right.date || 0).getTime();
      if (rightTime !== leftTime) return rightTime - leftTime;
      return right.bookingId - left.bookingId;
    });
  }, [records]);

  const filteredTransactions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const haystack = [
        transaction.title,
        transaction.subtitle,
        transaction.vehicleLabel,
        transaction.plateNumber,
        transaction.renterName,
        transaction.renterEmail,
        transaction.bookingId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !term || haystack.includes(term);
      const matchesType = transactionFilter === "all" || transaction.type === transactionFilter;
      return matchesSearch && matchesType;
    });
  }, [searchTerm, transactionFilter, transactions]);

  const summary = useMemo(() => {
    const paymentsReceived = transactions.filter((item) => item.type === "payment" && item.status === "paid");
    const pendingPayments = transactions.filter((item) => item.type === "payment" && item.status !== "paid");
    const invoices = transactions.filter((item) => item.type === "invoice");

    return {
      grossReceived: paymentsReceived.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      pendingRevenue: pendingPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      invoiceCount: invoices.length,
      transactionCount: transactions.length,
    };
  }, [transactions]);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">Transaction History</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Owner transaction history</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Track booking creation, invoice issuance, and incoming payments in a single chronological owner ledger.
        </p>
      </section>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="grid gap-4 xl:grid-cols-4">
        <SummaryCard label="Transactions" value={String(summary.transactionCount)} helper="timeline entries" />
        <SummaryCard label="Invoices Issued" value={String(summary.invoiceCount)} helper="invoice events" />
        <SummaryCard label="Payments Received" value={formatMoney(summary.grossReceived)} helper="paid collections" />
        <SummaryCard label="Pending Revenue" value={formatMoney(summary.pendingRevenue)} helper="awaiting payment" />
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by renter, vehicle, plate, title, or booking ID"
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--cargo-blue-bright)]"
          />
          <select
            value={transactionFilter}
            onChange={(event) => setTransactionFilter(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--cargo-blue-bright)]"
          >
            <option value="all">All transaction types</option>
            <option value="booking">Bookings</option>
            <option value="invoice">Invoices</option>
            <option value="payment">Payments</option>
          </select>
          <button
            type="button"
            onClick={loadHistory}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Refresh
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-[var(--cargo-blue-deep)]">
            {filteredTransactions.length} {filteredTransactions.length === 1 ? "entry" : "entries"}
          </span>
          {(searchTerm || transactionFilter !== "all") ? (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setTransactionFilter("all");
              }}
              className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600"
            >
              Clear filters
            </button>
          ) : null}
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-sm text-slate-500">
              Loading transaction history...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-sm text-slate-500">
              No transaction history matched the current filters.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <article
                  key={transaction.id}
                  className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff,_#fbfdff)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${typeTone(transaction.type)}`}>
                          {transaction.type}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusTone(transaction.status)}`}>
                          {normalizeStatusLabel(transaction.status)}
                        </span>
                      </div>
                      <h2 className="text-lg font-semibold text-slate-900">{transaction.title}</h2>
                      <p className="text-sm text-slate-500">{transaction.subtitle}</p>
                    </div>

                    <div className="md:text-right">
                      <p className="text-2xl font-semibold text-slate-900">{formatMoney(transaction.amount)}</p>
                      <p className="mt-1 text-sm text-slate-500">{formatDateTime(transaction.date)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetaItem label="Booking" value={`BK-${String(transaction.bookingId).padStart(6, "0")}`} />
                    <MetaItem label="Vehicle" value={transaction.vehicleLabel} />
                    <MetaItem label="Plate" value={transaction.plateNumber || "Not available"} />
                    <MetaItem label="Renter" value={transaction.renterName || "Not available"} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, helper }) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-400">{helper}</p>
    </article>
  );
}

function MetaItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function formatMoney(value) {
  return `P${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function typeTone(type) {
  if (type === "payment") return "bg-emerald-50 text-emerald-700";
  if (type === "invoice") return "bg-sky-50 text-sky-700";
  return "bg-slate-100 text-slate-700";
}

function statusTone(status) {
  if (status === "paid" || status === "completed" || status === "confirmed") return "bg-emerald-50 text-emerald-700";
  if (status === "pending") return "bg-amber-50 text-amber-700";
  if (status === "cancelled" || status === "unpaid") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function normalizeStatusLabel(status) {
  if (!status) return "Not set";
  return String(status).replace(/_/g, " ");
}
