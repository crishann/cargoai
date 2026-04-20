import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

function formatMoney(value) {
  return `P${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function capitalize(value) {
  const text = String(value || "");
  if (!text) return "Not available";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function CarInventoryOverview() {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadInventory();
  }, []);

  async function loadInventory() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/car-inventory");
      setOwners(data.owners || []);
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to load car inventory");
    } finally {
      setLoading(false);
    }
  }

  const filteredOwners = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return owners;

    return owners
      .map((owner) => ({
        ...owner,
        vehicles: owner.vehicles.filter((vehicle) =>
          [
            owner.username,
            owner.email,
            owner.companyName,
            vehicle.brand,
            vehicle.model,
            vehicle.carType,
            vehicle.plateNumber,
            vehicle.status,
            vehicle.approvalStatus,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(normalized)
        ),
      }))
      .filter(
        (owner) =>
          owner.vehicles.length > 0 ||
          [owner.username, owner.email, owner.companyName].filter(Boolean).join(" ").toLowerCase().includes(normalized)
      );
  }, [owners, searchTerm]);

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">Car Inventory Overview</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Cars by owner</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Review every car owner and inspect the full details of each vehicle from one admin inventory workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={loadInventory}
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search owner, email, company, vehicle, plate, or status"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--cargo-blue-bright)] focus:bg-white"
          />
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <section className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-8 text-sm text-slate-500 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          Loading car inventory...
        </section>
      ) : filteredOwners.length === 0 ? (
        <section className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white px-5 py-8 text-sm text-slate-500 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          No owner or vehicle records match this search.
        </section>
      ) : (
        filteredOwners.map((owner) => (
          <section key={owner.ownerId} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xl font-semibold text-slate-900">{owner.username}</p>
                <p className="mt-1 text-sm text-slate-500">{owner.email}</p>
                {owner.companyName ? <p className="mt-1 text-sm text-slate-500">Company: {owner.companyName}</p> : null}
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
                {owner.vehicles.length} {owner.vehicles.length === 1 ? "vehicle" : "vehicles"}
              </div>
            </div>

            {owner.vehicles.length === 0 ? (
              <div className="mt-4 rounded-[1rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                This owner has no vehicles on record.
              </div>
            ) : (
              <div className="mt-5 overflow-hidden rounded-[1.2rem] border border-slate-200">
                <div className="hidden grid-cols-[1.6fr_0.9fr_0.8fr_0.9fr_1fr_1.8fr] gap-4 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:grid">
                  <span>Vehicle</span>
                  <span>Plate</span>
                  <span>Seats</span>
                  <span>Rate</span>
                  <span>Status</span>
                  <span>Features</span>
                </div>

                <div className="divide-y divide-slate-200">
                  {owner.vehicles.map((vehicle) => (
                    <article key={vehicle.vehicleId} className="px-4 py-4 lg:px-5">
                      <div className="hidden grid-cols-[1.6fr_0.9fr_0.8fr_0.9fr_1fr_1.8fr] gap-4 lg:grid lg:items-start">
                        <div>
                          <p className="text-base font-semibold text-slate-900">
                            {vehicle.brand} {vehicle.model}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {vehicle.carType || "Vehicle"} • {vehicle.year || "Year not set"}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">Vehicle ID: {vehicle.vehicleId}</p>
                        </div>
                        <div className="text-sm font-medium text-slate-700">{vehicle.plateNumber}</div>
                        <div className="text-sm font-medium text-slate-700">{vehicle.seatCapacity ?? "N/A"}</div>
                        <div className="text-sm font-semibold text-slate-900">{formatMoney(vehicle.ratePerDay)}</div>
                        <div className="space-y-2">
                          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
                            {capitalize(vehicle.status)}
                          </div>
                          <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--cargo-blue-deep)]">
                            {capitalize(vehicle.approvalStatus)}
                          </div>
                        </div>
                        <div className="text-sm leading-6 text-slate-600">
                          {vehicle.features ? vehicle.features : "No features listed."}
                        </div>
                      </div>

                      <div className="space-y-3 lg:hidden">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold text-slate-900">{vehicle.brand} {vehicle.model}</p>
                            <p className="mt-1 text-sm text-slate-500">{vehicle.carType || "Vehicle"} • {vehicle.year || "Year not set"}</p>
                          </div>
                          <div className="space-y-2 text-right">
                            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
                              {capitalize(vehicle.status)}
                            </div>
                            <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--cargo-blue-deep)]">
                              {capitalize(vehicle.approvalStatus)}
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <MobileDetail label="Plate" value={vehicle.plateNumber} />
                          <MobileDetail label="Seats" value={vehicle.seatCapacity ?? "N/A"} />
                          <MobileDetail label="Rate per day" value={formatMoney(vehicle.ratePerDay)} />
                          <MobileDetail label="Vehicle ID" value={vehicle.vehicleId} />
                        </div>

                        <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                          <span className="font-semibold text-slate-900">Features:</span> {vehicle.features || "No features listed."}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}

function MobileDetail({ label, value }) {
  return (
    <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
