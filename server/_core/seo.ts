import { demoBusinesses, demoProducts, locations, naira } from "../../client/src/lib/priceData";
import { and, eq, gt } from "drizzle-orm";
import { businesses, businessProducts, categories, locations as dbLocations, priceReports, products } from "../../drizzle/schema";
import { getDb } from "../db";

const SHARE_IMAGE = "https://files.manuscdn.com/user_upload_by_module/session_file/310519664004238842/gALPlIlnUXTkVGIF.svg";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
const titles: Record<string, { title: string; description: string }> = {
  "/": { title: "PriceNaija | Compare prices across Nigeria", description: "Compare prices across Nigerian cities, check market context and share what you find. Know the price. Save your money." },
  "/search": { title: "Compare Nigerian prices | PriceNaija", description: "Search products and browse sample Nigerian price comparisons by category and location. Figures are clearly labeled and are not live quotes." },
  "/report": { title: "Report a price | PriceNaija Nigeria", description: "Share a product price, seller and location with the PriceNaija community. Reports stay pending until reviewed." },
  "/markets": { title: "Nigeria market prices by city | PriceNaija", description: "Explore city-by-city sample price context for Nigerian products, with clear data and verification labels." },
  "/fair-price": { title: "Fair Price Checker Nigeria | PriceNaija", description: "Compare a quote with recent verified PriceNaija reports for a product and location. Estimates may vary by seller." },
  "/deals": { title: "Price drops and deals | PriceNaija", description: "Browse illustrative price-drop comparisons and see why current seller prices should be confirmed before purchase." },
  "/businesses": { title: "Find Nigerian businesses | PriceNaija", description: "Explore sample local business profiles and product categories. PriceNaija clearly distinguishes demo profiles from verified businesses." },
  "/community": { title: "PriceNaija community | Nigerian market knowledge", description: "Share useful observations about prices, markets, products, shopping experiences and practical tips." },
  "/trust-safety": { title: "Trust and safety | PriceNaija", description: "Learn how PriceNaija reviews price reports, handles community concerns neutrally and offers businesses an appeal process." },
  "/privacy": { title: "Privacy policy | PriceNaija", description: "Learn how PriceNaija handles account information, price submissions, saved products and alert preferences." },
  "/terms": { title: "Terms of use | PriceNaija", description: "Understand PriceNaija estimates, community reports, moderation and the limits of sample comparison data." },
  "/help": { title: "Help centre | PriceNaija", description: "Learn how to compare prices, submit reports, create alerts and manage your PriceNaija account." },
  "/login": { title: "Log in to PriceNaija", description: "Sign in to manage saved products, price alerts and community contributions." },
  "/signup": { title: "Create a PriceNaija account", description: "Create a PriceNaija consumer or business account to save products, follow prices and share market observations." },
  "/forgot-password": { title: "Recover your PriceNaija account", description: "Request secure password-reset instructions for your PriceNaija account." },
  "/verify-email": { title: "Verify your PriceNaija email", description: "Confirm the email address for your PriceNaija account." },
};
const privatePaths = ["/dashboard", "/profile", "/business/dashboard", "/admin", "/login", "/signup", "/forgot-password", "/verify-email"];

type RealProduct = { id: number; name: string; slug: string; category: string; quantity: string; description: string | null; isDemo: boolean; average: number | null; low: number | null; high: number | null; count: number };
type RealBusiness = { id: number; name: string; slug: string; description: string | null; category: string | null; city: string | null; state: string | null; verificationStatus: "pending" | "verified" | "rejected"; isDemo: boolean; listings: Array<{ name: string; slug: string; quantity: string | null; price: number }> };

async function loadRealProduct(slug: string): Promise<RealProduct | null> {
  try {
    const db = await getDb(); if (!db) return null;
    const rows = await db.select({ product: products, category: categories.name }).from(products).leftJoin(categories, eq(products.categoryId, categories.id)).where(and(eq(products.slug, slug), eq(products.isActive, true))).limit(1);
    if (!rows[0]) return null;
    const cutoff = new Date(Date.now() - 180 * 86400000);
    const reports = await db.select({ price: priceReports.priceNaira }).from(priceReports).where(and(eq(priceReports.productId, rows[0].product.id), eq(priceReports.status, "verified"), eq(priceReports.isDemo, false), gt(priceReports.observedAt, cutoff))).limit(100);
    const prices = reports.map(row => row.price).sort((a, b) => a - b);
    return { id: rows[0].product.id, name: rows[0].product.name, slug: rows[0].product.slug, category: rows[0].category ?? "Products", quantity: rows[0].product.quantityLabel ?? "Product", description: rows[0].product.description, isDemo: rows[0].product.isDemo, average: prices.length ? Math.round(prices.reduce((sum, value) => sum + value, 0) / prices.length) : null, low: prices[0] ?? null, high: prices[prices.length - 1] ?? null, count: prices.length };
  } catch { return null; }
}

