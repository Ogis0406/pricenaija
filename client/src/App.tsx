import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Route, Switch, Link, useLocation } from "wouter";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PriceNaijaShell, type ShellUser } from "@/components/PriceNaijaShell";
const Home = lazy(() => import("@/pages/Home"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const ProductPage = lazy(() => import("@/pages/ProductPage"));
const MarketPage = lazy(() => import("@/pages/MarketPage"));
const ReportPage = lazy(() => import("@/pages/ReportPage"));
const FairPricePage = lazy(() => import("@/pages/FairPricePage"));
const AuthPage = lazy(() => import("@/pages/AuthPage").then(module => ({ default: module.AuthPage })));
const BusinessDirectory = lazy(() => import("@/pages/BusinessPages").then(module => ({ default: module.BusinessDirectory })));
const BusinessProfile = lazy(() => import("@/pages/BusinessPages").then(module => ({ default: module.BusinessProfile })));
const BusinessDashboard = lazy(() => import("@/pages/BusinessPages").then(module => ({ default: module.BusinessDashboard })));
const UserDashboardPage = lazy(() => import("@/pages/UserDashboardPage"));
const CommunityPage = lazy(() => import("@/pages/CommunityPage"));
const TrustSafetyPage = lazy(() => import("@/pages/TrustSafetyPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const InfoPage = lazy(() => import("@/pages/InfoPage"));
import { demoBusinesses, demoProducts, locations, naira } from "@/lib/priceData";

function setMeta(kind: "name" | "property", key: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[${kind}="${key}"]`);
  if (!element) { element = document.createElement("meta"); element.setAttribute(kind, key); document.head.appendChild(element); }
  element.setAttribute("content", content);
}
function routeMeta(path: string) {
  const productMatch = path.match(/^\/products\/([^/]+)$/);
  if (productMatch) { const p = demoProducts.find(item => item.slug === productMatch[1]); return { title: `${p?.name || "Product"} price comparison | PriceNaija`, description: p ? `Sample ${p.quantity} comparisons for ${p.name}. Demo figures are clearly labeled; real estimates use verified reports.` : "The PriceNaija product page could not be found.", robots: p ? "index,follow" : "noindex,follow" }; }
  const businessMatch = path.match(/^\/businesses\/([^/]+)$/);
  if (businessMatch) { const b = demoBusinesses.find(item => item.slug === businessMatch[1]); return { title: `${b?.name || "Business"} | PriceNaija directory`, description: b ? `Sample ${b.category} profile in ${b.city}. This demo profile is not verified as a real-world business.` : "The PriceNaija business page could not be found.", robots: b ? "index,follow" : "noindex,follow" }; }
  const marketMatch = path.match(/^\/markets\/([^/]+)$/);
  if (marketMatch) { const city = locations.find(item => item.toLowerCase().replace(/\s+/g, "-") === marketMatch[1]); return { title: `Market prices${city ? ` in ${city}` : ""} | PriceNaija`, description: city ? `Explore sample price comparisons for ${city} and other Nigerian cities. Figures are illustrative, not live verified prices.` : "The PriceNaija market page could not be found.", robots: city ? "index,follow" : "noindex,follow" }; }
  const items: Record<string, { title: string; description: string }> = {
    "/": { title: "PriceNaija | Compare prices across Nigeria", description: "Compare prices across Nigerian cities, check market context and share what you find. Know the price. Save your money." },
    "/search": { title: "Compare Nigerian prices | PriceNaija", description: "Search products and browse sample Nigerian price comparisons by category and location. Figures are clearly labeled and are not live quotes." },
    "/report": { title: "Report a price | PriceNaija Nigeria", description: "Share a product price, seller and location with the PriceNaija community. Reports stay pending until reviewed." },
    "/markets": { title: "Nigeria market prices by city | PriceNaija", description: "Explore city-by-city sample price context for Nigerian products, with clear data and verification labels." },
    "/fair-price": { title: "Fair Price Checker Nigeria | PriceNaija", description: "Compare a quote with recent verified PriceNaija reports for a product and location. Estimates may vary by seller." },
    "/deals": { title: "Price drops and deals | PriceNaija", description: "Browse illustrative price-drop comparisons and confirm current seller prices before purchase." },
    "/businesses": { title: "Find Nigerian businesses | PriceNaija", description: "Explore local business profiles and product categories. Demo profiles are not verified real-world listings." },
    "/business/dashboard": { title: "Business workspace | PriceNaija", description: "Manage your PriceNaija business profile and market context." },
    "/dashboard": { title: "My PriceNaija dashboard", description: "Manage your saved products, price alerts and contributions." },
    "/profile": { title: "My PriceNaija profile", description: "Manage your PriceNaija account profile and preferences." },
    "/community": { title: "PriceNaija community | Nigerian market knowledge", description: "Share useful observations about prices, markets, products, shopping experiences and practical tips." },
    "/trust-safety": { title: "Trust and safety | PriceNaija", description: "Learn how PriceNaija reviews reports neutrally and gives businesses an appeal process." },
    "/privacy": { title: "Privacy policy | PriceNaija", description: "Learn how PriceNaija handles account information, price submissions, saved products and alert preferences." },
    "/terms": { title: "Terms of use | PriceNaija", description: "Understand PriceNaija estimates, community reports, moderation and limits of sample data." },
    "/help": { title: "Help centre | PriceNaija", description: "Learn how to compare prices, submit reports, create alerts and manage your PriceNaija account." },
    "/login": { title: "Log in to PriceNaija", description: "Sign in to manage saved products, price alerts and contributions." },
    "/signup": { title: "Create a PriceNaija account", description: "Create a consumer or business account to save products, follow prices and share market observations." },
    "/forgot-password": { title: "Recover your PriceNaija account", description: "Request secure password-reset instructions for your account." },
    "/verify-email": { title: "Verify your PriceNaija email", description: "Confirm the email address for your PriceNaija account." },
  };
  const item = items[path];
  const privatePage = ["/dashboard", "/profile", "/business/dashboard", "/admin", "/login", "/signup", "/forgot-password", "/verify-email"].some(base => path === base || path.startsWith(`${base}/`));
  if (path.startsWith("/admin")) return { title: "PriceNaija admin workspace", description: "Sign in to access PriceNaija review and administration tools.", robots: "noindex,nofollow" };
  return { title: item?.title || "Page not found | PriceNaija", description: item?.description || "The PriceNaija page you requested could not be found.", robots: privatePage ? "noindex,nofollow" : item ? "index,follow" : "noindex,follow" };
}
export default function App() {
  const { data: user, isLoading } = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); window.location.href = "/"; } });
  const [path] = useLocation();
  useEffect(() => { const route = path.split("?")[0]; document.documentElement.lang = "en-NG"; const meta = routeMeta(route); document.title = meta.title; setMeta("name", "description", meta.description); setMeta("name", "robots", meta.robots); setMeta("property", "og:title", meta.title); setMeta("property", "og:description", meta.description); setMeta("name", "twitter:title", meta.title); setMeta("name", "twitter:description", meta.description); }, [path]);
  if (isLoading) return <div className="app-loading"><img src="/pricenaija-mark.svg" alt=""/><span>Getting your price toolkit ready…</span></div>;
  const shell = (content: ReactNode) => <PriceNaijaShell user={(user ?? null) as ShellUser} onLogout={() => logout.mutate(undefined)}><Suspense fallback={<div className="app-loading">Loading this PriceNaija page…</div>}>{content}</Suspense></PriceNaijaShell>;
  return <Switch>
    <Route path="/login"><Suspense fallback={<div className="app-loading">Loading sign in…</div>}><AuthPage mode="login"/></Suspense></Route>
    <Route path="/signup"><Suspense fallback={<div className="app-loading">Loading sign up…</div>}><AuthPage mode="signup"/></Suspense></Route>
    <Route path="/forgot-password"><Suspense fallback={<div className="app-loading">Loading account recovery…</div>}><AuthPage mode={new URLSearchParams(window.location.search).has("token") ? "reset" : "forgot"}/></Suspense></Route>
    <Route path="/verify-email"><Suspense fallback={<div className="app-loading">Loading verification…</div>}><AuthPage mode="verify"/></Suspense></Route>
    <Route path="/">{shell(<Home/>)}</Route>
    <Route path="/search">{shell(<SearchPage/>)}</Route>
    <Route path="/products/:slug">{params => shell(<ProductPage slug={params.slug}/>)}</Route>
    <Route path="/report">{shell(<ReportPage user={(user ?? null) as ShellUser}/>)}</Route>
    <Route path="/markets/:location">{params => shell(<MarketPage initialLocation={params.location}/>)}</Route>
    <Route path="/markets">{shell(<MarketPage initialLocation={new URLSearchParams(window.location.search).get("city") || undefined}/>)}</Route>
    <Route path="/fair-price">{shell(<FairPricePage/>)}</Route>
    <Route path="/deals">{shell(<DealsPage/>)}</Route>
    <Route path="/businesses">{shell(<BusinessDirectory/>)}</Route>
    <Route path="/businesses/:slug">{params => shell(<BusinessProfile slug={params.slug}/>)}</Route>
    <Route path="/business/dashboard">{shell(<BusinessDashboard user={(user ?? null) as ShellUser}/>)}</Route>
    <Route path="/dashboard">{shell(<UserDashboardPage user={(user ?? null) as ShellUser}/>)}</Route>
    <Route path="/profile">{shell(<ProfilePage user={(user ?? null) as ShellUser}/>)}</Route>
    <Route path="/trust-safety">{shell(<TrustSafetyPage user={(user ?? null) as ShellUser}/>)}</Route>
    <Route path="/community">{shell(<CommunityPage user={(user ?? null) as ShellUser}/>)}</Route>
    <Route path="/admin"><AdminRoute onLogout={() => logout.mutate(undefined)}/></Route>
    <Route path="/admin/reports"><AdminRoute section="reports" onLogout={() => logout.mutate(undefined)}/></Route>
    <Route path="/admin/trust"><AdminRoute section="trust" onLogout={() => logout.mutate(undefined)}/></Route>
    <Route path="/admin/businesses"><AdminRoute section="businesses" onLogout={() => logout.mutate(undefined)}/></Route>
    <Route path="/admin/products"><AdminRoute section="products" onLogout={() => logout.mutate(undefined)}/></Route>
    <Route path="/admin/users"><AdminRoute section="users" onLogout={() => logout.mutate(undefined)}/></Route>
    <Route path="/admin/alerts"><AdminRoute section="alerts" onLogout={() => logout.mutate(undefined)}/></Route>
    <Route path="/privacy">{shell(<InfoPage page="privacy"/>)}</Route>
    <Route path="/terms">{shell(<InfoPage page="terms"/>)}</Route>
    <Route path="/help">{shell(<InfoPage page="help"/>)}</Route>
    <Route>{shell(<NotFound/>)}</Route>
  </Switch>;
}
function AdminRoute({ section = "overview", onLogout }: { section?: string; onLogout: () => void }) {
  const [, setLocation] = useLocation();
  const access = trpc.admin.access.useQuery(undefined, { retry: false, staleTime: 0, refetchOnMount: "always", refetchOnWindowFocus: true });
  useEffect(() => {
    if (access.isError || (access.isSuccess && !access.data.allowed)) setLocation("/");
  }, [access.isError, access.isSuccess, access.data, setLocation]);
  if (access.isLoading || access.isFetching) return <div className="app-loading">Checking administrator access…</div>;
  if (access.isError || !access.data?.allowed) return null;
  const user = access.data.user as ShellUser;
  return <PriceNaijaShell user={user} onLogout={onLogout}><Suspense fallback={<div className="app-loading">Loading the admin workspace…</div>}><AdminPage user={user} section={section}/></Suspense></PriceNaijaShell>;
}
function DealsPage() { const deals = demoProducts.filter(item => item.change < 0).sort((a, b) => a.change - b.change); return <div className="content-width page-content"><div className="page-intro"><div><span className="eyebrow">PRICE DROPS &amp; DEALS</span><h1>Good to know when prices move.</h1><p>Sample comparisons for demonstration only — not verified live deals or seller offers.</p></div></div><div className="demo-banner"><span className="demo-tag"><i/> Demo data</span><span>Sample figures only. Confirm current seller prices before purchase.</span></div><div className="deal-list">{deals.map(item => <Link key={item.slug} href={`/products/${item.slug}`} className="deal-row"><span className="product-emoji">{item.icon}</span><div className="deal-details"><b>{item.name}</b><small>{item.category} · {item.quantity} · sample</small><div><del>{naira(Math.round(item.average * 1.065))}</del><strong>{naira(item.low)}</strong></div></div><span className="deal-drop">↓ {Math.abs(item.change)}%</span><span className="pending-badge">Sample comparison</span><ArrowUpRight size={17}/></Link>)}</div></div>; }
function NotFound() { return <div className="content-width page-content"><div className="empty-state"><span className="empty-icon">404</span><h2>That page isn’t here.</h2><p>Try searching for rice, cement or cooking gas.</p><Link href="/search" className="btn-primary">Compare prices <ArrowRight size={15}/></Link></div></div>; }
