import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";

function formatMoney(value) {
  return `P${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function RenterCarList() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingVehicle, setBookingVehicle] = useState(null);
  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    pickupLocation: "",
    dropoffLocation: "",
  });
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    setLoading(true);
    try {
      const { data } = await api.get("/renter/vehicles");
      setVehicles(data.vehicles || []);
      setError("");
    } catch (fetchError) {
      setError(fetchError?.response?.data?.message || "Failed to load available cars");
    } finally {
      setLoading(false);
    }
  }

  function openBookingForm(vehicle) {
    setBookingVehicle(vehicle);
    setForm({
      startDate: "",
      endDate: "",
      pickupLocation: "",
      dropoffLocation: "",
    });
    setSubmitError("");
  }

  function closeBookingForm() {
    if (submitting) return;
    setBookingVehicle(null);
    setSubmitError("");
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitBooking(event) {
    event.preventDefault();
    if (!bookingVehicle) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      await api.post("/renter/bookings", {
        vehicleId: bookingVehicle.vehicleId,
        startDate: form.startDate,
        endDate: form.endDate,
        pickupLocation: form.pickupLocation,
        dropoffLocation: form.dropoffLocation,
      });

      setBookingVehicle(null);
      window.location.href = "/renter/bookings";
    } catch (submitBookingError) {
      setSubmitError(submitBookingError?.response?.data?.message || "Failed to create reservation");
    } finally {
      setSubmitting(false);
    }
  }

  const estimatedTotal =
    bookingVehicle && form.startDate && form.endDate && form.endDate >= form.startDate
      ? (() => {
          const start = new Date(`${form.startDate}T00:00:00`);
          const end = new Date(`${form.endDate}T00:00:00`);
          const days = Math.round((end - start) / 86400000) + 1;
          return days > 0 ? bookingVehicle.ratePerDay * days : null;
        })()
      : null;

  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">
              Car List
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Available vehicles for renters</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadVehicles}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Refresh
            </button>
            <Link
              to="/renter/history"
              className="rounded-full bg-[var(--cargo-blue-deep)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
            >
              View history
            </Link>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6">
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {loading ? (
            <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm text-slate-500">Loading available cars...</div>
          ) : vehicles.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
              No available cars found right now.
            </div>
          ) : (
            vehicles.map((vehicle) => (
              <article
                key={vehicle.vehicleId}
                className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff,_#f8fafc)] shadow-[0_12px_28px_rgba(15,23,42,0.05)]"
              >
                <div className="h-36 bg-[linear-gradient(135deg,_#dbeafe,_#eff6ff_60%,_#ffffff)]">
                  {vehicle.imageUrl ? (
                    <img src={`http://localhost:5000${vehicle.imageUrl}`} alt={vehicle.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-slate-500">
                      No vehicle photo uploaded
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{vehicle.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {vehicle.year} • Plate {vehicle.plateNumber}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {vehicle.status}
                    </span>
                  </div>

                  <div className="rounded-[1rem] bg-slate-50 px-3 py-2.5">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Daily rate</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{formatMoney(vehicle.ratePerDay)}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Features</p>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-slate-600">
                      {vehicle.features || "No extra features listed yet."}
                    </p>
                  </div>

                  <div className="mt-auto pt-2">
                    <button
                      type="button"
                      onClick={() => openBookingForm(vehicle)}
                      className="w-full rounded-full bg-[var(--cargo-blue-deep)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95"
                    >
                      Reserve Now
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {bookingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-2xl rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">
                  Reserve Vehicle
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">{bookingVehicle.title}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {bookingVehicle.year} • Plate {bookingVehicle.plateNumber} • {formatMoney(bookingVehicle.ratePerDay)} per day
                </p>
              </div>
              <button
                type="button"
                onClick={closeBookingForm}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <form onSubmit={submitBooking} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Start date</span>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) => updateForm("startDate", event.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    required
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--cargo-blue-deep)]"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">End date</span>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(event) => updateForm("endDate", event.target.value)}
                    min={form.startDate || new Date().toISOString().slice(0, 10)}
                    required
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--cargo-blue-deep)]"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Pickup location</span>
                  <input
                    type="text"
                    value={form.pickupLocation}
                    onChange={(event) => updateForm("pickupLocation", event.target.value)}
                    placeholder="Enter pickup location"
                    required
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--cargo-blue-deep)]"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Dropoff location</span>
                  <input
                    type="text"
                    value={form.dropoffLocation}
                    onChange={(event) => updateForm("dropoffLocation", event.target.value)}
                    placeholder="Enter dropoff location"
                    required
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--cargo-blue-deep)]"
                  />
                </label>
              </div>

              <div className="rounded-[1.25rem] bg-slate-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Estimated total</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {estimatedTotal === null ? "Select dates" : formatMoney(estimatedTotal)}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  This creates a pending booking and checks for date conflicts before saving.
                </p>
              </div>

              {submitError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={closeBookingForm}
                  className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-[var(--cargo-blue-deep)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Confirm Reservation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
