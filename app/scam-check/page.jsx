"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle, CheckCircle, Loader2, ArrowRight,
  MapPin, ShoppingBag, Navigation,
} from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { formatPrice, CATEGORIES } from "@/lib/utils";
import { useLocation } from "@/hooks/useLocation";
import CategoryDetailsFields, { inferCategoryFromProduct } from "@/components/CategoryDetailsFields";

import { API_BASE as API } from "@/lib/api";

function ScamMeter({ probability }) {
  const color = probability>=70?"#dc2626":probability>=40?"#f59e0b":"#16a34a";
  const label = probability>=70?"High risk":probability>=40?"Review price":"Within range";
  const bg    = probability>=70?"#fef2f2":probability>=40?"#fffbeb":"#f0fdf4";

  return (
    <div className="rounded-2xl border-2 p-6 text-center" style={{ borderColor:color, background:bg }}>
      <p className="text-[12px] font-semibold mb-2 uppercase tracking-wide" style={{ color }}>Price Risk Indicator</p>
      <div className="text-[64px] font-black mb-2 leading-none" style={{ color }}>{probability}%</div>
      <p className="mb-3 text-xs text-zinc-500">A comparison score, not a calibrated probability or proof of fraud.</p>
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-bold text-white" style={{ background:color }}>
        {probability>=70
          ? <AlertTriangle className="w-3.5 h-3.5"/>
          : <CheckCircle className="w-3.5 h-3.5"/>}
        {label}
      </span>
    </div>
  );
}

