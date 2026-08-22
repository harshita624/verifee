"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User, Mail, Phone, MapPin, Calendar, Shield,
  Save, Loader2, CheckCircle, AlertTriangle,
  Zap, Trophy, Upload, TrendingDown, Edit3,
  Lock, Bell, ChevronRight, X, Eye, EyeOff,
  LogOut, Star, ArrowRight, Plus, Globe2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const LANGS   = ["English","Hindi","Tamil","Telugu","Kannada","Malayalam","Marathi","Bengali","Gujarati","Punjabi","Odia"];
const TRAVEL  = ["Rarely","Occasionally","Monthly","Weekly","Digital Nomad"];
const ALL_BADGES = [
  { id:"price_protector",label:"Price Protector",desc:"Checked 10+ prices"   },
  { id:"scam_buster",    label:"Scam Buster",    desc:"Detected 5+ scams"    },
  { id:"receipt_hero",   label:"Receipt Hero",   desc:"Uploaded 5 receipts"  },
  { id:"top_contributor",label:"Top Contributor",desc:"Reached 1,000 XP"    },
  { id:"explorer",       label:"Explorer",       desc:"Used in 3+ cities"    },
  { id:"trusted_voice",  label:"Trusted Voice",  desc:"100 helpful votes"    },
  { id:"pioneer",        label:"Pioneer",        desc:"Early Verifee user"   },
  { id:"local_expert",   label:"Local Expert",   desc:"500+ community votes" },
];

/* ── tiny reusables ───────────────────────────────────── */
function Avatar({ user, size = 72 }) {
  const initials = (user?.name || "U")
    .split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div
      className="rounded-2xl flex items-center justify-center text-white font-black overflow-hidden shrink-0"
      style={{
        width: size, height: size,
        fontSize: size * 0.3,
        background: "linear-gradient(135deg,#16a34a,#22c55e)",
      }}
    >
      {user?.avatar
        ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
        : initials}
    </div>
  );
}

function Field({ label, type = "text", value, onChange, placeholder, disabled, textarea }) {
  const cls = "w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 bg-white transition-colors disabled:bg-zinc-50 disabled:text-zinc-400";
  return (
    <div>
      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {textarea
        ? <textarea value={value} onChange={onChange} placeholder={placeholder}
            rows={3} className={`${cls} resize-none`} />
        : <input type={type} value={value} onChange={onChange}
            placeholder={placeholder} disabled={disabled} className={cls} />}
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-zinc-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-zinc-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-zinc-400 font-medium">{label}</p>
        <p className="text-[13px] font-semibold text-zinc-800 truncate">{value}</p>
      </div>
    </div>
  );
}

