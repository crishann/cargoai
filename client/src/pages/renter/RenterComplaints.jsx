import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

function formatDate(value) {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function RenterComplaints() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [complaints, setComplaints] = useState([]);
  const [bookingOptions, setBookingOptions] = useState([]);
  const [form, setForm] = useState({
    bookingId: "",
    subject: "",
    description: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [complaintsResponse, bookingsResponse] = await Promise.all([
        api.get("/renter/complaints"),
        api.get("/renter/complaints/bookings"),
      ]);
      setComplaints(complaintsResponse.data.complaints || []);
      setBookingOptions(bookingsResponse.data.bookings || []);
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to load complaints");
    } finally {
      setLoading(false);
    }
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitComplaint(event) {
    event.preventDefault();
    setSubmitting(true);
    setSuccess("");

    try {
      await api.post("/renter/complaints", {
        bookingId: Number(form.bookingId),
        subject: form.subject,
        description: form.description,
      });
      setForm({ bookingId: "", subject: "", description: "" });
      setSuccess("Complaint submitted successfully.");
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to submit complaint");
    } finally {
      setSubmitting(false);
    }
  }

  const openCount = useMemo(
    () => complaints.filter((item) => ["open", "in_review"].includes(item.status)).length,
    [complaints]
  );

  return (
    <div className="space-y-5">
      <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">Issues and Complaints</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Manage complaints or issues</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Report booking-related issues for admin review and track the status of submitted complaints in one place.
        </p>
      </section>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">Submit Issue</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Create a complaint record</h2>
          <form onSubmit={submitComplaint} className="mt-5 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Booking</span>
              <select
                value={form.bookingId}
                onChange={(event) => updateField("bookingId", event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--cargo-blue-deep)] focus:bg-white"
              >
                <option value="">Select booking</option>
                {bookingOptions.map((booking) => (
                  <option key={booking.bookingId} value={booking.bookingId}>
                    {booking.vehicleLabel} | {booking.startDate} to {booking.endDate}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Subject</span>
              <input
                type="text"
                value={form.subject}
                onChange={(event) => updateField("subject", event.target.value)}
                placeholder="Example: Vehicle issue during pickup"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--cargo-blue-deep)] focus:bg-white"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Description</span>
              <textarea
                rows="6"
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Describe the issue clearly so admin can review it."
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--cargo-blue-deep)] focus:bg-white"
              />
            </label>

            <button
              type="submit"
              disabled={submitting || !form.bookingId || !form.subject.trim() || !form.description.trim()}
              className="rounded-full bg-[var(--cargo-blue-deep)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit complaint"}
            </button>
          </form>
        </section>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">Complaint History</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Your submitted issues</h2>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[var(--cargo-blue-deep)]">
              {openCount} open
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {loading ? (
              <div className="rounded-[1rem] bg-slate-50 px-4 py-8 text-sm text-slate-500">Loading complaints...</div>
            ) : complaints.length === 0 ? (
              <div className="rounded-[1rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                No complaints submitted yet.
              </div>
            ) : (
              complaints.map((complaint) => (
                <article key={complaint.complaintId} className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{complaint.subject}</p>
                      <p className="mt-1 text-xs text-slate-500">Filed {formatDate(complaint.createdAt)}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
                      {complaint.status}
                    </span>
                  </div>
                  {complaint.booking ? (
                    <p className="mt-3 text-sm text-slate-600">
                      <span className="font-semibold text-slate-900">Booking:</span> {complaint.booking.vehicleLabel} | {complaint.booking.startDate} to {complaint.booking.endDate}
                    </p>
                  ) : null}
                  <p className="mt-3 text-sm leading-6 text-slate-600">{complaint.description}</p>
                  {complaint.resolutionNotes ? (
                    <div className="mt-3 rounded-[0.95rem] border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-600">
                      <span className="font-semibold text-slate-900">Admin notes:</span> {complaint.resolutionNotes}
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
