"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, MapPin, Star, Shield, CheckCircle,
  TrendingDown, Loader2, Navigation, RefreshCw,
  X, ChevronRight, AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useLocation } from "@/hooks/useLocation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const CITIES = [
  "Delhi","Mumbai","Jaipur","Agra","Varanasi","Srinagar","Goa",
  "Bangalore","Hyderabad","Chennai","Kolkata","Kochi","Udaipur",
  "Amritsar","Mysore","Pune","Ahmedabad","Chandigarh","Lucknow",
];

const POPULAR_SEARCHES = [
  { label: "Sarojini Nagar, Delhi",      q: "sarojini nagar", city: "Delhi"    },
  { label: "Johari Bazaar, Jaipur",      q: "johari bazaar",  city: "Jaipur"   },
  { label: "Crawford Market, Mumbai",    q: "crawford market",city: "Mumbai"   },
  { label: "Chandni Chowk, Delhi",       q: "chandni chowk",  city: "Delhi"    },
  { label: "Lal Chowk, Srinagar",        q: "lal chowk",      city: "Srinagar" },
  { label: "Colaba Causeway, Mumbai",    q: "colaba causeway",city: "Mumbai"   },
];

function ScoreBar({ value, color = "#16a34a" }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width:`${value}%`, background: color }} />
      </div>
      <span className="text-[11px] font-bold text-zinc-600 w-6 text-right">{value}</span>
    </div>
  );
}

