import { useState } from "react";
import { ArrowRight, CheckCircle2, ShieldCheck, UploadCloud } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { PageIntro, type ShellUser } from "@/components/PriceNaijaShell";

export default function TrustSafetyPage({ user }: { user: ShellUser }) {
  const businesses = trpc.businesses.list.useQuery({});
  const mine = trpc.businesses.myProfiles.useQuery(undefined, { enabled: user?.accountRole === "business" });
  const [businessId, setBusinessId] = useState(new URLSearchParams(window.location.search).get("businessId") || "");
  const [photo, setPhoto] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const report = trpc.businesses.report.useMutation({ onSuccess: () => { setNotice("Your concern was submitted for review. A report is not a finding of wrongdoing."); setError(""); }, onError: e => setError(e.message) });
  const appeal = trpc.businesses.appeal.useMutation({ onSuccess: () => { setNotice("Your appeal was sent for review."); setError(""); }, onError: e => setError(e.message) });
  const selectedBusiness = Number(businessId) || undefined;
  const reportCount = trpc.businesses.reportCount.useQuery({ businessId: selectedBusiness! }, { enabled: !!selectedBusiness });
  const onFile = (file?: File) => {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Choose a JPG, PNG or WebP image."); return; }
    if (file.size > 3 * 1024 * 1024) { setError("Evidence image must be 3MB or smaller."); return; }
    const reader = new FileReader(); reader.onload = () => setPhoto(String(reader.result)); reader.readAsDataURL(file);
  };
  const submitReport = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setNotice("");
    if (!user) { setError("Please log in or create an account before submitting a concern."); return; }
    const form = new FormData(event.currentTarget);
    report.mutate({ businessId: selectedBusiness, subjectName: String(form.get("subjectName") || ""), reason: String(form.get("reason")), description: String(form.get("description")), evidenceDataUrl: photo || undefined, observedAt: String(form.get("observedAt") || "") || undefined });
  };
  const submitAppeal = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setNotice("");
    if (!user) { setError("Please log in to submit a business appeal."); return; }
    const form = new FormData(event.currentTarget);
    appeal.mutate({ businessId: Number(form.get("appealBusiness")), message: String(form.get("appealMessage")) });
  };
  return <div className="content-width page-content">
    <PageIntro eyebrow="TRUST & SAFETY" title="Trust should be earned, not assumed." description="PriceNaija treats user reports as leads for review — never as automatic proof about a product, seller or business."/>
    <div className="trust-hero-card"><div className="trust-emblem"><ShieldCheck/></div><div><span className="eyebrow">OUR COMMITMENT</span><h2>Keep the signal useful.<br/>Keep people treated fairly.</h2><p>Verified price information is reviewed before it informs comparisons. Community concerns are described neutrally, reviewed by moderators and can be appealed by the business.</p></div></div>
    <div className="trust-principles">{[{n:"01",t:"Reports are not verdicts",d:"A user report is a submission that needs context and review. It is not a factual determination."},{n:"02",t:"Verification has a process",d:"Price reports and business profiles begin pending. A moderator reviews the available details and evidence."},{n:"03",t:"Concerns stay neutral",d:"We show the count of reports submitted where appropriate; we do not automatically call anyone a scammer."},{n:"04",t:"Businesses can appeal",d:"A business can request review of a decision. Appeals are considered through a separate moderation workflow."}].map(x=><article key={x.n}><span>{x.n}</span><h3>{x.t}</h3><p>{x.d}</p></article>)}</div>
    {notice&&<div className="form-notice"><CheckCircle2 size={17}/>{notice}</div>}{error&&<div className="form-alert">{error}</div>}
    <div className="trust-action-grid"><section className="surface-card trust-action-card"><span className="eyebrow">COMMUNITY REPORT</span><h2>Share a concern for review.</h2><p>Include only what you personally observed. Reports remain private to moderators while under review.</p>
      {!user&&<div className="auth-required-banner"><ShieldCheck size={17}/><div><b>Sign in to submit a report.</b><span>Reports are tied to an account for moderation.</span></div><Link href="/login">Log in <ArrowRight size={14}/></Link></div>}
      <form className="stacked-form trust-report-form" onSubmit={submitReport}>
        <label>Business, seller or transaction (optional)<input name="subjectName" maxLength={180} placeholder="Name or short reference"/></label>
        <label>Business profile (optional)<select value={businessId} onChange={e=>setBusinessId(e.target.value)}><option value="">No linked profile</option>{(businesses.data||[]).filter(b=>!b.isDemo).map(b=><option key={b.id} value={b.id}>{b.name} · {b.city||"Location not set"}</option>)}</select></label>
        {selectedBusiness&&reportCount.data&&<p className="neutral-report-count">Community Reports: {reportCount.data.count} report{reportCount.data.count===1?"":"s"} submitted about this business. This is a count of submissions, not a finding.</p>}
        <label>Reason<select name="reason" required><option value="">Select a reason</option><option>Price or listing concern</option><option>Transaction concern</option><option>Business information concern</option><option>Safety concern</option><option>Other</option></select></label>
        <label>What happened?<textarea name="description" rows={4} required minLength={10} maxLength={2000} placeholder="Describe what you personally observed. Avoid sharing sensitive personal information."/></label>
        <label>Date observed<input name="observedAt" type="date" max={new Date().toISOString().slice(0,10)}/></label>
        <label className="upload-zone trust-upload">{photo?<><img src={photo} alt="Evidence preview"/><span><b>Evidence attached</b><small>Click to replace · maximum 3MB</small></span></>:<><span className="upload-icon"><UploadCloud/></span><span><b>Evidence or screenshot (optional)</b><small>JPG, PNG or WebP · up to 3MB</small></span></>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>onFile(e.target.files?.[0])}/></label>
        <button className="btn-primary" type="submit" disabled={report.isPending||!user}>{report.isPending?"Submitting…":"Submit for review"}<ArrowRight size={15}/></button>
      </form>
    </section>
    <section className="surface-card trust-action-card"><span className="eyebrow">BUSINESS APPEAL</span><h2>Request a fair review.</h2><p>Verified business owners may ask PriceNaija to review a decision about their profile.</p>
      {user?.accountRole==="business"&&mine.data?.length?<form className="stacked-form" onSubmit={submitAppeal}><label>Your business<select name="appealBusiness" required>{mine.data.map(b=><option key={b.id} value={b.id}>{b.name} · {b.verificationStatus}</option>)}</select></label><label>Appeal details<textarea name="appealMessage" rows={5} required minLength={10} maxLength={2000} placeholder="Explain the decision you are appealing and add relevant context."/></label><button className="btn-outline" type="submit" disabled={appeal.isPending}>{appeal.isPending?"Sending…":"Submit an appeal"}<ArrowRight size={15}/></button></form>:<div className="empty-inline"><b>Business-owner access</b><p>Sign in with a business account that owns a PriceNaija profile to submit an appeal.</p><Link href="/business/dashboard" className="text-link">Business workspace <ArrowRight size={14}/></Link></div>}
    </section></div>
  </div>;
}
