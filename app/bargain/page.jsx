"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageSquare, Loader2, MapPin, Send,
  ChevronRight, Volume2, Copy, Check,
} from "lucide-react";
import { useLocation } from "@/hooks/useLocation";
import { LANGUAGES } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const STAGES = [
  { id: "enter",    label: "Enter shop"       },
  { id: "opener",   label: "Open negotiation" },
  { id: "counter",  label: "They counter"     },
  { id: "resist",   label: "They resist"      },
  { id: "close",    label: "Close the deal"   },
  { id: "walkaway", label: "Walk away"        },
];

function ScriptLine({ line, lang }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(line.say || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const speak = () => {
    if (!("speechSynthesis" in window)) return;
    const utt = new SpeechSynthesisUtterance(line.say || line.romanized || "");
    utt.lang = lang || "hi-IN";
    window.speechSynthesis.speak(utt);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid #e4e4e7", marginBottom: 12 }}
    >
      {/* Stage label */}
      <div
        className="px-4 py-2 flex items-center justify-between"
        style={{ background: "#fafafa", borderBottom: "1px solid #f4f4f5" }}
      >
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
          {line.stage}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={speak}
            className="p-1.5 rounded-lg hover:bg-zinc-200 transition-colors" title="Listen">
            <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
          </button>
          <button onClick={copy}
            className="p-1.5 rounded-lg hover:bg-zinc-200 transition-colors" title="Copy">
            {copied
              ? <Check className="w-3.5 h-3.5 text-green-500" />
              : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {/* What to say */}
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: "#f0fdf4", border: "1px solid #dcfce7" }}
        >
          <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-1">
            You say
          </p>
          <p className="text-[15px] font-bold text-zinc-900">{line.say}</p>
          {line.romanized && (
            <p className="text-[12px] text-zinc-500 mt-1 italic">{line.romanized}</p>
          )}
        </div>

        {/* Why */}
        {line.why && (
          <p className="text-[12px] text-zinc-500 leading-relaxed px-1">
            {line.why}
          </p>
        )}

        {/* What they might say back */}
        {line.theyMightSay && (
          <div
            className="rounded-xl px-4 py-2.5"
            style={{ background: "#fafafa", border: "1px solid #f4f4f5" }}
          >
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">
              They might say
            </p>
            <p className="text-[13px] text-zinc-600">{line.theyMightSay}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BargainCoachPage() {
  const { city } = useLocation();
  const [product,    setProduct]    = useState("");
  const [targetCity, setTargetCity] = useState(city || "");
  const [budget,     setBudget]     = useState("");
  const [lang,       setLang]       = useState("hi");
  const [loading,    setLoading]    = useState(false);
  const [script,     setScript]     = useState(null);
  const [error,      setError]      = useState("");
  const [activeStage,setActiveStage]= useState(0);
  const [liveMode,   setLiveMode]   = useState(false);
  const [sellerSaid, setSellerSaid] = useState("");
  const [liveLoading,setLiveLoading]= useState(false);
  const [liveReply,  setLiveReply]  = useState(null);

  useEffect(() => { if (city) setTargetCity(city); }, [city]);

  const generate = async () => {
    if (!product.trim()) return;
    setLoading(true); setError(""); setScript(null);
    try {
      const res = await fetch(`${API}/api/v1/ai/bargain-script`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          product: product.trim(),
          city:    targetCity,
          budget:  budget ? Number(budget) : null,
          lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setScript(data.data);
      setActiveStage(0);
    } catch (e) {
      setError(e.message || "Failed to generate script");
    } finally {
      setLoading(false);
    }
  };

  const getLiveResponse = async () => {
    if (!sellerSaid.trim()) return;
    setLiveLoading(true); setLiveReply(null);
    try {
      const res = await fetch(`${API}/api/v1/ai/bargain-reply`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          product,
          city:      targetCity,
          sellerSaid: sellerSaid.trim(),
          lang,
          context:   script,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setLiveReply(data.data);
    } catch (e) {
      setError(e.message || "Failed");
    } finally {
      setLiveLoading(false);
    }
  };

  return (
    <div className="vf-page">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 py-8">
        <div className="container">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-4"
            style={{ background: "#f0fdf4", border: "1px solid #dcfce7" }}
          >
            <MessageSquare className="w-3.5 h-3.5 text-green-600" />
            <span className="text-[12px] font-semibold text-green-700">
              Only on Verifee
            </span>
          </div>
          <h1 className="text-[28px] md:text-[36px] font-black text-zinc-950 mb-3 leading-tight">
            Bargain Coach
          </h1>
          <p className="text-[15px] text-zinc-500 max-w-xl leading-relaxed">
            Get a step-by-step negotiation script in the local language — exactly
            what to say at each stage of bargaining. Then switch to Live Mode
            to get instant comebacks based on what the seller actually says.
          </p>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid md:grid-cols-[380px_1fr] gap-6">
          {/* Config panel */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-zinc-100 p-5">
              <h3 className="text-[14px] font-bold text-zinc-900 mb-4">Setup</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                    What are you buying?
                  </label>
                  <input
                    value={product}
                    onChange={e => setProduct(e.target.value)}
                    placeholder="e.g. Kashmiri Carpet, Silk Saree, Brass statue"
                    className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                    City / market
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                    <input
                      value={targetCity}
                      onChange={e => setTargetCity(e.target.value)}
                      placeholder="e.g. Jaipur"
                      className="w-full rounded-xl border border-zinc-200 pl-9 pr-3.5 py-2.5 text-[14px] text-zinc-700 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                    Your max budget (₹)
                  </label>
                  <input
                    type="number"
                    value={budget}
                    onChange={e => setBudget(e.target.value)}
                    placeholder="e.g. 2500 (optional)"
                    className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-700 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                    Language to bargain in
                  </label>
                  <select
                    value={lang}
                    onChange={e => setLang(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-700 bg-white"
                  >
                    {LANGUAGES.filter(l => l.code !== "en").map(l => (
                      <option key={l.code} value={l.code}>
                        {l.name} — {l.native}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={generate}
                  disabled={loading || !product.trim()}
                  className="w-full flex items-center justify-center gap-2 btn-green text-[14px] py-3 rounded-xl disabled:opacity-50"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Generating script...</>
                    : "Generate bargain script"}
                </button>
              </div>
            </div>

            {/* Live mode */}
            {script && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[14px] font-bold text-zinc-900">Live mode</h3>
                  <button
                    onClick={() => setLiveMode(!liveMode)}
                    className="w-11 h-6 rounded-full transition-all relative"
                    style={{ background: liveMode ? "#16a34a" : "#e4e4e7" }}
                  >
                    <div
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                      style={{ left: liveMode ? "calc(100% - 22px)" : "2px" }}
                    />
                  </button>
                </div>
                <p className="text-[12px] text-zinc-400 leading-relaxed mb-3">
                  Type exactly what the seller just said. Get an instant comeback.
                </p>

                {liveMode && (
                  <div className="space-y-2">
                    <textarea
                      value={sellerSaid}
                      onChange={e => setSellerSaid(e.target.value)}
                      placeholder='"This is best quality, minimum ₹4,000..."'
                      rows={3}
                      className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[13px] text-zinc-800 placeholder:text-zinc-400 bg-white resize-none"
                    />
                    <button
                      onClick={getLiveResponse}
                      disabled={liveLoading || !sellerSaid.trim()}
                      className="w-full flex items-center justify-center gap-2 btn-green text-[13px] py-2.5 rounded-xl disabled:opacity-50"
                    >
                      {liveLoading
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <><Send className="w-3.5 h-3.5" />Get comeback</>}
                    </button>

                    {liveReply && (
                      <div
                        className="rounded-xl p-4 mt-2"
                        style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}
                      >
                        <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-2">
                          Say this now
                        </p>
                        <p className="text-[15px] font-bold text-zinc-900 mb-1">
                          {liveReply.say}
                        </p>
                        {liveReply.romanized && (
                          <p className="text-[12px] text-zinc-400 italic mb-2">
                            {liveReply.romanized}
                          </p>
                        )}
                        {liveReply.strategy && (
                          <p className="text-[11px] text-zinc-500">{liveReply.strategy}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Script panel */}
          <div>
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4">
                <p className="text-[13px] text-red-600">{error}</p>
              </div>
            )}

            {loading && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center">
                <Loader2 className="w-10 h-10 text-green-600 animate-spin mx-auto mb-4" />
                <p className="text-[15px] font-semibold text-zinc-700 mb-1">
                  Writing your bargain script...
                </p>
                <p className="text-[13px] text-zinc-400">
                  Tailored for {product} in {targetCity || "India"}
                </p>
              </div>
            )}

            {!script && !loading && !error && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-10 text-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "#f0fdf4" }}
                >
                  <MessageSquare className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-[15px] font-semibold text-zinc-700 mb-2">
                  Your bargain script will appear here
                </p>
                <p className="text-[13px] text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  Fill in the product, city, and language. You'll get a
                  complete step-by-step script in the local language — from
                  entering the shop to closing the deal.
                </p>
              </div>
            )}

            {script && !loading && (
              <div className="animate-fade-up">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: "Target price", value: `₹${script.targetPrice?.toLocaleString() || "—"}`, color: "#16a34a" },
                    { label: "Opening offer", value: `₹${script.openingOffer?.toLocaleString() || "—"}`, color: "#ef4444" },
                    { label: "Walk away at", value: `₹${script.walkAwayPrice?.toLocaleString() || "—"}`, color: "#f59e0b" },
                  ].map(s => (
                    <div key={s.label}
                      className="bg-white rounded-2xl border border-zinc-100 p-3 text-center">
                      <p className="text-[10px] text-zinc-400 mb-1">{s.label}</p>
                      <p className="text-[18px] font-black" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Stage tabs */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mb-5 pb-1">
                  {(script.steps || []).map((step, i) => (
                    <button key={i}
                      onClick={() => setActiveStage(i)}
                      className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-xl whitespace-nowrap transition-all shrink-0"
                      style={{
                        background: activeStage === i ? "#f0fdf4" : "#fff",
                        color:      activeStage === i ? "#16a34a" : "#71717a",
                        border:     activeStage === i ? "1px solid #bbf7d0" : "1px solid #e4e4e7",
                        fontWeight: activeStage === i ? 600 : 500,
                      }}
                    >
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black"
                        style={{
                          background: activeStage === i ? "#16a34a" : "#f4f4f5",
                          color:      activeStage === i ? "#fff" : "#a1a1aa",
                        }}
                      >
                        {i + 1}
                      </span>
                      {step.stage}
                    </button>
                  ))}
                </div>

                {/* Active step */}
                {script.steps?.[activeStage] && (
                  <ScriptLine line={script.steps[activeStage]} lang={lang} />
                )}

                {/* Nav */}
                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => setActiveStage(Math.max(0, activeStage - 1))}
                    disabled={activeStage === 0}
                    className="text-[13px] font-medium text-zinc-500 border border-zinc-200 px-4 py-2 rounded-xl hover:bg-zinc-50 transition-colors disabled:opacity-30"
                  >
                    Previous
                  </button>

                  {activeStage < (script.steps?.length || 0) - 1 ? (
                    <button
                      onClick={() => setActiveStage(activeStage + 1)}
                      className="flex items-center gap-2 btn-green text-[13px] px-4 py-2 rounded-xl"
                    >
                      Next stage <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <span
                      className="text-[13px] font-semibold px-4 py-2 rounded-xl"
                      style={{ background: "#f0fdf4", color: "#16a34a" }}
                    >
                      Script complete
                    </span>
                  )}
                </div>

                {/* Tips */}
                {script.generalTips?.length > 0 && (
                  <div className="mt-5 bg-white rounded-2xl border border-zinc-100 p-5">
                    <h3 className="text-[13px] font-bold text-zinc-900 mb-3">
                      Tips for {targetCity || "this market"}
                    </h3>
                    <ul className="space-y-2">
                      {script.generalTips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-[13px] text-zinc-600">
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                            style={{ background: "#f0fdf4", color: "#16a34a" }}
                          >
                            {i + 1}
                          </span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}