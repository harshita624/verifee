"use client";

// ALL imports must be at the very top — this fixes React Error #31
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search, MapPin, Loader2, AlertTriangle,
  CheckCircle, Navigation, ArrowRight, Info,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { CATEGORIES, formatPrice } from "@/lib/utils";
import { useLocation } from "@/hooks/useLocation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ── Price result display ──────────────────────────────────────────────────────
function PriceResult({ result }) {
  if (!result) return null;

  const overcharge = result.touristPremium || 0;
  const riskColor  = overcharge >= 60 ? "#dc2626" : overcharge >= 30 ? "#f59e0b" : "#16a34a";
  const riskLabel  = overcharge >= 60 ? "High tourist premium"
    : overcharge >= 30 ? "Moderate premium" : "Fair pricing";

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Main result card */}
      <div
        className="rounded-2xl overflow-hidden border border-zinc-100"
        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}
      >
        {/* Green header */}
        <div className="px-6 py-5" style={{ background: "#16a34a" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[12px] font-medium text-green-100 mb-1">Fair price for</p>
              <h2 className="text-[20px] font-black text-white leading-tight">{result.product}</h2>
              <p className="text-[13px] text-green-200 mt-0.5">in {result.city}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] text-green-200 mb-1">
                {result.dataSource === "community_verified"
                  ? `${result.dataPoints} community reports`
                  : "AI estimate"}
              </p>
              <p className="text-[28px] font-black text-white leading-none">{result.confidenceScore}%</p>
              <p className="text-[10px] text-green-200">confidence</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 bg-white space-y-4">
          {/* Data source badge */}
          <div>
            {result.dataSource === "community_verified" ? (
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #dcfce7" }}
              >
                <CheckCircle className="w-3 h-3" />
                {result.dataPoints} verified community receipts
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }}
              >
                <AlertTriangle className="w-3 h-3" />
                AI estimate — contribute your receipt to improve accuracy
              </span>
            )}
          </div>

          {/* Price range */}
          <div>
            <p className="text-[11px] text-zinc-400 mb-1">Fair price range</p>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-[32px] font-black text-zinc-950 leading-none">
                {formatPrice(result.fairPriceMin)} – {formatPrice(result.fairPriceMax)}
              </p>
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: `${riskColor}10`, color: riskColor }}
              >
                {riskLabel} (+{overcharge}%)
              </span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {[
              { label: "Local market avg",  value: formatPrice(result.localMarketAvg),  color: "#09090b" },
              { label: "Online avg",         value: formatPrice(result.onlineAvg),        color: "#09090b" },
              { label: "Start bargaining",   value: formatPrice(result.bargainingStart),  color: "#dc2626" },
              { label: "Target price",       value: formatPrice(result.bargainingTarget), color: "#16a34a" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl p-3" style={{ background: "#fafafa" }}>
                <p className="text-[10px] text-zinc-400 mb-1">{item.label}</p>
                <p className="text-[15px] font-bold" style={{ color: item.color }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* AI recommendation */}
          {result.aiRecommendation && (
            <div className="rounded-xl bg-green-50 border border-green-100 p-4 flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <p className="text-[13px] text-green-800 leading-relaxed">{result.aiRecommendation}</p>
            </div>
          )}

          {/* Scam warning */}
          {result.scamWarning && (
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-[13px] text-amber-800 leading-relaxed">{result.scamWarning}</p>
            </div>
          )}

          {/* Extra info */}
          {(result.bestTimeToBuy || result.trend || result.seasonalNote) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-100">
              {[
                result.bestTimeToBuy && { label: "Best time to buy", value: result.bestTimeToBuy },
                result.trend         && { label: "Price trend",      value: result.trend         },
                result.seasonalNote  && { label: "Seasonal note",    value: result.seasonalNote  },
              ]
                .filter(Boolean)
                .map((item) => (
                  <div key={item.label} className="flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-zinc-400">{item.label}</p>
                      <p className="text-[13px] font-medium text-zinc-700">{item.value}</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons — all using Link properly */}
      <div className="flex flex-wrap gap-2.5">
        <Link
          href={`/scam-check?product=${encodeURIComponent(result.product)}&city=${encodeURIComponent(result.city)}`}
          className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 border border-red-100 text-red-700 font-semibold text-[13px] py-3 rounded-xl transition-colors min-w-[140px]"
        >
          <AlertTriangle className="w-4 h-4" />
          Check if this is a scam
        </Link>
        <Link
          href={`/bargain?product=${encodeURIComponent(result.product)}&city=${encodeURIComponent(result.city)}`}
          className="flex-1 flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 border border-green-100 text-green-700 font-semibold text-[13px] py-3 rounded-xl transition-colors min-w-[140px]"
        >
          Get bargain script
        </Link>
        <Link
          href={`/translate?text=${encodeURIComponent("What is your best price?")}`}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 font-semibold text-[13px] py-3 rounded-xl transition-colors min-w-[140px]"
        >
          Translate to bargain
        </Link>
      </div>
    </div>
  );
}

// ── Main page content ─────────────────────────────────────────────────────────
function CheckPriceContent() {
  const searchParams = useSearchParams();

  const [query,        setQuery]        = useState(searchParams.get("q")        || "");
  const [category,     setCategory]     = useState(searchParams.get("category") || "");
  const [customCat,    setCustomCat]    = useState("");
  const [loading,      setLoading]      = useState(false);
  const [result,       setResult]       = useState(null);
  const [error,        setError]        = useState("");
  const [places,       setPlaces]       = useState([]);
  const [selectedPlace,setSelectedPlace]= useState(searchParams.get("place") || "");
  const [loadingPlaces,setLoadingPlaces]= useState(false);

  const {
    city, detecting, error: locErr,
    detectLocation, setManualCity,
  } = useLocation();

  const [cityInput, setCityInput] = useState(
    searchParams.get("city") || city || ""
  );

  // Sync city from location hook
  useEffect(() => {
    if (city && !cityInput) setCityInput(city);
  }, [city]);

  // Load places when city input changes
  useEffect(() => {
    const c = cityInput.trim();
    if (!c || c.length < 3) { setPlaces([]); return; }

    let cancelled = false;
    setLoadingPlaces(true);

    fetch(`${API}/api/v1/ai/city-places/${encodeURIComponent(c)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.success) setPlaces(d.data || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingPlaces(false); });

    return () => { cancelled = true; };
  }, [cityInput]);

  // Auto-run if query came from URL
  useEffect(() => {
    const q = searchParams.get("q");
    const c = searchParams.get("city") || city;
    if (q) handleCheck(null, q, c);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCheck = async (e, overrideQ, overrideCity) => {
    e?.preventDefault();

    const q = (overrideQ !== undefined ? overrideQ : query).trim();
    const c = (overrideCity !== undefined ? overrideCity : cityInput).trim();

    if (!q) return;

    setLoading(true);
    setError("");
    setResult(null);

    const productWithPlace = selectedPlace ? `${q} at ${selectedPlace}` : q;
    const finalCategory    = category === "other" ? customCat : category;

    try {
      const res  = await fetch(`${API}/api/v1/ai/fair-price`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          product:  productWithPlace,
          city:     c,
          category: finalCategory,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to get price");
      setResult(data.data);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vf-page">
      {/* Form section */}
      <div className="py-10 border-b border-zinc-100 bg-white">
        <div className="container max-w-3xl">
          <Badge variant="green" className="mb-3">AI Price Checker</Badge>
          <h1 className="text-[28px] md:text-[38px] font-black text-zinc-950 mb-2 leading-tight">
            What is the fair price?
          </h1>
          <p className="text-[14px] text-zinc-500 mb-7">
            Get an AI-powered fair price estimate before you buy anything.
            {cityInput && (
              <span className="font-semibold text-green-600">
                {" "}Showing prices for {cityInput}.
              </span>
            )}
          </p>

          <form onSubmit={handleCheck} className="space-y-3">
            {/* Product input */}
            <div className="flex items-center gap-2 bg-white rounded-xl border border-zinc-200 px-4 py-3 focus-within:border-green-400 transition-colors">
              <Search className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Kashmiri Carpet, Hotel room, Auto ride, Pani Puri"
                className="flex-1 text-[14px] text-zinc-800 placeholder:text-zinc-400 bg-transparent"
              />
            </div>

            {/* City + category row */}
            <div className="flex gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-1 bg-white rounded-xl border border-zinc-200 px-4 py-2.5 focus-within:border-green-400 transition-colors min-w-[180px]">
                <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
                <input
                  type="text"
                  value={cityInput}
                  onChange={(e) => {
                    setCityInput(e.target.value);
                    setManualCity(e.target.value);
                    setSelectedPlace("");
                  }}
                  placeholder="City (type or auto-detect)"
                  className="flex-1 text-[14px] text-zinc-700 placeholder:text-zinc-400 bg-transparent"
                />
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={detecting}
                  title="Detect my city"
                  className="shrink-0 p-1 rounded-lg hover:bg-green-50 transition-colors"
                >
                  {detecting
                    ? <Loader2 className="w-4 h-4 animate-spin text-green-500" />
                    : <Navigation className="w-4 h-4 text-zinc-400 hover:text-green-600" />}
                </button>
              </div>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="text-[13px] text-zinc-700 bg-white border border-zinc-200 rounded-xl px-3 py-2.5 md:w-48"
                style={{ outline: "none" }}
              >
                <option value="">All categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {/* FIX: only splice in cat.icon when it's a plain string (emoji).
                        If it's ever a component reference (e.g. a lucide-react icon),
                        rendering it directly here is what threw React error #31 —
                        native <option> tags can't render components anyway, so we
                        just fall back to the label alone in that case. */}
                    {typeof cat.icon === "string" ? `${cat.icon} ` : ""}{cat.label}
                  </option>
                ))}
                <option value="other">Other (specify below)</option>
              </select>
            </div>

            {/* Custom category */}
            {category === "other" && (
              <input
                type="text"
                value={customCat}
                onChange={(e) => setCustomCat(e.target.value)}
                placeholder="Describe the category e.g. Street food, Religious items, Sports equipment"
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-[14px] text-zinc-700 bg-white focus:border-green-400 transition-colors"
                style={{ outline: "none" }}
              />
            )}

            {/* Place suggestions */}
            {cityInput.trim().length >= 3 && (
              <div>
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                  Where in {cityInput}? (optional — improves accuracy)
                </p>
                {loadingPlaces ? (
                  <div className="flex items-center gap-2 text-[12px] text-zinc-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading popular places in {cityInput}...
                  </div>
                ) : places.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedPlace("")}
                      className="text-[12px] font-medium px-3 py-1.5 rounded-xl border transition-all"
                      style={{
                        background:  !selectedPlace ? "#f0fdf4" : "#fff",
                        borderColor: !selectedPlace ? "#bbf7d0" : "#e4e4e7",
                        color:       !selectedPlace ? "#16a34a" : "#71717a",
                      }}
                    >
                      Any place
                    </button>
                    {places.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setSelectedPlace(p.name)}
                        className="text-[12px] font-medium px-3 py-1.5 rounded-xl border transition-all"
                        style={{
                          background:  selectedPlace === p.name ? "#f0fdf4" : "#fff",
                          borderColor: selectedPlace === p.name ? "#bbf7d0" : "#e4e4e7",
                          color:       selectedPlace === p.name ? "#16a34a" : "#52525b",
                        }}
                      >
                        {p.name}
                        {p.touristRisk === "high" && (
                          <span className="ml-1 text-[9px] text-red-400">⚠</span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {locErr && <p className="text-[11px] text-red-500 px-1">{locErr}</p>}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="w-full flex items-center justify-center gap-2 text-white font-semibold text-[14px] py-3 rounded-xl transition-all active:scale-95"
              style={{
                background: loading || !query.trim() ? "#86efac" : "#16a34a",
                cursor:     !query.trim() ? "not-allowed" : "pointer",
              }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing prices...</>
              ) : (
                <>Get fair price <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Quick examples */}
          <div className="flex items-center gap-2 flex-wrap mt-4">
            <span className="text-[11px] text-zinc-400 font-medium">Try:</span>
            {[
              { q: "Pani Puri",       c: "Jaipur",   p: "Johari Bazaar" },
              { q: "Banarasi Saree",  c: "Varanasi",  p: ""              },
              { q: "Kashmiri Carpet", c: "Srinagar",  p: "Lal Chowk"    },
              { q: "Auto ride",       c: cityInput || "Delhi", p: "" },
            ].map(({ q, c, p }) => (
              <button
                key={q}
                onClick={() => {
                  setQuery(q);
                  setCityInput(c);
                  setManualCity(c);
                  setSelectedPlace(p);
                }}
                className="text-[11px] text-zinc-500 border border-zinc-200 bg-white px-2.5 py-1 rounded-full hover:border-green-300 hover:text-green-700 transition-colors"
              >
                {q} in {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results section */}
      <div className="container max-w-3xl py-8">
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-100 p-5 text-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-[14px] font-semibold text-red-700 mb-1">
              Could not get price estimate
            </p>
            <p className="text-[13px] text-red-500">{error}</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-16">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "#f0fdf4" }}
            >
              <Loader2 className="w-7 h-7 text-green-600 animate-spin" />
            </div>
            <p className="text-[15px] font-semibold text-zinc-700 mb-1">
              Analyzing {cityInput ? `${cityInput} market` : "market"} prices...
            </p>
            <p className="text-[13px] text-zinc-400">
              Checking community data
              {selectedPlace ? ` at ${selectedPlace}` : ""}
            </p>
          </div>
        )}

        {result && !loading && <PriceResult result={result} />}

        {!loading && !result && !error && (
          <div className="text-center py-16">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "#f0fdf4" }}
            >
              <Search className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-[15px] font-semibold text-zinc-700 mb-2">
              Search any product or service
            </p>
            <p className="text-[13px] text-zinc-400">
              From handicrafts to hotel rooms — we know what the fair price is.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckPricePage() {
  return (
    <Suspense
      fallback={
        <div className="vf-page flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-green-600" />
        </div>
      }
    >
      <CheckPriceContent />
    </Suspense>
  );
}