function MarketCard({ market, onClick }) {
  const riskColor =
    market.touristFriendlyScore >= 80 ? "#16a34a"
    : market.touristFriendlyScore >= 60 ? "#f59e0b"
    : "#dc2626";

  return (
    <div
      onClick={() => onClick(market)}
      className="bg-white rounded-2xl border border-zinc-100 p-5 cursor-pointer card-hover"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[13px] font-bold shrink-0"
            style={{ background: market.color || "#16a34a" }}
          >
            {market.name.slice(0,2)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-[15px] font-bold text-zinc-900">{market.name}</h3>
              {market.isVerified && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
            </div>
            <p className="text-[12px] text-zinc-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />{market.city}, {market.state}
            </p>
          </div>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{
            background: market.openNow ? "#f0fdf4" : "#fef2f2",
            color:      market.openNow ? "#16a34a" : "#dc2626",
          }}
        >
          {market.openNow ? "Open" : "Closed"}
        </span>
      </div>

      <p className="text-[12px] text-zinc-500 leading-relaxed mb-3 line-clamp-2">
        {market.description}
      </p>

      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-400 w-20 shrink-0">Trust</span>
          <ScoreBar value={market.trustScore} color="#16a34a" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-400 w-20 shrink-0">Fair price</span>
          <ScoreBar value={market.fairPriceScore} color="#0ea5e9" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-400 w-20 shrink-0">Tourist OK</span>
          <ScoreBar value={market.touristFriendlyScore} color={riskColor} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-zinc-50">
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="text-[12px] font-semibold text-zinc-700">{market.avgRating}</span>
          <span className="text-[10px] text-zinc-400">({market.totalReviews?.toLocaleString()})</span>
        </div>
        <span className="text-[11px] text-zinc-500">
          <TrendingDown className="w-3.5 h-3.5 text-green-500 inline mr-1" />
          {market.negotiationSuccessRate}% bargain success
        </span>
      </div>
    </div>
  );
}

function MarketDetail({ market, onClose }) {
  if (!market) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-up"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-zinc-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-[15px] font-bold"
                style={{ background: market.color || "#16a34a" }}
              >
                {market.name.slice(0,2)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[20px] font-black text-zinc-950">{market.name}</h2>
                  {market.isVerified && <CheckCircle className="w-5 h-5 text-green-500" />}
                </div>
                <p className="text-[13px] text-zinc-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />{market.city}, {market.state}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-zinc-100 transition-colors"
            >
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-[14px] text-zinc-600 leading-relaxed">{market.description}</p>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Trust Score",   value: market.trustScore,          color: "#16a34a", bg: "#f0fdf4" },
              { label: "Fair Price",    value: market.fairPriceScore,       color: "#0ea5e9", bg: "#f0f9ff" },
              { label: "Tourist OK",    value: market.touristFriendlyScore, color: "#8b5cf6", bg: "#faf5ff" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-3.5 text-center" style={{ background: s.bg }}>
                <p className="text-[28px] font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[11px] font-medium" style={{ color: s.color }}>{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Opening hours", value: market.openingHours },
              { label: "Bargain success", value: `${market.negotiationSuccessRate}% of visitors` },
              { label: "Peak hours", value: market.peakHours?.join(", ") },
              { label: "Languages", value: market.languages?.slice(0,3).join(", ") },
            ].map(s => s.value && (
              <div key={s.label} className="rounded-xl bg-zinc-50 p-3">
                <p className="text-[10px] text-zinc-400 mb-1 uppercase tracking-wide">{s.label}</p>
                <p className="text-[13px] font-semibold text-zinc-800">{s.value}</p>
              </div>
            ))}
          </div>

          {market.popularProducts?.length > 0 && (
            <div>
              <p className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                Popular products
              </p>
              <div className="flex flex-wrap gap-1.5">
                {market.popularProducts.map(p => (
                  <Link
                    key={p}
                    href={`/check-price?q=${encodeURIComponent(p)}&city=${encodeURIComponent(market.city)}`}
                    onClick={onClose}
                    className="text-[12px] font-medium bg-zinc-100 hover:bg-green-50 hover:text-green-700 text-zinc-600 px-2.5 py-1 rounded-full transition-colors"
                  >
                    {p}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Link
              href={`/check-price?city=${encodeURIComponent(market.city)}&place=${encodeURIComponent(market.name)}`}
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 btn-green text-[13px] py-3 rounded-xl"
            >
              <Shield className="w-4 h-4" /> Check prices here
            </Link>
            <Link
              href={`/scam-check?city=${encodeURIComponent(market.city)}&place=${encodeURIComponent(market.name)}`}
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 text-[13px] font-semibold py-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors text-zinc-700"
            >
              <AlertTriangle className="w-4 h-4 text-red-500" /> Check scams here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketsPage() {
  const { city: detectedCity } = useLocation();
  const [search,          setSearch]          = useState("");
  const [cityFilter,      setCityFilter]      = useState("");
  // FIX: track what was actually last SUBMITTED to the API, separately from
  // the live input/dropdown values — this drives all "Showing X in Y" /
  // "no results for X" copy, so it stays accurate even while the user is
  // mid-typing or has changed the dropdown but not searched yet.
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [submittedCity,   setSubmittedCity]   = useState("");
  const [markets,         setMarkets]         = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState("");
  const [selected,        setSelected]        = useState(null);
  const cache          = useRef({});
  const abortRef       = useRef(null);
  const initialFetchRef = useRef(false);

  // FIX: silently adopt the detected city into the dropdown once it resolves —
  // this does NOT fetch anything on its own. Previously this same event
  // (cityFilter changing) directly triggered a full AI call with zero user
  // interaction, which is exactly the "search happens on its own" behavior
  // that also collided with the mount-time fetch below and caused the 429
  // cascade in your logs.
  useEffect(() => {
    if (detectedCity && !cityFilter) {
      setCityFilter(detectedCity);
    }
  }, [detectedCity]);

  const fetchMarkets = useCallback(async (q, city) => {
    const key = `${q}__${city}`;

    if (cache.current[key]) {
      setMarkets(cache.current[key]);
      setLoading(false);
      setError("");
      return;
    }

    // FIX: cancel any request still in flight before starting a new one,
    // instead of letting both race and potentially resolve out of order.
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/api/v1/ai/markets-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, city, limit: 9 }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      cache.current[key] = data.data;
      setMarkets(data.data);
    } catch (e) {
      if (e.name === "AbortError") return; // superseded by a newer search — not a real error
      setError(e.message || "Failed to load markets");
    } finally {
      // Only the most recent request is allowed to clear the loading state —
      // an aborted, stale request's `finally` must not stomp on a newer one.
      if (abortRef.current === controller) {
        setLoading(false);
        abortRef.current = null;
      }
    }
  }, []);

  // FIX: this is now the ONLY thing that can trigger a fetch — a click on
  // Search, an Enter keypress, or a "Try:" chip. Nothing fires automatically
  // from typing or from changing the city dropdown.
  const runSearch = useCallback((q, city) => {
    const trimmedQ = (q ?? search).trim();
    const targetCity = city ?? cityFilter;
    setSubmittedSearch(trimmedQ);
    setSubmittedCity(targetCity);
    fetchMarkets(trimmedQ, targetCity);
  }, [search, cityFilter, fetchMarkets]);

  // FIX: exactly one automatic fetch, guarded so it can only ever run once —
  // this replaces the two separate effects that both fired on mount before.
  useEffect(() => {
    if (initialFetchRef.current) return;
    initialFetchRef.current = true;
    runSearch("", cityFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePopularSearch = (item) => {
    setSearch(item.q);
    setCityFilter(item.city);
    runSearch(item.q, item.city);
  };

  // Lets the UI nudge the user to re-search when they've changed a filter
  // but haven't clicked Search yet, since changing filters no longer
  // auto-fetches.
  const filtersAreStale =
    !loading && (search.trim() !== submittedSearch || cityFilter !== submittedCity);

  return (
    <div className="vf-page">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 py-10">
        <div className="container">
          <div className="flex items-center gap-2 mb-3">
            <span className="live-dot" />
            <span className="text-[12px] font-semibold text-zinc-500 uppercase tracking-wide">
              AI-powered market directory
            </span>
          </div>
          <h1 className="text-[28px] md:text-[38px] font-black text-zinc-950 mb-3 leading-tight">
            Find trusted markets near you.
          </h1>
          <p className="text-[15px] text-zinc-500 max-w-xl leading-relaxed mb-6">
            Search any market, bazaar, or shopping area across India.
            Every result includes trust scores, fair price ratings, and
            bargaining success rates.
          </p>

          {/* Search row */}
          <div className="flex flex-col sm:flex-row gap-3 mb-2">
            <div
              className="flex items-center gap-2 flex-1 bg-white rounded-xl border border-zinc-200 px-4 py-3 focus-within:border-green-400 transition-colors"
            >
              <Search className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") runSearch(search, cityFilter); }}
                placeholder="Search any market, bazaar, or shopping area..."
                className="flex-1 text-[14px] text-zinc-800 placeholder:text-zinc-400 bg-transparent"
              />
              {search && (
                <button onClick={() => setSearch("")}>
                  <X className="w-4 h-4 text-zinc-400 hover:text-zinc-700" />
                </button>
              )}
            </div>

            <select
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              className="text-[13px] text-zinc-700 bg-white border border-zinc-200 rounded-xl px-4 py-3 md:w-48"
            >
              <option value="">All cities</option>
              {CITIES.map(c => <option key={c}>{c}</option>)}
            </select>

            <button
              onClick={() => runSearch(search, cityFilter)}
              disabled={loading}
              className="flex items-center gap-2 btn-green text-[13px] px-5 py-3 rounded-xl disabled:opacity-60 shrink-0"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <RefreshCw className="w-4 h-4" />}
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          {filtersAreStale && (
            <p className="text-[12px] text-amber-600 font-medium mb-4">
              Filters changed — click Search to update results.
            </p>
          )}

          {/* Popular searches */}
          <div className="flex items-center gap-2 flex-wrap mt-4">
            <span className="text-[12px] text-zinc-400 font-medium shrink-0">Try:</span>
            {POPULAR_SEARCHES.map(item => (
              <button
                key={item.label}
                onClick={() => handlePopularSearch(item)}
                className="text-[12px] font-medium text-zinc-600 border border-zinc-200 bg-white px-3 py-1.5 rounded-full hover:border-green-300 hover:text-green-700 transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white border-b border-zinc-100">
        <div className="container py-3 flex items-center gap-6 flex-wrap">
          {[
            { icon: Shield,      label: "Verified markets",  value: "1,200+", color: "#16a34a" },
            { icon: TrendingDown,label: "Community reports",  value: "2.4M+",  color: "#0ea5e9" },
            { icon: Star,        label: "Avg tourist savings",value: "40%",    color: "#8b5cf6" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className="w-4 h-4" style={{ color }} />
              <span className="text-[13px] font-bold text-zinc-900">{value}</span>
              <span className="text-[12px] text-zinc-400 hidden sm:block">{label}</span>
            </div>
          ))}
          <span className="ml-auto text-[12px] text-zinc-400">
            {loading ? "Loading..." : `Showing ${markets.length} markets`}
            {submittedCity && ` in ${submittedCity}`}
          </span>
        </div>
      </div>

      {/* Market grid */}
      <div className="container py-8">
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center mb-6">
            <p className="text-[14px] text-red-600 mb-2">{error}</p>
            <button
              onClick={() => runSearch(submittedSearch, submittedCity)}
              className="text-[13px] font-semibold text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-50"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({length:6}).map((_,i) => (
              <div key={i} className="shimmer h-52 rounded-2xl" />
            ))}
          </div>
        ) : markets.length === 0 ? (
          <div className="text-center py-20">
            <MapPin className="w-14 h-14 text-zinc-200 mx-auto mb-4" />
            <p className="text-[16px] font-bold text-zinc-700 mb-2">No markets found</p>
            <p className="text-[14px] text-zinc-400 mb-5">
              {submittedSearch
                ? `No results for "${submittedSearch}". Try a city name or different keyword.`
                : "Try selecting a city or searching for a market."}
            </p>
            <button
              onClick={() => { setSearch(""); setCityFilter(""); runSearch("", ""); }}
              className="btn-green text-[13px] px-5 py-2.5 rounded-xl"
            >
              Show all markets
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {markets.map((market, i) => (
              <MarketCard key={market.id||i} market={market} onClick={setSelected} />
            ))}
          </div>
        )}

        {/* Suggest CTA */}
        {!loading && (
          <div className="mt-10 rounded-2xl border-2 border-dashed border-zinc-200 p-8 text-center">
            <MapPin className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
            <h3 className="text-[15px] font-bold text-zinc-700 mb-2">Know a market not listed?</h3>
            <p className="text-[13px] text-zinc-500 mb-4">
              Suggest it and earn 30 XP when it gets verified.
            </p>
            <Link href="/contribute">
              <button className="btn-green text-[13px] px-5 py-2.5 rounded-xl">
                Suggest a market
              </button>
            </Link>
          </div>
        )}
      </div>

      {selected && <MarketDetail market={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}