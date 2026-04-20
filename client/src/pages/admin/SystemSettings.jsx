import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

const statusOptions = ["pending", "active", "expired", "suspended", "inactive"];
const tierOptions = ["starter", "growth", "fleet"];

export default function SystemSettings() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [drafts, setDrafts] = useState({});
  const [savingOwnerId, setSavingOwnerId] = useState(0);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  async function loadSubscriptions() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/subscriptions");
      const nextSubscriptions = data.subscriptions || [];
      setSubscriptions(nextSubscriptions);
      setDrafts(
        nextSubscriptions.reduce((accumulator, subscription) => {
          accumulator[subscription.ownerId] = {
            subscriptionStatus: subscription.subscriptionStatus || "inactive",
            subscriptionTier: subscription.subscriptionTier || "starter",
            durationDays: "30",
          };
          return accumulator;
        }, {})
      );
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(ownerId, field, value) {
    setDrafts((current) => ({
      ...current,
      [ownerId]: {
        ...current[ownerId],
        [field]: value,
      },
    }));
  }

  async function handleSave(ownerId) {
    const draft = drafts[ownerId];
    setSavingOwnerId(ownerId);
    setError("");
    setMessage("");

    try {
      const payload = {
        subscriptionStatus: draft.subscriptionStatus,
        subscriptionTier: draft.subscriptionTier,
        durationDays: Number(draft.durationDays || 30),
      };
      const { data } = await api.patch(`/admin/subscriptions/${ownerId}`, payload);
      setMessage(data.message || "Subscription updated.");
      await loadSubscriptions();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to update subscription");
    } finally {
      setSavingOwnerId(0);
    }
  }

  const filteredSubscriptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return subscriptions.filter((subscription) => {
      const matchesSearch =
        !term ||
        subscription.username.toLowerCase().includes(term) ||
        subscription.email.toLowerCase().includes(term) ||
        String(subscription.companyName || "").toLowerCase().includes(term);
      const matchesStatus = statusFilter === "all" || subscription.subscriptionStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, subscriptions]);

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">System Settings</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Subscription Controls</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Review owner plan requests, activate subscriptions, and control tier assignments and validity periods.
        </p>
      </section>

      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search owner, company, or email"
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--cargo-blue-bright)]"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--cargo-blue-bright)]"
          >
            <option value="all">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {capitalize(status)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={loadSubscriptions}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Refresh
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-[0.14em] text-slate-400">
                  <th className="px-4 py-3 font-semibold">Owner</th>
                  <th className="px-4 py-3 font-semibold">Account</th>
                  <th className="px-4 py-3 font-semibold">Current Plan</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Period</th>
                  <th className="px-4 py-3 font-semibold">Admin Controls</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-10 text-center text-sm text-slate-500">
                      Loading subscriptions...
                    </td>
                  </tr>
                ) : filteredSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-10 text-center text-sm text-slate-500">
                      No owner subscriptions matched the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredSubscriptions.map((subscription) => {
                    const draft = drafts[subscription.ownerId] || {
                      subscriptionStatus: subscription.subscriptionStatus || "inactive",
                      subscriptionTier: subscription.subscriptionTier || "starter",
                      durationDays: "30",
                    };

                    return (
                      <tr key={subscription.ownerId} className="border-t border-slate-200 align-top">
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-slate-900">{subscription.username}</p>
                          <p className="mt-1 text-xs text-slate-500">{subscription.email}</p>
                          {subscription.companyName ? <p className="mt-1 text-xs text-slate-500">{subscription.companyName}</p> : null}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">{capitalize(subscription.accountStatus)}</td>
                        <td className="px-4 py-4 text-sm text-slate-600">{subscription.subscriptionTier ? capitalize(subscription.subscriptionTier) : "Not set"}</td>
                        <td className="px-4 py-4">
                          <StatusBadge status={subscription.subscriptionStatus} />
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {subscription.subscriptionStartDate || subscription.subscriptionEndDate
                            ? `${formatDate(subscription.subscriptionStartDate)} - ${formatDate(subscription.subscriptionEndDate)}`
                            : "Not scheduled"}
                        </td>
                        <td className="px-4 py-4">
                          <div className="grid gap-2 md:min-w-[240px]">
                            <select
                              value={draft.subscriptionTier}
                              onChange={(event) => updateDraft(subscription.ownerId, "subscriptionTier", event.target.value)}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--cargo-blue-bright)]"
                            >
                              {tierOptions.map((tier) => (
                                <option key={tier} value={tier}>
                                  {capitalize(tier)}
                                </option>
                              ))}
                            </select>
                            <select
                              value={draft.subscriptionStatus}
                              onChange={(event) => updateDraft(subscription.ownerId, "subscriptionStatus", event.target.value)}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--cargo-blue-bright)]"
                            >
                              {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                  {capitalize(status)}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min="1"
                              value={draft.durationDays}
                              onChange={(event) => updateDraft(subscription.ownerId, "durationDays", event.target.value)}
                              placeholder="Duration in days"
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--cargo-blue-bright)]"
                            />
                            <button
                              type="button"
                              onClick={() => handleSave(subscription.ownerId)}
                              disabled={savingOwnerId === subscription.ownerId}
                              className="rounded-2xl bg-[var(--cargo-blue-deep)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              {savingOwnerId === subscription.ownerId ? "Saving..." : "Save Subscription"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status || "inactive").toLowerCase();
  const className =
    normalized === "active"
      ? "bg-emerald-50 text-emerald-700"
      : normalized === "pending"
        ? "bg-amber-50 text-amber-700"
        : normalized === "expired"
          ? "bg-orange-50 text-orange-700"
          : normalized === "suspended"
            ? "bg-rose-50 text-rose-700"
            : "bg-slate-100 text-slate-600";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{capitalize(normalized)}</span>;
}

function capitalize(value) {
  if (!value) return "Not set";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