async function loadRealBusiness(slug: string): Promise<RealBusiness | null> {
  try {
    const db = await getDb(); if (!db) return null;
    const rows = await db.select({ business: businesses, city: dbLocations.city, state: dbLocations.state }).from(businesses).leftJoin(dbLocations, eq(businesses.locationId, dbLocations.id)).where(eq(businesses.slug, slug)).limit(1);
    if (!rows[0]) return null;
    const listed = await db.select({ product: products, price: businessProducts.priceNaira }).from(businessProducts).innerJoin(products, eq(businessProducts.productId, products.id)).where(and(eq(businessProducts.businessId, rows[0].business.id), eq(businessProducts.available, true))).limit(30);
    return { id: rows[0].business.id, name: rows[0].business.name, slug: rows[0].business.slug, description: rows[0].business.description, category: rows[0].business.category, city: rows[0].city, state: rows[0].state, verificationStatus: rows[0].business.verificationStatus, isDemo: rows[0].business.isDemo, listings: listed.map(row => ({ name: row.product.name, slug: row.product.slug, quantity: row.product.quantityLabel, price: row.price })) };
  } catch { return null; }
}

function renderBody(path: string, realProduct?: RealProduct | null, realBusiness?: RealBusiness | null) {
  const productMatch = path.match(/^\/products\/([a-z0-9-]+)$/);
  if (productMatch) {
    const product = demoProducts.find(item => item.slug === productMatch[1]);
    if (product) return `<main class="seo-fallback"><p>PriceNaija · ${escapeHtml(product.category)} · <strong>Demo data</strong></p><h1>${escapeHtml(product.name)} price comparison</h1><p>${escapeHtml(product.quantity)} · Sample price range ${naira(product.low)}–${naira(product.high)} · Sample average ${naira(product.average)}. These illustrative figures are not verified market prices.</p><h2>Compare with context</h2><p>Price estimates require recent verified reports. No sample price should be treated as a live seller quote.</p><nav><a href="/search">Compare products</a> · <a href="/markets">Explore markets</a> · <a href="/fair-price?product=${encodeURIComponent(product.name)}">Check a fair price</a></nav></main>`;
    if (!realProduct) return null;
    const priceInfo = realProduct.count ? `Recent verified price range ${naira(realProduct.low!)}–${naira(realProduct.high!)} · average ${naira(realProduct.average!)} from ${realProduct.count} verified reports.` : "There are not enough recent verified reports to provide a public price estimate.";
    return `<main class="seo-fallback"><p>PriceNaija · ${escapeHtml(realProduct.category)} · <strong>${realProduct.isDemo ? "Demo data" : "Price information"}</strong></p><h1>${escapeHtml(realProduct.name)} price comparison</h1><p>${escapeHtml(realProduct.quantity)} · ${realProduct.isDemo ? "This demo product is not a live seller quote." : escapeHtml(realProduct.description || "Compare seller prices and recent community reports.")}</p><p>${escapeHtml(priceInfo)}</p><h2>Compare with context</h2><p>Price estimates use recent verified community reports and may vary by seller and location.</p><nav><a href="/search">Compare products</a> · <a href="/markets">Explore markets</a> · <a href="/fair-price?product=${encodeURIComponent(realProduct.name)}">Check a fair price</a></nav></main>`;
  }
  const marketMatch = path.match(/^\/markets\/([a-z0-9-]+)$/);
  if (marketMatch) {
    const city = locations.find(item => item.toLowerCase().replace(/\s+/g, "-") === marketMatch[1]);
    if (!city) return null;
    return `<main class="seo-fallback"><p>PriceNaija · Nigeria Market Price Map · <strong>Demo data</strong></p><h1>Market prices in ${escapeHtml(city)}</h1><p>Explore sample product-price context for ${escapeHtml(city)}, with comparisons across Nigerian cities. Figures are illustrative and are not live or verified prices.</p><h2>Products to compare</h2><ul>${demoProducts.slice(0, 5).map(p => `<li><a href="/products/${encodeURIComponent(p.slug)}">${escapeHtml(p.name)} — sample only</a></li>`).join("")}</ul><a href="/markets">View all markets</a></main>`;
  }
  const businessMatch = path.match(/^\/businesses\/([a-z0-9-]+)$/);
  if (businessMatch) {
    const business = demoBusinesses.find(item => item.slug === businessMatch[1]);
    if (business) return `<main class="seo-fallback"><p>PriceNaija business directory · <strong>Demo profile — not verified</strong></p><h1>${escapeHtml(business.name)}</h1><p>${escapeHtml(business.category)} · ${escapeHtml(business.city)}. ${escapeHtml(business.description)}</p><p>This sample profile is not a real verified business. PriceNaija reviews business verification and community concerns before making factual claims.</p><a href="/businesses">Browse businesses</a></main>`;
    if (!realBusiness) return null;
    const verified = !realBusiness.isDemo && realBusiness.verificationStatus === "verified";
    const offers = realBusiness.listings.length ? `<h2>Seller listings</h2><ul>${realBusiness.listings.map(item => `<li><a href="/products/${encodeURIComponent(item.slug)}">${escapeHtml(item.name)}</a> · ${escapeHtml(item.quantity || "Product")} · ${naira(item.price)} seller-listed price; not an independently verified market quote</li>`).join("")}</ul>` : "<p>No product listings are available yet.</p>";
    return `<main class="seo-fallback"><p>PriceNaija business directory · <strong>${verified ? "Business profile verified" : realBusiness.isDemo ? "Demo profile — not verified" : "Verification " + escapeHtml(realBusiness.verificationStatus) + " — not verified"}</strong></p><h1>${escapeHtml(realBusiness.name)}</h1><p>${escapeHtml(realBusiness.category || "Business")}${realBusiness.city ? ` · ${escapeHtml(realBusiness.city)}` : ""}${realBusiness.state ? `, ${escapeHtml(realBusiness.state)}` : ""}. ${escapeHtml(realBusiness.description || "PriceNaija business profile.")}</p><p>Seller-listed prices are distinct from independently verified community price reports.</p>${offers}<a href="/businesses">Browse businesses</a></main>`;
  }
  const page = titles[path];
  if (!page && privatePaths.some(base => path === base || path.startsWith(`${base}/`))) {
    return `<main class="seo-fallback"><h1>PriceNaija account workspace</h1><p>Sign in to access private account and business tools.</p><a href="/login">Log in</a></main>`;
  }
  if (!page) return null;
  if (path === "/") return `<main class="seo-fallback"><p>Price transparency for everyday life in Nigeria</p><h1>Know the price. Save your money.</h1><p>PriceNaija helps Nigerians compare prices, discover trusted businesses and understand market prices before they buy. Compare prices across Nigeria before you buy.</p><nav><a href="/search">Compare prices</a> · <a href="/report">Report a price</a> · <a href="/markets">Explore markets</a></nav><h2>Sample prices for demonstration only</h2><ul>${demoProducts.slice(0, 3).map(p => `<li><a href="/products/${encodeURIComponent(p.slug)}">${escapeHtml(p.name)}</a> · ${naira(p.low)} lowest sample · ${naira(p.average)} average sample</li>`).join("")}</ul><p>Sample figures are not live or independently verified market prices.</p></main>`;
  if (path === "/search") return `<main class="seo-fallback"><h1>Compare Nigerian product prices</h1><p>Search product names and explore clearly labeled demonstration prices across categories and locations.</p><ul>${demoProducts.slice(0, 8).map(p => `<li><a href="/products/${encodeURIComponent(p.slug)}">${escapeHtml(p.name)}</a> · ${escapeHtml(p.category)}</li>`).join("")}</ul></main>`;
  if (path === "/businesses") return `<main class="seo-fallback"><h1>Explore Nigerian businesses</h1><p>Sample business profiles are not verified real-world listings.</p><ul>${demoBusinesses.map(b => `<li><a href="/businesses/${encodeURIComponent(b.slug)}">${escapeHtml(b.name)}</a> · ${escapeHtml(b.category)} · demo profile</li>`).join("")}</ul></main>`;
  if (path === "/markets") return `<main class="seo-fallback"><h1>Nigeria Market Price Map</h1><p>Explore illustrative city comparisons for the selected product. These sample figures are not live or verified prices.</p><ul>${locations.map(city => `<li><a href="/markets/${encodeURIComponent(city.toLowerCase().replace(/\s+/g, "-"))}">${escapeHtml(city)}</a></li>`).join("")}</ul></main>`;
  return `<main class="seo-fallback"><h1>${escapeHtml(page.title)}</h1><p>${escapeHtml(page.description)}</p><nav><a href="/">Home</a> · <a href="/search">Compare prices</a> · <a href="/trust-safety">Trust &amp; Safety</a></nav></main>`;
}

