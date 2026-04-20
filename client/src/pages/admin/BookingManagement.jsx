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

export default function BookingManagement() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeComplaintId, setActiveComplaintId] = useState(null);
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    loadComplaints();
  }, []);

  async function loadComplaints() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/complaints");
      const nextComplaints = data.complaints || [];
      setComplaints(nextComplaints);
      setDrafts(
        Object.fromEntries(
          nextComplaints.map((item) => [
            item.complaintId,
            { status: item.status, resolutionNotes: item.resolutionNotes || "" },
          ])
        )
      );
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to load complaints");
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(complaintId, field, value) {
    setDrafts((current) => ({
      ...current,
      [complaintId]: {
        ...(current[complaintId] || {}),
        [field]: value,
      },
    }));
  }

  async function saveComplaint(complaintId) {
    const draft = drafts[complaintId];
    if (!draft) return;

    setActiveComplaintId(complaintId);
    try {
      await api.patch(`/admin/complaints/${complaintId}`, draft);
      await loadComplaints();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to update complaint");
    } finally {
      setActiveComplaintId(null);
    }
  }

  const visibleComplaints = useMemo(
    () => complaints.filter((item) => statusFilter === "all" || item.status === statusFilter),
    [complaints, statusFilter]
  );

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">Complaint Management</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Manage complaints or issues</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Review renter issues, update complaint status, and record admin resolution notes from one workspace.
        </p>
      </section>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">Admin Queue</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Complaint records</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {["all", "open", "in_review", "resolved", "dismissed"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  statusFilter === status
                    ? "bg-[var(--cargo-blue-deep)] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {status === "all" ? "All" : status.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="rounded-[1rem] bg-slate-50 px-4 py-8 text-sm text-slate-500">Loading complaints...</div>
          ) : visibleComplaints.length === 0 ? (
            <div className="rounded-[1rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
              No complaints found for this filter.
            </div>
          ) : (
            visibleComplaints.map((complaint) => {
              const draft = drafts[complaint.complaintId] || { status: complaint.status, resolutionNotes: complaint.resolutionNotes || "" };
              return (
                <article key={complaint.complaintId} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{complaint.subject}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Complaint #{complaint.complaintId} • Filed {formatDate(complaint.createdAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
                      {complaint.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2 text-sm text-slate-600">
                      <p><span className="font-semibold text-slate-900">Complainant:</span> {complaint.complainant.username} ({complaint.complainant.email})</p>
                      <p><span className="font-semibold text-slate-900">Against:</span> {complaint.againstUser.username} ({complaint.againstUser.email || "No email"})</p>
                      {complaint.booking ? (
                        <p>
                          <span className="font-semibold text-slate-900">Booking:</span> {complaint.booking.vehicleLabel} | {complaint.booking.startDate} to {complaint.booking.endDate}
                        </p>
                      ) : null}
                      <p className="leading-6"><span className="font-semibold text-slate-900">Description:</span> {complaint.description}</p>
                    </div>

                    <div className="rounded-[1rem] border border-slate-200 bg-white p-4">
                      <div className="grid gap-4">
                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-slate-700">Status</span>
                          <select
                            value={draft.status}
                            onChange={(event) => updateDraft(complaint.complaintId, "status", event.target.value)}
                            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--cargo-blue-deep)] focus:bg-white"
                          >
                            <option value="open">Open</option>
                            <option value="in_review">In review</option>
                            <option value="resolved">Resolved</option>
                            <option value="dismissed">Dismissed</option>
                          </select>
                        </label>

                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-slate-700">Resolution notes</span>
                          <textarea
                            rows="4"
                            value={draft.resolutionNotes}
                            onChange={(event) => updateDraft(complaint.complaintId, "resolutionNotes", event.target.value)}
                            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--cargo-blue-deep)] focus:bg-white"
                          />
                        </label>

                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs text-slate-500">
                            {complaint.resolvedAt ? `Resolved ${formatDate(complaint.resolvedAt)} by ${complaint.resolvedBy || "admin"}` : "Not resolved yet"}
                          </p>
                          <button
                            type="button"
                            onClick={() => saveComplaint(complaint.complaintId)}
                            disabled={activeComplaintId === complaint.complaintId}
                            className="rounded-full bg-[var(--cargo-blue-deep)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {activeComplaintId === complaint.complaintId ? "Saving..." : "Save update"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
