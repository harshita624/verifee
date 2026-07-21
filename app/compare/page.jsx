"use client";

import { useState } from "react";
import {
  MapPin, Loader2, BarChart2, RefreshCw,
  TrendingDown, AlertTriangle, CheckCircle, ArrowRight,
} from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const CITIES = [
  "Delhi","Mumbai","Jaipur","Agra","Varanasi","Srinagar","Goa",
  "Bangalore","Hyderabad","Chennai","Kolkata","Kochi","Udaipur",
  "Amritsar","Mysore","Pune","Ahmedabad",
];

// ── Fixed bar: always shows meaningful differences ────────────────────────────
function Bar({ city, priceMin, priceMax, allPrices, rank }) {
  const sortedMins  = [...allPrices].sort((a,b)=>a-b);
  const minVal      = sortedMins[0];
  const maxVal      = sortedMins[sortedMins.length-1];
  const range       = maxVal - minVal;
  const isBest      = priceMin === minVal && rank === 1;
  const isWorst     = priceMin === maxVal;

  // If all prices identical, spread bars artificially so it's visible
  let pct;
  if (range === 0) {
    pct = 55 + (rank-1)*10;
  } else {
    // Best city = 85%, worst = 30%, others proportional
    pct = 85 - ((priceMin - minVal) / range) * 55;
  }
  pct = Math.max(22, Math.min(88, pct));

  const barColor = isBest
    ? "linear-gradient(90deg,#16a34a,#22c55e)"
    : isWorst
    ? "linear-gradient(90deg,#f59e0b,#fbbf24)"
    : "linear-gradient(90deg,#3b82f6,#60a5fa)";

  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex items-center gap-1.5 w-24 shrink-0">
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 text-white"
          style={{ background: isBest?"#16a34a":"#a1a1aa", minWidth:20 }}
        >
          {rank}
        </span>
        <span className="text-[12px] font-semibold text-zinc-700 truncate">{city}</span>
      </div>

      <div className="flex-1 h-9 bg-zinc-100 rounded-xl overflow-hidden">
        <div
          className="h-full rounded-xl flex items-center px-3 transition-all duration-700"
          style={{ width:`${pct}%`, background:barColor, minWidth:80 }}
        >
          <span className="text-[11px] font-bold text-white whitespace-nowrap">
            ₹{priceMin.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="shrink-0 w-16 text-right">
        {isBest && (
          <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            Best
          </span>
        )}
        {isWorst && !isBest && (
          <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            Pricey
          </span>
        )}
      </div>
    </div>
  );
}

