import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function RenterNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications || []);
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(notificationId) {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications((current) =>
        current.map((item) =>
          item.notificationId === notificationId
            ? { ...item, isRead: true, readAt: item.readAt || new Date().toISOString() }
            : item
        )
      );
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to update notification");
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">Notifications</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Booking, payment, and account updates</h1>
        </div>
        <button type="button" onClick={loadNotifications} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
          Refresh
        </button>
      </section>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="space-y-4">
        {loading ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-sm text-slate-500">No notifications yet.</div>
        ) : (
          notifications.map((item) => (
            <article
              key={item.notificationId}
              className={`rounded-[1.5rem] border p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] ${
                item.isRead ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50/50"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.message}</p>
                  <p className="mt-2 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
                {!item.isRead ? (
                  <button
                    type="button"
                    onClick={() => markAsRead(item.notificationId)}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Mark as read
                  </button>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Read</span>
                )}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
