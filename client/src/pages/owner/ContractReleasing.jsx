import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function ContractReleasing() {
  const [error, setError] = useState("");
  const [templateTitle, setTemplateTitle] = useState("Rental Agreement");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("0");

  useEffect(() => {
    loadContracts();
  }, []);

  async function loadContracts() {
    try {
      const { data } = await api.get("/owner/contracts");
      setTemplateTitle(data.template?.templateTitle || "Rental Agreement");
      setTermsAndConditions(data.template?.termsAndConditions || "");
      setSecurityDeposit(String(data.template?.securityDeposit || 0));
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to load contracts");
    }
  }

  async function saveTemplate() {
    try {
      await api.put("/owner/contracts/template", {
        templateTitle,
        termsAndConditions,
        securityDeposit: Number(securityDeposit || 0),
      });
      await loadContracts();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to save contract template");
    }
  }

  return (
    <div className="space-y-6">
      {/* <section className="flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">Contract Releasing</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Manage one owner contract template and booking contract status</h1>
        </div>
        <button
          type="button"
          onClick={loadContracts}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
        >
          Refresh
        </button>
      </section> */}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">Contract</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Manage one owner contract template and booking contract status</h2>
          </div>
        </div>
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Template title
            <input
              type="text"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--cargo-blue-bright)]"
              value={templateTitle}
              onChange={(event) => setTemplateTitle(event.target.value)}
              placeholder="Rental Agreement"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Security deposit
            <input
              type="number"
              min="0"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--cargo-blue-bright)]"
              value={securityDeposit}
              onChange={(event) => setSecurityDeposit(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Terms and conditions
            <textarea
              rows="10"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[var(--cargo-blue-bright)]"
              value={termsAndConditions}
              onChange={(event) => setTermsAndConditions(event.target.value)}
              placeholder="Write the reusable contract template that renters must review and agree to."
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={saveTemplate}
            className="rounded-full bg-[var(--cargo-blue-deep)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95"
          >
            Edit template
          </button>
        </div>
      </section>

    </div>
  );
}
