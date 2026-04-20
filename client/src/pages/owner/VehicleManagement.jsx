import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";

const statusOrder = ["available", "booked", "maintenance", "inactive"];

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    setLoading(true);
    try {
      const { data } = await api.get("/owner/vehicles");
      setVehicles(data.vehicles || []);
      setError("");
    } catch (fetchError) {
      setError(fetchError?.response?.data?.message || "Failed to load vehicle management data");
    } finally {
      setLoading(false);
    }
  }

  const counts = useMemo(() => {
    const base = { all: vehicles.length, available: 0, booked: 0, maintenance: 0, inactive: 0 };
    for (const vehicle of vehicles) {
      const key = statusOrder.includes(vehicle.status) ? vehicle.status : "inactive";
      base[key] += 1;
    }
    return base;
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    if (activeFilter === "all") return vehicles;
    return vehicles.filter((vehicle) => vehicle.status === activeFilter);
  }, [activeFilter, vehicles]);

  const statusCards = [
    { key: "available", label: "Available", tone: "bg-emerald-400", text: "Ready to accept bookings" },
    { key: "booked", label: "Booked", tone: "bg-sky-400", text: "Currently reserved by renters" },
    { key: "maintenance", label: "Maintenance", tone: "bg-amber-400", text: "Temporarily out for service" },
    { key: "inactive", label: "Inactive", tone: "bg-slate-400", text: "Not visible for booking yet" },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <article className="rounded-[1.5rem] bg-[linear-gradient(135deg,_#0f172a,_#1e3a8a_60%,_#2563eb)] px-5 py-5 text-white shadow-[0_20px_45px_rgba(30,58,138,0.16)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">Vehicle management</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[2rem]">Track fleet readiness, booking state, and listing visibility</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-blue-50/90">
            This page is connected to your `vehicles` and `vehicle_image` tables, so inventory status and counts reflect your current MySQL records.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/owner/vehicle-list" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900">
              Open vehicle list
            </Link>
            <button
              type="button"
              onClick={loadVehicles}
              className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur"
            >
              Refresh data
            </button>
          </div>
        </article>

        <article className="rounded-[1.5rem] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.85)] sm:p-5">
          <p className="text-sm text-slate-500">Inventory pulse</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Status distribution</h2>
          <div className="mt-4 space-y-3">
            {statusCards.map((item) => (
              <div key={item.key}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.text}</p>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">{counts[item.key]}</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${item.tone}`}
                    style={{ width: `${counts.all > 0 ? Math.max((counts[item.key] / counts.all) * 100, counts[item.key] ? 8 : 0) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-[1.5rem] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.85)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Filter inventory</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Manage vehicles by current state</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: `All (${counts.all})` },
              { key: "available", label: `Available (${counts.available})` },
              { key: "booked", label: `Booked (${counts.booked})` },
              { key: "maintenance", label: `Maintenance (${counts.maintenance})` },
              { key: "inactive", label: `Inactive (${counts.inactive})` },
            ].map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeFilter === filter.key ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {loading ? (
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">Loading vehicles...</div>
          ) : filteredVehicles.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
              No vehicles found for the selected filter.
            </div>
          ) : (
            filteredVehicles.map((vehicle) => (
              <article key={vehicle.vehicleId} className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff,_#f8fafc)]">
                <div
                  className="h-44 bg-[linear-gradient(135deg,_#dbeafe,_#e2e8f0)] bg-cover bg-center"
                  style={vehicle.imageUrl ? { backgroundImage: `url(http://localhost:5000${vehicle.imageUrl})` } : undefined}
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{vehicle.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {vehicle.carType || "Vehicle"} • {vehicle.year} • {vehicle.seatCapacity ? `${vehicle.seatCapacity} seats • ` : ""}Plate {vehicle.plateNumber}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                        vehicle.status === "available"
                          ? "bg-emerald-50 text-emerald-700"
                          : vehicle.status === "booked"
                            ? "bg-sky-50 text-sky-700"
                            : vehicle.status === "maintenance"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {vehicle.status}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-3 rounded-[1rem] bg-slate-50 p-3 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Rate</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        P{Number(vehicle.ratePerDay).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Seats</p>
                      <p className="mt-1 font-semibold text-slate-900">{vehicle.seatCapacity || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Type</p>
                      <p className="mt-1 font-semibold text-slate-900">{vehicle.carType || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Photos</p>
                      <p className="mt-1 font-semibold text-slate-900">{vehicle.imageCount}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Record ID</p>
                      <p className="mt-1 font-semibold text-slate-900">#{vehicle.vehicleId}</p>
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{vehicle.features || "No features added yet for this vehicle."}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link to="/owner/vehicle-list" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                      Edit listing
                    </Link>
                    <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                      Manage blockouts
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
