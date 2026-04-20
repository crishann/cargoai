import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";

function formatMoney(value) {
  return `P${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function renderStars(rating, size = "h-4 w-4") {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= Math.round(Number(rating || 0));
        return (
          <svg
            key={star}
            viewBox="0 0 24 24"
            className={`${size} ${active ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`}
          >
            <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4.1 5.8-.8L12 3.6Z" />
          </svg>
        );
      })}
    </div>
  );
}

export default function RenterCarList() {
  const location = useLocation();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("any");
  const [budgetFilter, setBudgetFilter] = useState("any");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [bookingVehicle, setBookingVehicle] = useState(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    pickupLocation: "",
    dropoffLocation: "",
    paymentMethod: "gcash",
    agreementName: "",
    agreedToContract: false,
  });
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [availability, setAvailability] = useState({ reservations: [], blockouts: [] });

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    const rebookBooking = location.state?.rebookBooking;
    if (!rebookBooking || vehicles.length === 0) return;

    const matchedVehicle = vehicles.find((vehicle) => vehicle.vehicleId === rebookBooking.vehicleId);
    if (!matchedVehicle) return;

    setBookingVehicle(matchedVehicle);
    setBookingStep(1);
    setForm({
      startDate: rebookBooking.startDate ? String(rebookBooking.startDate).slice(0, 10) : "",
      endDate: rebookBooking.endDate ? String(rebookBooking.endDate).slice(0, 10) : "",
      pickupLocation: rebookBooking.pickupLocation || "",
      dropoffLocation: rebookBooking.dropoffLocation || "",
      paymentMethod: rebookBooking.paymentMethod || "gcash",
      agreementName: "",
      agreedToContract: false,
    });
    setSubmitError("");
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, vehicles]);

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
    setBookingStep(1);
    setForm({
      startDate: "",
      endDate: "",
      pickupLocation: "",
      dropoffLocation: "",
      paymentMethod: "gcash",
      agreementName: "",
      agreedToContract: false,
    });
    setSubmitError("");
    setAvailability({ reservations: [], blockouts: [] });
    setAvailabilityError("");
  }

  function openVehicleDetails(vehicle) {
    setSelectedVehicle(vehicle);
  }

  function closeVehicleDetails() {
    setSelectedVehicle(null);
  }

  function closeBookingForm() {
    if (submitting) return;
    setBookingVehicle(null);
    setBookingStep(1);
    setSubmitError("");
    setAvailability({ reservations: [], blockouts: [] });
    setAvailabilityError("");
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  useEffect(() => {
    if (!bookingVehicle?.vehicleId) return;

    let active = true;

    async function loadAvailability() {
      setAvailabilityLoading(true);
      try {
        const { data } = await api.get(`/renter/vehicles/${bookingVehicle.vehicleId}/availability`);
        if (!active) return;
        setAvailability({
          reservations: data.reservations || [],
          blockouts: data.blockouts || [],
        });
        setAvailabilityError("");
      } catch (requestError) {
        if (!active) return;
        setAvailabilityError(requestError?.response?.data?.message || "Failed to load vehicle availability");
      } finally {
        if (active) setAvailabilityLoading(false);
      }
    }

    loadAvailability();
    return () => {
      active = false;
    };
  }, [bookingVehicle?.vehicleId]);

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
        paymentMethod: form.paymentMethod,
        agreementName: form.agreementName,
        agreedToContract: form.agreedToContract,
      });

      setBookingVehicle(null);
      setBookingStep(1);
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

  const canContinueFromDates = Boolean(bookingVehicle && form.startDate && form.endDate && form.endDate >= form.startDate);
  const canContinueFromDetails = Boolean(form.pickupLocation.trim() && form.dropoffLocation.trim());
  const hasOwnerTemplate = Boolean(bookingVehicle?.contractTemplate?.trim());
  const canContinueFromContract = Boolean(hasOwnerTemplate && form.agreementName.trim() && form.agreedToContract);

  function nextBookingStep() {
    setSubmitError("");

    if (bookingStep === 1 && canContinueFromDates) {
      setBookingStep(2);
      return;
    }

    if (bookingStep === 2 && canContinueFromDetails) {
      setBookingStep(3);
      return;
    }

    if (bookingStep === 3 && canContinueFromContract) {
      setBookingStep(4);
    }
  }

  const conflictingAvailability = (() => {
    if (!form.startDate || !form.endDate || form.endDate < form.startDate) return null;

    const selectedStart = new Date(`${form.startDate}T00:00:00`).getTime();
    const selectedEnd = new Date(`${form.endDate}T23:59:59`).getTime();

    const reservationConflict = availability.reservations.find((entry) => {
      const entryStart = new Date(entry.startDate).getTime();
      const entryEnd = new Date(entry.endDate).getTime();
      return entryStart <= selectedEnd && entryEnd >= selectedStart;
    });

    if (reservationConflict) {
      return {
        type: "reservation",
        label: "This vehicle already has a booking in the selected range.",
        startDate: reservationConflict.startDate,
        endDate: reservationConflict.endDate,
      };
    }

    const blockoutConflict = availability.blockouts.find((entry) => {
      const entryStart = new Date(entry.startDate).getTime();
      const entryEnd = new Date(entry.endDate).getTime();
      return entryStart <= selectedEnd && entryEnd >= selectedStart;
    });

    if (blockoutConflict) {
      return {
        type: "blockout",
        label: blockoutConflict.reason || "This vehicle is blocked out for the selected range.",
        startDate: blockoutConflict.startDate,
        endDate: blockoutConflict.endDate,
      };
    }

    return null;
  })();

  function previousBookingStep() {
    setSubmitError("");
    setBookingStep((current) => Math.max(1, current - 1));
  }

  const filteredVehicles = vehicles.filter((vehicle) => {
    const haystack = [
      vehicle.title,
      vehicle.carType,
      vehicle.year,
      vehicle.plateNumber,
      vehicle.features,
      vehicle.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = haystack.includes(searchTerm.trim().toLowerCase());
    const matchesType =
      typeFilter === "any" ||
      String(vehicle.carType || "")
        .trim()
        .toLowerCase() === typeFilter;
    const rate = Number(vehicle.ratePerDay || 0);
    const matchesBudget =
      budgetFilter === "any" ||
      (budgetFilter === "under-2000" && rate < 2000) ||
      (budgetFilter === "2000-3500" && rate >= 2000 && rate <= 3500) ||
      (budgetFilter === "above-3500" && rate > 3500);

    return matchesSearch && matchesType && matchesBudget;
  });

  return (
    <div className="space-y-6">
      <section>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-5">
          <div className="flex flex-col gap-3 rounded-full border border-slate-200 bg-white p-2 sm:flex-row sm:items-center">
            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 transition focus-within:border-[var(--cargo-blue-bright)] focus-within:bg-white">
            <SearchIcon className="h-4 w-4 shrink-0" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by vehicle, type, plate number, year, or feature"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[var(--cargo-blue-bright)]"
            >
              <option value="any">Any type</option>
              <option value="sedan">Sedan</option>
              <option value="suv">SUV</option>
              <option value="hatchback">Hatchback</option>
              <option value="van">Van</option>
              <option value="pickup">Pickup</option>
              <option value="crossover">Crossover</option>
              <option value="mpv">MPV</option>
              <option value="coupe">Coupe</option>
              <option value="convertible">Convertible</option>
              <option value="wagon">Wagon</option>
            </select>
            <select
              value={budgetFilter}
              onChange={(event) => setBudgetFilter(event.target.value)}
              className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[var(--cargo-blue-bright)]"
            >
              <option value="any">Any budget</option>
              <option value="under-2000">Under P2,000</option>
              <option value="2000-3500">P2,000 - P3,500</option>
              <option value="above-3500">Above P3,500</option>
            </select>
            <button
              type="button"
              className="rounded-full bg-[var(--cargo-blue-deep)] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.22)] hover:opacity-95"
            >
              Search Cars
            </button>
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6">
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {loading ? (
            <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm text-slate-500">Loading available cars...</div>
          ) : vehicles.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
              No available cars found right now.
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
              No vehicles matched your search.
            </div>
          ) : (
            filteredVehicles.map((vehicle) => (
              <article
                key={vehicle.vehicleId}
                role="button"
                tabIndex={0}
                onClick={() => openVehicleDetails(vehicle)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openVehicleDetails(vehicle);
                  }
                }}
                className="flex h-full cursor-pointer flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff,_#f8fafc)] shadow-[0_12px_28px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_36px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-[var(--cargo-blue-bright)] focus:ring-offset-2"
              >
                <div className="h-36 bg-[linear-gradient(135deg,_#dbeafe,_#eff6ff_60%,_#ffffff)]">
                  {vehicle.imageUrl ? (
                    <img src={`http://localhost:5000${vehicle.imageUrl}`} alt={vehicle.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-slate-500">No vehicle photo uploaded</div>
                  )}
                </div>

                <div className="flex flex-1 flex-col space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{vehicle.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {vehicle.carType || "Vehicle"} • {vehicle.year} • {vehicle.seatCapacity ? `${vehicle.seatCapacity} seats • ` : ""}Plate {vehicle.plateNumber}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-[var(--cargo-blue-deep)]">
                        {vehicle.reviewSummary?.reviewCount
                          ? `${vehicle.reviewSummary.averageRating}/5 rating • ${vehicle.reviewSummary.reviewCount} review${vehicle.reviewSummary.reviewCount === 1 ? "" : "s"}`
                          : "No reviews yet"}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{vehicle.status}</span>
                  </div>

                    <div className="rounded-[1rem] bg-slate-50 px-3 py-2.5">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Daily rate</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{formatMoney(vehicle.ratePerDay)}</p>
                    </div>

                    <div className={`rounded-[1rem] px-3 py-2 text-xs font-semibold ${vehicle.contractTemplate ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {vehicle.contractTemplate ? "Owner contract ready" : "Owner contract template not set"}
                    </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Features</p>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-slate-600">{vehicle.features || "No extra features listed yet."}</p>
                  </div>

                  <div className="mt-auto pt-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openBookingForm(vehicle);
                        }}
                        disabled={!vehicle.contractTemplate}
                        className="w-full rounded-full bg-[var(--cargo-blue-deep)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {vehicle.contractTemplate ? "Reserve Now" : "Template Required"}
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
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className="flex min-h-full items-center justify-center">
              <div className="w-full max-w-4xl overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)] lg:max-h-[calc(100vh-2rem)]">
                <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
                  <div className="bg-[linear-gradient(135deg,_#dbeafe,_#eff6ff_60%,_#ffffff)] lg:max-h-[calc(100vh-2rem)]">
                    {selectedVehicle.imageUrl ? (
                      <img
                        src={`http://localhost:5000${selectedVehicle.imageUrl}`}
                        alt={selectedVehicle.title}
                        className="h-64 w-full object-cover sm:h-72 lg:h-full lg:min-h-0"
                      />
                    ) : (
                      <div className="flex h-64 items-center justify-center px-6 text-center text-sm font-medium text-slate-500 sm:h-72 lg:h-full lg:min-h-0">
                        No vehicle photo uploaded
                      </div>
                    )}
                  </div>

                  <div className="cargo-scrollbar flex flex-col p-5 sm:p-6 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">Vehicle Details</p>
                        <h2 className="mt-1 text-2xl font-semibold text-slate-900">{selectedVehicle.title}</h2>
                        <p className="mt-2 text-sm text-slate-500">
                          {selectedVehicle.carType || "Vehicle"} • {selectedVehicle.year} • Plate {selectedVehicle.plateNumber}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={closeVehicleDetails}
                        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Close
                      </button>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <InfoCard label="Daily Rate" value={formatMoney(selectedVehicle.ratePerDay)} />
                      <InfoCard label="Car Type" value={selectedVehicle.carType || "-"} />
                      <InfoCard label="Seats" value={selectedVehicle.seatCapacity ? `${selectedVehicle.seatCapacity}` : "-"} />
                      <InfoCard
                        label="Rating"
                        value={
                          selectedVehicle.reviewSummary?.reviewCount
                            ? `${selectedVehicle.reviewSummary.averageRating}/5 (${selectedVehicle.reviewSummary.reviewCount})`
                            : "No reviews"
                        }
                      />
                    </div>

                    <div className="mt-5">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Features</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {selectedVehicle.features || "No extra features listed yet."}
                      </p>
                    </div>

                    {selectedVehicle.images?.length > 1 && (
                      <div className="mt-5">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Gallery</p>
                        <div className="mt-3 grid grid-cols-3 gap-3">
                          {selectedVehicle.images.slice(0, 3).map((image) => (
                            <div key={image.imageId} className="overflow-hidden rounded-[1rem] border border-slate-200 bg-slate-50">
                              <img src={`http://localhost:5000${image.imageUrl}`} alt={selectedVehicle.title} className="h-20 w-full object-cover sm:h-24" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-5 border-t border-slate-200 pt-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Ratings and Reviews</p>

                      {selectedVehicle.reviewSummary?.reviewCount ? (
                        <div className="mt-3 rounded-[1.15rem] border border-slate-200 bg-[linear-gradient(180deg,_#f8fbff,_#ffffff)] p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2.5">
                                <span className="text-3xl font-semibold tracking-tight text-slate-950">
                                  {selectedVehicle.reviewSummary.averageRating.toFixed(1)}
                                </span>
                                <div>
                                  {renderStars(selectedVehicle.reviewSummary.averageRating, "h-4 w-4")}
                                  <p className="mt-1.5 text-xs text-slate-500">
                                    Based on {selectedVehicle.reviewSummary.reviewCount} verified renter review{selectedVehicle.reviewSummary.reviewCount === 1 ? "" : "s"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                            <div className="rounded-[0.95rem] border border-slate-200 bg-white px-3.5 py-3">
                              <p className="text-sm font-medium text-slate-500">Car rating</p>
                              <div className="mt-2 flex items-center justify-between gap-2">
                                {renderStars(selectedVehicle.reviewSummary.averageCarRating, "h-3.5 w-3.5")}
                                <span className="text-sm font-semibold text-slate-900">
                                  {selectedVehicle.reviewSummary.averageCarRating}/5
                                </span>
                              </div>
                            </div>
                            <div className="rounded-[0.95rem] border border-slate-200 bg-white px-3.5 py-3">
                              <p className="text-sm font-medium text-slate-500">Rental experience</p>
                              <div className="mt-2 flex items-center justify-between gap-2">
                                {renderStars(selectedVehicle.reviewSummary.averageExperienceRating, "h-3.5 w-3.5")}
                                <span className="text-sm font-semibold text-slate-900">
                                  {selectedVehicle.reviewSummary.averageExperienceRating}/5
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-[1.15rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                          This vehicle does not have renter feedback yet.
                        </div>
                      )}

                      <div className="mt-4 space-y-2.5">
                        {selectedVehicle.reviews?.length ? (
                          selectedVehicle.reviews.map((review) => (
                            <article key={review.reviewId} className="rounded-[1rem] border border-slate-200 bg-white px-3.5 py-3.5 shadow-[0_8px_18px_rgba(15,23,42,0.035)]">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{review.renterName}</p>
                                  <p className="mt-1 text-xs text-slate-500">{formatDate(review.createdAt)}</p>
                                </div>
                                <div className="text-right">
                                  {renderStars(review.averageRating, "h-3.5 w-3.5")}
                                  <p className="mt-1 text-xs font-semibold text-[var(--cargo-blue-deep)]">
                                    {review.averageRating.toFixed(1)}/5
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] font-medium text-slate-500">
                                <span className="rounded-full bg-slate-100 px-3 py-1">Car {review.carRating}/5</span>
                                <span className="rounded-full bg-slate-100 px-3 py-1">Experience {review.experienceRating}/5</span>
                              </div>
                              <p className="mt-2 text-sm leading-5 text-slate-600">
                                {review.reviewText || "No written feedback provided."}
                              </p>
                              {review.ownerResponse ? (
                                <div className="mt-3 rounded-[0.9rem] border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-sm text-slate-600">
                                  <span className="font-semibold text-slate-900">Owner response:</span> {review.ownerResponse}
                                </div>
                              ) : null}
                            </article>
                          ))
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-6 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          closeVehicleDetails();
                          openBookingForm(selectedVehicle);
                        }}
                        className="w-full rounded-full bg-[var(--cargo-blue-deep)] px-4 py-3 text-sm font-semibold text-white hover:opacity-95"
                        disabled={!selectedVehicle.contractTemplate}
                      >
                        {selectedVehicle.contractTemplate ? "Reserve This Vehicle" : "Template Required"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {bookingVehicle &&
        createPortal(
          <div className="cargo-scrollbar fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-4">
            <div className="flex min-h-full items-center justify-center">
              <div className="cargo-scrollbar w-full max-w-2xl rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)] sm:max-h-[calc(100vh-2rem)] sm:overflow-y-auto">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">Reserve Vehicle</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-900">{bookingVehicle.title}</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {bookingVehicle.carType || "Vehicle"} • {bookingVehicle.year} • Plate {bookingVehicle.plateNumber} • {formatMoney(bookingVehicle.ratePerDay)} per day
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
                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Booking flow</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {bookingStep === 1 && "Step 1 of 4 - Select dates"}
                        {bookingStep === 2 && "Step 2 of 4 - Booking details and payment"}
                        {bookingStep === 3 && "Step 3 of 4 - Review and agree to contract"}
                        {bookingStep === 4 && "Step 4 of 4 - Final review"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4].map((step) => (
                        <span
                          key={step}
                          className={`h-2.5 w-10 rounded-full ${step <= bookingStep ? "bg-[var(--cargo-blue-deep)]" : "bg-slate-200"}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {bookingStep === 1 ? (
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
                ) : null}

                {bookingStep === 1 ? (
                  <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Vehicle availability</p>
                    {availabilityLoading ? (
                      <p className="mt-2 text-sm text-slate-500">Loading reserved dates...</p>
                    ) : availabilityError ? (
                      <p className="mt-2 text-sm text-red-600">{availabilityError}</p>
                    ) : (
                      <>
                        {conflictingAvailability ? (
                          <div className="mt-3 rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {conflictingAvailability.label} {formatDate(conflictingAvailability.startDate)} to {formatDate(conflictingAvailability.endDate)}.
                          </div>
                        ) : (
                          <div className="mt-3 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            The selected date range is currently available.
                          </div>
                        )}

                        <div className="mt-4">
                          <p className="text-sm font-semibold text-slate-900">Unavailable date ranges</p>
                          {availability.reservations.length === 0 && availability.blockouts.length === 0 ? (
                            <p className="mt-2 text-sm text-slate-500">No active reservations or owner blockouts found for this vehicle.</p>
                          ) : (
                            <div className="mt-2 space-y-2 text-sm text-slate-600">
                              {availability.reservations.map((entry) => (
                                <p key={`reservation-${entry.bookingId}`}>
                                  <span className="font-semibold text-slate-900">Booked:</span> {formatDate(entry.startDate)} to {formatDate(entry.endDate)}
                                </p>
                              ))}
                              {availability.blockouts.map((entry) => (
                                <p key={`blockout-${entry.blockoutId}`}>
                                  <span className="font-semibold text-slate-900">Blocked:</span> {formatDate(entry.startDate)} to {formatDate(entry.endDate)}
                                  {entry.reason ? ` (${entry.reason})` : ""}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ) : null}

                {bookingStep === 2 ? (
                  <div className="space-y-4">
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
                    <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Payment method</p>
                      <p className="mt-1 text-sm text-slate-600">Choose the payment option for this reservation before reviewing the rental terms.</p>
                      <label className="mt-4 block space-y-2">
                        <span className="text-sm font-semibold text-slate-700">Selected method</span>
                        <select
                          value={form.paymentMethod}
                          onChange={(event) => updateForm("paymentMethod", event.target.value)}
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--cargo-blue-deep)]"
                        >
                          <option value="gcash">GCash</option>
                          <option value="cash">Cash</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[1.25rem] bg-slate-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Estimated total</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{estimatedTotal === null ? "Select dates" : formatMoney(estimatedTotal)}</p>
                  <p className="mt-2 text-sm text-slate-500">Booking is created only after you review the contract, agree to it, and complete the payment step.</p>
                </div>

                {bookingStep === 3 ? (
                  <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Contract Preview</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{bookingVehicle.contractTemplateTitle || "Rental Agreement"}</p>
                        <p className="mt-1 text-xs text-slate-500">This contract text comes from the vehicle owner's saved template.</p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[var(--cargo-blue-deep)]">Required</span>
                    </div>
                    <div className="cargo-scrollbar mt-4 max-h-40 overflow-y-auto whitespace-pre-line rounded-[1rem] bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600 sm:max-h-44">
                      {bookingVehicle.contractTemplate || "The vehicle owner has not published a contract template yet."}
                    </div>
                    {!hasOwnerTemplate ? (
                      <div className="mt-4 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        This owner has not saved a reusable contract template yet, so the booking cannot continue.
                      </div>
                    ) : null}

                    <div className="mt-4">
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-700">Digital agreement name</span>
                        <input
                          type="text"
                          value={form.agreementName}
                          onChange={(event) => updateForm("agreementName", event.target.value)}
                          placeholder="Type your full name"
                          required
                          className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--cargo-blue-deep)]"
                        />
                      </label>
                    </div>

                    <label className="mt-4 flex items-start gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={form.agreedToContract}
                        onChange={(event) => updateForm("agreedToContract", event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--cargo-blue-deep)]"
                        required
                      />
                      <span className="text-sm leading-6 text-slate-600">
                        I reviewed the rental terms above and agree to create a booking-specific contract linked to this reservation.
                      </span>
                    </label>
                  </div>
                ) : null}

                {bookingStep === 4 ? (
                  <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Final review</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">Confirm the booking details before the reservation is created</p>
                    <div className="mt-4 rounded-[1rem] bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                      <p>Selected dates, booking details, and contract consent will be saved together with this booking.</p>
                      <p className="mt-2"><span className="font-semibold text-slate-900">Selected payment method:</span> {form.paymentMethod.toUpperCase()}</p>
                      <p className="mt-2">A unique contract instance will be linked to this booking ID with the renter agreement timestamp.</p>
                    </div>
                  </div>
                ) : null}

                {submitError && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>}

                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeBookingForm}
                    className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  {bookingStep > 1 ? (
                    <button
                      type="button"
                      onClick={previousBookingStep}
                      disabled={submitting}
                      className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Back
                    </button>
                  ) : null}
                  {bookingStep < 4 ? (
                    <button
                      type="button"
                      onClick={nextBookingStep}
                      disabled={
                        submitting ||
                         (bookingStep === 1 && (!canContinueFromDates || Boolean(conflictingAvailability) || availabilityLoading)) ||
                         (bookingStep === 2 && !canContinueFromDetails) ||
                         (bookingStep === 3 && !canContinueFromContract)
                       }
                      className="rounded-full bg-[var(--cargo-blue-deep)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-full bg-[var(--cargo-blue-deep)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? "Submitting..." : "Proceed to Payment and Create Booking"}
                    </button>
                  )}
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

function InfoCard({ label, value }) {
  return (
    <div className="rounded-[1rem] bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
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
