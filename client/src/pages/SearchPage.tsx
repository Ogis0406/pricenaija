import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, ArrowUpDown, MapPin, BadgeCheck, ChevronDown, Building2, Star, ArrowRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { categories, demoBusinesses, demoProducts, locations, naira } from "@/lib/priceData";
import { PageIntro, DemoTag } from "@/components/PriceNaijaShell";
import { ProductCard } from "@/components/ProductCard";

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const initial = new URLSearchParams(window.location.search).get("q") || "";
  const [query, setQuery] = useState(initial);
  const [category, setCategory] = useState("All categories");
  const [city, setCity] = useState("All locations");
  const [sort, setSort] = useState("Lowest price");
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(1500000);
  const [minRating, setMinRating] = useState("Any rating");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [updatedWithin, setUpdatedWithin] = useState("Any time");
  const [resultType, setResultType] = useState<"products" | "businesses">("products");
  const [appliedQuery, setAppliedQuery] = useState(initial);
  const liveProducts = trpc.products.search.useQuery({ query: appliedQuery || undefined, category: category === "All categories" ? undefined : category, city: city === "All locations" ? undefined : city, minPrice: min || undefined, maxPrice: max < 1500000 ? max : undefined, minRating: minRating === "Any rating" ? undefined : Number(minRating), verifiedOnly: verifiedOnly || undefined, updatedWithinDays: updatedWithin === "Any time" ? undefined : Number(updatedWithin) });
  const liveBusinesses = trpc.businesses.list.useQuery({ query: appliedQuery || undefined, city: city === "All locations" ? undefined : city, category: category === "All categories" ? undefined : category, minPrice: min || undefined, maxPrice: max < 1500000 ? max : undefined, minRating: minRating === "Any rating" ? undefined : Number(minRating), verifiedOnly: verifiedOnly || undefined });
  const trackSearch = trpc.products.trackSearch.useMutation();
  const localProducts = useMemo(() => {
    const q = appliedQuery.trim().toLowerCase();
    let rows = demoProducts.filter(item => (!q || `${item.name} ${item.brand} ${item.category} ${item.sellers.map(seller => seller.name).join(" ")} ${Object.keys(item.locationPrices).join(" ")}`.toLowerCase().includes(q)) && (category === "All categories" || item.category === category) && (city === "All locations" || Object.hasOwn(item.locationPrices, city)) && item.low <= max && item.high >= min && (minRating === "Any rating" || Math.max(...item.sellers.map(seller => seller.rating)) >= Number(minRating)) && (!verifiedOnly || item.sellers.some(seller => seller.verified)) && updatedWithin === "Any time");
    if (sort === "Highest price") rows = [...rows].sort((a, b) => b.high - a.high);
    else if (sort === "Most recent") rows = [...rows].reverse();
    else if (sort === "Best rated") rows = [...rows].sort((a, b) => Math.max(...b.sellers.map(s => s.rating)) - Math.max(...a.sellers.map(s => s.rating)));
    else rows = [...rows].sort((a, b) => a.low - b.low);
    return rows;
  }, [appliedQuery, category, city, min, max, minRating, verifiedOnly, updatedWithin, sort]);
  const sampleBusinesses = useMemo(() => demoBusinesses.filter(item => (!appliedQuery || `${item.name} ${item.category} ${item.city} ${item.products.join(" ")}`.toLowerCase().includes(appliedQuery.toLowerCase())) && (city === "All locations" || item.city.includes(city)) && (category === "All categories" || item.category === category) && (minRating === "Any rating" || item.rating >= Number(minRating)) && !verifiedOnly), [appliedQuery, city, category, minRating, verifiedOnly]);
  const productRows = liveProducts.data ?? [];
  const productsBySlug = useMemo(() => new Map(productRows.map(item => [item.slug, item])), [productRows]);
  const realProducts = useMemo(() => {
    const rows = productRows.filter(item => !item.isDemo);
    const numberFor = (item: typeof rows[number]) => item.verifiedPrices?.low ?? item.lowestSellerPrice ?? Number.MAX_SAFE_INTEGER;
    return [...rows].sort((a, b) => {
      if (sort === "Highest price") return (b.verifiedPrices?.high ?? b.lowestSellerPrice ?? -1) - (a.verifiedPrices?.high ?? a.lowestSellerPrice ?? -1);
      if (sort === "Most recent") return new Date(b.verifiedPrices?.lastUpdated ?? b.updatedAt).getTime() - new Date(a.verifiedPrices?.lastUpdated ?? a.updatedAt).getTime();
      if (sort === "Best rated") return (b.averageSellerRating ?? -1) - (a.averageSellerRating ?? -1);
      return numberFor(a) - numberFor(b);
    });
  }, [productRows, sort]);
  const realBusinesses = (liveBusinesses.data || []).filter(item => !item.isDemo);
  const applySearch = (event: React.FormEvent) => { event.preventDefault(); const value = query.trim(); setAppliedQuery(value); setLocation(`/search${value ? `?q=${encodeURIComponent(value)}` : ""}`); if (value) trackSearch.mutate({ query: value, category: category === "All categories" ? undefined : category, city: city === "All locations" ? undefined : city }); };
  const reset = () => { setQuery(""); setAppliedQuery(""); setCategory("All categories"); setCity("All locations"); setMin(0); setMax(1500000); setMinRating("Any rating"); setVerifiedOnly(false); setUpdatedWithin("Any time"); setLocation("/search"); };
  const resultCount = resultType === "products" ? localProducts.length + realProducts.length : sampleBusinesses.length + realBusinesses.length;
  return <div className="content-width page-content"><PageIntro eyebrow="COMPARE WITH CONTEXT" title="Find the price that feels right." description="Search products, sellers, categories and locations. Demo figures are labeled; verified prices come only from reviewed reports."/>
    <form className="search-toolbar" onSubmit={applySearch}><Search size={19}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search rice, cooking gas, phones…" aria-label="Search products, sellers and locations"/><button className="btn-primary" type="submit">Search</button></form>
    <div className="search-result-top"><div><b>{resultCount} {resultType === "products" ? "products" : "businesses"}</b><span> · Demo listings clearly labeled</span></div><DemoTag/></div>
    <div className="search-layout"><aside className="filter-panel"><div className="filter-title"><SlidersHorizontal size={17}/> Filters <button type="button" onClick={reset}>Reset</button></div>
      <label className="filter-label">Category<select value={category} onChange={event => setCategory(event.target.value)}><option>All categories</option>{categories.map(value => <option key={value}>{value}</option>)}</select><ChevronDown className="select-chevron" size={14}/></label>
      <label className="filter-label">Location<select value={city} onChange={event => setCity(event.target.value)}><option>All locations</option>{locations.map(value => <option key={value}>{value}</option>)}</select><ChevronDown className="select-chevron" size={14}/></label>
      <label className="filter-label">Minimum price<input type="number" min="0" step="5000" value={min || ""} onChange={event => setMin(Number(event.target.value) || 0)} placeholder="₦0"/></label>
      <label className="filter-label">Maximum price <strong>{naira(max)}</strong><input className="range-input" type="range" min="5000" max="1500000" step="5000" value={max} onChange={event => setMax(Number(event.target.value))}/><span className="range-limits"><small>₦5,000</small><small>₦1.5m</small></span></label>
      <label className="filter-label">Minimum seller rating<select value={minRating} onChange={event => setMinRating(event.target.value)}><option>Any rating</option><option value="3">3.0+</option><option value="4">4.0+</option><option value="4.5">4.5+</option></select></label>
      <label className="filter-label">Date updated<select value={updatedWithin} onChange={event => setUpdatedWithin(event.target.value)}><option>Any time</option><option value="30">Past 30 days</option><option value="90">Past 90 days</option><option value="180">Past 6 months</option></select></label>
      <label className="check-filter"><input type="checkbox" checked={verifiedOnly} onChange={event => setVerifiedOnly(event.target.checked)}/><span><BadgeCheck size={15}/> Verified sellers only</span></label>
      <div className="filter-note"><b>Why verified?</b><p>Reports are reviewed before they inform public price comparisons. Sample records never count as verified.</p></div>
    </aside><div className="results-area"><div className="results-controls"><span><MapPin size={15}/> {city === "All locations" ? "Across Nigeria" : city}</span><div className="result-tabs"><button type="button" className={resultType === "products" ? "active" : ""} onClick={() => setResultType("products")}>Products</button><button type="button" className={resultType === "businesses" ? "active" : ""} onClick={() => setResultType("businesses")}>Businesses</button></div><label><ArrowUpDown size={14}/><select value={sort} onChange={event => setSort(event.target.value)}><option>Lowest price</option><option>Highest price</option><option>Most recent</option><option>Best rated</option></select></label></div>
      {resultType === "products" ? <>{localProducts.length || realProducts.length ? <div className="product-grid search-products">{localProducts.map(item => <ProductCard key={item.slug} product={item} record={productsBySlug.get(item.slug) ?? null} compact/>)}{realProducts.map(item => <ProductCard key={item.id} product={item} compact/>)}</div> : <EmptySearch reset={reset}/>}</> : <>{sampleBusinesses.length || realBusinesses.length ? <div className="business-grid">{sampleBusinesses.map(item => <article className="business-card" key={item.slug}><div className="business-card-top"><span className="business-logo">{item.icon}</span><span className="pending-badge">Demo profile</span></div><h3>{item.name}</h3><div className="business-location"><MapPin size={14}/>{item.city}</div><p>{item.description}</p><div className="business-card-meta"><span><Star size={14} fill="#f5b942" stroke="#f5b942"/> {item.rating.toFixed(1)} <small>sample</small></span><span><Building2 size={14}/>{item.category}</span></div><Link className="business-view" href={`/businesses/${item.slug}`}>View business <ArrowRight size={15}/></Link></article>)}{realBusinesses.map(item => <article className="business-card" key={item.id}><div className="business-card-top"><span className="business-logo"><Building2 size={22}/></span><span className={item.verificationStatus === "verified" ? "verified-label" : "pending-badge"}>{item.verificationStatus === "verified" ? "✓ Verified" : item.verificationStatus}</span></div><h3>{item.name}</h3><div className="business-location"><MapPin size={14}/>{item.city || "Location pending"}{item.state ? `, ${item.state}` : ""}</div><p>{item.description || "Business profile"}</p><div className="business-card-meta"><span><Star size={14} fill="#f5b942" stroke="#f5b942"/> {item.rating ? item.rating.toFixed(1) : "New"}</span><span><Building2 size={14}/>{item.category}</span></div><Link className="business-view" href={`/businesses/${item.slug}`}>View business <ArrowRight size={15}/></Link></article>)}</div> : <EmptySearch reset={reset}/>}</>}
      <div className="data-caveat"><BadgeCheck size={16}/><span>Sample catalog for preview. Verified comparisons appear only after real reports are reviewed.</span></div>
    </div></div>
  </div>;
}
function EmptySearch({ reset }: { reset: () => void }) { return <div className="empty-state"><span className="empty-icon"><Search/></span><h3>We couldn't find that product.</h3><p>Try searching for rice, cement or cooking gas, or relax your filters.</p><button className="btn-outline" onClick={reset}>Clear filters</button></div>; }
