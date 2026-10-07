import { ArrowRight, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

type MetricProps = { label: string; value: string | number; note?: string };

function Metric({ label, value, note }: MetricProps) {
  return <article className="metric-card"><span>{label}</span><b>{value}</b><small>{note ?? "Live database total"}</small></article>;
}

export default function AdminStatsDashboard() {
  const stats = trpc.admin.stats.useQuery(undefined, { refetchOnWindowFocus: true });
  const data = stats.data;
  const accountMetrics: MetricProps[] = [
    { label: "Registered users", value: data?.users ?? "—" },
    { label: "Active · last 30 days", value: data?.activeUsers ?? "—" },
    { label: "New accounts · last 30 days", value: data?.newUsers ?? "—" },
    { label: "Email verified", value: data?.verifiedEmails ?? "—" },
    { label: "Email unverified", value: data?.unverifiedEmails ?? "—" },
    { label: "Consumer accounts", value: data?.consumers ?? "—" },
    { label: "Business accounts", value: data?.businessAccounts ?? "—" },
    { label: "Administrators", value: data?.adminAccounts ?? "—" },
  ];
  const platformMetrics: MetricProps[] = [
    { label: "Price reports", value: data?.reports ?? "—" },
    { label: "Verified reports", value: data?.verifiedReports ?? "—" },
    { label: "Pending reports", value: data?.pendingReports ?? "—" },
    { label: "Business profiles", value: data?.businesses ?? "—" },
    { label: "Verified businesses", value: data?.verifiedBusinesses ?? "—" },
    { label: "Trust reports pending", value: data?.pendingTrustReports ?? "—" },
    { label: "Verified price movement · 90d", value: data?.averagePriceChangePct == null ? "—" : `${data.averagePriceChangePct}%`, note: "Average across products with verified history" },
  ];

  return <div className="admin-dashboard-view">
    <div className="admin-dashboard-toolbar">
      <div><span className="eyebrow">SYSTEM STATISTICS</span><h2>Live platform overview</h2><p>Account growth, marketplace activity and trust review totals from the PriceNaija database.</p></div>
      <div className="admin-dashboard-actions">
        <button className="btn-outline" type="button" onClick={() => stats.refetch()} disabled={stats.isFetching}><RefreshCw size={15} className={stats.isFetching ? "spin" : ""}/>{stats.isFetching ? "Refreshing…" : "Refresh"}</button>
        <Link href="/admin/users" className="btn-primary">Manage users <ArrowRight size={15}/></Link>
      </div>
    </div>
    {stats.isError && <p className="admin-inline-error" role="alert">System statistics could not be loaded. Refresh to try again.</p>}
    <section className="admin-stat-section"><h3>Accounts and adoption</h3><div className="metric-grid admin-metrics">{accountMetrics.map(metric => <Metric key={metric.label} {...metric}/>)}</div></section>
    <section className="admin-stat-section"><h3>Marketplace and trust</h3><div className="metric-grid admin-metrics">{platformMetrics.map(metric => <Metric key={metric.label} {...metric}/>)}</div></section>
    <div className="admin-analytics-grid">
      <section className="admin-table-card"><span className="eyebrow">DISCOVERY</span><h2>Most searched</h2>{data?.mostSearched?.length ? data.mostSearched.map(item => <div className="dashboard-list-row" key={item.query}><b>{item.query}</b><small>{item.total} searches</small></div>) : <p className="empty-inline">Search analytics will appear after searches are submitted.</p>}</section>
      <section className="admin-table-card"><span className="eyebrow">PRICE REPORTS</span><h2>Most reported products</h2>{data?.mostReported?.length ? data.mostReported.map(item => <div className="dashboard-list-row" key={item.productName}><b>{item.productName}</b><small>{item.total} reports</small></div>) : <p className="empty-inline">No reported products yet.</p>}</section>
    </div>
    <div className="admin-dashboard-actions admin-dashboard-shortcuts"><Link href="/admin/reports" className="btn-outline">Review price reports <ArrowRight size={15}/></Link><Link href="/admin/businesses" className="btn-outline">Review businesses <ArrowRight size={15}/></Link></div>
  </div>;
}
