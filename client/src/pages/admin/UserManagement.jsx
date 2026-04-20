import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

const tabs = [
  { key: "all", label: "All Users" },
  { key: "owners", label: "Owners" },
  { key: "customers", label: "Customers" },
  { key: "pending", label: "Pending Approval" },
];

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

const roleOptions = [
  { value: "all", label: "All Roles" },
  { value: "owner", label: "Owner" },
  { value: "renter", label: "Customer" },
];

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data.users || []);
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function handleOwnerAction(ownerId, decision) {
    try {
      await api.patch(`/admin/owner-approvals/${ownerId}`, { decision });
      await loadUsers();
      if (selectedUser?.owner?.ownerId === ownerId) {
        setSelectedUser(null);
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to update owner account");
    }
  }

  async function handleCustomerStatus(userId, status) {
    try {
      await api.patch(`/admin/users/${userId}/status`, { status });
      await loadUsers();
      if (selectedUser?.userId === userId) {
        setSelectedUser(null);
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to update customer account");
    }
  }

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return users.filter((user) => {
      const effectiveStatus = getEffectiveStatus(user);
      const matchesTab =
        activeTab === "all"
          ? true
          : activeTab === "owners"
            ? user.role === "owner"
            : activeTab === "customers"
              ? user.role === "renter"
              : user.role === "owner" && effectiveStatus === "pending";

      const matchesSearch =
        !term ||
        user.username.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term);

      const matchesStatus = statusFilter === "all" || effectiveStatus === statusFilter;
      const matchesRole = roleFilter === "all" || user.role === roleFilter;

      return matchesTab && matchesSearch && matchesStatus && matchesRole;
    });
  }, [activeTab, roleFilter, search, statusFilter, users]);

  const counts = useMemo(() => {
    const all = users.length;
    const owners = users.filter((user) => user.role === "owner").length;
    const customers = users.filter((user) => user.role === "renter").length;
    const pending = users.filter((user) => user.role === "owner" && getEffectiveStatus(user) === "pending").length;

    return { all, owners, customers, pending };
  }, [users]);

  const emptyMessage = getEmptyMessage(activeTab, search, statusFilter, roleFilter);

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">User Management</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">User Management</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Manage customers and car owners, review account status, and control user access.
        </p>
      </section>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-5">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? "bg-[var(--cargo-blue-deep)] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${activeTab === tab.key ? "bg-white/15 text-white" : "bg-white text-slate-500"}`}>
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or email"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--cargo-blue-bright)]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--cargo-blue-bright)]"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--cargo-blue-bright)]"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={loadUsers}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Refresh
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-[0.14em] text-slate-400">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date Created</th>
                  <th className="px-4 py-3 font-semibold">Verification</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-10 text-center text-sm text-slate-500">
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-10">
                      <EmptyState title={emptyMessage.title} description={emptyMessage.description} />
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const effectiveStatus = getEffectiveStatus(user);
                    const isPendingOwner = user.role === "owner" && effectiveStatus === "pending";

                    return (
                      <tr
                        key={user.userId}
                        className={`border-t border-slate-200 align-top ${isPendingOwner ? "bg-amber-50/40" : ""}`}
                      >
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{user.username}</p>
                            {user.role === "owner" && user.owner?.companyName ? (
                              <p className="mt-1 text-xs text-slate-500">{user.owner.companyName}</p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">{user.email}</td>
                        <td className="px-4 py-4">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={effectiveStatus} />
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">{formatDate(user.createdAt)}</td>
                        <td className="px-4 py-4">
                          <VerificationBadge verified={user.emailVerified} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {renderActions(user, {
                              onOwnerAction: handleOwnerAction,
                              onCustomerStatus: handleCustomerStatus,
                              onViewDetails: setSelectedUser,
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {selectedUser ? (
        <UserDetailsDrawer user={selectedUser} onClose={() => setSelectedUser(null)} />
      ) : null}
    </div>
  );
}

function renderActions(user, handlers) {
  const effectiveStatus = getEffectiveStatus(user);

  if (user.role === "owner" && effectiveStatus === "pending" && user.owner?.ownerId) {
    return (
      <>
        <button type="button" onClick={() => handlers.onOwnerAction(user.owner.ownerId, "approved")} className="rounded-full bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
          Approve
        </button>
        <button type="button" onClick={() => handlers.onOwnerAction(user.owner.ownerId, "rejected")} className="rounded-full bg-rose-600 px-3 py-2 text-sm font-semibold text-white">
          Reject
        </button>
        <button type="button" onClick={() => handlers.onViewDetails(user)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
          View Details
        </button>
      </>
    );
  }

  if (effectiveStatus === "active") {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            if (user.role === "owner" && user.owner?.ownerId) {
              handlers.onOwnerAction(user.owner.ownerId, "suspended");
            } else {
              handlers.onCustomerStatus(user.userId, "suspended");
            }
          }}
          className="rounded-full bg-amber-500 px-3 py-2 text-sm font-semibold text-white"
        >
          Suspend
        </button>
        <button type="button" onClick={() => handlers.onViewDetails(user)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
          View Details
        </button>
      </>
    );
  }

  if (effectiveStatus === "suspended") {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            if (user.role === "owner" && user.owner?.ownerId) {
              handlers.onOwnerAction(user.owner.ownerId, "reactivated");
            } else {
              handlers.onCustomerStatus(user.userId, "active");
            }
          }}
          className="rounded-full bg-[var(--cargo-blue-deep)] px-3 py-2 text-sm font-semibold text-white"
        >
          Activate
        </button>
        <button type="button" onClick={() => handlers.onViewDetails(user)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
          View Details
        </button>
      </>
    );
  }

  return (
    <button type="button" onClick={() => handlers.onViewDetails(user)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
      View Details
    </button>
  );
}

function UserDetailsDrawer({ user, onClose }) {
  const effectiveStatus = getEffectiveStatus(user);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 p-3 sm:p-5">
      <div className="h-full w-full max-w-xl overflow-y-auto rounded-[1.75rem] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cargo-blue-bright)]">User Details</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">{user.username}</h2>
              <p className="mt-1 text-sm text-slate-500">{user.email}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600">
              Close
            </button>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <section className="grid gap-4 sm:grid-cols-2">
            <DetailCard label="Role" value={user.role === "owner" ? "Owner" : "Customer"} />
            <DetailCard label="Account Status" value={capitalizeStatus(effectiveStatus)} />
            <DetailCard label="Date Joined" value={formatDate(user.createdAt)} />
            <DetailCard label="Email Verification" value={user.emailVerified ? "Verified" : "Not verified"} />
            <DetailCard label="Last Login" value={user.lastLoginAt ? formatDate(user.lastLoginAt) : "Not available"} />
            {user.role === "owner" ? (
              <DetailCard label="Date Approved" value={user.owner?.dateApproved ? formatDate(user.owner.dateApproved) : "Not approved yet"} />
            ) : (
              <DetailCard label="Phone Number" value={user.renter?.phoneNumber || "Not available"} />
            )}
          </section>

          {user.role === "owner" ? (
            <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Owner Information</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <DetailCard label="Company Name" value={user.owner?.companyName || "Not provided"} compact />
                <DetailCard label="Subscription Status" value={user.owner?.subscriptionStatus || "Not set"} compact />
                <DetailCard label="Subscription Tier" value={user.owner?.subscriptionTier || "Not set"} compact />
                <DetailCard
                  label="Subscription Period"
                  value={
                    user.owner?.subscriptionStartDate || user.owner?.subscriptionEndDate
                      ? `${user.owner?.subscriptionStartDate ? formatDate(user.owner.subscriptionStartDate) : "Not set"} - ${user.owner?.subscriptionEndDate ? formatDate(user.owner.subscriptionEndDate) : "Not set"}`
                      : "Not set"
                  }
                  compact
                />
              </div>
            </section>
          ) : (
            <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Customer Information</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <DetailCard label="Address" value={user.renter?.address || "Not available"} compact />
                <DetailCard label="Government ID" value={user.renter?.governmentId || "Not available"} compact />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailCard({ label, value, compact = false }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white ${compact ? "p-3" : "p-4"}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
      <p className="text-base font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{description}</p>
    </div>
  );
}

function RoleBadge({ role }) {
  const className = role === "owner" ? "bg-[rgba(21,91,162,0.12)] text-[var(--cargo-blue-deep)]" : "bg-emerald-50 text-emerald-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{role === "owner" ? "Owner" : "Customer"}</span>;
}

function StatusBadge({ status }) {
  const className = status === "pending" ? "bg-amber-50 text-amber-700" : status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{capitalizeStatus(status)}</span>;
}

function VerificationBadge({ verified }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${verified ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-600"}`}>{verified ? "Verified" : "Unverified"}</span>;
}

function getEffectiveStatus(user) {
  if (user.role === "owner" && user.owner?.accountStatus) {
    return user.owner.accountStatus === "rejected" ? "suspended" : user.owner.accountStatus;
  }
  return user.userAccountStatus === "disabled" ? "suspended" : user.userAccountStatus;
}

function getEmptyMessage(activeTab, search, statusFilter, roleFilter) {
  if (search || statusFilter !== "all" || roleFilter !== "all") {
    return { title: "No users found", description: "Try adjusting the search term or filters to find matching users." };
  }
  if (activeTab === "pending") {
    return { title: "No pending approvals", description: "There are no owner accounts waiting for approval right now." };
  }
  if (activeTab === "customers") {
    return { title: "No customers", description: "Customer accounts will appear here once renters register in the system." };
  }
  if (activeTab === "owners") {
    return { title: "No owners", description: "Owner accounts will appear here once car rental owners register in the system." };
  }
  return { title: "No users found", description: "User accounts will appear here when customers and car owners are available in the database." };
}

function capitalizeStatus(status) {
  return status === "pending" ? "Pending Approval" : status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