export async function renderSeoDocument(template: string, requestUrl: string) {
  const parsed = new URL(requestUrl, "https://internal.invalid");
  const path = parsed.pathname.replace(/\/$/, "") || "/";
  const productPath = path.match(/^\/products\/([a-z0-9-]+)$/);
  const businessPath = path.match(/^\/businesses\/([a-z0-9-]+)$/);
  const realProduct = productPath && !demoProducts.some(item => item.slug === productPath[1]) ? await loadRealProduct(productPath[1]) : null;
  const realBusiness = businessPath && !demoBusinesses.some(item => item.slug === businessPath[1]) ? await loadRealBusiness(businessPath[1]) : null;
  let resolved: { title: string; description: string } | undefined = titles[path];
  if (path.match(/^\/products\/[a-z0-9-]+$/)) {
    const product = demoProducts.find(item => item.slug === path.split("/").pop());
    if (product) resolved = { title: `${product.name} price comparison | PriceNaija`, description: `See sample ${product.quantity} comparisons for ${product.name}. PriceNaija labels demo figures clearly and uses verified reports for real price estimates.` };
    else if (realProduct) resolved = { title: `${realProduct.name} price comparison | PriceNaija`, description: `${realProduct.quantity} · ${realProduct.count ? `Recent verified estimates from ${realProduct.count} reports` : "No recent verified price estimate yet"}. Compare prices with PriceNaija.` };
    else resolved = undefined;
  } else if (path.match(/^\/businesses\/[a-z0-9-]+$/)) {
    const business = demoBusinesses.find(item => item.slug === path.split("/").pop());
    if (business) resolved = { title: `${business.name} | PriceNaija business directory`, description: `Sample ${business.category} profile in ${business.city}. This demo profile is not verified as a real-world business.` };
    else if (realBusiness) resolved = { title: `${realBusiness.name} | PriceNaija business directory`, description: `${realBusiness.category || "Business"} profile${realBusiness.city ? ` in ${realBusiness.city}` : ""}. Seller-listed offers are distinct from independently verified community prices.` };
    else resolved = undefined;
  } else if (path.match(/^\/markets\/[a-z0-9-]+$/)) {
    const city = locations.find(item => item.toLowerCase().replace(/\s+/g, "-") === path.split("/").pop());
    if (!city) resolved = undefined;
    else resolved = { title: `Market prices in ${city} | PriceNaija`, description: `Explore sample price comparisons for ${city} and other Nigerian cities. Figures are illustrative and not verified live prices.` };
  }
  const isPrivate = privatePaths.some(base => path === base || path.startsWith(`${base}/`));
  if (!resolved && isPrivate) resolved = { title: "PriceNaija private workspace", description: "Sign in to access PriceNaija account and administration tools." };
  const body = renderBody(path, realProduct, realBusiness);
  const notFound = body === null;
  const meta = resolved ?? { title: "Page not found | PriceNaija", description: "The PriceNaija page you requested could not be found." };
  let tags = `<meta name="description" content="${escapeHtml(meta.description)}"/><meta name="keywords" content="PriceNaija, Nigeria prices, compare prices, market prices, fair price checker, Nigerian businesses"/><meta name="robots" content="${isPrivate || notFound ? "noindex,nofollow" : "index,follow"}"/><meta property="og:type" content="${path.startsWith("/products/") ? "product" : "website"}"/><meta property="og:title" content="${escapeHtml(meta.title)}"/><meta property="og:description" content="${escapeHtml(meta.description)}"/><meta property="og:site_name" content="PriceNaija"/><meta property="og:image" content="${SHARE_IMAGE}"/><meta name="twitter:card" content="summary"/><meta name="twitter:title" content="${escapeHtml(meta.title)}"/><meta name="twitter:description" content="${escapeHtml(meta.description)}"/><meta name="twitter:image" content="${SHARE_IMAGE}"/>`;
  const publicOrigin = process.env.PUBLIC_APP_URL;
  if (publicOrigin && /^https:\/\//i.test(publicOrigin)) {
    const canonical = new URL(path, publicOrigin.endsWith("/") ? publicOrigin : `${publicOrigin}/`).toString();
    tags += `<link rel="canonical" href="${escapeHtml(canonical)}"/><meta property="og:url" content="${escapeHtml(canonical)}"/>`;
  }
  if (path === "/") {
    const jsonld = JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: "PriceNaija", description: meta.description, inLanguage: "en-NG" }).replace(/</g, "\\u003c");
    tags += `<script type="application/ld+json">${jsonld}</script>`;
  }
  let html = template.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`);
  html = html.replace(/<meta\s+(?:name|property)=["'](?:description|keywords|robots|og:[^"']+|twitter:[^"']+)["'][^>]*\/?\s*>/gi, "");
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*\/?\s*>/gi, "");
  html = html.replace(/<title>[\s\S]*?<\/title>/i, match => `${match}${tags}`);
  const fallback = body ?? `<main class="seo-fallback"><h1>Page not found</h1><p>We couldn't find that page.</p><a href="/">Return to PriceNaija</a></main>`;
  html = html.replace(/<div\s+id=["']root["']\s*>[\s\S]*?<\/div>/i, `<div id="root">${fallback}</div>`);
  return { html, status: notFound ? 404 : 200, private: isPrivate };
}
