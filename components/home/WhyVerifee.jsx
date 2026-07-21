"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";

const VS_ITEMS = [
  {
    others: "Shows you prices from Amazon, Flipkart, Meesho",
    verifee: "Shows you what someone actually paid at Chandni Chowk yesterday",
    highlight: true,
  },
  {
    others: "Generic search results when you type 'Pashmina price'",
    verifee: "Scam probability score for the exact price you were just quoted",
    highlight: false,
  },
  {
    others: "Can't tell you the right Hindi phrase to say right now",
    verifee: "Gives you the exact words: 'यह बहुत महंगा है, ₹1500 में दीजिए'",
    highlight: true,
  },
  {
    others: "No idea which stall in Lajpat Nagar is a tourist trap",
    verifee: "Trust score for specific shops, rated by locals who live there",
    highlight: false,
  },
  {
    others: "Tells you what something costs online",
    verifee: "Tells you what locals pay at the physical market, right now",
    highlight: true,
  },
];

const UNIQUE_STATS = [
  { label: "Community price reports",   value: "2.4M+",  sub: "From real buyers with receipts"       },
  { label: "Not on any e-commerce site",value: "100%",   sub: "We only track physical market prices"  },
  { label: "Languages for bargaining",  value: "11",     sub: "With pronunciation guides"             },
  { label: "Cities with trusted shops", value: "180+",   sub: "Scored by locals, verified by AI"      },
];

export default function WhyVerifee() {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVis(true); },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="vf-section bg-white">
      <div className="container">
        {/* Header */}
        <div
          className="text-center mb-14"
          style={{
            opacity:   vis ? 1 : 0,
            transform: vis ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.5s ease",
          }}
        >
          <p className="section-label mb-3">Why Verifee</p>
          <h2 className="text-[28px] md:text-[44px] font-black text-zinc-950 leading-tight mb-4">
            Google can't tell you what
            <br className="hidden sm:block" />
            <span className="text-gradient"> a local pays.</span>
          </h2>
          <p className="text-[15px] text-zinc-500 max-w-lg mx-auto leading-relaxed">
            Every price on Google and Amazon is for online purchases.
            Verifee is built specifically for physical markets — the
            bazaars, stalls, and shops that tourists visit.
          </p>
        </div>

        {/* VS table */}
        <div
          className="rounded-2xl overflow-hidden border border-zinc-100 mb-14"
          style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}
        >
          {/* Table header */}
          <div className="grid grid-cols-2 bg-zinc-50 border-b border-zinc-100">
            <div className="px-5 py-4 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-zinc-200 flex items-center justify-center">
                <span className="text-[11px] font-black text-zinc-500">G</span>
              </div>
              <span className="text-[12px] font-bold text-zinc-500 uppercase tracking-wide">
                Google / ChatGPT / Shopping sites
              </span>
            </div>
            <div
              className="px-5 py-4 flex items-center gap-2"
              style={{ background: "#f0fdf4", borderLeft: "1px solid #dcfce7" }}
            >
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: "#16a34a" }}
              >
                <span className="text-[11px] font-black text-white">V</span>
              </div>
              <span className="text-[12px] font-bold text-green-700 uppercase tracking-wide">
                Verifee
              </span>
            </div>
          </div>

          {/* Rows */}
          {VS_ITEMS.map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-2 border-b border-zinc-50 last:border-0"
              style={{ background: item.highlight ? "#fafafa" : "#fff" }}
            >
              <div className="px-5 py-4 flex items-start gap-2.5">
                <span className="text-red-400 shrink-0 mt-0.5 text-[16px]">✕</span>
                <p className="text-[13px] text-zinc-500 leading-relaxed">{item.others}</p>
              </div>
              <div
                className="px-5 py-4 flex items-start gap-2.5"
                style={{ borderLeft: "1px solid #dcfce7", background: item.highlight ? "#f0fdf4" : "transparent" }}
              >
                <span className="text-green-500 shrink-0 mt-0.5 text-[16px]">✓</span>
                <p className="text-[13px] text-zinc-700 leading-relaxed font-medium">{item.verifee}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Unique stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {UNIQUE_STATS.map((s, i) => (
            <div
              key={s.label}
              className="text-center p-5 rounded-2xl border border-zinc-100 bg-white"
              style={{
                opacity:   vis ? 1 : 0,
                transform: vis ? "translateY(0)" : "translateY(20px)",
                transition: `all 0.5s ease ${i * 0.1}s`,
              }}
            >
              <p className="text-[32px] font-black text-zinc-950 mb-1">{s.value}</p>
              <p className="text-[12px] font-bold text-zinc-700 mb-0.5">{s.label}</p>
              <p className="text-[11px] text-zinc-400">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "1px solid #bbf7d0" }}
        >
          <h3 className="text-[22px] font-black text-green-900 mb-3">
            The only tool built for the tourist in front of a shopkeeper.
          </h3>
          <p className="text-[14px] text-green-700 mb-6 max-w-md mx-auto leading-relaxed">
            Not for online shopping. Not for price tracking. Specifically for the
            moment when someone says "₹5,000" and you have no idea if that's fair.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/check-price">
              <button className="btn-green text-[14px] px-6 py-3 rounded-xl">
                Check any price free
              </button>
            </Link>
            <Link href="/scam-check">
              <button
                className="text-[14px] font-semibold px-6 py-3 rounded-xl border transition-colors hover:bg-green-100"
                style={{ borderColor: "#86efac", color: "#16a34a", background: "rgba(22,163,74,0.06)" }}
              >
                Check if you're being scammed
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}