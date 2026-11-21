"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, MapPin, Star, Shield, CheckCircle,
  TrendingDown, Loader2, Navigation, RefreshCw,
  X, ChevronRight, AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useLocation } from "@/hooks/useLocation";

import { API_BASE as API } from "@/lib/api";

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

function MarketCard({ market, onClick }) {
  return (
    <article onClick={() => onClick(market)} className="cursor-pointer rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-sm font-bold text-green-800">{market.name.slice(0, 2)}</div>
          <div><h3 className="font-bold text-zinc-900">{market.name}</h3><p className="mt-1 flex items-center gap-1 text-xs text-zinc-500"><MapPin className="h-3 w-3"/>{[market.city, market.state].filter(Boolean).join(", ") || "Location listed on map"}</p></div>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-semibold text-zinc-600">{market.category || "Mapped place"}</span>
      </div>
      <p className="mt-4 min-h-10 text-sm leading-5 text-zinc-600">{market.description || "Listed in OpenStreetMap. Check current details with the venue before visiting."}</p>
      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500"><span>{market.source || "OpenStreetMap"} · not independently verified</span><span className="font-semibold text-green-700">View details →</span></div>
    </article>
  );
}

function MarketDetail({ market, onClose }) {
  if (!market) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm md:items-center" onClick={onClose}>
      <section className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-green-700">{market.category || "Mapped place"}</p><h2 className="mt-1 text-2xl font-black text-zinc-950">{market.name}</h2><p className="mt-2 flex items-center gap-1 text-sm text-zinc-500"><MapPin className="h-4 w-4"/>{[market.city, market.state, market.description].filter(Boolean).join(" · ")}</p></div><button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"><X className="h-5 w-5"/></button></div>
        <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900">This place listing comes from {market.source || "OpenStreetMap"}. Verifee has not independently checked its opening hours, safety, prices, or merchant identity.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3"><a href={market.mapsUrl || ("https://www.openstreetmap.org/?mlat=" + market.lat + "&mlon=" + market.lng + "#map=16/" + market.lat + "/" + market.lng)} target="_blank" rel="noreferrer" className="rounded-xl border border-zinc-200 px-3 py-3 text-center text-sm font-semibold text-zinc-700">Open map ↗</a><Link href={"/check-price?city=" + encodeURIComponent(market.city || "") + "&place=" + encodeURIComponent(market.name)} onClick={onClose} className="rounded-xl bg-green-600 px-3 py-3 text-center text-sm font-bold text-white">Check prices</Link><Link href={"/scam-check?city=" + encodeURIComponent(market.city || "") + "&place=" + encodeURIComponent(market.name)} onClick={onClose} className="rounded-xl border border-zinc-200 px-3 py-3 text-center text-sm font-semibold text-zinc-700">Check a quote</Link></div>
      </section>
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
        credentials: "include",
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
    if (!trimmedQ && !targetCity) {
      setMarkets([]);
      setLoading(false);
      setError("Choose a city or enter a market name to search mapped listings.");
      return;
    }
    fetchMarkets(trimmedQ, targetCity);
  }, [search, cityFilter, fetchMarkets]);

  // FIX: exactly one automatic fetch, guarded so it can only ever run once —
  // this replaces the two separate effects that both fired on mount before.
  useEffect(() => {
    if (initialFetchRef.current) return;
    initialFetchRef.current = true;
    if (cityFilter) runSearch("", cityFilter);
    else setLoading(false);
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
              Map-based market discovery
            </span>
          </div>
          <h1 className="text-[28px] md:text-[38px] font-black text-zinc-950 mb-3 leading-tight">
            Find markets and shopping areas.
          </h1>
          <p className="text-[15px] text-zinc-500 max-w-xl leading-relaxed mb-6">
            Search real market and shopping-area listings from OpenStreetMap. The map data is not independently verified, and Verifee does not invent ratings or opening status.
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
          <span className="ml-auto text-[12px] text-zinc-400">
            {loading ? "Loading..." : `Showing ${markets.length} mapped places`}
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
            <p className="text-[16px] font-bold text-zinc-700 mb-2">No mapped places found</p>
            <p className="text-[14px] text-zinc-400 mb-5">
              {submittedSearch
                ? `No mapped results for "${submittedSearch}". Try a broader market name or choose its city.`
                : "Try selecting a city or searching for a market."}
            </p>
            <button
              onClick={() => { setSearch(""); setCityFilter("Jaipur"); runSearch("", "Jaipur"); }}
              className="btn-green text-[13px] px-5 py-2.5 rounded-xl"
            >
              Browse Jaipur map listings
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
            <h3 className="text-[15px] font-bold text-zinc-700 mb-2">Can’t find the place on the map?</h3>
            <p className="text-[13px] text-zinc-500 mb-4">
              You can still check a price by entering the city and market name yourself.
            </p>
            <Link href="/check-price">
              <button className="btn-green text-[13px] px-5 py-2.5 rounded-xl">
                Check a price manually
              </button>
            </Link>
          </div>
        )}
      </div>

      {selected && <MarketDetail market={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
