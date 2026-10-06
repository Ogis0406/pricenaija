import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, ArrowRight, Bell, Bookmark, Check, MapPin, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { demoProducts, locations, naira, productBySlug } from "@/lib/priceData";
import { DemoTag } from "@/components/PriceNaijaShell";

const samplePoints = [52300, 53700, 52800, 55000, 54300, 55900, 53600, 54200];
function setPageMeta(title: string, description: string) {
  document.title = title;
  const values: Array<["name" | "property", string, string]> = [["name", "description", description], ["property", "og:title", title], ["property", "og:description", description], ["name", "twitter:title", title], ["name", "twitter:description", description]];
  for (const [kind, key, content] of values) {
    let meta = document.querySelector<HTMLMetaElement>(`meta[${kind}="${key}"]`);
    if (!meta) { meta = document.createElement("meta"); meta.setAttribute(kind, key); document.head.appendChild(meta); }
    meta.content = content;
  }
}

export default function ProductPage({ slug }: { slug: string }) {
  const [, setPath] = useLocation();
  const sample = productBySlug(slug);
  const { data: detail, isLoading } = trpc.products.bySlug.useQuery({ slug });
  const record = detail?.product;
  const productName = record?.name ?? sample?.name ?? "";
  const category = detail?.categoryName ?? sample?.category ?? "Products";
  const quantity = record?.quantityLabel ?? sample?.quantity ?? "Product";
  const verified = detail?.verifiedPrices;
  const isDemo = Boolean(!verified?.count && (record ? record.isDemo : sample));
  const [days, setDays] = useState(30);
  const [alertPrice, setAlertPrice] = useState(50000);
  const [alertOpen, setAlertOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [city, setCity] = useState("Lagos");
  const { data: user } = trpc.auth.me.useQuery(undefined, { retry: false });
  const history = trpc.products.history.useQuery({ productId: record?.id ?? 0, days }, { enabled: Boolean(record?.id) });
  const fair = trpc.products.fairPrice.useQuery({ productName, productId: record?.id, quantityLabel: quantity, city }, { enabled: Boolean(record?.id && productName && quantity) });
  const market = trpc.products.marketSummary.useQuery({ productName, productId: record?.id, quantityLabel: quantity }, { enabled: Boolean(record?.id && productName && quantity) });
  const saved = trpc.account.saved.useQuery(undefined, { enabled: Boolean(user) });
  const utils = trpc.useUtils();
  const isSaved = Boolean(record && saved.data?.some(item => item.product.id === record.id));
  const createAlert = trpc.account.createAlert.useMutation({ onSuccess: async () => { setNotice("Price alert saved to your account."); setAlertOpen(false); await utils.account.alerts.invalidate(); } });
  const toggleSaved = trpc.account.toggleSaved.useMutation({ onSuccess: async result => { setNotice(result.saved ? "Product saved to your account." : "Product removed from your saved list."); await utils.account.saved.invalidate(); } });
  const data = useMemo(() => {
    if (history.data?.length) return history.data.map(item => ({ day: new Date(item.recordedAt).toLocaleDateString("en-NG", { day: "2-digit", month: "short" }), price: item.priceNaira }));
    if (!sample || !isDemo) return [];
    return samplePoints.map((price, index) => { const offset = (samplePoints.length - 1 - index) / (samplePoints.length - 1); const date = new Date(Date.now() - days * offset * 86400000); return { day: date.toLocaleDateString("en-NG", { day: "2-digit", month: "short" }), price: price + sample.average - 54200 }; });
  }, [history.data, days, sample, isDemo]);
  const locationPrices = market.data?.length ? market.data.map(item => ({ city: item.city, average: item.average, count: item.count, lastUpdated: item.lastUpdated })) : isDemo && sample ? Object.entries(sample.locationPrices).map(([place, price]) => ({ city: place, average: price, count: 0, lastUpdated: null as Date | null })) : [];
  const loginGate = () => { if (!user) { setPath("/login"); return false; } if (!record) { setNotice("This product is not available in the PriceNaija catalogue yet."); return false; } return true; };

  useEffect(() => {
    if (!productName) return;
    const title = `${productName} price comparison | PriceNaija`;
    setPageMeta(title, isDemo ? `Sample ${quantity} prices for ${productName}. Demo figures are labeled and are not verified market prices.` : `${quantity} price comparison for ${productName}. ${verified?.count ? `${verified.count} recent verified reports.` : "No recent verified estimate is available yet."}`);
  }, [productName, quantity, isDemo, verified?.count]);

  if (isLoading && !sample) return <div className="content-width page-content"><div className="app-loading">Loading product details…</div></div>;
  if (!sample && !record) return <div className="content-width page-content"><div className="empty-state"><span className="empty-icon">404</span><h2>We couldn't find that product.</h2><p>Try searching for rice, cement or cooking gas.</p><Link href="/search" className="btn-primary">Compare products <ArrowRight size={15}/></Link></div></div>;

  return <div className="content-width page-content product-page">
    <Link href="/search" className="back-link"><ArrowLeft size={15}/> Back to prices</Link>
    <div className="product-head"><div><div className="breadcrumbs">Products <span>/</span> {category}</div><h1>{productName}</h1><p>{sample?.brand ?? record?.brand ?? ""}{(sample?.brand || record?.brand) && <span> · </span>}{quantity}</p></div>{isDemo ? <DemoTag/> : <span className={verified ? "verified-label" : "pending-badge"}>{verified ? "✓ Recent verified reports" : "No verified price estimate yet"}</span>}</div>
    <div className="product-summary-grid">
      <section className="price-summary">
        <div className="summary-top"><span>{isDemo ? "Current sample range" : verified?.count ? "Recent verified range" : "Verified price status"}</span><span className="sample-indicator"><i/> {isDemo ? "DEMO" : verified?.count ? "VERIFIED REPORTS" : "NO VERIFIED DATA"}</span></div>
        {verified?.count ? <><strong>{naira(verified.low)} <span>–</span> {naira(verified.high)}</strong><div className="summary-average"><span>Verified average</span><b>{naira(verified.average)}</b></div></> : isDemo && sample ? <><strong>{naira(sample.low)} <span>–</span> {naira(sample.high)}</strong><div className="summary-average"><span>Sample average</span><b>{naira(sample.average)}</b></div></> : <div className="verified-empty-price"><b>Not enough verified reports yet</b><span>Seller-entered offers below are separate from verified community prices.</span></div>}
        {isDemo && sample && <div className="assessment-pill"><ShieldCheck size={16}/>{fair.data?.available ? `Recent verified range available in ${city}` : "Sample range only · awaiting verified reports"}</div>}
        {isDemo && sample && <p className="small-disclaimer">These illustrative sample figures are not verified market prices.</p>}
        {!isDemo && verified?.lastUpdated && <p className="small-disclaimer">{verified.count} verified report{verified.count === 1 ? "" : "s"} · last updated {new Date(verified.lastUpdated).toLocaleDateString("en-NG")}</p>}
        <label className="product-city-select">Check verified data by city<select value={city} onChange={event => setCity(event.target.value)}>{locations.map(item => <option key={item}>{item}</option>)}</select></label>
        {fair.data?.available && <p className="verified-range-note"><Check size={14}/> {city} verified range: {naira(fair.data.low ?? 0)}–{naira(fair.data.high ?? 0)} · {fair.data.count} report(s)</p>}
        {!fair.data?.available && !isDemo && <p className="small-disclaimer">No recent verified reports are available for {city} yet.</p>}
        <div className="summary-actions"><button className="btn-primary" onClick={() => { if (loginGate()) setAlertOpen(value => !value); }}><Bell size={16}/> Set price alert</button><button className={`icon-action ${isSaved ? "is-saved" : ""}`} title={isSaved ? "Remove saved product" : "Save product"} aria-label={isSaved ? "Remove saved product" : "Save product"} onClick={() => { if (loginGate()) toggleSaved.mutate({ productId: record!.id }); }}><Bookmark size={17} fill={isSaved ? "currentColor" : "none"}/></button></div>
        {alertOpen && <form className="inline-alert-form" onSubmit={event => { event.preventDefault(); if (loginGate() && alertPrice > 0) createAlert.mutate({ productId: record!.id, targetPriceNaira: alertPrice }); }}><label>Notify me below (₦)<input type="number" min="1" required value={alertPrice} onChange={event => setAlertPrice(Number(event.target.value))}/></label><button className="btn-outline" disabled={createAlert.isPending}>{createAlert.isPending ? "Saving…" : "Create alert"}</button></form>}
        {notice && <div className="inline-notice" role="status">{notice}</div>}
      </section>
      <section className="chart-card"><div className="chart-card-head"><div><span className="eyebrow">PRICE MOVEMENT</span><h3>Price history</h3><p>{history.data?.length ? `Verified reports only · ${history.data.length} records` : isDemo && sample ? "Illustrative sample series · not verified" : "No verified price history for this period yet."}</p></div><div className="chart-ranges" aria-label="Price history range">{[30, 90, 180, 365].map(value => <button type="button" key={value} className={days === value ? "active" : ""} aria-pressed={days === value} onClick={() => setDays(value)}>{value === 180 ? "6 mo" : value === 365 ? "1 yr" : `${value}d`}</button>)}</div></div><div className="chart-container">{data.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}><defs><linearGradient id="productFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#087443" stopOpacity={0.18}/><stop offset="95%" stopColor="#087443" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid strokeDasharray="4 5" vertical={false} stroke="#edf0ec"/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#849087" }}/><YAxis hide domain={[(minValue: number) => minValue - 3000, (maxValue: number) => maxValue + 3000]}/><Tooltip formatter={value => naira(Number(value))}/><Area type="monotone" dataKey="price" stroke="#087443" strokeWidth={2.5} fill="url(#productFill)"/></AreaChart></ResponsiveContainer> : <div className="chart-empty">A verified price-history chart will appear when reports are reviewed.</div>}</div>{isDemo&&sample&&!history.data?.length&&<p className="small-disclaimer chart-disclaimer">The chart illustrates the selected period with demo figures; it is not a real historical series.</p>}</section>
    </div>
    <div className="product-details-grid">
      <section className="surface-card seller-panel"><div className="section-heading-inline"><div><span className="eyebrow">COMPARE SELLERS</span><h2>{sample ? "Sample offers" : "Seller listings"}</h2></div><span className="soft-badge">{sample ? "Demo only" : "Seller-entered"}</span></div>
        {sample ? sample.sellers.map(seller => <div className="seller-row" key={seller.name}><span className="seller-icon">{seller.name.charAt(0)}</span><div className="seller-data"><b>{seller.name}</b><small><MapPin size={12}/>{seller.city} · Sample listing</small><small>Last updated: sample data</small></div><div className="seller-price"><b>{naira(seller.price)}</b><small>Not verified</small><Link className="seller-view-link" href="/businesses">View businesses</Link></div></div>) : detail?.sellers.map(seller => <div className="seller-row" key={seller.id}><span className="seller-icon">{seller.businessName.charAt(0)}</span><div className="seller-data"><b>{seller.businessName}</b><small><MapPin size={12}/>{seller.city || "Location pending"}{seller.state ? `, ${seller.state}` : ""}</small><small>Updated {new Date(seller.updatedAt).toLocaleDateString("en-NG")} · Seller-listed</small></div><div className="seller-price"><b>{naira(seller.priceNaira)}</b><small>{!seller.businessIsDemo && seller.verificationStatus === "verified" ? <span className="verified-label"><Check size={12}/> Verified business</span> : "Business not verified"}</small><Link className="seller-view-link" href={`/businesses/${seller.businessSlug}`}>View seller</Link></div></div>)}
        {!sample && !detail?.sellers.length && <div className="empty-inline"><b>No seller listings yet.</b><p>Seller-entered prices will appear here and remain distinct from community-verified reports.</p></div>}<Link className="text-link" href="/businesses">Browse the business directory <ArrowRight size={14}/></Link>
      </section>
      <section className="surface-card locations-panel"><div className="section-heading-inline"><div><span className="eyebrow">LOCATION COMPARISON</span><h2>Different city, different price.</h2></div><MapPin size={19} className="green-icon"/></div>{locationPrices.length ? <div className="location-price-list">{locationPrices.map(item => <div key={item.city}><span>{item.city}{item.count ? ` · ${item.count} verified` : ""}</span><b>{naira(item.average)}</b><div className="mini-bar"><i style={{ width: `${Math.max(18, item.average / (verified?.high ?? (isDemo ? sample?.high : undefined) ?? item.average) * 100)}%` }}/></div></div>)}</div> : <div className="empty-inline"><b>No verified city averages yet.</b><p>Location estimates appear after real reports are reviewed.</p></div>}<p className="small-disclaimer">{market.data?.length ? "Only recent, administrator-verified reports appear in this comparison." : isDemo && sample ? "All city figures are sample data. Verified local reports will power this comparison." : "Only recent, administrator-verified reports appear in this comparison."}</p></section>
    </div>
    <section className="fair-callout"><div className="fair-icon">₦</div><div><b>Not sure what you should pay?</b><p>Use the Fair Price Checker to compare against recent verified reports.</p></div><Link href={`/fair-price?product=${encodeURIComponent(productName)}`} className="btn-outline">Check a fair price <ArrowRight size={15}/></Link></section>
  </div>;
}
