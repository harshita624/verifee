"use client";

import { useState, useRef } from "react";
import {
  Camera, Upload, Loader2, CheckCircle,
  AlertTriangle, TrendingDown, X,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ReceiptVerifyPage() {
  const [file,     setFile]    = useState(null);
  const [preview,  setPreview] = useState(null);
  const [loading,  setLoading] = useState(false);
  const [result,   setResult]  = useState(null);
  const [error,    setError]   = useState("");
  const [city,     setCity]    = useState("");
  const fileRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError("");
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(f);
  };

  const verify = async () => {
    if (!file) return;
    setLoading(true); setError("");
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result.split(",")[1];
        const res    = await fetch(`${API}/api/v1/ai/verify-receipt`, {
          method:  "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imageBase64: base64, mimeType: file.type || "image/jpeg", city }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setResult(data.data);
      } catch (e) {
        setError(e.message || "Verification failed. Try a clearer photo.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const verdict = result?.comparisonAvailable
    ? result.overchargedPercent > 30
      ? { label: "Overcharged", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" }
      : result.overchargedPercent > 0
      ? { label: "Above reference", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" }
      : { label: "Within reference", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" }
    : result ? { label: "Receipt scanned", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" } : null;

  return (
    <div className="vf-page">
      <div className="bg-white border-b border-zinc-100 py-8">
        <div className="container">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-4"
            style={{ background: "#f0fdf4", border: "1px solid #dcfce7" }}
          >
            <Camera className="w-3.5 h-3.5 text-green-600" />
            <span className="text-[12px] font-semibold text-green-700">Only on Verifee</span>
          </div>
          <h1 className="text-[28px] md:text-[36px] font-black text-zinc-950 mb-3 leading-tight">
            Receipt Verifier
          </h1>
          <p className="text-[15px] text-zinc-500 max-w-xl leading-relaxed">
            Upload a receipt image to extract its merchant, date, items, and totals. If you provide the city, Verifee compares readable prices with local reference data.
          </p>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Upload side */}
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              className="bg-white rounded-2xl border-2 border-dashed border-zinc-200 hover:border-green-300 transition-colors cursor-pointer overflow-hidden"
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={e => handleFile(e.target.files[0])}
                capture="environment"
              />

              {preview ? (
                <div className="relative">
                  <img src={preview} alt="Receipt" className="w-full max-h-80 object-contain" />
                  <button
                    onClick={e => { e.stopPropagation(); setFile(null); setPreview(null); setResult(null); }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center py-12 px-6 text-center">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: "#f0fdf4" }}
                  >
                    <Camera className="w-8 h-8 text-green-400" />
                  </div>
                  <p className="text-[15px] font-bold text-zinc-700 mb-2">
                    Tap to snap or upload receipt
                  </p>
                  <p className="text-[12px] text-zinc-400 leading-relaxed">
                    Works with shop receipts, hotel bills, restaurant checks,
                    tour tickets, and any printed or handwritten bill.
                  </p>
                  <div className="flex items-center gap-3 mt-4">
                    <span
                      className="text-[11px] font-medium px-3 py-1 rounded-full"
                      style={{ background: "#fafafa", border: "1px solid #e4e4e7", color: "#71717a" }}
                    >
                      JPG / PNG
                    </span>
                    <span
                      className="text-[11px] font-medium px-3 py-1 rounded-full"
                      style={{ background: "#fafafa", border: "1px solid #e4e4e7", color: "#71717a" }}
                    >
                      Up to 8MB
                    </span>
                    <span
                      className="text-[11px] font-medium px-3 py-1 rounded-full"
                      style={{ background: "#fafafa", border: "1px solid #e4e4e7", color: "#71717a" }}
                    >
                      Printed languages
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-zinc-100 p-4">
              <label htmlFor="receipt-city" className="block text-[12px] font-semibold text-zinc-700 mb-1.5">City for local price comparison</label>
              <input id="receipt-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Jaipur" className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400" maxLength={80} />
              <p className="text-[11px] text-zinc-400 mt-1.5">The city helps compare extracted items with local references. You can scan without it.</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-[13px] text-red-600">{error}</p>
              </div>
            )}

            {file && !result && !loading && (
              <button
                onClick={verify}
                className="w-full flex items-center justify-center gap-2 btn-green text-[14px] py-3 rounded-xl"
              >
                <Upload className="w-4 h-4" />
                Verify this receipt
              </button>
            )}

            {loading && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-6 text-center">
                <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-3" />
                <p className="text-[14px] font-semibold text-zinc-700 mb-1">
                  Reading your receipt...
                </p>
                <p className="text-[12px] text-zinc-400">
                  Extracting items and comparing with fair prices
                </p>
              </div>
            )}
          </div>

          {/* Result side */}
          <div>
            {result && !loading && (
              <div className="space-y-4 animate-fade-up">
                <div className="bg-white rounded-2xl border border-zinc-100 p-4 grid grid-cols-2 gap-3 text-[12px]">
                  <div><p className="text-zinc-400">Merchant</p><p className="font-semibold text-zinc-800">{result.merchantName || "Not read"}</p></div>
                  <div><p className="text-zinc-400">Receipt date</p><p className="font-semibold text-zinc-800">{result.date || "Not read"}</p></div>
                  <div><p className="text-zinc-400">City used</p><p className="font-semibold text-zinc-800">{result.city || "Not provided"}</p></div>
                  <div><p className="text-zinc-400">Text confidence</p><p className="font-semibold text-zinc-800">{result.confidence}%</p></div>
                </div>

                {/* Verdict */}
                <div
                  className="rounded-2xl p-5"
                  style={{ background: verdict.bg, border: `2px solid ${verdict.border}` }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {verdict.label === "Within reference"
                      ? <CheckCircle className="w-8 h-8" style={{ color: verdict.color }} />
                      : <AlertTriangle className="w-8 h-8" style={{ color: verdict.color }} />}
                    <div>
                      <p className="text-[20px] font-black" style={{ color: verdict.color }}>
                        {verdict.label}
                      </p>
                      {result.overchargedPercent > 0 && (
                        <p className="text-[13px]" style={{ color: verdict.color }}>
                          Receipt lines exceed the upper reference by {result.overchargedPercent}%
                        </p>
                      )}
                    </div>
                  </div>

                  {result.overchargedBy > 0 && (
                    <div
                      className="rounded-xl px-4 py-3 flex items-center justify-between mt-1"
                      style={{ background: "rgba(255,255,255,0.6)" }}
                    >
                      <span className="text-[13px] font-medium" style={{ color: verdict.color }}>
                        Extra you paid
                      </span>
                      <span className="text-[18px] font-black" style={{ color: verdict.color }}>
                        ₹{result.overchargedBy?.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Extracted items */}
                {result.items?.length > 0 && (
                  <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
                    <div className="px-5 py-3 border-b border-zinc-50">
                      <h3 className="text-[13px] font-bold text-zinc-900">Items found on receipt</h3>
                    </div>
                    <div className="divide-y divide-zinc-50">
                      {result.items.map((item, i) => (
                        <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-zinc-900 truncate">
                              {item.name}
                            </p>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{item.category || "other"} · category inferred from receipt text</p>
                            <p className="text-[11px] text-zinc-400">
                              {item.fairPriceMin != null && item.fairPriceMax != null
                                ? `Local reference: ₹${item.fairPriceMin.toLocaleString()} – ₹${item.fairPriceMax.toLocaleString()}${item.unitLabel ? ` (${item.unitLabel})` : ""} (${item.dataSource === "community_verified" ? `${item.dataPoints} verified reports` : "AI estimate"})`
                                : item.comparisonNote || "No local comparison available"}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[14px] font-bold text-zinc-900">
                              ₹{item.charged?.toLocaleString()}
                            </p>
                            <p
                              className="text-[11px] font-semibold"
                              style={{
                                color: item.status === "fair" ? "#16a34a"
                                  : item.status === "very_high" ? "#dc2626"
                                  : item.status === "high" ? "#f59e0b"
                                  : "#71717a",
                              }}
                            >
                              {item.status === "fair" ? "Within range" : item.status === "very_high" ? "Far above range" : item.status === "high" ? "Above range" : "Not compared"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Total row */}
                    <div
                      className="px-5 py-3 flex items-center justify-between border-t border-zinc-100"
                      style={{ background: "#fafafa" }}
                    >
                      <p className="text-[13px] font-bold text-zinc-900">Total charged</p>
                      <p className="text-[16px] font-black text-zinc-950">
                        ₹{result.totalCharged?.toLocaleString() || "—"}
                      </p>
                    </div>
                    <div className="px-5 py-3 flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-green-700">Local reference range</p>
                      <p className="text-[16px] font-black text-green-700">
                        {result.totalFairPriceMin != null && result.totalFairPriceMax != null
                          ? `₹${result.totalFairPriceMin.toLocaleString()} – ₹${result.totalFairPriceMax.toLocaleString()}`
                          : "No local comparison"}
                      </p>
                    </div>
                  </div>
                )}

                {/* AI advice */}
                {result.advice && (
                  <div
                    className="rounded-2xl p-4"
                    style={{ background: "#f0fdf4", border: "1px solid #dcfce7" }}
                  >
                    <p className="text-[11px] font-semibold text-green-600 uppercase tracking-wide mb-2">
                      What you can do
                    </p>
                    <p className="text-[13px] text-zinc-700 leading-relaxed">{result.advice}</p>
                  </div>
                )}

                {/* Contribute */}
                <div
                  className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: "#fafafa", border: "1px solid #e4e4e7" }}
                >
                  <TrendingDown className="w-5 h-5 text-green-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-zinc-800">
                      Help future travelers
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Contribute this price to the community database. Earn 80 XP.
                    </p>
                  </div>
                  <button
                    className="btn-green text-[12px] px-3 py-1.5 rounded-xl shrink-0"
                    onClick={() => window.location.href = "/contribute"}
                  >
                    Contribute
                  </button>
                </div>
              </div>
            )}

            {!result && !loading && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-8 text-center h-full flex flex-col items-center justify-center min-h-[300px]">
                <CheckCircle className="w-12 h-12 text-zinc-200 mb-4" />
                <p className="text-[14px] font-semibold text-zinc-500 mb-2">
                  Verification results appear here
                </p>
                <p className="text-[12px] text-zinc-400 max-w-xs leading-relaxed">
                  Upload a receipt image to extract visible details and compare them with available local price references.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
