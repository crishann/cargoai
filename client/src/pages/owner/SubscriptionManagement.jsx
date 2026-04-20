import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

const defaultPlans = [];

export default function SubscriptionManagement() {
  const [owner, setOwner] = useState(null);
  const [plans, setPlans] = useState(defaultPlans);
  const [loading, setLoading] = useState(true);
  const [submittingTier, setSubmittingTier] = useState("");
  const [selectedCycle, setSelectedCycle] = useState("monthly");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSubscription();
  }, []);

  async function loadSubscription() {
    setLoading(true);
    try {
      const { data } = await api.get("/owner/subscription");
      setOwner(data.owner || null);
      setPlans(data.plans || defaultPlans);
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to load subscription details");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestPlan(tier) {
    setSubmittingTier(tier);
    setMessage("");
    setError("");

    try {
      const { data } = await api.post("/owner/subscription/request", {
        tier,
        cycle: selectedCycle,
      });
      setMessage(data.message || "Subscription request submitted.");
      await loadSubscription();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to submit subscription request");
    } finally {
      setSubmittingTier("");
    }
  }

  const activePlan = useMemo(
    () => plans.find((plan) => plan.tier === owner?.subscriptionTier) || null,
    [owner?.subscriptionTier, plans]
  );

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">Subscription</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Owner Subscription Management</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Review your current plan, monitor subscription status, and request a new package for admin approval.
        </p>
      </section>

      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          Loading subscription details...
        </section>
      ) : owner ? (
        <>
          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Current Subscription</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">
                    {activePlan ? activePlan.label : owner.subscriptionTier ? capitalize(owner.subscriptionTier) : "No active plan"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {getSubscriptionMessage(owner)}
                  </p>
                </div>
                <StatusPill status={owner.subscriptionStatus} />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <DetailCard label="Account Status" value={capitalize(owner.accountStatus)} />
                <DetailCard label="Company Name" value={owner.companyName || "Not set"} />
                <DetailCard label="Billing Cycle" value={capitalize(selectedCycle)} />
                <DetailCard
                  label="Coverage Period"
                  value={
                    owner.subscriptionStartDate || owner.subscriptionEndDate
                      ? `${formatDate(owner.subscriptionStartDate)} - ${formatDate(owner.subscriptionEndDate)}`
                      : "Not scheduled"
                  }
                />
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Request Settings</p>
              <label className="mt-4 block text-sm font-medium text-slate-700">
                Billing cycle
                <select
                  value={selectedCycle}
                  onChange={(event) => setSelectedCycle(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--cargo-blue-bright)]"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </label>

              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-500">
                Requests are queued for admin review. Once approved, the plan start and end dates will be assigned automatically.
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = owner.subscriptionTier === plan.tier;
              const price = selectedCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;

              return (
                <article key={plan.tier} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{plan.label}</h3>
                      <p className="mt-1 text-sm text-slate-500">{plan.supportLevel}</p>
                    </div>
                    {isCurrent ? <span className="rounded-full bg-[rgba(21,91,162,0.12)] px-3 py-1 text-xs font-semibold text-[var(--cargo-blue-deep)]">Current</span> : null}
                  </div>

                  <div className="mt-5">
                    <p className="text-3xl font-semibold text-slate-900">PHP {formatCurrency(price)}</p>
                    <p className="mt-1 text-sm text-slate-500">per {selectedCycle === "yearly" ? "year" : "month"}</p>
                  </div>

                  <div className="mt-5 space-y-2 text-sm text-slate-600">
                    <p>{plan.vehicleLimit === null ? "Unlimited active vehicles" : `Up to ${plan.vehicleLimit} active vehicles`}</p>
                    {plan.features.map((feature) => (
                      <p key={feature}>{feature}</p>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRequestPlan(plan.tier)}
                    disabled={submittingTier === plan.tier || owner.accountStatus !== "active"}
                    className="mt-6 w-full rounded-2xl bg-[var(--cargo-blue-deep)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {submittingTier === plan.tier ? "Submitting..." : isCurrent ? "Request Renewal / Change" : `Request ${plan.label}`}
                  </button>
                </article>
              );
            })}
          </section>
        </>
      ) : null}
    </div>
  );
}

function DetailCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StatusPill({ status }) {
  const normalized = String(status || "inactive").toLowerCase();
  const className =
    normalized === "active"
      ? "bg-emerald-50 text-emerald-700"
      : normalized === "pending"
        ? "bg-amber-50 text-amber-700"
        : normalized === "suspended"
          ? "bg-rose-50 text-rose-700"
          : normalized === "expired"
            ? "bg-orange-50 text-orange-700"
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

function formatCurrency(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function getSubscriptionMessage(owner) {
  if (owner.subscriptionStatus === "active") {
    return `Your subscription is active${owner.subscriptionEndDate ? ` until ${formatDate(owner.subscriptionEndDate)}` : ""}.`;
  }
  if (owner.subscriptionStatus === "pending") {
    return "Your subscription request is pending admin review.";
  }
  if (owner.subscriptionStatus === "suspended") {
    return "Your subscription is suspended. Contact an administrator for reactivation.";
  }
  if (owner.subscriptionStatus === "expired") {
    return "Your subscription has expired. Submit a new plan request to continue owner subscription access.";
  }
  return "No active owner subscription is assigned yet. Choose a plan below to submit a request.";
}
