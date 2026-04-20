import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearToken, getAuthUser } from "../../lib/auth";
import BrandLogo from "../../components/BrandLogo";
import { api } from "../../lib/api";

export default function RenterDashboard() {
  const nav = useNavigate();
  const authUser = getAuthUser();
  const currentUserLabel = authUser?.username || "Renter";
  const currentUserEmail = authUser?.email || "No email saved";
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [chatMessages, setChatMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: "Ask me about your booking status, payment method, invoice, cancellation, or rebooking.",
      suggestions: ["Show my upcoming booking", "What is my payment method?", "Do I have an invoice?"],
    },
  ]);
  const menuRef = useRef(null);
  const chatPanelRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (chatPanelRef.current && !chatPanelRef.current.contains(event.target)) {
        setChatOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleLogout() {
    clearToken();
    nav("/login");
  }

  async function sendChatMessage(message) {
    const trimmed = String(message || "").trim();
    if (!trimmed || chatLoading) return;

    const userMessage = { id: `user-${Date.now()}`, role: "user", text: trimmed };
    setChatMessages((current) => [...current, userMessage]);
    setChatInput("");
    setChatLoading(true);
    setChatError("");

    try {
      const { data } = await api.post("/renter/chatbot", { message: trimmed });
      setChatMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: data.answer || "I could not find an answer right now.",
          suggestions: data.suggestions || [],
        },
      ]);
    } catch (requestError) {
      setChatError(requestError?.response?.data?.message || "Failed to contact booking assistant");
    } finally {
      setChatLoading(false);
    }
  }

  const renterNavItems = [
    { label: "Cars", to: "/renter" },
    { label: "My Bookings", to: "/renter/bookings" },
    { label: "Notifications", to: "/renter/notifications" },
    { label: "Issues", to: "/renter/complaints" },
    { label: "History", to: "/renter/history" },
  ];

  const menuItems = [
    { label: "Account", hint: "Manage profile details", onClick: () => nav("/renter/account") },
    { label: "Cars", hint: "Browse available vehicles", onClick: () => nav("/renter") },
    { label: "My Bookings", hint: "Check active reservations", onClick: () => nav("/renter/bookings") },
    { label: "Notifications", hint: "Read updates", onClick: () => nav("/renter/notifications") },
    { label: "Issues", hint: "Report complaints or problems", onClick: () => nav("/renter/complaints") },
    { label: "History", hint: "View past trips", onClick: () => nav("/renter/history") },
  ];

  return (
    <div className="min-h-screen bg-[var(--cargo-cream)] text-[var(--cargo-ink)]">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
              <NavLink to="/renter" end className="flex items-center gap-3 text-[var(--cargo-ink)]">
                <BrandLogo
                  label="CarGoAI Renter"
                  subtitle="Cars, bookings, and trip history in one place"
                />
              </NavLink>

              <nav className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {renterNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/renter"}
                    className={({ isActive }) =>
                      `rounded-full px-4 py-2 transition ${
                        isActive
                          ? "bg-[var(--cargo-blue-deep)] text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div ref={menuRef} className="relative ml-auto w-[220px]">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex w-full items-center justify-between gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left transition hover:border-slate-300 hover:bg-white"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] bg-[linear-gradient(135deg,_#dbeafe,_#bfdbfe)] text-sm font-semibold text-[var(--cargo-blue-deep)]">
                    {currentUserLabel.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-none text-slate-900">{currentUserLabel}</p>
                    <p className="truncate text-xs text-slate-500">{currentUserEmail}</p>
                  </div>
                </div>
                <span className={`text-xs text-slate-400 transition ${menuOpen ? "rotate-180" : ""}`}>▼</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-full overflow-hidden rounded-[1.1rem] border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
                  <div className="border-b border-slate-100 bg-[linear-gradient(135deg,_#eff6ff,_#ffffff)] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">Signed in</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{currentUserLabel}</p>
                    <p className="truncate text-xs text-slate-500">{currentUserEmail}</p>
                  </div>

                  <div className="p-1.5">
                    {menuItems.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          item.onClick();
                        }}
                        className="flex w-full items-start justify-between rounded-[0.85rem] px-3 py-2.5 text-left hover:bg-slate-50"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                          <p className="text-xs text-slate-500">{item.hint}</p>
                        </div>
                        <span className="mt-0.5 text-slate-300">›</span>
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 p-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center justify-between rounded-[0.85rem] px-3 py-2.5 text-left text-red-600 hover:bg-red-50"
                    >
                      <span className="text-sm font-semibold">Logout</span>
                      <span>›</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <div ref={chatPanelRef} className="fixed bottom-5 right-5 z-40">
        {chatOpen ? (
          <div className="w-[350px] overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <div className="border-b border-slate-100 bg-[linear-gradient(135deg,_#eff6ff,_#ffffff)] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">Booking Assistant</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">Renter support chatbot</p>
                </div>
                <button
                  type="button"
                  onClick={() => setChatOpen(false)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="cargo-scrollbar max-h-[420px] space-y-3 overflow-y-auto bg-slate-50/80 px-4 py-4">
              {chatMessages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-[1rem] px-4 py-3 text-sm leading-6 ${
                      message.role === "user"
                        ? "bg-[var(--cargo-blue-deep)] text-white"
                        : "border border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <p>{message.text}</p>
                    {message.role === "assistant" && message.suggestions?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => sendChatMessage(suggestion)}
                            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {chatLoading ? (
                <div className="flex justify-start">
                  <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                    Looking up your booking details...
                  </div>
                </div>
              ) : null}
            </div>

            {chatError ? (
              <div className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{chatError}</div>
            ) : null}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                sendChatMessage(chatInput);
              }}
              className="border-t border-slate-100 bg-white px-4 py-4"
            >
              <div className="flex items-end gap-3">
                <textarea
                  rows="2"
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Ask about your booking, invoice, payment, or cancellation..."
                  className="cargo-scrollbar min-h-[52px] flex-1 resize-none rounded-[1rem] border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--cargo-blue-deep)] focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="rounded-full bg-[var(--cargo-blue-deep)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-3 rounded-full bg-[var(--cargo-blue-deep)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(37,99,235,0.35)] transition hover:opacity-95"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-base">?</span>
            Booking Assistant
          </button>
        )}
      </div>
    </div>
  );
}
