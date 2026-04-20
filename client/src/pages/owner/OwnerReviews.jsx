import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

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

export default function OwnerReviews() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [responseDrafts, setResponseDrafts] = useState({});
  const [respondingReviewId, setRespondingReviewId] = useState(null);

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    setLoading(true);
    try {
      const { data } = await api.get("/owner/vehicles");
      setVehicles(data.vehicles || []);
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to load owner reviews");
    } finally {
      setLoading(false);
    }
  }

  const reviewItems = useMemo(() => {
    return vehicles.flatMap((vehicle) =>
      (vehicle.reviews || []).map((review) => ({
        ...review,
        vehicleId: vehicle.vehicleId,
        vehicleLabel: vehicle.title,
        plateNumber: vehicle.plateNumber,
        vehicleSummary: vehicle.reviewSummary,
      }))
    );
  }, [vehicles]);

  const filteredReviews = useMemo(() => {
    return reviewItems.filter((item) => {
      const haystack = `${item.vehicleLabel} ${item.plateNumber} ${item.renterName} ${item.reviewText}`.toLowerCase();
      return haystack.includes(searchTerm.trim().toLowerCase());
    });
  }, [reviewItems, searchTerm]);

  const summary = useMemo(() => {
    return {
      totalReviews: reviewItems.length,
      responded: reviewItems.filter((item) => item.ownerResponse).length,
      pending: reviewItems.filter((item) => !item.ownerResponse).length,
      averageRating: reviewItems.length
        ? Number((reviewItems.reduce((sum, item) => sum + Number(item.averageRating || 0), 0) / reviewItems.length).toFixed(1))
        : null,
    };
  }, [reviewItems]);

  async function submitOwnerResponse(vehicleId, reviewId) {
    const ownerResponse = String(responseDrafts[reviewId] || "").trim();
    if (!ownerResponse) {
      setError("Owner response cannot be empty");
      return;
    }

    setRespondingReviewId(reviewId);
    try {
      await api.patch(`/owner/vehicles/${vehicleId}/reviews/${reviewId}/respond`, { ownerResponse });
      setSuccess("Owner response saved successfully.");
      await loadVehicles();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to save owner response");
    } finally {
      setRespondingReviewId(null);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      ) : null}

      <section className="rounded-[1.6rem] bg-[linear-gradient(180deg,_#ffffff,_#fbfdff)] px-5 py-5 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.85)] sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--cargo-blue-bright)]">Owner Reviews</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Ratings and feedback</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              View renter ratings across your vehicles and reply directly to feedback from one screen.
            </p>
          </div>
          <button
            type="button"
            onClick={loadVehicles}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Refresh
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total reviews" value={summary.totalReviews} />
          <SummaryCard label="Average rating" value={summary.averageRating ? `${summary.averageRating}/5` : "No ratings"} />
          <SummaryCard label="Responded" value={summary.responded} />
          <SummaryCard label="Awaiting response" value={summary.pending} />
        </div>

        <div className="mt-5">
          <label className="flex min-w-0 items-center gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 focus-within:border-[var(--cargo-blue-bright)] focus-within:bg-white">
            <SearchIcon className="h-4 w-4 shrink-0" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by vehicle, renter, plate number, or review text"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        {loading ? (
          <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-8 text-sm text-slate-500">Loading reviews...</div>
        ) : filteredReviews.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
            No reviews matched your search.
          </div>
        ) : (
          filteredReviews.map((review) => (
            <article key={review.reviewId} className="rounded-[1.25rem] border border-slate-200 bg-white px-5 py-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--cargo-blue-bright)]">
                    {review.vehicleLabel}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">{review.renterName}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Plate {review.plateNumber} • {formatDate(review.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  {renderStars(review.averageRating)}
                  <p className="mt-1 text-sm font-semibold text-[var(--cargo-blue-deep)]">{review.averageRating.toFixed(1)}/5</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1">Car {review.carRating}/5</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">Experience {review.experienceRating}/5</span>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {review.reviewText || "No written feedback provided."}
              </p>

              <div className="mt-4 rounded-[1rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Owner response</p>
                <textarea
                  rows="3"
                  value={responseDrafts[review.reviewId] ?? review.ownerResponse ?? ""}
                  onChange={(event) =>
                    setResponseDrafts((current) => ({
                      ...current,
                      [review.reviewId]: event.target.value,
                    }))
                  }
                  disabled={Boolean(review.ownerResponse)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--cargo-blue-bright)] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder="Write a short reply to this review."
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    {review.ownerResponse ? `Last responded ${formatDate(review.ownerRespondedAt)}` : "No response posted yet"}
                  </p>
                  {review.ownerResponse ? (
                    <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500">
                      Response locked
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => submitOwnerResponse(review.vehicleId, review.reviewId)}
                      disabled={respondingReviewId === review.reviewId}
                      className="rounded-full bg-[var(--cargo-blue-deep)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {respondingReviewId === review.reviewId ? "Saving..." : "Post response"}
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
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
