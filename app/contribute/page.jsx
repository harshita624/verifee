"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Upload, CheckCircle, Loader2, AlertTriangle,
  MapPin, Star, Trophy, Zap, ChevronRight,
  Camera, FileText, ArrowRight, Plus,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "@/hooks/useLocation";
import { CATEGORIES } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const STEPS = [
  { id: 1, label: "Product",  desc: "What did you buy?"     },
  { id: 2, label: "Price",    desc: "What did you pay?"     },
  { id: 3, label: "Location", desc: "Where did you buy it?" },
  { id: 4, label: "Submit",   desc: "Review and confirm"    },
];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-all"
              style={{
                background: current > step.id ? "#16a34a"
                  : current === step.id ? "#16a34a"
                  : "#f4f4f5",
                color: current >= step.id ? "#fff" : "#a1a1aa",
              }}
            >
              {current > step.id
                ? <CheckCircle className="w-4 h-4" />
                : step.id}
            </div>
            <p
              className="text-[10px] font-medium mt-1 hidden sm:block"
              style={{ color: current >= step.id ? "#16a34a" : "#a1a1aa" }}
            >
              {step.label}
            </p>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className="flex-1 h-0.5 mx-2"
              style={{ background: current > step.id ? "#16a34a" : "#e4e4e7" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Real leaderboard fetched from API
function Leaderboard() {
  const [leaders,  setLeaders]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetch(`${API}/api/v1/auth/top-contributors?limit=5`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setLeaders(d.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const medals = ["🥇", "🥈", "🥉"];

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="shimmer h-12 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!leaders.length) {
    return (
      <div className="text-center py-6">
        <Trophy className="w-10 h-10 text-zinc-200 mx-auto mb-2" />
        <p className="text-[13px] font-semibold text-zinc-600 mb-1">No contributors yet</p>
        <p className="text-[12px] text-zinc-400">
          Be the first to contribute a price and claim the top spot!
        </p>
        {!user && (
          <Link href="/auth/signup">
            <button className="mt-3 text-[12px] font-semibold text-green-600 border border-green-200 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-xl transition-colors">
              Sign up to contribute
            </button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {leaders.map((person, i) => {
        const isCurrentUser = user && person._id === user._id;
        return (
          <div
            key={person._id || i}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
            style={{
              background: isCurrentUser ? "#f0fdf4" : i === 0 ? "#fffbeb" : "transparent",
              border:     isCurrentUser ? "1px solid #dcfce7" : "1px solid transparent",
            }}
          >
            <span className="text-[16px] shrink-0 w-6 text-center">
              {i < 3 ? medals[i] : `${i + 1}.`}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-zinc-900 truncate">
                {person.name || "Anonymous"}
                {isCurrentUser && (
                  <span className="ml-1.5 text-[10px] font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
                    You
                  </span>
                )}
              </p>
              <p className="text-[11px] text-zinc-400 truncate">
                {person.city || "India"} · {person.contributionCount || 0} contributions
              </p>
            </div>
            <span className="text-[13px] font-black text-green-600 shrink-0">
              +{(person.xp || 0).toLocaleString()} XP
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function ContributePage() {
  const { user } = useAuth();
  const { city }  = useLocation();

  const [step,   setStep]   = useState(1);
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);
  const [error,  setError]  = useState("");

  const [form, setForm] = useState({
    product:    "",
    category:   "",
    customCat:  "",
    pricePaid:  "",
    quality:    "good",
    city:       "",
    marketName: "",
    shopName:   "",
    notes:      "",
  });

  // Pre-fill city from location
  useEffect(() => {
    if (city && !form.city) setForm((prev) => ({ ...prev, city }));
  }, [city]);

  const updateForm = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const canProceed = () => {
    if (step === 1) return form.product.trim().length > 1;
    if (step === 2) return Number(form.pricePaid) > 0;
    if (step === 3) return form.city.trim().length > 1;
    return true;
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("vf_token");
      const res   = await fetch(`${API}/api/v1/prices`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          product:    form.product.trim(),
          category:   form.category === "other" ? form.customCat : form.category,
          pricePaid:  Number(form.pricePaid),
          quality:    form.quality,
          city:       form.city.trim(),
          marketName: form.marketName.trim(),
          shopName:   form.shopName.trim(),
          notes:      form.notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Submission failed");
      setDone(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="vf-page">
        <div className="container max-w-lg py-20 text-center">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
            style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)" }}
          >
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-[28px] font-black text-zinc-950 mb-2">
            Contribution submitted!
          </h2>
          <p className="text-[15px] text-zinc-500 mb-2 leading-relaxed">
            You earned <span className="font-bold text-green-600">+50 XP</span> for helping
            future travelers know the fair price.
          </p>
          <p className="text-[13px] text-zinc-400 mb-8">
            Your report will be reviewed and verified by the community.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => { setDone(false); setStep(1); setForm({ product:"",category:"",customCat:"",pricePaid:"",quality:"good",city:"",marketName:"",shopName:"",notes:"" }); }}
              className="flex items-center justify-center gap-2 btn-green text-[14px] px-6 py-3 rounded-xl"
            >
              <Plus className="w-4 h-4" /> Contribute another price
            </button>
            <Link href="/dashboard">
              <button className="flex items-center justify-center gap-2 border border-zinc-200 text-zinc-700 font-semibold text-[14px] px-6 py-3 rounded-xl hover:bg-zinc-50 transition-colors">
                View your XP
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vf-page">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 py-10">
        <div className="container">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wide">
              Earn XP · Help travelers
            </span>
          </div>
          <h1 className="text-[28px] md:text-[38px] font-black text-zinc-950 mb-3 leading-tight">
            Contribute a price
          </h1>
          <p className="text-[15px] text-zinc-500 max-w-xl leading-relaxed">
            Share what you paid so future travelers know the real local price.
            Every verified contribution earns you 50 XP and helps protect others
            from being overcharged.
          </p>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid md:grid-cols-[1fr_320px] gap-8">
          {/* Form */}
          <div>
            {/* Login prompt */}
            {!user && (
              <div
                className="rounded-2xl p-5 mb-6 flex items-center gap-4"
                style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
              >
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-amber-900">Sign in to earn XP</p>
                  <p className="text-[12px] text-amber-700">
                    You can still contribute without an account, but you won't earn XP or badges.
                  </p>
                </div>
                <Link href="/auth/login?next=/contribute">
                  <button className="shrink-0 text-[12px] font-bold text-amber-800 border border-amber-300 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition-colors">
                    Sign in
                  </button>
                </Link>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-zinc-100 p-6">
              <StepIndicator current={step} />

              {/* Step 1 — Product */}
              {step === 1 && (
                <div className="space-y-4 animate-fade-up">
                  <h3 className="text-[17px] font-bold text-zinc-900 mb-4">
                    What did you buy?
                  </h3>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                      Product or service name *
                    </label>
                    <input
                      type="text"
                      value={form.product}
                      onChange={(e) => updateForm("product", e.target.value)}
                      placeholder="e.g. Kashmiri Carpet, Auto ride, Pani Puri, Hotel room"
                      className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 bg-white"
                      style={{ outline: "none" }}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                      Category
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => updateForm("category", e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-700 bg-white"
                      style={{ outline: "none" }}
                    >
                      <option value="">Select a category</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {/* FIX: same root cause as /check-price — cat.icon must be a
                              plain string to render inside <option>. If CATEGORIES
                              stores icon as a component (e.g. a lucide-react import),
                              this line threw React error #31 at prerender time. */}
                          {typeof cat.icon === "string" ? `${cat.icon} ` : ""}{cat.label}
                        </option>
                      ))}
                      <option value="other">Other (specify)</option>
                    </select>
                  </div>

                  {form.category === "other" && (
                    <input
                      type="text"
                      value={form.customCat}
                      onChange={(e) => updateForm("customCat", e.target.value)}
                      placeholder="Describe the category"
                      className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-700 bg-white"
                      style={{ outline: "none" }}
                    />
                  )}
                </div>
              )}

              {/* Step 2 — Price */}
              {step === 2 && (
                <div className="space-y-4 animate-fade-up">
                  <h3 className="text-[17px] font-bold text-zinc-900 mb-4">
                    What did you pay?
                  </h3>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                      Price you paid (₹) *
                    </label>
                    <div className="flex items-center gap-2 bg-white rounded-xl border border-zinc-200 px-3.5 py-2.5 focus-within:border-green-400 transition-colors">
                      <span className="text-[18px] font-bold text-zinc-400">₹</span>
                      <input
                        type="number"
                        value={form.pricePaid}
                        onChange={(e) => updateForm("pricePaid", e.target.value)}
                        placeholder="e.g. 350"
                        min="1"
                        className="flex-1 text-[18px] font-bold text-zinc-900 bg-transparent"
                        style={{ outline: "none", border: "none" }}
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 px-1">
                      Enter the actual amount you paid — after any bargaining.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                      Quality received
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {["poor", "fair", "good", "excellent"].map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => updateForm("quality", q)}
                          className="py-2 px-2 rounded-xl border text-[12px] font-semibold transition-all capitalize"
                          style={{
                            background:  form.quality === q ? "#f0fdf4" : "#fff",
                            borderColor: form.quality === q ? "#bbf7d0" : "#e4e4e7",
                            color:       form.quality === q ? "#16a34a" : "#71717a",
                          }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                      Any additional notes (optional)
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => updateForm("notes", e.target.value)}
                      placeholder="e.g. Fixed price, heavily bargained, tourist area, quality was good..."
                      rows={2}
                      className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 bg-white resize-none"
                      style={{ outline: "none" }}
                    />
                  </div>
                </div>
              )}

              {/* Step 3 — Location */}
              {step === 3 && (
                <div className="space-y-4 animate-fade-up">
                  <h3 className="text-[17px] font-bold text-zinc-900 mb-4">
                    Where did you buy it?
                  </h3>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                      City *
                    </label>
                    <div className="flex items-center gap-2 bg-white rounded-xl border border-zinc-200 px-3.5 py-2.5 focus-within:border-green-400 transition-colors">
                      <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
                      <input
                        type="text"
                        value={form.city}
                        onChange={(e) => updateForm("city", e.target.value)}
                        placeholder="e.g. Jaipur, Delhi, Mumbai"
                        className="flex-1 text-[14px] text-zinc-800 placeholder:text-zinc-400 bg-transparent"
                        style={{ outline: "none", border: "none" }}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                      Market or area (optional but helpful)
                    </label>
                    <input
                      type="text"
                      value={form.marketName}
                      onChange={(e) => updateForm("marketName", e.target.value)}
                      placeholder="e.g. Johari Bazaar, Chandni Chowk, Sarojini Nagar"
                      className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 bg-white"
                      style={{ outline: "none" }}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                      Shop name (optional)
                    </label>
                    <input
                      type="text"
                      value={form.shopName}
                      onChange={(e) => updateForm("shopName", e.target.value)}
                      placeholder="e.g. Rajasthan Emporium (leave blank if unknown)"
                      className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 bg-white"
                      style={{ outline: "none" }}
                    />
                  </div>
                </div>
              )}

              {/* Step 4 — Review */}
              {step === 4 && (
                <div className="space-y-4 animate-fade-up">
                  <h3 className="text-[17px] font-bold text-zinc-900 mb-4">
                    Review and submit
                  </h3>

                  <div className="rounded-2xl border border-zinc-100 overflow-hidden">
                    {[
                      { label: "Product",   value: form.product   },
                      { label: "Category",  value: form.category === "other" ? form.customCat : (CATEGORIES.find(c => c.id === form.category)?.label || "—") },
                      { label: "Price paid",value: `₹${Number(form.pricePaid).toLocaleString()}` },
                      { label: "Quality",   value: form.quality   },
                      { label: "City",      value: form.city      },
                      { label: "Market",    value: form.marketName || "—" },
                      { label: "Shop",      value: form.shopName  || "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between px-4 py-3 border-b border-zinc-50 last:border-0">
                        <span className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wide">
                          {label}
                        </span>
                        <span className="text-[14px] font-semibold text-zinc-900 max-w-[200px] text-right truncate">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <p className="text-[13px] text-red-600">{error}</p>
                    </div>
                  )}

                  <div
                    className="rounded-xl p-4"
                    style={{ background: "#f0fdf4", border: "1px solid #dcfce7" }}
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <p className="text-[13px] font-bold text-green-800">
                        You will earn +50 XP for this contribution
                      </p>
                    </div>
                    {!user && (
                      <p className="text-[11px] text-green-600 mt-1">
                        Sign in to claim your XP and badge.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-zinc-100">
                {step > 1 ? (
                  <button
                    onClick={() => setStep((s) => s - 1)}
                    className="text-[13px] font-medium text-zinc-500 border border-zinc-200 px-4 py-2.5 rounded-xl hover:bg-zinc-50 transition-colors"
                  >
                    Back
                  </button>
                ) : (
                  <div />
                )}

                {step < 4 ? (
                  <button
                    onClick={() => setStep((s) => s + 1)}
                    disabled={!canProceed()}
                    className="flex items-center gap-2 btn-green text-[14px] px-6 py-2.5 rounded-xl disabled:opacity-50"
                  >
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={submit}
                    disabled={saving}
                    className="flex items-center gap-2 btn-green text-[14px] px-6 py-2.5 rounded-xl disabled:opacity-60"
                  >
                    {saving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Submit contribution</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* XP info */}
            <div className="bg-white rounded-2xl border border-zinc-100 p-5">
              <h3 className="text-[14px] font-bold text-zinc-900 mb-4">Earn XP</h3>
              <div className="space-y-2.5">
                {[
                  { action: "Submit a price report",     xp: "+50 XP"  },
                  { action: "Report gets verified",      xp: "+30 XP"  },
                  { action: "Report gets 10 upvotes",    xp: "+20 XP"  },
                  { action: "Upload a receipt photo",    xp: "+80 XP"  },
                  { action: "Report a scam",             xp: "+40 XP"  },
                ].map(({ action, xp }) => (
                  <div key={action} className="flex items-center justify-between">
                    <p className="text-[12px] text-zinc-600">{action}</p>
                    <span className="text-[12px] font-bold text-green-600">{xp}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Real leaderboard */}
            <div className="bg-white rounded-2xl border border-zinc-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-amber-500" />
                <h3 className="text-[14px] font-bold text-zinc-900">
                  Top contributors this month
                </h3>
              </div>
              <Leaderboard />
            </div>

            {/* Why contribute */}
            <div
              className="rounded-2xl p-5"
              style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "1px solid #bbf7d0" }}
            >
              <h3 className="text-[13px] font-bold text-green-900 mb-2">
                Why contribute?
              </h3>
              <p className="text-[12px] text-green-700 leading-relaxed">
                Every price you share makes Verifee's AI more accurate for
                the next traveler. The ML pipeline uses your verified data
                to detect anomalies and catch tourist overpricing.
              </p>
              <Link href="/check-price">
                <button className="mt-3 text-[12px] font-semibold text-green-700 flex items-center gap-1 hover:underline">
                  See how it's used <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}