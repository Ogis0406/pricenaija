import { useDeferredValue, useState } from "react";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";

type AccountRoleFilter = "all" | "consumer" | "business" | "admin";
type VerificationFilter = "all" | "verified" | "unverified";
const PAGE_SIZE = 25;
const dateTime = (value: Date | string | null) => value ? new Date(value).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "Never signed in";

export default function AdminUsersPanel() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<AccountRoleFilter>("all");
  const [verification, setVerification] = useState<VerificationFilter>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const deferredSearch = useDeferredValue(search);
  const utils = trpc.useUtils();
  const users = trpc.admin.users.useQuery({ search: deferredSearch.trim() || undefined, role, verification, page, pageSize: PAGE_SIZE }, { refetchOnWindowFocus: true });
  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.admin.users.invalidate(), utils.admin.stats.invalidate()]);
      setNotice("Account role updated.");
    },
  });
  const result = users.data;
  const firstRow = result && result.total > 0 ? (result.page - 1) * result.pageSize + 1 : 0;
  const lastRow = result ? Math.min(result.page * result.pageSize, result.total) : 0;

  return <section className="admin-table-card admin-users-panel">
    <div className="admin-users-heading"><div><span className="eyebrow">ACCOUNT MANAGEMENT</span><h2>User accounts</h2><p>Search and filter accounts. Administrator access is managed only through protected backend setup.</p></div><div className="admin-users-total"><Users size={17}/><b>{result?.total ?? "—"}</b><small>matching users</small></div></div>
    <div className="admin-user-controls">
      <label className="admin-user-search"><span>Search name or email</span><div><Search size={16}/><input type="search" value={search} maxLength={120} placeholder="e.g. Amina or name@example.com" onChange={event => { setSearch(event.target.value); setPage(1); }}/></div></label>
      <label><span>Account role</span><select value={role} onChange={event => { setRole(event.target.value as AccountRoleFilter); setPage(1); }}><option value="all">All roles</option><option value="consumer">Consumer</option><option value="business">Business</option><option value="admin">Administrator</option></select></label>
      <label><span>Email status</span><select value={verification} onChange={event => { setVerification(event.target.value as VerificationFilter); setPage(1); }}><option value="all">All statuses</option><option value="verified">Verified</option><option value="unverified">Unverified</option></select></label>
    </div>
    {notice && <p className="form-notice" role="status">{notice}</p>}
    {updateRole.error && <p className="admin-inline-error" role="alert">{updateRole.error.message}</p>}
    {users.isError && <p className="admin-inline-error" role="alert">User accounts could not be loaded. Adjust the filters or try again.</p>}
    <div className="admin-users-table-wrap"><table className="admin-users-table"><thead><tr><th>Account</th><th>Role</th><th>Email verification</th><th>Joined</th><th>Last sign-in</th><th>Manage</th></tr></thead><tbody>
      {users.isPending ? <tr><td colSpan={6}>Loading accounts…</td></tr> : result?.items.length ? result.items.map(account => <tr key={account.id}>
        <td><b>{account.name || "PriceNaija member"}</b><small>{account.email}</small></td>
        <td><span className={`pending-badge admin-role-${account.accountRole}`}>{account.accountRole}</span></td>
        <td><span className={account.emailVerifiedAt ? "admin-status-verified" : "admin-status-unverified"}>{account.emailVerifiedAt ? "Verified" : "Unverified"}</span></td>
        <td>{new Date(account.createdAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}</td>
        <td>{dateTime(account.lastSignedIn)}</td>
        <td>{account.accountRole === "admin" ? <span className="admin-protected-role">Protected</span> : <button className="admin-role-action" type="button" disabled={updateRole.isPending} onClick={() => updateRole.mutate({ userId: account.id, accountRole: account.accountRole === "business" ? "consumer" : "business" })}>{account.accountRole === "business" ? "Set consumer" : "Set business"}</button>}</td>
      </tr>) : <tr><td colSpan={6} className="admin-users-empty">{search || role !== "all" || verification !== "all" ? "No users match those filters." : "No user accounts yet."}</td></tr>}
    </tbody></table></div>
    <div className="admin-user-pagination"><span>{users.isPending ? "Loading results…" : `Showing ${firstRow}–${lastRow} of ${result?.total ?? 0} users`}</span><div><button type="button" className="btn-outline" aria-label="Previous page" disabled={page <= 1 || users.isFetching} onClick={() => setPage(value => Math.max(1, value - 1))}><ChevronLeft size={16}/> Previous</button><span>Page {page} of {result?.totalPages ?? 1}</span><button type="button" className="btn-outline" aria-label="Next page" disabled={!result || page >= result.totalPages || users.isFetching} onClick={() => setPage(value => value + 1)}>Next <ChevronRight size={16}/></button></div></div>
  </section>;
}
