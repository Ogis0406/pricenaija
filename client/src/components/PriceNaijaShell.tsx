import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpRight, Bell, Home, MapPinned, Menu, Search, UserRound, X } from "lucide-react";
import { useState } from "react";

export type ShellUser = { id: number; name: string | null; email: string | null; accountRole: "consumer" | "business" | "admin"; emailVerified: boolean; phone?: string | null; city?: string | null; state?: string | null; profileImageUrl?: string | null; notificationsEnabled?: boolean } | null;
const navItems = [["Home", "/"], ["Compare Prices", "/search"], ["Markets", "/markets"], ["Deals", "/deals"], ["Businesses", "/businesses"], ["Community", "/community"]] as const;
const mobileItems = [["Home", "/", Home], ["Search", "/search", Search], ["Markets", "/markets", MapPinned], ["Report", "/report", Bell], ["Profile", "/profile", UserRound]] as const;

export function Brand({ small = false }: { small?: boolean }) {
  return <Link href="/" className={`brand ${small ? "brand-small" : ""}`} aria-label="PriceNaija home"><img src="/pricenaija-mark.svg" alt="" /><span>Price<span>Naija</span><i>.</i></span></Link>;
}
export function PriceNaijaShell({ children, user, onLogout }: { children: ReactNode; user: ShellUser; onLogout?: () => void }) {
  const [path] = useLocation(); const [open, setOpen] = useState(false);
  return <div className="site-frame">
    <div className="announcement"><span className="announcement-dot" /> A clearer view of prices across Nigeria <span className="announcement-right">Community-powered market intelligence <ArrowUpRight size={13} /></span></div>
    <header className="topbar"><div className="topbar-inner"><Brand />
      <nav className="desktop-nav">{navItems.map(([label, href]) => <Link key={href} href={href} className={path === href ? "nav-link active" : "nav-link"}>{label}</Link>)}</nav>
      <div className="nav-actions">{user ? <><Link href={user.accountRole === "business" ? "/business/dashboard" : user.accountRole === "admin" ? "/admin" : "/dashboard"} className="nav-user">{user.name?.split(" ")[0] || "My account"}</Link><button onClick={onLogout} className="nav-login">Log out</button></> : <><Link href="/login" className="nav-login">Log in</Link><Link href="/signup" className="nav-signup">Sign up</Link></>}<Link href="/report" className="nav-report">Report a Price <ArrowUpRight size={15}/></Link></div>
      <button className="menu-toggle" onClick={() => setOpen(!open)} aria-label={open ? "Close navigation" : "Open navigation"}>{open ? <X/> : <Menu/>}</button>
    </div>{open && <div className="mobile-menu">{navItems.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}<Link href="/report" className="mobile-report" onClick={() => setOpen(false)}>Report a Price</Link></div>}</header>
    <main>{children}</main>
    <footer className="footer"><div className="footer-inner"><div className="footer-brand"><Brand small/><p>Know the price. Save your money.</p><span>Community-powered price intelligence for everyday decisions.</span></div><div><b>Platform</b><Link href="/search">Compare Prices</Link><Link href="/markets">Markets</Link><Link href="/deals">Deals</Link><Link href="/businesses">Businesses</Link><Link href="/community">Community</Link></div><div><b>Business</b><Link href="/signup">List Your Business</Link><Link href="/business/dashboard">Business Dashboard</Link><Link href="/markets">Market Intelligence</Link></div><div><b>Support</b><Link href="/help">Help Centre</Link><a href="mailto:hello@pricenaija.example">Contact</a><Link href="/trust-safety">Report an Issue</Link></div><div><b>Legal</b><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms</Link><Link href="/trust-safety">Trust &amp; Safety</Link></div></div><div className="footer-bottom"><span>© 2026 PriceNaija. Built for clearer everyday choices.</span><span>Prices are estimates and may vary by seller and location.</span></div></footer>
    <nav className="mobile-bottom-nav">{mobileItems.map(([label, href, Icon]) => <Link key={href} href={href} className={`mobile-bottom-item ${path === href ? "selected" : ""}`}><Icon size={19}/><span>{label}</span></Link>)}</nav>
  </div>;
}

export function PageIntro({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-intro"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}
export function SectionTitle({ eyebrow, title, detail, href, linkText = "View all" }: { eyebrow?: string; title: string; detail?: string; href?: string; linkText?: string }) {
  return <div className="section-title"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{detail && <p>{detail}</p>}</div>{href && <Link href={href} className="text-link">{linkText} <ArrowUpRight size={15}/></Link>}</div>;
}
export function DemoTag() { return <span className="demo-tag"><span/> Demo data</span>; }