function ScamResult({ result }) {
  if (!result) return null;
  const color = result.scamProbability>=70?"#dc2626":result.scamProbability>=40?"#f59e0b":"#16a34a";

  return (
    <div className="space-y-4 animate-fade-up">
      <ScamMeter probability={result.scamProbability} />

      {/* Data source */}
      <div className="flex flex-wrap items-center gap-2">
        {result.category&&<span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold capitalize text-zinc-600">{result.category} comparison</span>}
        {result.dataSource==="community_verified" ? (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background:"#f0fdf4",color:"#16a34a",border:"1px solid #dcfce7" }}>
            Based on {result.dataPoints} matching verified reports
          </span>
        ) : result.dataSource==="route_estimate" ? (
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800">Route and vehicle based · indicative fare</span>
        ) : result.dataSource==="community_limited" ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
            Low-confidence range · {result.dataPoints} matching report(s)
          </span>
        ) : (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background:"#fffbeb",color:"#92400e",border:"1px solid #fde68a" }}>
            AI estimate — contribute your receipt to improve accuracy
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4">
          <p className="text-[11px] text-red-400 mb-1">They quoted</p>
          <p className="text-[24px] font-black text-red-600 line-through">
            {formatPrice(result.offeredPrice)}
          </p>
          <p className="text-[11px] text-red-500 mt-1">
            +{result.overpricingPercent}% above fair price
          </p>
        </div>
        <div className="rounded-2xl bg-green-50 border border-green-100 p-4">
          <p className="text-[11px] text-green-500 mb-1">{result.category === "hotels" ? "Fair price for this stay" : "Fair price"}</p>
          <p className="text-[24px] font-black text-green-700">
            {formatPrice(result.fairPriceMin)} – {formatPrice(result.fairPriceMax)}
          </p>
          <p className="text-[11px] text-green-600 mt-1">What you should pay</p>
        </div>
      </div>

      {(result.priceComparison || result.comparisonBasis || result.comparisonRule) && (
        <div className="rounded-2xl bg-zinc-50 border border-zinc-100 p-4">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">
            {result.dataSource === "route_estimate" ? "Route and category checks" : "Price comparison"}
          </p>
          {result.comparisonBasis && <p className="text-[13px] text-zinc-700 leading-relaxed"><b>Details used:</b> {result.comparisonBasis}</p>}
          {result.comparisonRule && <p className="mt-1 text-[13px] text-zinc-700 leading-relaxed"><b>Category check:</b> {result.comparisonRule}</p>}
          {result.explanation && <p className="mt-2 text-[13px] text-zinc-700 leading-relaxed">{result.explanation}</p>}
          {result.priceComparison && <p className="mt-2 text-[12px] font-semibold text-zinc-600">
            {result.priceComparison === "far_above" ? "Far above usual prices" : result.priceComparison === "above" ? "Above usual prices" : "Near usual prices"}
          </p>}
        </div>
      )}

      {result.negotiationScript && (
        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5">
          <p className="text-[11px] font-semibold text-blue-500 uppercase tracking-wide mb-3">
            Say this right now
          </p>
          <p className="text-[15px] font-medium text-blue-900 leading-relaxed bg-blue-100 rounded-xl px-4 py-3 font-mono">
            "{result.negotiationScript}"
          </p>
        </div>
      )}

      {result.walkAwayAdvice && (
        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4">
          <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide mb-2">
            Walk away advice
          </p>
          <p className="text-[13px] text-amber-800 leading-relaxed">{result.walkAwayAdvice}</p>
        </div>
      )}

      {result.alternatives?.length > 0 && (
        <div className="rounded-2xl bg-white border border-zinc-100 p-4">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Better alternatives
          </p>
          <ul className="space-y-2">
            {result.alternatives.map((alt,i) => (
              <li key={i} className="flex items-center gap-2 text-[13px] text-zinc-700">
                <MapPin className="w-4 h-4 text-green-500 shrink-0" />
                {alt}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2.5">
        <Link href={`/bargain?product=${encodeURIComponent(result.offeredPrice?`product at ₹${result.offeredPrice}`:"item")}`}
          className="flex-1 flex items-center justify-center gap-2 btn-green text-[13px] py-3 rounded-xl">
          Get bargain script
        </Link>
        <Link href="/contribute"
          className="flex-1 flex items-center justify-center gap-2 border border-zinc-200 text-zinc-700 font-semibold text-[13px] py-3 rounded-xl hover:bg-zinc-50 transition-colors">
          Report this scam
        </Link>
      </div>
    </div>
  );
}

function ScamCheckContent() {
  const searchParams = useSearchParams();
  const [product,      setProduct]      = useState(searchParams.get("product")||"");
  const [offeredPrice, setOfferedPrice] = useState(searchParams.get("quote") || "");
  const [quality, setQuality] = useState("good");
  const [details, setDetails] = useState(() => {
    try { return JSON.parse(searchParams.get("details") || "{}"); } catch { return {}; }
  });
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [selectedPlace,setSelectedPlace]= useState(searchParams.get("place")||"");
  const selectedCategory = category || inferCategoryFromProduct(product);
  const [loading,      setLoading]      = useState(false);
  const [result,       setResult]       = useState(null);
  const [error,        setError]        = useState("");
  const [places,       setPlaces]       = useState([]);
  const [loadingPlaces,setLoadingPlaces]= useState(false);

  const {
    city, detecting, error: locErr,
    detectLocation, setManualCity,
  } = useLocation();

  const [cityInput, setCityInput] = useState(
    searchParams.get("city") || city || ""
  );

  useEffect(() => { if (city && !cityInput) setCityInput(city); }, [city]);

  // Load places when city changes
  useEffect(() => {
    const c = cityInput.trim();
    if (!c || c.length < 3) { setPlaces([]); return; }
    setLoadingPlaces(true);
    fetch(`${API}/api/v1/ai/city-places/${encodeURIComponent(c)}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.success) setPlaces(d.data||[]); })
      .catch(()=>{})
      .finally(()=>setLoadingPlaces(false));
  }, [cityInput]);

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!product || !offeredPrice) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res  = await fetch(`${API}/api/v1/ai/scam-check`, {
        method:  "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          product,
          offeredPrice: Number(offeredPrice),
          city: cityInput,
          place: selectedPlace,
          category,
          quality,
          details,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setResult(data.data);
    } catch (err) {
      setError(err.message||"Failed to analyze. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vf-page">
      <div className="py-10 border-b border-zinc-100 bg-white">
        <div className="container max-w-2xl">
          <Badge variant="red" className="mb-3">
            <AlertTriangle className="w-3.5 h-3.5" /> AI Scam Detector
          </Badge>
          <h1 className="text-[28px] md:text-[38px] font-black text-zinc-950 mb-2">
            Is this price a scam?
          </h1>
          <p className="text-[14px] text-zinc-500 mb-7">
            Enter what you were quoted. Get a scam risk estimate, a comparison with local prices,
            and practical words to use when negotiating.
          </p>

          <form onSubmit={handleCheck} className="space-y-3">
            {/* Product */}
            <div className="flex items-center gap-2 bg-white rounded-xl border border-zinc-200 px-4 py-3 focus-within:border-green-400 transition-colors">
              <ShoppingBag className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                type="text" value={product} onChange={e=>setProduct(e.target.value)}
                placeholder="What product/service? e.g. Silk Saree, Auto ride, Marble bowl"
                className="flex-1 text-[14px] text-zinc-800 placeholder:text-zinc-400 bg-transparent"
                required
              />
            </div>

            {/* Price + City */}
            <div className="flex gap-3">
              <div className="flex items-center gap-2 flex-1 bg-white rounded-xl border border-zinc-200 px-4 py-3 focus-within:border-red-400 transition-colors">
                <span className="text-[16px] font-bold text-zinc-400">₹</span>
                <input
                  type="number" value={offeredPrice} onChange={e=>setOfferedPrice(e.target.value)}
                  placeholder={selectedCategory === "hotels" ? "Total quoted price for the stay" : "Price they quoted"}
                  className="flex-1 text-[14px] text-zinc-800 placeholder:text-zinc-400 bg-transparent"
                  required min="1"
                />
              </div>
              <div className="flex items-center gap-2 bg-white rounded-xl border border-zinc-200 px-4 py-2.5 flex-1 focus-within:border-green-400 transition-colors">
                <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
                <input
                  type="text" value={cityInput}
                  onChange={e=>{ setCityInput(e.target.value); setManualCity(e.target.value); setSelectedPlace(""); }}
                  placeholder="City"
                  className="flex-1 text-[14px] text-zinc-700 placeholder:text-zinc-400 bg-transparent"
                />
                <button type="button" onClick={detectLocation} disabled={detecting}
                  className="shrink-0 p-1 rounded-lg hover:bg-green-50">
                  {detecting
                    ? <Loader2 className="w-4 h-4 animate-spin text-green-500" />
                    : <Navigation className="w-4 h-4 text-zinc-400 hover:text-green-600" />}
                </button>
              </div>
            </div>

            <label className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
              <span className="font-semibold">Product category</span>
              <select value={category} onChange={e=>setCategory(e.target.value)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm">
                <option value="">Auto-detect from product</option>
                {CATEGORIES.map((item)=><option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              <span className="text-xs text-zinc-400">Only compare with the same product category.</span>
            </label>
            <CategoryDetailsFields category={selectedCategory} value={details} onChange={setDetails} />

            <label className="flex flex-wrap items-center gap-3 text-sm text-zinc-600">
              <span className="font-semibold">Item quality</span>
              <select value={quality} onChange={e=>setQuality(e.target.value)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm">
                <option value="poor">Basic</option><option value="fair">Fair</option><option value="good">Good / typical</option><option value="excellent">Premium</option>
              </select>
              <span className="text-xs text-zinc-400">Price comparison uses verified reports of similar quality.</span>
            </label>

            {/* Place suggestions for city */}
            {cityInput.trim().length >= 3 && (
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                  Where did this happen? (optional)
                </label>
                {loadingPlaces ? (
                  <div className="flex items-center gap-2 text-[12px] text-zinc-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading places in {cityInput}...
                  </div>
                ) : places.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => setSelectedPlace("")}
                      className="text-[12px] font-medium px-3 py-1.5 rounded-xl border transition-all"
                      style={{
                        background:  !selectedPlace?"#f0fdf4":"#fff",
                        borderColor: !selectedPlace?"#bbf7d0":"#e4e4e7",
                        color:       !selectedPlace?"#16a34a":"#71717a",
                      }}>
                      Unknown
                    </button>
                    {places.map(p => (
                      <button key={p.name} type="button" onClick={()=>setSelectedPlace(p.name)}
                        className="text-[12px] font-medium px-3 py-1.5 rounded-xl border transition-all"
                        style={{
                          background:  selectedPlace===p.name?"#fef2f2":"#fff",
                          borderColor: selectedPlace===p.name?"#fecaca":"#e4e4e7",
                          color:       selectedPlace===p.name?"#dc2626":"#52525b",
                        }}>
                        {p.name}
                        {p.touristRisk==="high" && <span className="ml-1 text-[9px] text-red-500">⚠ high risk</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {locErr && <p className="text-[11px] text-red-500">{locErr}</p>}

            <button
              type="submit" disabled={loading||!product||!offeredPrice}
              className="w-full flex items-center justify-center gap-2 text-white font-semibold text-[14px] py-3 rounded-xl transition-all disabled:opacity-50 active:scale-95"
              style={{ background:"#dc2626" }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin"/>Analyzing...</>
                : <>Detect scam now <ArrowRight className="w-4 h-4"/></>}
            </button>
          </form>

          {/* Common examples */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-[11px] text-zinc-400 font-medium">Common scams:</span>
            {[
              ["Taj Mahal ticket","1500","Agra","Meena Bazaar"],
              ["Auto ride",       "500", "Delhi","Connaught Place"],
              ["Pashmina shawl",  "8000","Srinagar","Lal Chowk"],
            ].map(([p,price,c,pl]) => (
              <button key={p}
                onClick={()=>{ setProduct(p); setOfferedPrice(price); setCityInput(c); setManualCity(c); setSelectedPlace(pl); }}
                className="text-[11px] text-zinc-500 border border-zinc-200 bg-white px-2.5 py-1 rounded-full hover:border-red-200 hover:text-red-600 transition-colors">
                {p} ₹{price} in {pl}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container max-w-2xl py-8">
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-[14px] font-semibold text-red-700">{error}</p>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin mx-auto mb-4" />
            <p className="text-[15px] font-semibold text-zinc-700">
        Checking the price risk{selectedPlace?` at ${selectedPlace}`:""}...
            </p>
            <p className="text-[13px] text-zinc-400 mt-1">
              Comparing the quote with local prices
            </p>
          </div>
        )}

        {result && <ScamResult result={result} />}
      </div>
    </div>
  );
}

export default function ScamCheckPage() {
  return (
    <Suspense fallback={<div className="vf-page flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-green-600"/></div>}>
      <ScamCheckContent />
    </Suspense>
  );
}
