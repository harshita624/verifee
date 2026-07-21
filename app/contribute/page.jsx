"use client";

import { useState } from "react";
import {
  Upload, MapPin, ShoppingBag, Star, CheckCircle,
  Camera, Trophy, Zap, ArrowRight, Loader2, X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { CATEGORIES } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Product", icon: ShoppingBag },
  { id: 2, label: "Price & Shop", icon: MapPin },
  { id: 3, label: "Receipt", icon: Upload },
  { id: 4, label: "Done", icon: CheckCircle },
];

const STAR_LABELS = ["Terrible", "Poor", "Average", "Good", "Excellent"];

export default function ContributePage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    product: "",
    category: "",
    pricePaid: "",
    shopName: "",
    city: "",
    state: "",
    marketName: "",
    rating: 0,
    review: "",
    receiptFile: null,
  });
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const update = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    update("receiptFile", file);

    // Auto-parse receipt with OCR
    const reader = new FileReader();
    reader.onloadend = async () => {
      setOcrLoading(true);
      try {
        const base64 = reader.result.split(",")[1];
        const res = await fetch("/api/v1/ai/parse-receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64 }),
        });
        const data = await res.json();
        if (data.success && data.data) {
          setOcrResult(data.data);
          if (data.data.product) update("product", data.data.product);
          if (data.data.amount) update("pricePaid", String(data.data.amount));
          if (data.data.shopName) update("shopName", data.data.shopName);
          if (data.data.city) update("city", data.data.city);
          if (data.data.category) update("category", data.data.category);
        }
      } catch { /* silent */ }
      finally { setOcrLoading(false); }
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errs = {};
    if (step === 1) {
      if (!form.product.trim()) errs.product = "Product name is required";
      if (!form.category) errs.category = "Category is required";
    }
    if (step === 2) {
      if (!form.pricePaid || Number(form.pricePaid) <= 0) errs.pricePaid = "Valid price is required";
      if (!form.city.trim()) errs.city = "City is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    setStep((s) => Math.min(s + 1, 4));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("vf_token");
      const res = await fetch("/api/v1/prices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          product: form.product,
          category: form.category,
          pricePaid: Number(form.pricePaid),
          shopName: form.shopName,
          city: form.city,
          state: form.state,
          marketName: form.marketName,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }

      setSuccess(true);
      setStep(4);
    } catch (err) {
      setErrors({ submit: err.message || "Submission failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-[62px]" style={{ background: "#fafafa" }}>
      <div className="py-10 border-b border-zinc-100 bg-white">
        <div className="max-w-2xl mx-auto px-5">
          <Badge variant="green" className="mb-3">
            <Trophy className="w-3.5 h-3.5" />
            Contribute & Earn XP
          </Badge>
          <h1 className="text-[30px] md:text-[38px] font-black text-zinc-950 mb-2">
            Share what you paid.
          </h1>
          <p className="text-[15px] text-zinc-500">
            Your price report helps thousands of future travelers avoid being
            overcharged. Earn 50 XP for every verified report.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-8">
        {/* XP cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: "⚡", label: "Price report", xp: "+50 XP" },
            { icon: "📷", label: "With receipt", xp: "+30 XP" },
            { icon: "⭐", label: "With review", xp: "+20 XP" },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-2xl border border-zinc-100 p-3 text-center">
              <div className="text-2xl mb-1">{item.icon}</div>
              <p className="text-[10px] text-zinc-500 mb-0.5">{item.label}</p>
              <p className="text-[14px] font-bold text-green-600">{item.xp}</p>
            </div>
          ))}
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: done ? "#16a34a" : active ? "#f0fdf4" : "#f4f4f5",
                      border: active ? "2px solid #16a34a" : done ? "2px solid #16a34a" : "2px solid #e4e4e7",
                    }}
                  >
                    {done ? (
                      <CheckCircle className="w-4 h-4 text-white" />
                    ) : (
                      <Icon className={`w-4 h-4 ${active ? "text-green-600" : "text-zinc-400"}`} />
                    )}
                  </div>
                  <p
                    className="text-[10px] font-medium mt-1 whitespace-nowrap"
                    style={{ color: active ? "#16a34a" : done ? "#16a34a" : "#a1a1aa" }}
                  >
                    {s.label}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className="flex-1 h-px mx-2 mb-4"
                    style={{ background: step > s.id ? "#16a34a" : "#e4e4e7" }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">

          {/* Step 1: Product */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-[18px] font-bold text-zinc-900">What did you buy?</h2>

              <div>
                <label className="block text-[12px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                  Product or service *
                </label>
                <input
                  value={form.product}
                  onChange={(e) => update("product", e.target.value)}
                  placeholder="e.g. Kashmiri Carpet, Auto rickshaw ride, Hotel room"
                  className="w-full rounded-xl border px-3.5 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400"
                  style={{
                    outline: "none",
                    borderColor: errors.product ? "#dc2626" : "#e4e4e7",
                  }}
                />
                {errors.product && <p className="text-[11px] text-red-500 mt-1">{errors.product}</p>}
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                  Category *
                </label>
                <select
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                  className="w-full rounded-xl border px-3.5 py-2.5 text-[14px] text-zinc-700"
                  style={{ outline: "none", borderColor: errors.category ? "#dc2626" : "#e4e4e7" }}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
                {errors.category && <p className="text-[11px] text-red-500 mt-1">{errors.category}</p>}
              </div>

              <Button variant="primary" size="lg" className="w-full" onClick={handleNext}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Price & Location */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-[18px] font-bold text-zinc-900">Price & location details</h2>

              <div>
                <label className="block text-[12px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                  Price you paid (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="1"
                    value={form.pricePaid}
                    onChange={(e) => update("pricePaid", e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border pl-8 pr-3.5 py-2.5 text-[15px] font-bold text-zinc-900"
                    style={{ outline: "none", borderColor: errors.pricePaid ? "#dc2626" : "#e4e4e7" }}
                  />
                </div>
                {errors.pricePaid && <p className="text-[11px] text-red-500 mt-1">{errors.pricePaid}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                    City *
                  </label>
                  <input
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    placeholder="e.g. Jaipur"
                    className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-800"
                    style={{ outline: "none", borderColor: errors.city ? "#dc2626" : "#e4e4e7" }}
                  />
                  {errors.city && <p className="text-[11px] text-red-500 mt-1">{errors.city}</p>}
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                    State
                  </label>
                  <input
                    value={form.state}
                    onChange={(e) => update("state", e.target.value)}
                    placeholder="e.g. Rajasthan"
                    className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-800"
                    style={{ outline: "none" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                  Shop name (optional)
                </label>
                <input
                  value={form.shopName}
                  onChange={(e) => update("shopName", e.target.value)}
                  placeholder="e.g. Ram Handicrafts, Sunrise Hotel"
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-800"
                  style={{ outline: "none" }}
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                  Market name (optional)
                </label>
                <input
                  value={form.marketName}
                  onChange={(e) => update("marketName", e.target.value)}
                  placeholder="e.g. Johari Bazaar, Chandni Chowk"
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-800"
                  style={{ outline: "none" }}
                />
              </div>

              {/* Star rating */}
              <div>
                <label className="block text-[12px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                  Your experience
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => update("rating", s)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className="w-7 h-7"
                        style={{
                          fill: s <= form.rating ? "#f59e0b" : "none",
                          color: s <= form.rating ? "#f59e0b" : "#d4d4d8",
                        }}
                      />
                    </button>
                  ))}
                  {form.rating > 0 && (
                    <span className="text-[13px] font-medium text-zinc-600 ml-1">
                      {STAR_LABELS[form.rating - 1]}
                    </span>
                  )}
                </div>
              </div>

              <textarea
                value={form.review}
                onChange={(e) => update("review", e.target.value)}
                placeholder="Share your experience (optional)..."
                rows={3}
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 resize-none"
                style={{ outline: "none" }}
              />

              <div className="flex gap-2">
                <Button variant="secondary" size="md" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button variant="primary" size="md" onClick={handleNext} className="flex-1">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Receipt upload */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-[18px] font-bold text-zinc-900 mb-1">Upload receipt (optional)</h2>
                <p className="text-[13px] text-zinc-500">
                  A receipt earns you +30 bonus XP and increases report credibility.
                  Our AI auto-extracts the details.
                </p>
              </div>

              {/* File upload area */}
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 hover:border-green-300 rounded-2xl p-8 cursor-pointer transition-colors">
                <input type="file" accept="image/*,.pdf" className="sr-only" onChange={handleFileUpload} />

                {form.receiptFile ? (
                  <div className="text-center">
                    <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                    <p className="text-[14px] font-semibold text-zinc-700">{form.receiptFile.name}</p>
                    <p className="text-[12px] text-zinc-400 mt-0.5">
                      {(form.receiptFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-3">
                      <Camera className="w-6 h-6 text-green-500" />
                    </div>
                    <p className="text-[14px] font-semibold text-zinc-700 mb-1">
                      Tap to upload receipt or bill
                    </p>
                    <p className="text-[12px] text-zinc-400">JPG, PNG, PDF — max 5MB</p>
                  </div>
                )}
              </label>

              {/* OCR loading */}
              {ocrLoading && (
                <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-100 rounded-xl p-3.5">
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                  <p className="text-[13px] text-blue-700">AI is reading your receipt...</p>
                </div>
              )}

              {/* OCR result */}
              {ocrResult && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-green-600" />
                    <p className="text-[12px] font-semibold text-green-700">AI auto-filled from receipt</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    {ocrResult.product && <div><span className="text-zinc-400">Product: </span><span className="font-medium text-zinc-700">{ocrResult.product}</span></div>}
                    {ocrResult.amount && <div><span className="text-zinc-400">Amount: </span><span className="font-medium text-zinc-700">₹{ocrResult.amount}</span></div>}
                    {ocrResult.shopName && <div><span className="text-zinc-400">Shop: </span><span className="font-medium text-zinc-700">{ocrResult.shopName}</span></div>}
                    {ocrResult.date && <div><span className="text-zinc-400">Date: </span><span className="font-medium text-zinc-700">{ocrResult.date}</span></div>}
                  </div>
                </div>
              )}

              {errors.submit && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3.5">
                  <p className="text-[13px] text-red-600">{errors.submit}</p>
                </div>
              )}

              {/* Summary before submit */}
              <div className="bg-zinc-50 rounded-xl p-4 space-y-1.5">
                <p className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                  Submission summary
                </p>
                {[
                  { label: "Product", value: form.product },
                  { label: "Price paid", value: `₹${form.pricePaid}` },
                  { label: "City", value: form.city },
                  form.shopName && { label: "Shop", value: form.shopName },
                ].filter(Boolean).map((item) => (
                  <div key={item.label} className="flex justify-between text-[12px]">
                    <span className="text-zinc-400">{item.label}</span>
                    <span className="font-semibold text-zinc-700">{item.value}</span>
                  </div>
                ))}
                <div className="flex justify-between text-[13px] pt-2 border-t border-zinc-200 mt-2">
                  <span className="text-zinc-500">XP to earn</span>
                  <span className="font-bold text-green-600">
                    +{50 + (form.receiptFile ? 30 : 0) + (form.review ? 20 : 0)} XP
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" size="md" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSubmit}
                  loading={loading}
                  className="flex-1"
                >
                  Submit report
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-[22px] font-black text-zinc-950 mb-2">
                Thank you! 🎉
              </h2>
              <p className="text-[14px] text-zinc-500 mb-2">
                Your price report has been submitted and will help future travelers.
              </p>
              <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 px-4 py-2 rounded-full mb-6">
                <Zap className="w-4 h-4 text-green-600" />
                <span className="text-[14px] font-bold text-green-700">
                  +{50 + (form.receiptFile ? 30 : 0) + (form.review ? 20 : 0)} XP earned!
                </span>
              </div>
              <div className="flex gap-3">
                <a href="/check-price" className="flex-1">
                  <Button variant="primary" size="md" className="w-full">
                    Check another price
                  </Button>
                </a>
                <button
                  onClick={() => {
                    setStep(1);
                    setForm({ product: "", category: "", pricePaid: "", shopName: "", city: "", state: "", marketName: "", rating: 0, review: "", receiptFile: null });
                    setOcrResult(null);
                    setSuccess(false);
                  }}
                  className="flex-1 border border-zinc-200 text-zinc-700 font-semibold text-[14px] py-2.5 rounded-xl hover:bg-zinc-50 transition-colors"
                >
                  Submit another
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Leaderboard preview */}
        {step !== 4 && (
          <div className="mt-6 bg-white rounded-2xl border border-zinc-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-amber-500" />
              <h3 className="text-[14px] font-bold text-zinc-900">Top contributors this month</h3>
            </div>
            <div className="space-y-2.5">
              {[
                { rank: 1, name: "Rahul M.", city: "Jaipur", xp: 4200, badge: "🥇" },
                { rank: 2, name: "Priya S.", city: "Mumbai", xp: 3840, badge: "🥈" },
                { rank: 3, name: "Arjun K.", city: "Delhi", xp: 3120, badge: "🥉" },
              ].map((c) => (
                <div key={c.rank} className="flex items-center gap-3">
                  <span className="text-lg">{c.badge}</span>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-zinc-800">{c.name}</p>
                    <p className="text-[11px] text-zinc-400">{c.city}</p>
                  </div>
                  <span className="text-[12px] font-bold text-green-600">+{c.xp.toLocaleString()} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}