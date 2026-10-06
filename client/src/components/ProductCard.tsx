import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Heart, MoveUpRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { naira, type DemoProduct } from "@/lib/priceData";
import { trpc } from "@/lib/trpc";

type PriceSummary = { low: number; high: number; average: number; count: number; lastUpdated: Date | string | null };
type LiveProduct = { id: number; slug: string; name: string; brand: string | null; categoryName: string | null; quantityLabel: string | null; isDemo: boolean; verifiedPrices?: PriceSummary | null };
function isDemoProduct(product: DemoProduct | LiveProduct): product is DemoProduct { return "low" in product; }
const categoryIcons: Record<string, string> = { "Food & Groceries": "🌾", "Home & Energy": "🔥", "Building Materials": "🧱", Electronics: "📱", Appliances: "⚡" };

export function ProductCard({ product, compact = false, record }: { product: DemoProduct | LiveProduct; compact?: boolean; record?: LiveProduct | null }) {
  const [, setLocation] = useLocation();
  const demo = isDemoProduct(product) ? product : undefined;
  const suppliedRecord = record ?? (isDemoProduct(product) ? undefined : product);
  const detail = trpc.products.bySlug.useQuery({ slug: product.slug }, { enabled: !suppliedRecord?.id });
  const user = trpc.auth.me.useQuery(undefined, { retry: false });
  const live = suppliedRecord ?? (detail.data?.product as LiveProduct | undefined);
  const summary = suppliedRecord?.verifiedPrices ?? detail.data?.verifiedPrices;
  const productId = live?.id;
  const saved = trpc.account.saved.useQuery(undefined, { enabled: Boolean(user.data && productId) });
  const utils = trpc.useUtils();
  const [notice, setNotice] = useState("");
  const save = trpc.account.toggleSaved.useMutation({ onSuccess: async result => { setNotice(result.saved ? "Saved to your account." : "Removed from saved products."); await utils.account.saved.invalidate(); } });
  const dropping = Boolean(demo && demo.change < 0);
  const name = demo?.name ?? live?.name ?? product.name;
  const category = demo?.category ?? live?.categoryName ?? detail.data?.categoryName ?? "Products";
  const quantity = demo?.quantity ?? live?.quantityLabel ?? "";
  const isSaved = Boolean(productId && saved.data?.some(item => item.product.id === productId));
  const lowest = summary?.low ?? demo?.low;
  const average = summary?.average ?? demo?.average;
  const label = summary ? "Lowest verified price" : demo ? "Lowest sample price" : "Verified price";
  const icon = demo?.icon ?? categoryIcons[category] ?? "◈";
  const updateDate = summary?.lastUpdated ? new Date(summary.lastUpdated).toLocaleDateString("en-NG") : null;
  const onSave = () => {
    if (user.isLoading) { setNotice("Checking your account…"); return; }
    if (!user.data) { setLocation("/login"); return; }
    if (!productId) { setNotice("This item is not available in the catalogue yet."); return; }
    save.mutate({ productId });
  };

  return <article className={`product-card ${compact ? "product-card-compact" : ""}`}>
    <div className="product-card-top"><span className="product-emoji">{icon}</span><button type="button" className={`save-icon ${isSaved ? "is-saved" : ""}`} aria-label={isSaved ? `Remove ${name} from saved products` : `Save ${name}`} aria-pressed={isSaved} title={user.data ? (isSaved ? "Remove from saved products" : "Save this product") : "Sign in to save this product"} disabled={save.isPending} onClick={onSave}><Heart size={17} fill={isSaved ? "currentColor" : "none"}/></button></div>
    <div className="product-category">{category} <span>·</span> {quantity}</div>
    <Link href={`/products/${product.slug}`} className="product-name">{name}</Link>
    <div className="product-price-row"><div><small>{label}</small><b>{lowest !== undefined ? naira(lowest) : "Awaiting reports"}</b></div>{summary ? <span className="verified-label"><span>✓</span> {summary.count} verified</span> : demo ? <div className="change-pill">{dropping ? <ArrowDownRight size={14}/> : <ArrowUpRight size={14}/>} {Math.abs(demo.change)}%</div> : <span className="soft-badge">No verified data</span>}</div>
    <div className="product-card-bottom"><span>{average !== undefined ? <>{summary ? "Verified avg." : "Sample avg."} <b>{naira(average)}</b></> : <span>No verified price yet</span>}</span><Link href={`/products/${product.slug}`} className="compare-link">Compare <MoveUpRight size={14}/></Link></div>
    {notice && <div className="card-save-notice" role="status">{notice}</div>}
    <div className="card-demo-note">{summary ? `${summary.count} verified report${summary.count === 1 ? "" : "s"}${updateDate ? ` · updated ${updateDate}` : ""}` : demo ? "Sample figures · not verified" : "No verified price reports yet"}</div>
  </article>;
}
