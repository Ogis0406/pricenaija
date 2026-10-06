import { useState } from "react";
import { ArrowLeft, ArrowRight, AtSign, KeyRound, LockKeyhole, MailCheck, ShieldCheck, UserRound } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

type AuthMode = "login" | "signup" | "forgot" | "reset" | "verify";
export function AuthPage({ mode }: { mode: AuthMode }) {
  const [, setPath] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<"consumer" | "business">("consumer");
  const [notice, setNotice] = useState("");
  const [devLink, setDevLink] = useState("");
  const utils = trpc.useUtils();
  const login = trpc.auth.login.useMutation({ onSuccess: async result => { await utils.auth.me.invalidate(); setPath(result.user?.accountRole === "business" ? "/business/dashboard" : result.user?.accountRole === "admin" ? "/admin" : "/dashboard"); }, onError: e => setNotice(e.message) });
  const signup = trpc.auth.signUp.useMutation({ onSuccess: d => { setNotice(d.message); setDevLink(d.developmentVerifyPath || ""); }, onError: e => setNotice(e.message) });
  const forgot = trpc.auth.requestPasswordReset.useMutation({ onSuccess: d => { setNotice(d.message); setDevLink(d.developmentResetPath || ""); }, onError: e => setNotice(e.message) });
  const reset = trpc.auth.resetPassword.useMutation({ onSuccess: d => { setNotice(d.message); setDevLink(""); }, onError: e => setNotice(e.message) });
  const verify = trpc.auth.verifyEmail.useMutation({ onSuccess: d => setNotice(d.message), onError: e => setNotice(e.message) });
  const title: Record<AuthMode,string> = { login: "Welcome back.", signup: "Start with more clarity.", forgot: "Let’s get you back in.", reset: "Choose a new password.", verify: "Confirm your email." };
  const sub: Record<AuthMode,string> = { login: "Sign in to see your saved products, price alerts and contributions.", signup: "Save useful products, track prices and share what you find.", forgot: "Enter your account email and we’ll share next steps.", reset: "Create a new password for your PriceNaija account.", verify: "Confirm your email address to activate your PriceNaija account." };
  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault(); setNotice(""); setDevLink("");
    if (mode === "login") login.mutate({ email, password });
    else if (mode === "signup") signup.mutate({ name, email, password, accountRole: role });
    else if (mode === "forgot") forgot.mutate({ email });
    else if (mode === "reset") { if (!token) { setNotice("This reset link is missing or invalid."); return; } if (password !== confirm) { setNotice("Your passwords do not match."); return; } reset.mutate({ token, password }); }
    else if (mode === "verify") { if (token) verify.mutate({ token }); else setNotice("This verification link is missing or invalid."); }
  };
  return <div className="auth-page">
    <aside className="auth-aside"><Link href="/" className="auth-back"><ArrowLeft size={15}/> Back to PriceNaija</Link><div className="auth-aside-copy"><div className="auth-emblem">₦</div><span className="eyebrow">PRICE TRANSPARENCY, FOR EVERYDAY LIFE</span><h2>Every naira<br/>deserves a little<br/><em>more context.</em></h2><p>Compare, contribute and make your next decision with a clearer view.</p><div className="auth-assurance"><ShieldCheck size={17}/> Your account is yours. Your data stays private.</div></div><span className="auth-aside-footer">PriceNaija · Know the price. Save your money.</span></aside>
    <section className="auth-form-side"><div className="auth-card"><Link href="/" className="auth-brand"><img src="/pricenaija-mark.svg" alt=""/> Price<span>Naija</span></Link><span className="eyebrow">{mode === "signup" ? "CREATE YOUR ACCOUNT" : mode === "login" ? "YOUR PRICE TOOLKIT" : mode === "verify" ? "EMAIL VERIFICATION" : "ACCOUNT RECOVERY"}</span><h1>{title[mode]}</h1><p className="auth-subtitle">{sub[mode]}</p>
      <form className="auth-form" onSubmit={onSubmit}>
        {mode === "signup" && <><label>Your name<div className="input-with-icon"><UserRound size={16}/><input value={name} onChange={e=>setName(e.target.value)} required minLength={2} placeholder="e.g. Amaka Okoro"/></div></label><label>Account type<div className="role-switch"><button type="button" className={role === "consumer" ? "selected" : ""} onClick={()=>setRole("consumer")}>Consumer</button><button type="button" className={role === "business" ? "selected" : ""} onClick={()=>setRole("business")}>Business</button></div></label></>}
        {(mode === "login" || mode === "signup" || mode === "forgot") && <label>Email address<div className="input-with-icon"><AtSign size={16}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com" autoComplete="email"/></div></label>}
        {(mode === "login" || mode === "signup" || mode === "reset") && <label>{mode === "reset" ? "New password" : "Password"}<div className="input-with-icon"><KeyRound size={16}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={mode === "signup" || mode === "reset" ? 10 : 1} maxLength={128} placeholder={mode === "login" ? "Your password" : "At least 10 characters"} autoComplete={mode === "login" ? "current-password" : "new-password"}/></div>{(mode === "signup" || mode === "reset") && <small className="field-hint">Use 10 or more characters.</small>}</label>}
        {mode === "reset" && <label>Confirm new password<div className="input-with-icon"><KeyRound size={16}/><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required minLength={10} maxLength={128} placeholder="Type it again" autoComplete="new-password"/></div></label>}
        {notice && <div className={notice.toLowerCase().includes("incorrect") || notice.toLowerCase().includes("invalid") || notice.toLowerCase().includes("expired") ? "form-alert" : "form-notice"}>{notice}</div>}
        {devLink && <div className="dev-link-box"><b>Development-only test link</b><p>Email delivery is not connected in this preview. Use this one-time link to continue testing.</p><Link href={devLink} className="text-link">Continue securely <ArrowRight size={14}/></Link></div>}
        <button className="btn-primary full-width auth-submit" disabled={login.isPending || signup.isPending || forgot.isPending || reset.isPending || verify.isPending}>{mode === "login" ? "Log in" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset instructions" : mode === "reset" ? "Update password" : "Verify email"} <ArrowRight size={16}/></button>
      </form>
      {mode === "verify" && <div className="verify-state"><span className="verify-icon"><MailCheck/></span><p>{notice || "Use the button above to check your one-time verification link."}</p></div>}
      {mode === "login" && <div className="auth-forgot"><Link href="/forgot-password">Forgot password?</Link></div>}
      <div className="auth-switch">{mode === "login" ? <>New to PriceNaija? <Link href="/signup">Create an account</Link></> : mode === "signup" ? <>Already have an account? <Link href="/login">Log in</Link></> : <>Remembered it? <Link href="/login">Back to login</Link></>}</div>
      <div className="auth-footnote"><LockKeyhole size={13}/> Passwords are securely hashed. PriceNaija will never ask you to share your password.</div>
    </div><div className="auth-copyright">© 2026 PriceNaija · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></div></section>
  </div>;
}
