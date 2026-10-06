import { useState } from "react";
import { ArrowRight, ImagePlus, UserRound } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { PageIntro, type ShellUser } from "@/components/PriceNaijaShell";

export default function ProfilePage({ user }: { user: ShellUser }) {
  const [message, setMessage] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState("");
  const utils = trpc.useUtils();
  const update = trpc.account.updateProfile.useMutation({ onSuccess: async () => { setMessage("Profile updated."); await utils.auth.me.invalidate(); } });
  if (!user) return <div className="content-width page-content"><PageIntro eyebrow="ACCOUNT SETTINGS" title="Your profile." description="Sign in to view and update your PriceNaija profile."/><div className="empty-state"><span className="empty-icon"><UserRound/></span><h3>Log in to continue.</h3><Link href="/login" className="btn-primary">Log in <ArrowRight size={14}/></Link></div></div>;
  return <div className="content-width page-content"><PageIntro eyebrow="ACCOUNT SETTINGS" title="Your profile." description="Manage the personal details attached to your PriceNaija account."/><div className="profile-settings-card"><div className="profile-settings-avatar">{avatarDataUrl || user.profileImageUrl ? <img src={avatarDataUrl || user.profileImageUrl || ""} alt="Your profile"/> : user.name?.slice(0,1).toUpperCase() || "P"}</div><div className="profile-settings-summary"><b>{user.name}</b><span>{user.email}</span><span className="pending-badge">{user.accountRole} · {user.emailVerified ? "Email verified" : "Email unverified"}</span></div>
    <form className="stacked-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); update.mutate({ name: String(form.get("name")), phone: String(form.get("phone") || "") || undefined, city: String(form.get("city") || "") || undefined, state: String(form.get("state") || "") || undefined, notificationsEnabled: form.get("notificationsEnabled") === "on", profileImageDataUrl: avatarDataUrl || undefined }); }}>
      <label>Profile picture<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.currentTarget.files?.[0]; if (!file) return; if (file.size > 3 * 1024 * 1024) { setMessage("Choose a JPG, PNG or WebP image under 3MB."); event.currentTarget.value = ""; return; } const reader = new FileReader(); reader.onload = () => setAvatarDataUrl(typeof reader.result === "string" ? reader.result : ""); reader.readAsDataURL(file); }}/><small><ImagePlus size={12}/> JPG, PNG or WebP up to 3MB.</small></label>
      <label>Name<input name="name" required minLength={2} defaultValue={user.name || ""}/></label><label>Email address<input value={user.email || ""} readOnly/></label>
      <div className="form-grid"><label>Phone (optional)<input name="phone" defaultValue={user.phone || ""} placeholder="Phone number"/></label><label>City (optional)<input name="city" defaultValue={user.city || ""} placeholder="e.g. Ikeja"/></label></div><label>State (optional)<input name="state" defaultValue={user.state || ""} placeholder="e.g. Lagos"/></label>
      <label className="notification-preference"><input type="checkbox" name="notificationsEnabled" defaultChecked={user.notificationsEnabled !== false}/> Receive PriceNaija account and price-alert notifications</label>
      {message && <div className="form-notice">{message}</div>}<button className="btn-primary" disabled={update.isPending}>{update.isPending ? "Saving…" : "Save changes"} <ArrowRight size={14}/></button>
    </form><div className="profile-settings-links"><Link href="/dashboard">My dashboard</Link><Link href="/forgot-password">Change password</Link><Link href="/privacy">Privacy details</Link></div></div></div>;
}
