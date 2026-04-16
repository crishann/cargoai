const paymentSummary = [
  { label: "Settled", value: "P112,800", tone: "bg-emerald-400", width: "76%" },
  { label: "Pending release", value: "P38,400", tone: "bg-amber-400", width: "44%" },
  { label: "Refund review", value: "P6,250", tone: "bg-rose-400", width: "18%" },
];

const paymentRows = [
  { invoice: "INV-2026-0412", booking: "BK-2093", renter: "Aly Reyes", amount: "P8,400", status: "Paid" },
  { invoice: "INV-2026-0414", booking: "BK-2098", renter: "Marco Diaz", amount: "P12,600", status: "Pending release" },
  { invoice: "INV-2026-0415", booking: "BK-2104", renter: "Sam Lim", amount: "P6,250", status: "Dispute review" },
];

export default function PaymentRecords() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[1.5rem] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.85)]">
          <p className="text-sm text-slate-500">Payment overview</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Vehicle payment flow</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            These cards map cleanly to your bookings, payments, and invoice tables, so the backend can later replace the sample values with live totals.
          </p>

          <div className="mt-5 space-y-4">
            {paymentSummary.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="text-lg font-semibold text-slate-900">{item.value}</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${item.tone}`} style={{ width: item.width }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[1.5rem] bg-[linear-gradient(135deg,_#f8fafc,_#fff7f2)] p-5 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.85)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Payout pulse</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Release timing and cash visibility</h2>
            </div>
            <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">Export report</button>
          </div>

          <div className="mt-6 grid h-56 grid-cols-7 items-end gap-3">
            {[30, 52, 40, 70, 48, 74, 60].map((height, index) => (
              <div key={height + index} className="flex h-full items-end">
                <div className={`w-full rounded-t-2xl ${index === 5 ? "bg-[#ff6a3d]" : "bg-slate-300"}`} style={{ height: `${height}%` }} />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-[1.5rem] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.85)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Recent payment rows</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Invoices, bookings, and status</h2>
          </div>
          <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Filter records</button>
        </div>

        <div className="mt-5 overflow-hidden rounded-[1.25rem] border border-slate-200">
          <div className="grid grid-cols-5 gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            <span>Invoice</span>
            <span>Booking</span>
            <span>Renter</span>
            <span>Amount</span>
            <span>Status</span>
          </div>
          {paymentRows.map((row) => (
            <div key={row.invoice} className="grid grid-cols-5 gap-4 border-t border-slate-200 px-4 py-4 text-sm text-slate-700">
              <span className="font-semibold text-slate-900">{row.invoice}</span>
              <span>{row.booking}</span>
              <span>{row.renter}</span>
              <span>{row.amount}</span>
              <span className="font-medium text-[var(--cargo-blue-deep)]">{row.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
