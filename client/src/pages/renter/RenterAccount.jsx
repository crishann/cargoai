import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { saveAuthSession } from "../../lib/auth";

function InfoRow({ label, value, tone = "default" }) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "warn"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <div className="flex items-center justify-between gap-4 rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${toneClass}`}>
        {value}
      </span>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-2">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
      {children}
    </label>
  );
}

function SectionCard({ eyebrow, title, description, children }) {
  return (
    <section className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
          {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function RenterAccount() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [account, setAccount] = useState(null);
  const [form, setForm] = useState({
    username: "",
    email: "",
    governmentId: "",
    address: "",
    phoneNumber: "",
  });

  useEffect(() => {
    loadAccount();
  }, []);

  async function loadAccount() {
    setLoading(true);
    try {
      const { data } = await api.get("/auth/account");
      const nextAccount = data.account || null;
      setAccount(nextAccount);
      setForm({
        username: nextAccount?.username || "",
        email: nextAccount?.email || "",
        governmentId: nextAccount?.governmentId || "",
        address: nextAccount?.address || "",
        phoneNumber: nextAccount?.phoneNumber || "",
      });
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to load account");
    } finally {
      setLoading(false);
    }
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveAccount(event) {
    event.preventDefault();
    setSaving(true);
    setSuccess("");

    try {
      const { data } = await api.patch("/auth/account", form);
      const nextAccount = data.account || null;
      setAccount(nextAccount);
      setForm({
        username: nextAccount?.username || "",
        email: nextAccount?.email || "",
        governmentId: nextAccount?.governmentId || "",
        address: nextAccount?.address || "",
        phoneNumber: nextAccount?.phoneNumber || "",
      });
      if (data.token && data.user) {
        saveAuthSession({ token: data.token, user: data.user });
      }
      setError("");
      setSuccess("Your account details were updated successfully.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to update account");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-[1.4rem] border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
        Loading account settings...
      </section>
    );
  }

  const verificationTone = account?.emailVerified ? "success" : "warn";
  const verificationLabel = account?.emailVerified ? "Verified" : "Pending";

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-[linear-gradient(135deg,_#f7fbff,_#ffffff_60%,_#eef5ff)] shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.25rem] bg-[linear-gradient(135deg,_#dbeafe,_#bfdbfe)] text-lg font-semibold text-[var(--cargo-blue-deep)]">
              {(account?.username || "RT").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">Account Center</p>
              <h1 className="mt-2 text-[1.9rem] font-semibold tracking-tight text-slate-950">{account?.username || "Renter"}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Control the personal details attached to your reservations, invoices, and booking notifications.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.1rem] border border-white/70 bg-white/90 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Primary Email</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{account?.email || "Not available"}</p>
            </div>
            <div className="rounded-[1.1rem] border border-white/70 bg-white/90 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Renter ID</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {account?.renterId ? `RT-${String(account.renterId).padStart(4, "0")}` : "Not assigned"}
              </p>
            </div>
            <div className="rounded-[1.1rem] border border-white/70 bg-white/90 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Account Status</p>
              <p className="mt-2 text-sm font-semibold capitalize text-slate-900">{account?.accountStatus || "active"}</p>
            </div>
            <div className="rounded-[1.1rem] border border-white/70 bg-white/90 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Verification</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{verificationLabel}</p>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-[1.1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-[1.1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.84fr_1.16fr]">
        <div className="space-y-5">
          <SectionCard
            eyebrow="Account Overview"
            title="Security and status"
            description="Quick account signals so you can see what is active, verified, and attached to your renter profile."
          >
            <div className="space-y-3">
              <InfoRow label="Account access" value={account?.accountStatus || "active"} />
              <InfoRow label="Email verification" value={verificationLabel} tone={verificationTone} />
              <InfoRow label="Role" value={(account?.role || "renter").replace(/^./, (char) => char.toUpperCase())} />
            </div>
            <div className="mt-4 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
              Your email and profile details appear on booking records and are used for reservation updates and invoice references.
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Profile Snapshot"
            title="Current information on file"
            description="These details are the current values saved in your renter account."
          >
            <div className="space-y-3">
              <SnapshotRow label="Username" value={account?.username || "Not set"} />
              <SnapshotRow label="Email" value={account?.email || "Not set"} />
              <SnapshotRow label="Phone number" value={account?.phoneNumber || "Not set"} />
              <SnapshotRow label="Government ID" value={account?.governmentId || "Not set"} />
              <SnapshotRow label="Address" value={account?.address || "Not set"} multiline />
            </div>
          </SectionCard>
        </div>

        <SectionCard
          eyebrow="Edit Details"
          title="Update personal information"
          description="Keep these details accurate so renters, owners, invoices, and notifications use the right contact information."
        >
          <form onSubmit={saveAccount} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Username" hint="Shown across your renter account and booking records.">
                <input
                  type="text"
                  value={form.username}
                  onChange={(event) => updateField("username", event.target.value)}
                  className="w-full rounded-[1rem] border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--cargo-blue-deep)] focus:bg-white"
                />
              </Field>

              <Field label="Email address" hint="Used for login, notifications, and invoices.">
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  className="w-full rounded-[1rem] border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--cargo-blue-deep)] focus:bg-white"
                />
              </Field>

              <Field label="Phone number" hint="Optional contact number for booking coordination.">
                <input
                  type="text"
                  value={form.phoneNumber}
                  onChange={(event) => updateField("phoneNumber", event.target.value)}
                  placeholder="Add phone number"
                  className="w-full rounded-[1rem] border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--cargo-blue-deep)] focus:bg-white"
                />
              </Field>

              <Field label="Government ID" hint="Optional ID reference for verification or release steps.">
                <input
                  type="text"
                  value={form.governmentId}
                  onChange={(event) => updateField("governmentId", event.target.value)}
                  placeholder="Add government ID"
                  className="w-full rounded-[1rem] border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--cargo-blue-deep)] focus:bg-white"
                />
              </Field>
            </div>

            <Field label="Address" hint="Optional address attached to your renter profile.">
              <textarea
                rows="5"
                value={form.address}
                onChange={(event) => updateField("address", event.target.value)}
                placeholder="Add address"
                className="w-full rounded-[1rem] border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--cargo-blue-deep)] focus:bg-white"
              />
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Save account changes</p>
                <p className="mt-1 text-xs text-slate-500">Your latest profile details will be reflected in the renter interface after saving.</p>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[var(--cargo-blue-deep)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}

function SnapshotRow({ label, value, multiline = false }) {
  return (
    <div className={`rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 ${multiline ? "" : "flex items-center justify-between gap-4"}`}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`text-sm font-semibold text-slate-900 ${multiline ? "mt-2 leading-6" : "text-right"}`}>{value}</p>
    </div>
  );
}
