import { Link } from "react-router-dom";

const highlights = [
  {
    title: "Smart Fleet Insights",
    description:
      "Track availability, utilization, and upcoming demand from one clear dashboard.",
  },
  {
    title: "Faster Bookings",
    description:
      "Give renters a seamless reservation flow while owners keep control of approvals.",
  },
  {
    title: "Production-Grade Security",
    description:
      "Role-based access for renters, owners, and admins with secure authentication.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">CarGoAI</p>
          <h1 className="text-lg font-bold">Mobility Operations Platform</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Sign up
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-12 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section>
          <p className="inline-flex rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700">
            Built for modern car rental teams
          </p>
          <h2 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">
            Manage rentals, automate operations, and scale with confidence.
          </h2>
          <p className="mt-5 max-w-xl text-base text-gray-600 sm:text-lg">
            CarGoAI helps rental businesses deliver a premium customer experience while keeping fleet,
            payments, and role-based workflows centralized.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/register"
              className="rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Create account
            </Link>
            <Link
              to="/login"
              className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50"
            >
              I already have an account
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-gray-500">Why teams choose CarGoAI</p>
          <div className="mt-5 space-y-5">
            {highlights.map((item) => (
              <article key={item.title} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