export default function ComparePage() {
  const [product,  setProduct]  = useState("");
  const [selected, setSelected] = useState(["Delhi","Mumbai","Jaipur"]);
  const [results,  setResults]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const toggle = (c) =>
    setSelected(prev =>
      prev.includes(c)
        ? prev.filter(x=>x!==c)
        : prev.length<6 ? [...prev,c] : prev
    );

  const compare = async () => {
    if (!product.trim()||selected.length<2) return;
    setLoading(true); setError(""); setResults(null);
    try {
      const calls = selected.map(city =>
        fetch(`${API}/api/v1/ai/fair-price`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            product: product.trim(),
            city,
            // Pass a hint to get city-specific prices
            category: "",
          }),
        })
          .then(r=>r.json())
          .then(d=>({ city, data: d.data }))
      );

      const all   = await Promise.all(calls);
      const valid = all.filter(r=>r.data?.fairPriceMin!=null);
      if (!valid.length) throw new Error("No results returned");

      // Sort cheapest first
      valid.sort((a,b)=>a.data.fairPriceMin - b.data.fairPriceMin);
      setResults(valid);
    } catch (e) {
      setError(e.message||"Comparison failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const allMins  = results ? results.map(r=>r.data.fairPriceMin) : [];
  const minPrice = results ? Math.min(...allMins) : 0;
  const maxPrice = results ? Math.max(...results.map(r=>r.data.fairPriceMax)) : 0;
  const bestCity = results?.[0];
  const saving   = results&&results.length>1
    ? results[results.length-1].data.fairPriceMin - results[0].data.fairPriceMin
    : 0;

  return (
    <div className="vf-page">
      <div className="bg-white border-b border-zinc-100 py-10">
        <div className="container">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full"
              style={{ background:"#f0fdf4",color:"#16a34a",border:"1px solid #dcfce7" }}>
              New
            </span>
          </div>
          <h1 className="text-[28px] md:text-[38px] font-black text-zinc-950 mb-3 leading-tight">
            Compare prices across cities
          </h1>
          <p className="text-[14px] text-zinc-500 max-w-xl leading-relaxed">
            Find which Indian city offers the best price for what you want to buy.
            AI gives city-specific prices — not generic all-India estimates.
          </p>
        </div>
      </div>

      <div className="container py-8">
        <div
          className="bg-white rounded-2xl border border-zinc-100 p-5 sm:p-6 mb-6"
          style={{ boxShadow:"0 4px 24px rgba(0,0,0,0.04)" }}
        >
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              value={product} onChange={e=>setProduct(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&compare()}
              placeholder="e.g. Pashmina Shawl, Hotel room, Banarasi Saree, Leather bag"
              className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-[14px] text-zinc-800 placeholder:text-zinc-400 bg-white"
            />
            <button
              onClick={compare}
              disabled={loading||!product.trim()||selected.length<2}
              className="flex items-center justify-center gap-2 btn-green text-[14px] px-6 py-3 rounded-xl disabled:opacity-50 shrink-0"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin"/>
                : <><BarChart2 className="w-4 h-4"/>Compare prices</>}
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wide">
                Select cities to compare
              </p>
              <span className="text-[11px] text-zinc-400">{selected.length}/6 · min 2</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {CITIES.map(c => {
                const active   = selected.includes(c);
                const disabled = !active&&selected.length>=6;
                return (
                  <button key={c} onClick={()=>!disabled&&toggle(c)}
                    className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-xl border transition-all"
                    style={{
                      background:  active?"#f0fdf4":"#fff",
                      borderColor: active?"#bbf7d0":"#e4e4e7",
                      color:       active?"#16a34a":disabled?"#d4d4d8":"#52525b",
                      cursor:      disabled?"not-allowed":"pointer",
                    }}>
                    <MapPin className="w-3 h-3 shrink-0"/>{c}
                    {active&&<span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"/>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0"/>
            <p className="text-[13px] text-red-600">{error}</p>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center">
            <Loader2 className="w-10 h-10 text-green-600 animate-spin mx-auto mb-4"/>
            <p className="text-[15px] font-semibold text-zinc-700 mb-1">
              Comparing {selected.length} cities...
            </p>
            <p className="text-[13px] text-zinc-400">
              Getting city-specific prices for {product}
            </p>
          </div>
        )}

        {results && !loading && (
          <div className="space-y-5 animate-fade-up">
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-green-100 p-4"
                style={{ boxShadow:"0 2px 12px rgba(22,163,74,0.06)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-500"/>
                  <p className="text-[11px] font-semibold text-green-600 uppercase tracking-wide">
                    Best city to buy
                  </p>
                </div>
                <p className="text-[24px] font-black text-green-700">{bestCity?.city}</p>
                <p className="text-[13px] text-zinc-500 mt-0.5">
                  from ₹{bestCity?.data.fairPriceMin.toLocaleString()}
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-zinc-100 p-4">
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                  Price range
                </p>
                <p className="text-[20px] font-black text-zinc-900 leading-tight">
                  ₹{minPrice.toLocaleString()}
                  <span className="text-zinc-300 mx-1">–</span>
                  ₹{maxPrice.toLocaleString()}
                </p>
                <p className="text-[12px] text-zinc-400 mt-0.5">across {results.length} cities</p>
              </div>

              <div className="bg-white rounded-2xl border border-zinc-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-amber-500"/>
                  <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                    Max saving
                  </p>
                </div>
                <p className="text-[24px] font-black text-amber-600">
                  ₹{saving > 0 ? saving.toLocaleString() : "—"}
                </p>
                <p className="text-[12px] text-zinc-400 mt-0.5">
                  {saving > 0 ? `by buying in ${bestCity?.city}` : "Similar prices across cities"}
                </p>
              </div>
            </div>

            {/* Bar chart */}
            <div className="bg-white rounded-2xl border border-zinc-100 p-5 sm:p-6">
              <h2 className="text-[15px] font-bold text-zinc-900 mb-5">
                Fair price comparison — {product}
              </h2>
              <div className="space-y-2.5">
                {results.map((r,i) => (
                  <Bar
                    key={r.city}
                    city={r.city}
                    priceMin={r.data.fairPriceMin}
                    priceMax={r.data.fairPriceMax}
                    allPrices={results.map(x=>x.data.fairPriceMin)}
                    rank={i+1}
                  />
                ))}
              </div>
              <p className="text-[11px] text-zinc-400 mt-5 pt-4 border-t border-zinc-50">
                Prices are city-specific AI estimates. Actual market prices vary by vendor and season.
              </p>
            </div>

            {/* Detail table */}
            <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-50">
                <h2 className="text-[14px] font-bold text-zinc-900">Detailed breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-50">
                      {["City","Fair range","Bargain start","Target","Tourist premium","Tip"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r,i) => (
                      <tr key={r.city}
                        className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors"
                        style={{ background: i===0?"#f0fdf4":"" }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                              style={{ background:i===0?"#16a34a":"#f4f4f5", color:i===0?"#fff":"#71717a" }}>
                              {i+1}
                            </span>
                            <span className="text-[13px] font-bold text-zinc-900">{r.city}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[13px] font-semibold text-zinc-800 whitespace-nowrap">
                          ₹{r.data.fairPriceMin?.toLocaleString()} – ₹{r.data.fairPriceMax?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-[13px] font-semibold text-red-600 whitespace-nowrap">
                          ₹{r.data.bargainingStart?.toLocaleString()||"—"}
                        </td>
                        <td className="px-4 py-3 text-[13px] font-semibold text-green-700 whitespace-nowrap">
                          ₹{r.data.bargainingTarget?.toLocaleString()||"—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{
                              background:(r.data.touristPremium||0)>=50?"#fef2f2":"#f0fdf4",
                              color:     (r.data.touristPremium||0)>=50?"#dc2626":"#16a34a",
                            }}>
                            +{r.data.touristPremium||0}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-zinc-500 max-w-[180px]">
                          <span className="line-clamp-2">{r.data.aiRecommendation||"—"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CTA */}
            <div className="grid sm:grid-cols-2 gap-3">
              <Link href={`/check-price?q=${encodeURIComponent(product)}&city=${encodeURIComponent(bestCity?.city||"")}`}>
                <div className="bg-white rounded-2xl border border-green-100 p-4 flex items-center gap-3 card-hover cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-600"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-zinc-900">
                      Full price details for {bestCity?.city}
                    </p>
                    <p className="text-[11px] text-zinc-400">Bargaining advice, scam warnings, best time</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0"/>
                </div>
              </Link>
              <Link href={`/scam-check?product=${encodeURIComponent(product)}&city=${encodeURIComponent(bestCity?.city||"")}`}>
                <div className="bg-white rounded-2xl border border-zinc-100 p-4 flex items-center gap-3 card-hover cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-500"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-zinc-900">Check if a price is a scam</p>
                    <p className="text-[11px] text-zinc-400">Someone quoted you? Check instantly</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0"/>
                </div>
              </Link>
            </div>

            <button onClick={()=>{setResults(null);setProduct("");}}
              className="flex items-center gap-2 text-[13px] font-medium text-zinc-400 hover:text-zinc-700 transition-colors">
              <RefreshCw className="w-3.5 h-3.5"/> Compare another product
            </button>
          </div>
        )}

        {!results&&!loading&&!error&&(
          <div className="bg-white rounded-2xl border border-zinc-100 p-10 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background:"#f0fdf4" }}>
              <BarChart2 className="w-8 h-8 text-green-400"/>
            </div>
            <p className="text-[15px] font-semibold text-zinc-700 mb-2">Select cities and enter a product</p>
            <p className="text-[13px] text-zinc-400 max-w-sm mx-auto">
              We compare city-specific AI-estimated fair prices and show you where to get the best deal.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}