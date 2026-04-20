import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { saveAuthSession } from "../../lib/auth";

export default function VerifyEmail() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verifying your email...");
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const token = String(searchParams.get("token") || "").trim();

    if (!token) {
      setStatus("error");
      setMessage("Verification token is missing.");
      return;
    }

    let ignore = false;

    async function verify() {
      try {
        const { data } = await api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
        if (ignore) return;

        saveAuthSession({
          token: data.token,
          user: data.user,
        });

        setStatus("success");
        setMessage(data.message || "Email verified successfully.");

        const nextRole = data?.user?.role;
        window.setTimeout(() => {
          if (nextRole === "owner") nav("/owner", { replace: true });
          else if (nextRole === "admin") nav("/admin", { replace: true });
          else nav("/renter", { replace: true });
        }, 1200);
      } catch (error) {
        if (ignore) return;
        setStatus("error");
        setMessage(error?.response?.data?.message || error?.message || "Verification failed.");
      }
    }

    verify();

    return () => {
      ignore = true;
    };
  }, [nav, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cargo-cream)] px-4 py-12 text-[var(--cargo-ink)]">
      <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <img
          src="/cargoailogo.png"
          alt="CarGoAI logo"
          className="mx-auto h-16 w-16 rounded-2xl border border-slate-200 bg-white object-cover shadow-sm"
        />
        <h1 className="mt-5 text-center text-2xl font-semibold text-slate-900">
          {status === "loading" ? "Verifying email" : status === "success" ? "Email verified" : "Verification failed"}
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-slate-600">{message}</p>
        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex rounded-full bg-[var(--cargo-blue-deep)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
