import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../../lib/api";

const emptyForm = {
  brand: "",
  model: "",
  carType: "",
  year: "",
  seatCapacity: "",
  plateNumber: "",
  ratePerDay: "",
  status: "inactive",
  features: "",
};

export default function VehicleList() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [respondingReviewId, setRespondingReviewId] = useState(null);
  const [responseDrafts, setResponseDrafts] = useState({});
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const previewUrls = useMemo(() => selectedFiles.map((file) => URL.createObjectURL(file)), [selectedFiles]);
  const vehicleCounts = useMemo(() => {
    const counts = { all: vehicles.length, available: 0, booked: 0, maintenance: 0, inactive: 0 };
    for (const vehicle of vehicles) {
      const key = counts[vehicle.status] !== undefined ? vehicle.status : "inactive";
      counts[key] += 1;
    }
    return counts;
  }, [vehicles]);

  const visibleVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const haystack = [
        vehicle.title,
        vehicle.brand,
        vehicle.model,
        vehicle.carType,
        vehicle.year,
        vehicle.plateNumber,
        vehicle.features,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = haystack.includes(searchTerm.trim().toLowerCase());
      const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, vehicles]);

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  async function loadVehicles() {
    setLoading(true);
    try {
      const { data } = await api.get("/owner/vehicles");
      const nextVehicles = data.vehicles || [];
      setVehicles(nextVehicles);
      setSelectedVehicle((current) =>
        current ? nextVehicles.find((vehicle) => vehicle.vehicleId === current.vehicleId) || null : null
      );
      setError("");
    } catch (fetchError) {
      setError(fetchError?.response?.data?.message || "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingVehicle(null);
    setForm(emptyForm);
    setSelectedFiles([]);
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  }

  function openEditModal(vehicle) {
    setEditingVehicle(vehicle);
    setForm({
      brand: vehicle.brand || "",
      model: vehicle.model || "",
      carType: vehicle.carType || "",
      year: vehicle.year ? String(vehicle.year) : "",
      seatCapacity: vehicle.seatCapacity ? String(vehicle.seatCapacity) : "",
      plateNumber: vehicle.plateNumber || "",
      ratePerDay: vehicle.ratePerDay ? String(vehicle.ratePerDay) : "",
      status: vehicle.status || "inactive",
      features: vehicle.features || "",
    });
    setSelectedFiles([]);
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  }

  function openVehicleReviews(vehicle) {
    setSelectedVehicle(vehicle);
    setResponseDrafts(
      Object.fromEntries((vehicle.reviews || []).map((review) => [review.reviewId, review.ownerResponse || ""]))
    );
  }

  async function submitOwnerResponse(vehicleId, reviewId) {
    const ownerResponse = String(responseDrafts[reviewId] || "").trim();
    if (!ownerResponse) {
      setError("Owner response cannot be empty");
      return;
    }

    setRespondingReviewId(reviewId);
    try {
      await api.patch(`/owner/vehicles/${vehicleId}/reviews/${reviewId}/respond`, { ownerResponse });
      await loadVehicles();
      setSuccess("Owner response saved successfully.");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to save owner response");
    } finally {
      setRespondingReviewId(null);
    }
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingVehicle(null);
    setForm(emptyForm);
    setSelectedFiles([]);
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleFileChange(event) {
    const files = Array.from(event.target.files || []).slice(0, 3);
    setSelectedFiles(files);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      selectedFiles.forEach((file) => payload.append("images", file));

      if (editingVehicle) {
        await api.put(`/owner/vehicles/${editingVehicle.vehicleId}`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setSuccess("Vehicle updated successfully.");
      } else {
        await api.post("/owner/vehicles", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setSuccess("Vehicle listing saved successfully.");
      }

      await loadVehicles();
      closeModal();
    } catch (saveError) {
      setError(saveError?.response?.data?.message || "Failed to save vehicle");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      )}

      <section className="rounded-[1.75rem] bg-[linear-gradient(180deg,_#ffffff,_#fbfdff)] px-5 py-5 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.85)] sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--cargo-blue-bright)]">
              Owner Garage
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Vehicle inventory
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Browse listings, switch between status views, and manage your fleet from one clean inventory screen.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadVehicles}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-full bg-[var(--cargo-blue-deep)] px-4 py-2 text-sm font-semibold text-white"
            >
              Add vehicle
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex min-w-0 flex-1 items-center gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 focus-within:border-[var(--cargo-blue-bright)] focus-within:bg-white">
            <SearchIcon className="h-4 w-4 shrink-0" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by brand, model, type, plate number, or feature"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
          {(searchTerm || statusFilter !== "all") ? (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Clear filters
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {[
            { key: "all", label: "All vehicles" },
            { key: "available", label: "Available" },
            { key: "booked", label: "Booked" },
            { key: "maintenance", label: "Maintenance" },
            { key: "inactive", label: "Inactive" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setStatusFilter(item.key)}
              className={`min-w-[128px] rounded-[1.35rem] border px-4 py-3 text-left transition sm:min-w-[138px] ${
                statusFilter === item.key
                  ? "border-[#cfe0ff] bg-[linear-gradient(180deg,_#edf4ff,_#dce9ff)] text-[var(--cargo-blue-deep)] shadow-[0_10px_24px_rgba(37,99,235,0.12)]"
                  : "border-slate-200 bg-white text-slate-900 hover:border-[#d7e4fb] hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className={`text-base font-medium ${statusFilter === item.key ? "text-[var(--cargo-blue-deep)]" : "text-slate-900"}`}>
                  {item.label}
                </p>
                <span
                  className={`inline-flex min-w-7 items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                    statusFilter === item.key ? "bg-white text-[var(--cargo-blue-deep)]" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {vehicleCounts[item.key]}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-4 text-sm text-slate-500">
          Showing <span className="font-semibold text-slate-900">{visibleVehicles.length}</span> of <span className="font-semibold text-slate-900">{vehicles.length}</span> vehicles
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {loading ? (
            <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">Loading vehicles...</div>
          ) : vehicles.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
              No vehicles yet. Click `Add vehicle` to create your first listing.
            </div>
          ) : visibleVehicles.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
              No vehicles matched your current search or status filter.
            </div>
          ) : (
            visibleVehicles.map((listing) => (
              <article key={listing.vehicleId} className="rounded-[1.25rem] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff,_#f8fafc)] p-4">
                <div
                  className="h-40 rounded-[1rem] bg-[linear-gradient(135deg,_#dbeafe,_#e2e8f0)] bg-cover bg-center"
                  style={listing.imageUrl ? { backgroundImage: `url(http://localhost:5000${listing.imageUrl})` } : undefined}
                />
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{listing.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {listing.carType || "Vehicle"} • {listing.year} • {listing.seatCapacity ? `${listing.seatCapacity} seats • ` : ""}Plate {listing.plateNumber}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-600">{listing.status}</span>
                </div>
                <p className="mt-3 text-sm font-semibold text-[var(--cargo-blue-deep)]">
                  {listing.reviewSummary?.reviewCount
                    ? `${listing.reviewSummary.averageRating}/5 average • ${listing.reviewSummary.reviewCount} review${listing.reviewSummary.reviewCount === 1 ? "" : "s"}`
                    : "No renter ratings yet"}
                </p>
                <p className="mt-4 text-sm font-semibold text-[var(--cargo-blue-deep)]">
                  P{Number(listing.ratePerDay).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/day
                </p>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{listing.features || "No feature summary added yet."}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                    {listing.imageCount} image{listing.imageCount === 1 ? "" : "s"}
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openVehicleReviews(listing)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                      Reviews
                    </button>
                    <button type="button" onClick={() => openEditModal(listing)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                      Edit
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {selectedVehicle &&
        createPortal(
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm sm:p-6">
            <div className="flex min-h-full items-start justify-center pt-4 sm:pt-8">
              <div className="w-full max-w-3xl rounded-[1.75rem] bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">Vehicle reviews</p>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-900">{selectedVehicle.title}</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      {selectedVehicle.reviewSummary?.reviewCount
                        ? `${selectedVehicle.reviewSummary.averageRating}/5 average from ${selectedVehicle.reviewSummary.reviewCount} renter review${selectedVehicle.reviewSummary.reviewCount === 1 ? "" : "s"}`
                        : "No renter feedback yet"}
                    </p>
                  </div>
                  <button type="button" onClick={() => setSelectedVehicle(null)} className="rounded-xl px-3 py-1.5 text-lg text-slate-400 hover:bg-slate-100">
                    x
                  </button>
                </div>

                <div className="space-y-4 px-5 py-5 sm:px-6">
                  {selectedVehicle.reviewSummary?.reviewCount ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <ReviewInfoCard label="Overall" value={`${selectedVehicle.reviewSummary.averageRating}/5`} />
                      <ReviewInfoCard label="Car" value={`${selectedVehicle.reviewSummary.averageCarRating}/5`} />
                      <ReviewInfoCard label="Experience" value={`${selectedVehicle.reviewSummary.averageExperienceRating}/5`} />
                    </div>
                  ) : null}

                  {selectedVehicle.reviews?.length ? (
                    selectedVehicle.reviews.map((review) => (
                      <article key={review.reviewId} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{review.renterName}</p>
                            <p className="mt-1 text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--cargo-blue-deep)]">
                            {review.averageRating.toFixed(1)}/5
                          </span>
                        </div>
                        <p className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                          Car {review.carRating}/5 • Experience {review.experienceRating}/5
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{review.reviewText || "No written feedback provided."}</p>

                        <div className="mt-4 rounded-[1rem] border border-slate-200 bg-white p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Owner response</p>
                          <textarea
                            rows="3"
                            value={responseDrafts[review.reviewId] || ""}
                            onChange={(event) => setResponseDrafts((current) => ({ ...current, [review.reviewId]: event.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--cargo-blue-bright)]"
                            placeholder="Write a short reply to this renter review."
                          />
                          <div className="mt-3 flex justify-end">
                            <button
                              type="button"
                              onClick={() => submitOwnerResponse(selectedVehicle.vehicleId, review.reviewId)}
                              disabled={respondingReviewId === review.reviewId}
                              className="rounded-full bg-[var(--cargo-blue-deep)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {respondingReviewId === review.reviewId ? "Saving..." : review.ownerResponse ? "Update response" : "Post response"}
                            </button>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                      No renter reviews yet for this vehicle.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm sm:p-6">
            <div className="flex min-h-full items-start justify-center pt-4 sm:pt-8">
              <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl lg:max-w-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
                  <div>
                    <p className="text-sm text-slate-500">{editingVehicle ? "Edit vehicle" : "Add vehicle"}</p>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                      {editingVehicle ? "Update listing details" : "Create a new listing"}
                    </h2>
                  </div>
                  <button type="button" onClick={closeModal} className="rounded-xl px-3 py-1.5 text-lg text-slate-400 hover:bg-slate-100">
                    x
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="px-5 py-5 sm:px-6">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Field label="Brand">
                      <input value={form.brand} onChange={(event) => updateField("brand", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[var(--cargo-blue-bright)]" placeholder="Toyota" />
                    </Field>
                    <Field label="Model">
                      <input value={form.model} onChange={(event) => updateField("model", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[var(--cargo-blue-bright)]" placeholder="Raize" />
                    </Field>
                    <Field label="Year">
                      <input value={form.year} onChange={(event) => updateField("year", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[var(--cargo-blue-bright)]" placeholder="2024" />
                    </Field>
                    <Field label="Car Type">
                      <select value={form.carType} onChange={(event) => updateField("carType", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[var(--cargo-blue-bright)]">
                        <option value="">Select car type</option>
                        <option value="Sedan">Sedan</option>
                        <option value="SUV">SUV</option>
                        <option value="Hatchback">Hatchback</option>
                        <option value="Van">Van</option>
                        <option value="Pickup">Pickup</option>
                        <option value="Crossover">Crossover</option>
                        <option value="MPV">MPV</option>
                        <option value="Coupe">Coupe</option>
                        <option value="Convertible">Convertible</option>
                        <option value="Wagon">Wagon</option>
                      </select>
                    </Field>
                    <Field label="Seat Capacity">
                      <input value={form.seatCapacity} onChange={(event) => updateField("seatCapacity", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[var(--cargo-blue-bright)]" placeholder="5" />
                    </Field>
                    <Field label="Plate Number">
                      <input value={form.plateNumber} onChange={(event) => updateField("plateNumber", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[var(--cargo-blue-bright)]" placeholder="ABC-1234" />
                    </Field>
                    <Field label="Rate Per Day">
                      <input value={form.ratePerDay} onChange={(event) => updateField("ratePerDay", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[var(--cargo-blue-bright)]" placeholder="2800" />
                    </Field>
                    <Field label="Status">
                      <select value={form.status} onChange={(event) => updateField("status", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[var(--cargo-blue-bright)]">
                        <option value="inactive">Inactive</option>
                        <option value="available">Available</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="booked">Booked</option>
                      </select>
                    </Field>
                    <label className="md:col-span-2 block text-sm font-medium text-slate-700">
                      Features
                      <textarea value={form.features} onChange={(event) => updateField("features", event.target.value)} className="mt-1 min-h-[120px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[var(--cargo-blue-bright)]" placeholder="ABS, reverse camera, leather seats, Bluetooth..." />
                    </label>
                    <label className="lg:col-span-2 block text-sm font-medium text-slate-700">
                      Vehicle photos
                      <div className="mt-1 rounded-[1.25rem] border border-dashed border-slate-300 bg-[linear-gradient(135deg,_#f8fafc,_#eff6ff)] p-4">
                        <input id="vehicle-photo-upload" type="file" accept="image/*" multiple onChange={handleFileChange} className="sr-only" />
                        <label
                          htmlFor="vehicle-photo-upload"
                          className="flex cursor-pointer flex-col items-center justify-center rounded-[1rem] border border-white/80 bg-white/85 px-4 py-8 text-center shadow-sm transition hover:border-slate-300 hover:bg-white"
                        >
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-[var(--cargo-blue-deep)]">+</span>
                          <span className="mt-3 text-sm font-semibold text-slate-900">Choose up to 3 photos</span>
                          <span className="mt-1 text-xs text-slate-500">JPG, PNG, or WEBP. New uploads replace old photos when editing.</span>
                        </label>
                      </div>
                    </label>

                    {editingVehicle?.images?.length > 0 && selectedFiles.length === 0 && (
                      <div className="lg:col-span-2">
                        <p className="text-sm font-medium text-slate-700">Current photos</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          {editingVehicle.images.slice(0, 3).map((image) => (
                            <div key={image.imageId} className="overflow-hidden rounded-[1rem] border border-slate-200 bg-white">
                              <div className="h-32 bg-slate-100 bg-cover bg-center" style={{ backgroundImage: `url(http://localhost:5000${image.imageUrl})` }} />
                              <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-500">
                                <span>{image.isPrimary ? "Primary" : "Gallery"}</span>
                                <span>Saved</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {previewUrls.length > 0 && (
                      <div className="lg:col-span-2">
                        <p className="text-sm font-medium text-slate-700">Selected photos</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          {previewUrls.map((url, index) => (
                            <div key={url} className="overflow-hidden rounded-[1rem] border border-slate-200 bg-white">
                              <div className="h-32 bg-slate-100 bg-cover bg-center" style={{ backgroundImage: `url(${url})` }} />
                              <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-500">
                                <span>{index === 0 ? "Primary" : `Photo ${index + 1}`}</span>
                                <span>Ready</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-200 pt-4">
                    <button type="submit" disabled={saving} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                      {saving ? "Saving..." : editingVehicle ? "Save changes" : "Add vehicle"}
                    </button>
                    <button type="button" onClick={closeModal} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function SearchIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16 21 21" strokeLinecap="round" />
    </svg>
  );
}

function ReviewInfoCard({ label, value }) {
  return (
    <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
