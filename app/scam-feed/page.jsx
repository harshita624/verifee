"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle, MapPin, Clock, Filter,
  TrendingUp, Shield, Plus, Loader2,
} from "lucide-react";
import Link from "next/link";
import { useLocation } from "@/hooks/useLocation";
import { CATEGORIES } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const SEVERITY = {
  high:   { label: "High risk",   color: "#dc2626", bg: "#fef2f2" },
  medium: { label: "Medium risk", color: "#f59e0b", bg: "#fffbeb" },
  low:    { label: "Low risk",    color: "#16a34a", bg: "#f0fdf4" },
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ReportCard({ report }) {
  const sev = SEVERITY[report.severity] || SEVERITY.medium;
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-4 card-hover">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-zinc-900 leading-snug mb-1">
            {report.product}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-zinc-400">
              <MapPin className="w-3 h-3" />
              {report.city}{report.marketName ? ` · ${report.marketName}` : ""}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-zinc-400">
              <Clock className="w-3 h-3" />
              {timeAgo(report.reportedAt)}
            </span>
          </div>
        </div>
        <span
          className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0"
          style={{ background: sev.bg, color: sev.color }}
        >
          {sev.label}
        </span>
      </div>

      {/* Price comparison */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div
          className="rounded-xl p-2.5 text-center"
          style={{ background: "#fef2f2" }}
        >
          <p className="text-[9px] text-red-400 font-semibold uppercase mb-0.5">Charged</p>
          <p className="text-[15px] font-black text-red-600">
            ₹{report.chargedPrice?.toLocaleString()}
          </p>
        </div>
        <div
          className="rounded-xl p-2.5 text-center"
          style={{ background: "#f0fdf4" }}
        >
          <p className="text-[9px] text-green-500 font-semibold uppercase mb-0.5">Fair price</p>
          <p className="text-[15px] font-black text-green-700">
            ₹{report.fairPrice?.toLocaleString()}
          </p>
        </div>
      </div>

      {report.description && (
        <p className="text-[12px] text-zinc-500 leading-relaxed mb-2">
          {report.description}
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-zinc-50">
        <span className="text-[11px] text-zinc-400">
          Reported by {report.reportedBy || "Anonymous"}
          {report.verified && (
            <span className="ml-2 text-green-600 font-semibold">· Verified</span>
          )}
        </span>
        <Link href={`/scam-check?product=${encodeURIComponent(report.product)}&city=${encodeURIComponent(report.city)}`}>
          <button className="text-[11px] font-semibold text-green-600 hover:underline">
            Check this product →
          </button>
        </Link>
      </div>
    </div>
  );
}

export default function ScamFeedPage() {
  const { city }         = useLocation();
  const [cityFilter,     setCityFilter]    = useState("");
  const [categoryFilter, setCategoryFilter]= useState("");
  const [reports,        setReports]       = useState([]);
  const [loading,        setLoading]       = useState(true);
  const [error,          setError]         = useState("");
  const [showReport,     setShowReport]    = useState(false);
  const [form,           setForm]          = useState({
    product:"",city:"",marketName:"",chargedPrice:"",fairPrice:"",description:"",
  });
  const [submitting,     setSubmitting]    = useState(false);
  const [submitted,      setSubmitted]     = useState(false);

  useEffect(() => {
    if (city) setCityFilter(city);
  }, [city]);

  useEffect(() => {
    fetchReports();
  }, [cityFilter, categoryFilter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 30 });
      if (cityFilter)     params.set("city",     cityFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      const res  = await fetch(`${API}/api/v1/scam-reports?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setReports(data.data || []);
    } catch (e) {
      setError(e.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const submitReport = async () => {
    if (!form.product || !form.city || !form.chargedPrice) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("vf_token");
      const res   = await fetch(`${API}/api/v1/scam-reports`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ ...form, chargedPrice: Number(form.chargedPrice), fairPrice: Number(form.fairPrice) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSubmitted(true);
      setTimeout(() => { setShowReport(false); setSubmitted(false); fetchReports(); }, 2000);
    } catch (e) {
      setError(e.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const hotspots = reports.reduce((acc, r) => {
    acc[r.city] = (acc[r.city] || 0) + 1;
    return acc;
  }, {});
  const topCities = Object.entries(hotspots).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="vf-page">
      <div className="bg-white border-b border-zinc-100 py-8">
        <div className="container">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-4"
                style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
              >
                <span className="live-dot shrink-0" style={{ background: "#ef4444" }} />
                <span className="text-[12px] font-semibold text-red-700">Live scam reports</span>
              </div>
              <h1 className="text-[28px] md:text-[36px] font-black text-zinc-950 mb-3 leading-tight">
                Scam Feed
              </h1>
              <p className="text-[15px] text-zinc-500 max-w-xl leading-relaxed">
                Real overcharging incidents reported by travelers in the last 7 days.
                Know the danger spots before you arrive.
              </p>
            </div>
            <button
              onClick={() => setShowReport(true)}
              className="flex items-center gap-2 btn-green text-[13px] px-4 py-2.5 rounded-xl shrink-0"
            >
              <Plus className="w-4 h-4" /> Report a scam
            </button>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid md:grid-cols-[1fr_280px] gap-6">
          {/* Main feed */}
          <div>
            {/* Filters */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-3 py-2">
                <Filter className="w-3.5 h-3.5 text-zinc-400" />
                <input
                  value={cityFilter}
                  onChange={e => setCityFilter(e.target.value)}
                  placeholder="Filter by city"
                  className="text-[13px] text-zinc-700 placeholder:text-zinc-400 bg-transparent w-32"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="text-[13px] text-zinc-700 bg-white border border-zinc-200 rounded-xl px-3 py-2"
              >
                <option value="">All categories</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              {(cityFilter || categoryFilter) && (
                <button
                  onClick={() => { setCityFilter(""); setCategoryFilter(""); }}
                  className="text-[12px] text-zinc-500 hover:text-zinc-800 underline"
                >
                  Clear filters
                </button>
              )}
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="shimmer h-40 rounded-2xl" />)}
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
                <p className="text-[13px] text-red-600">{error}</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-100 p-10 text-center">
                <Shield className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
                <p className="text-[15px] font-bold text-zinc-700 mb-2">
                  No scam reports yet
                </p>
                <p className="text-[13px] text-zinc-400 mb-4">
                  {cityFilter ? `No reports for ${cityFilter} yet.` : "Be the first to report an overcharging incident."}
                </p>
                <button
                  onClick={() => setShowReport(true)}
                  className="btn-green text-[13px] px-5 py-2.5 rounded-xl"
                >
                  Report one now
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((r, i) => <ReportCard key={r._id || i} report={r} />)}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {topCities.length > 0 && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-red-500" />
                  <h3 className="text-[13px] font-bold text-zinc-900">Scam hotspots</h3>
                </div>
                <div className="space-y-2">
                  {topCities.map(([c, count], i) => (
                    <div key={c} className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-zinc-400 w-4">{i+1}</span>
                      <button
                        onClick={() => setCityFilter(c)}
                        className="flex-1 text-left text-[13px] font-medium text-zinc-700 hover:text-green-600 transition-colors"
                      >
                        {c}
                      </button>
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "#fef2f2", color: "#dc2626" }}
                      >
                        {count} reports
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              className="rounded-2xl p-5"
              style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "1px solid #bbf7d0" }}
            >
              <h3 className="text-[13px] font-bold text-green-900 mb-2">
                Protect others
              </h3>
              <p className="text-[12px] text-green-700 leading-relaxed mb-3">
                Were you overcharged? Report it. Future travelers will be warned
                before they walk into the same trap.
              </p>
              <button
                onClick={() => setShowReport(true)}
                className="w-full btn-green text-[13px] py-2.5 rounded-xl"
              >
                Report a scam
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report modal */}
      {showReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowReport(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 animate-fade-up"
            style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.15)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] font-bold text-zinc-900">Report overcharging</h3>
              <button onClick={() => setShowReport(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100">
                <AlertTriangle className="w-4 h-4 text-zinc-500" />
              </button>
            </div>

            {submitted ? (
              <div className="text-center py-6">
                <Shield className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-[15px] font-bold text-zinc-900">Report submitted</p>
                <p className="text-[13px] text-zinc-400 mt-1">
                  Thanks for protecting other travelers.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { k:"product",     l:"Product / service",  p:"e.g. Auto ride, Silk saree" },
                  { k:"city",        l:"City",               p:"e.g. Agra"                  },
                  { k:"marketName",  l:"Shop / market name", p:"e.g. Meena Bazaar (optional)"},
                ].map(({ k, l, p }) => (
                  <div key={k}>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                      {l}
                    </label>
                    <input value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })}
                      placeholder={p}
                      className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 bg-white" />
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                      They charged (₹)
                    </label>
                    <input type="number" value={form.chargedPrice}
                      onChange={e => setForm({ ...form, chargedPrice: e.target.value })}
                      placeholder="e.g. 3500"
                      className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-700 bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                      Fair price (₹)
                    </label>
                    <input type="number" value={form.fairPrice}
                      onChange={e => setForm({ ...form, fairPrice: e.target.value })}
                      placeholder="e.g. 800"
                      className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-700 bg-white" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                    What happened?
                  </label>
                  <textarea value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe the scam briefly..."
                    rows={3}
                    className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 bg-white resize-none" />
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={submitReport}
                    disabled={submitting || !form.product || !form.city || !form.chargedPrice}
                    className="flex-1 flex items-center justify-center gap-2 btn-green text-[13px] py-2.5 rounded-xl disabled:opacity-50">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit report
                  </button>
                  <button onClick={() => setShowReport(false)}
                    className="text-[13px] font-medium text-zinc-500 border border-zinc-200 px-4 py-2.5 rounded-xl hover:bg-zinc-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}