function PasswordModal({ onClose }) {
  const [f,setF]=useState({cur:"",nxt:"",cfm:""});
  const [show,setShow]=useState(false);
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const [done,setDone]=useState(false);

  const submit=async()=>{
    setErr("");
    if(f.nxt.length<8){setErr("At least 8 characters");return}
    if(f.nxt!==f.cfm){setErr("Passwords do not match");return}
    setLoading(true);
    try{
      const token=localStorage.getItem("vf_token");
      const res=await fetch(`${API}/api/v1/auth/change-password`,{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
        body:JSON.stringify({currentPassword:f.cur,newPassword:f.nxt}),
      });
      const d=await res.json();
      if(!res.ok)throw new Error(d.message);
      setDone(true);setTimeout(onClose,1800);
    }catch(e){setErr(e.message||"Failed")}
    finally{setLoading(false)}
  };

  return(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{background:"rgba(0,0,0,.4)",backdropFilter:"blur(4px)"}} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-fade-up"
        style={{boxShadow:"0 24px 64px rgba(0,0,0,.15)"}} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-bold text-zinc-900">Change password</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100"><X className="w-4 h-4 text-zinc-500"/></button>
        </div>
        {done?(
          <div className="flex flex-col items-center py-4 gap-2">
            <CheckCircle className="w-10 h-10 text-green-500"/>
            <p className="text-[14px] font-semibold text-zinc-800">Password updated</p>
          </div>
        ):(
          <>
            {err&&<div className="bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0"/>
              <p className="text-[12px] text-red-600">{err}</p>
            </div>}
            <div className="space-y-3 mb-5">
              {[{k:"cur",l:"Current password"},{k:"nxt",l:"New password"},{k:"cfm",l:"Confirm new password"}].map(({k,l})=>(
                <div key={k}>
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">{l}</label>
                  <div className="relative">
                    <input type={show?"text":"password"} value={f[k]}
                      onChange={e=>setF({...f,[k]:e.target.value})}
                      className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-800 bg-white pr-10"/>
                    {k==="nxt"&&<button type="button" onClick={()=>setShow(!show)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                      {show?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                    </button>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={submit} disabled={loading||!f.cur||!f.nxt||!f.cfm}
                className="flex-1 flex items-center justify-center gap-2 btn-green text-[13px] py-2.5 rounded-xl disabled:opacity-50">
                {loading&&<Loader2 className="w-4 h-4 animate-spin"/>}
                Update password
              </button>
              <button onClick={onClose}
                className="text-[13px] font-medium text-zinc-600 border border-zinc-200 px-4 py-2.5 rounded-xl hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────── */
export default function ProfilePage() {
  const router=useRouter();
  const {user,loading:authLoading,setLoggedIn,logout}=useAuth();

  const [tab,setTab]       = useState("profile");
  const [editing,setEditing]= useState(false);
  const [saving,setSaving]  = useState(false);
  const [saved,setSaved]    = useState(false);
  const [error,setError]    = useState("");
  const [pwModal,setPwModal]= useState(false);

  const [form,setForm]=useState({
    name:"",phone:"",city:"",country:"",
    language:"English",bio:"",travelFrequency:"Occasionally",
  });

  const [notifs,setNotifs]=useState({
    priceAlerts:true,scamAlerts:true,newMarkets:false,
  });

  useEffect(()=>{
    if(!authLoading&&!user) router.push("/auth/login?next=/profile");
  },[user,authLoading,router]);

  useEffect(()=>{
    if(user) setForm({
      name:user.name||"",phone:user.phone||"",
      city:user.city||"",country:user.country||"",
      language:user.language||"English",
      bio:user.bio||"",
      travelFrequency:user.travelFrequency||"Occasionally",
    });
  },[user]);

  const save=async()=>{
    setSaving(true);setError("");
    try{
      const token=localStorage.getItem("vf_token");
      const res=await fetch(`${API}/api/v1/auth/me`,{
        method:"PATCH",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
        body:JSON.stringify(form),
      });
      const data=await res.json();
      if(!res.ok)throw new Error(data.message);
      setLoggedIn(data.data?.user||{...user,...form});
      setEditing(false);setSaved(true);setTimeout(()=>setSaved(false),3000);
    }catch(e){setError(e.message||"Failed to save")}
    finally{setSaving(false)}
  };

  if(authLoading){
    return(
      <div className="min-h-screen pt-[60px] flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-green-600 animate-spin"/>
      </div>
    );
  }
  if(!user) return null;

  const xp            = user.xp||0;
  const level         = user.level||1;
  const contributions = user.contributionCount||0;
  const earnedSet     = new Set(user.badges||[]);
  const xpProgress    = Math.min(((xp%1000)/1000)*100,100);
  const joinedDate    = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN",{year:"numeric",month:"long"})
    : null;
// FIX: banner text only asks for name + city, but the completeness check
// also required phone — so filling in exactly what the banner asked for
// (name + city) still left the banner showing forever, since phone was
// never mentioned but silently required. Now the check matches the message.
const profileComplete = !!(user.name && user.city);

  const TABS=[
    {id:"profile",label:"Profile"},
    {id:"badges", label:`Badges ${earnedSet.size>0?`(${earnedSet.size})`:""}`},
    {id:"settings",label:"Settings"},
  ];

  return(
    <div className="min-h-screen pt-[60px]" style={{background:"#fafafa"}}>

      {/* ── Banner ── */}
      <div style={{
        background:"linear-gradient(135deg,#14532d 0%,#166534 40%,#16a34a 100%)",
        paddingTop:36,paddingBottom:72,position:"relative",overflow:"hidden",
      }}>
        {/* dot pattern */}
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage:"radial-gradient(circle,#fff 1px,transparent 1px)",
          backgroundSize:"24px 24px",
        }}/>

        <div className="container relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <Avatar user={user} size={80}/>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start mb-1">
                <h1 className="text-[22px] sm:text-[26px] font-black text-white">
                  {user.name||user.email?.split("@")[0]||"My Profile"}
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{background:"rgba(255,255,255,.15)",color:"#bbf7d0"}}>
                  Level {level}
                </span>
              </div>
              <p className="text-[13px] text-green-200 truncate">{user.email}</p>
              {user.city&&(
                <p className="text-[12px] text-green-300 flex items-center gap-1 mt-0.5 justify-center sm:justify-start">
                  <MapPin className="w-3 h-3"/>{user.city}
                </p>
              )}

              {/* XP progress */}
              <div className="mt-4 max-w-xs mx-auto sm:mx-0">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-green-300">{xp.toLocaleString()} XP</span>
                  <span className="text-green-400">{1000-(xp%1000)} to Level {level+1}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{background:"rgba(255,255,255,.15)"}}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{width:`${xpProgress}%`,background:"linear-gradient(90deg,#86efac,#22c55e)"}}/>
                </div>
              </div>
            </div>

            {/* top-right actions */}
            <div className="flex items-center gap-2 shrink-0">
              {saved&&(
                <span className="flex items-center gap-1.5 text-[12px] font-medium text-white
                  px-3 py-1.5 rounded-xl" style={{background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.2)"}}>
                  <CheckCircle className="w-3.5 h-3.5 text-green-300"/>Saved
                </span>
              )}
              <button onClick={logout}
                className="flex items-center gap-1.5 text-[13px] font-semibold text-white
                  px-4 py-2 rounded-xl transition-colors"
                style={{background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.2)"}}>
                <LogOut className="w-3.5 h-3.5"/>
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container pb-16 -mt-10">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            {label:"Total XP",       value:xp>0?xp.toLocaleString():"0",  color:"#16a34a",bg:"#f0fdf4",icon:Zap         },
            {label:"Contributions",  value:contributions.toString(),        color:"#8b5cf6",bg:"#faf5ff",icon:Upload      },
            {label:"Badges",         value:earnedSet.size.toString(),       color:"#f59e0b",bg:"#fffbeb",icon:Trophy      },
            {label:"Level",          value:`Level ${level}`,                color:"#0ea5e9",bg:"#f0f9ff",icon:Star        },
          ].map(({label,value,color,bg,icon:Icon})=>(
            <div key={label} className="bg-white rounded-2xl border border-zinc-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-medium text-zinc-500">{label}</p>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:bg}}>
                  <Icon className="w-4 h-4" style={{color}}/>
                </div>
              </div>
              <p className="text-[22px] font-black" style={{color}}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 bg-white border border-zinc-100 rounded-2xl p-1 mb-5 w-fit overflow-x-auto no-scrollbar">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className="text-[13px] px-5 py-2 rounded-xl transition-all whitespace-nowrap"
              style={{
                background:tab===t.id?"#f0fdf4":"transparent",
                color:      tab===t.id?"#16a34a":"#71717a",
                fontWeight: tab===t.id?600:500,
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Error ── */}
        {error&&(
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0"/>
            <p className="text-[13px] text-red-600 flex-1">{error}</p>
            <button onClick={()=>setError("")}><X className="w-4 h-4 text-red-400"/></button>
          </div>
        )}

        {/* ════ PROFILE TAB ════ */}
        {tab==="profile"&&(
          <div className="space-y-5">

            {/* ── Profile completeness banner (shown when incomplete) ── */}
            {!profileComplete&&!editing&&(
              <div className="rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                style={{background:"linear-gradient(135deg,#fffbeb,#fef3c7)",border:"1px solid #fde68a"}}>
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-amber-900">Your profile is incomplete</p>
                  <p className="text-[12px] text-amber-700 mt-0.5">
                    Add your name and city so Verifee gives you accurate local price estimates.
                  </p>
                </div>
                <button onClick={()=>setEditing(true)}
                  className="shrink-0 flex items-center gap-2 font-semibold text-[13px] text-white px-4 py-2 rounded-xl transition-all"
                  style={{background:"#d97706"}}>
                  <Edit3 className="w-4 h-4"/>Complete profile
                </button>
              </div>
            )}

            {/* ── Edit form ── */}
            {editing?(
              <div className="bg-white rounded-2xl border border-zinc-100 p-5 sm:p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[16px] font-bold text-zinc-900">Edit profile</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={save} disabled={saving}
                      className="flex items-center gap-2 btn-green text-[13px] px-4 py-2 rounded-xl disabled:opacity-60">
                      {saving?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Save className="w-3.5 h-3.5"/>}
                      Save
                    </button>
                    <button onClick={()=>{setEditing(false);setError("");}}
                      className="text-[13px] font-medium text-zinc-500 border border-zinc-200 px-4 py-2 rounded-xl hover:bg-zinc-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Full name" value={form.name}
                    onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your full name"/>
                  <Field label="Phone number" type="tel" value={form.phone}
                    onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+91 98765 43210"/>
                  <Field label="City" value={form.city}
                    onChange={e=>setForm({...form,city:e.target.value})} placeholder="e.g. Jaipur"/>
                  <Field label="Country" value={form.country}
                    onChange={e=>setForm({...form,country:e.target.value})} placeholder="e.g. India"/>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Language</label>
                    <select value={form.language} onChange={e=>setForm({...form,language:e.target.value})}
                      className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-700 bg-white">
                      {LANGS.map(l=><option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Travel frequency</label>
                    <select value={form.travelFrequency} onChange={e=>setForm({...form,travelFrequency:e.target.value})}
                      className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-700 bg-white">
                      {TRAVEL.map(v=><option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Bio" value={form.bio}
                      onChange={e=>setForm({...form,bio:e.target.value})}
                      placeholder="Tell us about your travel style..." textarea/>
                  </div>
                </div>
              </div>
            ):(
              /* ── Profile view ── */
              <div className="grid md:grid-cols-[1fr_320px] gap-5">
                {/* Main info card */}
                <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[15px] font-bold text-zinc-900">Account details</h2>
                    <button onClick={()=>setEditing(true)}
                      className="flex items-center gap-1.5 text-[12px] font-semibold text-green-600 hover:underline">
                      <Edit3 className="w-3.5 h-3.5"/>Edit
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-x-6">
                    <div>
                      <Row icon={User}     label="Full name"         value={user.name}/>
                      <Row icon={Mail}     label="Email"             value={user.email}/>
                      <Row icon={Phone}    label="Phone"             value={user.phone}/>
                    </div>
                    <div>
                      <Row icon={MapPin}   label="City"              value={user.city}/>
                      <Row icon={Globe2}   label="Country"           value={user.country}/>
                      <Row icon={Calendar} label="Member since"      value={joinedDate}/>
                    </div>
                  </div>

                  {user.bio&&(
                    <div className="mt-4 pt-4 border-t border-zinc-50">
                      <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wide mb-1.5">Bio</p>
                      <p className="text-[13px] text-zinc-700 leading-relaxed">{user.bio}</p>
                    </div>
                  )}

                  {/* Empty state inside card — only show name/city fields that are missing */}
                  {(!user.name||!user.city||!user.phone)&&(
  <div className="mt-4 pt-4 border-t border-zinc-50 flex items-center gap-3">
    <div className="flex-1">
      <p className="text-[12px] text-zinc-400 leading-relaxed">
        {!user.name&&"Add your name. "}
        {!user.city&&"Add your city for city-specific prices. "}
        {!user.phone&&"Add your phone number."}
      </p>
    </div>
    <button onClick={()=>setEditing(true)}
      className="shrink-0 text-[12px] font-semibold text-green-600 border border-green-200 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-xl transition-colors">
      Add now
    </button>
  </div>
)}
                </div>

                {/* Right sidebar */}
                <div className="space-y-4">
                  {/* Quick actions */}
                  <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                    <h3 className="text-[13px] font-bold text-zinc-900 mb-3">Quick actions</h3>
                    <div className="space-y-1">
                      {[
                        {label:"Check a price",    href:"/check-price",  color:"#16a34a"},
                        {label:"Detect a scam",    href:"/scam-check",   color:"#ef4444"},
                        {label:"Translate phrase", href:"/translate",    color:"#0ea5e9"},
                        {label:"Contribute price", href:"/contribute",   color:"#f59e0b"},
                        {label:"Explore markets",  href:"/markets",      color:"#8b5cf6"},
                      ].map(({label,href,color})=>(
                        <Link key={label} href={href}
                          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-zinc-50 transition-colors group">
                          <div className="flex items-center gap-2.5">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{background:color}}/>
                            <span className="text-[13px] font-medium text-zinc-700 group-hover:text-zinc-900">
                              {label}
                            </span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-500"/>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Security */}
                  <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                    <h3 className="text-[13px] font-bold text-zinc-900 mb-3">Security</h3>
                    <button onClick={()=>setPwModal(true)}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition-colors text-left">
                      <div className="w-8 h-8 rounded-xl bg-zinc-50 flex items-center justify-center shrink-0">
                        <Lock className="w-3.5 h-3.5 text-zinc-500"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-zinc-800">Change password</p>
                        <p className="text-[11px] text-zinc-400">Update your login password</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0"/>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ BADGES TAB ════ */}
        {tab==="badges"&&(
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-[13px] text-zinc-500">
                {earnedSet.size} of {ALL_BADGES.length} badges earned
              </p>
              {earnedSet.size===0&&(
                <Link href="/contribute"
                  className="text-[12px] font-semibold text-green-600 hover:underline flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5"/>Earn your first badge
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {ALL_BADGES.map(badge=>{
                const earned=earnedSet.has(badge.id);
                return(
                  <div key={badge.id}
                    className="bg-white rounded-2xl border p-4 flex flex-col items-center text-center gap-3 transition-all"
                    style={{borderColor:earned?"#bbf7d0":"#f4f4f5",opacity:earned?1:.55}}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{background:earned?"#f0fdf4":"#fafafa"}}>
                      <Trophy className="w-6 h-6" style={{color:earned?"#16a34a":"#d4d4d8"}}/>
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-zinc-900">{badge.label}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{badge.desc}</p>
                    </div>
                    {earned
                      ?<span className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
                        <CheckCircle className="w-3 h-3"/>Earned
                       </span>
                      :<span className="text-[10px] text-zinc-400">Not yet</span>}
                  </div>
                );
              })}
            </div>

            {earnedSet.size===0&&(
              <div className="mt-6 bg-white rounded-2xl border border-zinc-100 p-8 text-center">
                <Trophy className="w-12 h-12 text-zinc-200 mx-auto mb-3"/>
                <p className="text-[15px] font-bold text-zinc-700 mb-2">No badges yet</p>
                <p className="text-[13px] text-zinc-400 mb-5 max-w-sm mx-auto">
                  Check prices, detect scams, and contribute to the community to earn badges and XP.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Link href="/check-price">
                    <button className="btn-green text-[13px] px-5 py-2.5 rounded-xl">
                      Check a price
                    </button>
                  </Link>
                  <Link href="/contribute">
                    <button className="text-[13px] font-semibold text-zinc-700 border border-zinc-200 px-5 py-2.5 rounded-xl hover:bg-zinc-50 transition-colors">
                      Contribute
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ SETTINGS TAB ════ */}
        {tab==="settings"&&(
          <div className="grid md:grid-cols-[1fr_300px] gap-5">
            <div className="space-y-5">
              {/* Notifications */}
              <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                <h3 className="text-[15px] font-bold text-zinc-900 mb-4">Notifications</h3>
                <div className="space-y-0.5">
                  {[
                    {k:"priceAlerts",label:"Price drop alerts",    desc:"When prices drop for checked products"},
                    {k:"scamAlerts", label:"Scam reports nearby",  desc:"New scam reports in your area"       },
                    {k:"newMarkets", label:"New trusted markets",   desc:"When new markets are verified"       },
                  ].map(({k,label,desc})=>(
                    <div key={k} className="flex items-center justify-between py-3.5 border-b border-zinc-50 last:border-0">
                      <div>
                        <p className="text-[13px] font-semibold text-zinc-800">{label}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{desc}</p>
                      </div>
                      <button onClick={()=>setNotifs(n=>({...n,[k]:!n[k]}))}
                        className="w-11 h-6 rounded-full transition-all relative shrink-0 ml-4"
                        style={{background:notifs[k]?"#16a34a":"#e4e4e7"}}>
                        <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                          style={{left:notifs[k]?"calc(100% - 22px)":"2px"}}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preferences */}
              <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                <h3 className="text-[15px] font-bold text-zinc-900 mb-4">Preferences</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Language</label>
                    <select value={form.language} onChange={e=>setForm({...form,language:e.target.value})}
                      className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-700 bg-white">
                      {LANGS.map(l=><option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Travel frequency</label>
                    <select value={form.travelFrequency} onChange={e=>setForm({...form,travelFrequency:e.target.value})}
                      className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-700 bg-white">
                      {TRAVEL.map(v=><option key={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={save} disabled={saving}
                  className="mt-4 flex items-center gap-2 btn-green text-[13px] px-5 py-2.5 rounded-xl disabled:opacity-60">
                  {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}
                  Save preferences
                </button>
              </div>
            </div>

            {/* Right */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                <h3 className="text-[14px] font-bold text-zinc-900 mb-3">Account</h3>
                <button onClick={()=>setPwModal(true)}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-zinc-50 flex items-center justify-center">
                    <Lock className="w-3.5 h-3.5 text-zinc-500"/>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[13px] font-semibold text-zinc-800">Change password</p>
                    <p className="text-[11px] text-zinc-400">Update login password</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400"/>
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-red-100 p-5">
                <h3 className="text-[13px] font-bold text-red-700 mb-2">Danger zone</h3>
                <p className="text-[12px] text-zinc-500 leading-relaxed mb-3">
                  Permanently deletes your account, data, XP, and contributions.
                </p>
                <button className="w-full text-[13px] font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-colors">
                  Delete account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {pwModal&&<PasswordModal onClose={()=>setPwModal(false)}/>}
    </div>
  );
}