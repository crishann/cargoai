import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

function SummaryCard({ label, value, helper }) {
  return (
    <div className="rounded-[1.3rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{helper}</p>
    </div>
  );
}

export default function Overview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    loadOverview();
  }, []);

  async function loadOverview() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/overview");
      setStats(data.stats || null);
      setInventory(data.inventory || []);
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to load admin overview");
    } finally {
      setLoading(false);
    }
  }

  const inventorySummary = useMemo(
    () => ({
      ownersWithVehicles: inventory.filter((item) => item.totalVehicles > 0).length,
      totalVehicles: inventory.reduce((sum, item) => sum + Number(item.totalVehicles || 0), 0),
      availableVehicles: inventory.reduce((sum, item) => sum + Number(item.availableVehicles || 0), 0),
      bookedVehicles: inventory.reduce((sum, item) => sum + Number(item.bookedVehicles || 0), 0),
      maintenanceVehicles: inventory.reduce((sum, item) => sum + Number(item.maintenanceVehicles || 0), 0),
    }),
    [inventory]
  );

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">Dashboard Overview</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">See car inventory overview</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Monitor the full car inventory across all car owners, along with the main admin platform totals.
            </p>
          </div>
          <button
            type="button"
            onClick={loadOverview}
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          >
            Refresh
          </button>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <section className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-8 text-sm text-slate-500 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          Loading admin overview...
        </section>
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-4">
            <SummaryCard label="Total Users" value={String(stats?.totalUsers || 0)} helper="all registered accounts" />
            <SummaryCard label="Total Vehicles" value={String(stats?.totalVehicles || 0)} helper="inventory across owners" />
            <SummaryCard label="Active Bookings" value={String(stats?.activeBookings || 0)} helper="pending, confirmed, and ongoing" />
            <SummaryCard label="Open Complaints" value={String(stats?.openComplaints || 0)} helper="open and in review issues" />
          </section>

          <section className="grid gap-4 xl:grid-cols-5">
            <SummaryCard label="Car Owners With Inventory" value={String(inventorySummary.ownersWithVehicles)} helper="owners with at least one vehicle" />
            <SummaryCard label="Available Cars" value={String(inventorySummary.availableVehicles)} helper="ready for booking" />
            <SummaryCard label="Booked Cars" value={String(inventorySummary.bookedVehicles)} helper="currently assigned" />
            <SummaryCard label="In Maintenance" value={String(inventorySummary.maintenanceVehicles)} helper="temporarily unavailable" />
            <SummaryCard label="Pending Vehicle Approvals" value={String(stats?.pendingVehicleApprovals || 0)} helper="awaiting admin review" />
          </section>

          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">Car Inventory</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Per car owner overview</h2>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[var(--cargo-blue-deep)]">
                {inventory.length} owner accounts
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {inventory.length === 0 ? (
                <div className="rounded-[1rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                  No owner inventory found yet.
                </div>
              ) : (
                inventory.map((item) => (
                  <article key={item.ownerId} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{item.username}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.email}</p>
                        {item.companyName ? <p className="mt-1 text-sm text-slate-500">Company: {item.companyName}</p> : null}
                      </div>
                      <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
                        {item.totalVehicles} vehicles
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      <InventoryStat label="Total" value={item.totalVehicles} />
                      <InventoryStat label="Available" value={item.availableVehicles} />
                      <InventoryStat label="Booked" value={item.bookedVehicles} />
                      <InventoryStat label="Maintenance" value={item.maintenanceVehicles} />
                      <InventoryStat label="Inactive" value={item.inactiveVehicles} />
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function InventoryStat({ label, value }) {
  return (
    <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
