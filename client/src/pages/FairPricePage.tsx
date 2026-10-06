import { useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Search, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { demoProducts, locations, naira } from "@/lib/priceData";
import { PageIntro } from "@/components/PriceNaijaShell";

export default function FairPricePage() {
  const params = new URLSearchParams(window.location.search);
  const [product, setProduct] = useState(params.get("product") || demoProducts[0].name);
  const [city, setCity] = useState("Lagos");
  const [amount, setAmount] = useState(0);
  const [checked, setChecked] = useState(false);
  const catalogue = trpc.products.search.useQuery({});
  const selectedProduct = catalogue.data?.find(item => item.name === product);
  const sampleProduct = demoProducts.find(item => item.name === product);
  const quantity = selectedProduct?.quantityLabel || sampleProduct?.quantity || "";
  const options = catalogue.data?.length ? catalogue.data.map(item => ({ slug: item.slug, name: item.name, quantity: item.quantityLabel || "", isDemo: item.isDemo })) : demoProducts.map(item => ({ slug: item.slug, name: item.name, quantity: item.quantity, isDemo: true }));
  const result = trpc.products.fairPrice.useQuery({ productName: product, productId: selectedProduct?.id, quantityLabel: quantity, city }, { enabled: checked && product.length > 1 && quantity.length > 0 });
  const raw = result.data;
  const verifiedRange = raw?.available && typeof raw.low === "number" && typeof raw.high === "number" && typeof raw.average === "number" && raw.lastUpdated
    ? { count: raw.count, low: raw.low, high: raw.high, average: raw.average, lastUpdated: new Date(raw.lastUpdated) }
    : null;
  const status = verifiedRange && amount > 0 ? (amount <= verifiedRange.low ? "good" : amount <= verifiedRange.high ? "normal" : "high") : null;
  return <div className="content-width page-content fair-page">
    <PageIntro eyebrow="HOW MUCH SHOULD I PAY?" title="A fair price, with context." description="Compare your expected price against recent verified reports for the exact product, size and location." />
    <div className="fair-checker-card">
      <div className="fair-checker-head"><div className="fair-large-icon">₦</div><div><span className="eyebrow">PRICE CHECKER</span><h2>Let's check the market.</h2><p>Share what you’re looking at, and we’ll compare it with verified reports.</p></div></div>
      <form className="fair-form" onSubmit={event => { event.preventDefault(); setChecked(true); }}>
        <label>Product<select value={product} onChange={event => { setProduct(event.target.value); setChecked(false); }}>{options.map(item => <option key={item.slug} value={item.name}>{item.name}{item.isDemo ? " · demo catalogue" : ""}</option>)}</select></label>
        <label>Quantity<input value={quantity} readOnly placeholder="Choose a catalogue product" /></label>
        <label>Location<select value={city} onChange={event => { setCity(event.target.value); setChecked(false); }}>{locations.map(location => <option key={location}>{location}</option>)}</select></label>
        <label>Price you were quoted (₦)<input type="number" min="1" value={amount || ""} onChange={event => setAmount(Number(event.target.value))} placeholder="Enter a price" /></label>
        <button type="submit" className="btn-primary full-width">Check this price <Search size={16}/></button>
      </form>
      {checked && <div className="fair-result">
        {result.isLoading ? <p>Checking verified reports…</p> : !verifiedRange ? <div className="no-verified-data"><AlertTriangle size={20}/><div><b>No verified reports to compare yet.</b><p>PriceNaija will show an estimate here after reports for {product} ({quantity}) in {city} have been reviewed and verified. Sample figures and pending reports are not treated as facts.</p></div></div> : <>
          <div className="fair-range"><span>Recent verified range · {verifiedRange.count} report{verifiedRange.count === 1 ? "" : "s"}</span><strong>{naira(verifiedRange.low)} – {naira(verifiedRange.high)}</strong><small>Average {naira(verifiedRange.average)} · Updated {verifiedRange.lastUpdated.toLocaleDateString("en-NG")}</small></div>
          {status && <div className={`price-verdict ${status}`}>{status === "good" ? <CheckCircle2/> : status === "normal" ? <ShieldCheck/> : <AlertTriangle/>}<span><b>{naira(amount)} = {status === "good" ? "Good price" : status === "normal" ? "Normal price" : "Above recent reported prices"}</b><small>Estimate based on recent verified reports. Prices vary by seller and location.</small></span></div>}
        </>}
      </div>}
      <p className="fair-disclaimer">Prices are estimates based on recent PriceNaija reports and may vary by seller and location.</p>
    </div>
    <div className="fair-support-row"><span><ShieldCheck size={17}/> Verified reports only</span><span><CheckCircle2 size={17}/> Transparent sample size</span><span><AlertTriangle size={17}/> No guarantee of seller pricing</span></div>
    <div className="fair-linkout"><div><b>Help build a clearer picture.</b><p>Share a price you see and help others compare with more confidence.</p></div><Link href="/report" className="btn-outline">Report a price <ArrowRight size={15}/></Link></div>
  </div>;
}
