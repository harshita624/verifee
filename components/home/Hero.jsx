"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, MapPin, ArrowRight, Loader2,
  Navigation, Shield, CheckCircle, TrendingDown, Star,
  AlertTriangle,
} from "lucide-react";
import { useLocation } from "@/hooks/useLocation";

const FLOATING = [
  {
    title: "Pashmina Shawl",
    location: "Srinagar",
    offered: "8,500",
    fair: "2,800",
    saved: "5,700",
    risk: "overpriced 204%",
    riskColor: "#dc2626",
    delay: "0s",
    position: { top: "8%", left: "2%" },
  },
  {
    title: "Auto Rickshaw",
    location: "Delhi",
    offered: "400",
    fair: "90",
    saved: "310",
    risk: "tourist pricing",
    riskColor: "#f59e0b",
    delay: "1s",
    position: { top: "42%", right: "0%" },
  },
  {
    title: "Blue Pottery",
    location: "Jaipur",
    offered: "1,200",
    fair: "380",
    saved: "820",
    risk: "overpriced 216%",
    riskColor: "#dc2626",
    delay: "0.5s",
    position: { bottom: "8%", left: "6%" },
  },
];

export default function Hero() {
  const [query,    setQuery]    = useState("");
  const [cityInput,setCityInput]= useState("");
  const router = useRouter();
  const { city, detecting, error: locErr, detectLocation, setManualCity } = useLocation();

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    const p = new URLSearchParams({ q: query.trim() });
    if (city) p.set("city", city);
    router.push(`/check-price?${p}`);
  };

  return (
    <section
      className="relative flex items-center overflow-hidden"
      style={{
        minHeight: "100svh",
        paddingTop: "60px",
        background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(22,163,74,0.07) 0%, transparent 60%), linear-gradient(180deg,#f0fdf4 0%,#ffffff 60%)",
      }}
    >
      {/* dot grid */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle,#16a34a 1px,transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="container py-16 lg:py-24 relative z-10">
        <div className="grid lg:grid-cols-[1fr_480px] gap-12 lg:gap-16 items-center">

          {/* ── Left ── */}
          <div className="max-w-xl">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 bg-white border border-green-200 rounded-full px-4 py-2 mb-7 shadow-sm badge-pulse"
            >
              <span className="live-dot shrink-0" />
              <span className="text-[13px] font-medium text-green-700">
                What locals actually pay — not what Amazon charges
              </span>
            </div>

            {/* Headline */}
            <h1
              className="font-black text-zinc-950 leading-[1.06] tracking-tight mb-5"
              style={{ fontSize: "clamp(36px,6vw,64px)" }}
            >
              They charged you
              <br />
              <span
                style={{
                  background: "linear-gradient(135deg,#15803d,#22c55e)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                tourist price.
              </span>
              <br />
              We tell locals.
            </h1>

            <p className="text-[16px] text-zinc-500 leading-relaxed mb-8 max-w-[440px]">
              Verifee uses community-verified prices from real buyers with
              receipts — not online prices. Know what a local pays at any Indian
              bazaar, hotel, or market before you open your wallet.
            </p>

            {/* Location */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {city ? (
                <div
                  className="flex items-center gap-2 rounded-xl px-3.5 py-2"
                  style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}
                >
                  <MapPin className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  <span className="text-[13px] font-semibold text-green-800">{city}</span>
                  <button
                    onClick={() => { setManualCity(""); setCityInput(""); }}
                    className="text-[11px] text-green-500 hover:text-green-700 ml-1 font-medium"
                  >
                    change
                  </button>
                </div>
              ) : (
                <button
                  onClick={detectLocation}
                  disabled={detecting}
                  className="flex items-center gap-2 text-[13px] font-medium text-zinc-600 border border-zinc-200 bg-white rounded-xl px-3.5 py-2 hover:border-green-300 hover:text-green-700 transition-colors"
                >
                  {detecting
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin text-green-500" />
                    : <Navigation className="w-3.5 h-3.5" />}
                  {detecting ? "Detecting..." : "Detect my city"}
                </button>
              )}
              {locErr && <p className="text-[11px] text-red-500">{locErr}</p>}
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="mb-6">
              <div
                className="flex items-center bg-white rounded-2xl border border-zinc-200 p-2 gap-2 transition-all focus-within:border-green-400"
                style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
              >
                <div className="flex items-center gap-2.5 flex-1 pl-2 min-w-0">
                  <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. Pashmina Shawl, Hotel room, Auto ride"
                    className="flex-1 text-[14px] text-zinc-900 placeholder:text-zinc-400 bg-transparent py-2.5 min-w-0"
                  />
                </div>
                {!city && (
                  <div className="hidden sm:flex items-center gap-2 border-l border-zinc-100 pl-3 pr-2">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <input
                      type="text"
                      value={cityInput}
                      onChange={(e) => { setCityInput(e.target.value); setManualCity(e.target.value); }}
                      placeholder="City"
                      className="w-24 text-[13px] text-zinc-700 placeholder:text-zinc-400 bg-transparent"
                    />
                  </div>
                )}
                <button
                  type="submit"
                  className="flex items-center gap-2 text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-all hover:opacity-90 active:scale-95 shrink-0 btn-green"
                >
                  Check price
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Quick searches */}
            <div className="flex items-center gap-2 flex-wrap mb-10">
              <span className="text-[12px] text-zinc-400 font-medium">Try:</span>
              {["Kashmiri Carpet", "Hotel room", "Auto ride", "Taj Mahal ticket"].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuery(q)}
                  className="text-[12px] font-medium text-zinc-600 bg-white border border-zinc-200 px-3 py-1.5 rounded-full hover:border-green-300 hover:text-green-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Trust row */}
            <div className="flex items-center gap-5 flex-wrap pt-6 border-t border-zinc-100">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-[12px] font-medium text-zinc-600">Receipt-verified prices</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-[12px] font-medium text-zinc-600">Real scam detection</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-blue-500" />
                <span className="text-[12px] font-medium text-zinc-600">Avg 40% savings</span>
              </div>
            </div>
          </div>

          {/* ── Right — floating cards ── */}
          <div className="relative hidden lg:block" style={{ height: 560 }}>
            {FLOATING.map((card) => (
              <div
                key={card.title}
                className="absolute w-[228px] bg-white rounded-2xl p-4 border border-zinc-100 animate-float"
                style={{
                  ...card.position,
                  animationDelay: card.delay,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[13px] font-bold text-zinc-900">{card.title}</p>
                    <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />{card.location}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2"
                    style={{ background: `${card.riskColor}12`, color: card.riskColor }}
                  >
                    {card.risk}
                  </span>
                </div>
                <div className="flex items-stretch gap-2 mb-2.5">
                  <div className="flex-1 bg-red-50 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-red-400 font-medium mb-0.5">They quoted</p>
                    <p className="text-[14px] font-bold text-red-600 line-through">₹{card.offered}</p>
                  </div>
                  <div className="flex items-center text-zinc-300 text-xs">→</div>
                  <div className="flex-1 bg-green-50 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-green-500 font-medium mb-0.5">Locals pay</p>
                    <p className="text-[14px] font-bold text-green-700">₹{card.fair}</p>
                  </div>
                </div>
                <div
                  className="flex items-center justify-between rounded-xl px-3 py-2"
                  style={{ background: "#f0fdf4" }}
                >
                  <span className="text-[11px] text-green-600 font-medium">Tourist tax saved</span>
                  <span className="text-[13px] font-bold text-green-700">₹{card.saved}</span>
                </div>
              </div>
            ))}

            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg,#16a34a,#22c55e)",
                boxShadow: "0 0 48px rgba(34,197,94,0.25), 0 8px 24px rgba(22,163,74,0.2)",
              }}
            >
              <Shield className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}