"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bot, AlertTriangle, Globe2, Map,
  Camera, MessageSquare, Trophy, Bell, BarChart2,
} from "lucide-react";

const FEATURES = [
  {
    icon: Bot,
    title: "AI Fair Price Engine",
    desc: "Real-time price estimation using community data and local market intelligence. Know the fair price before you even walk into a shop.",
    color: "#16a34a", bg: "#f0fdf4",
    href: "/check-price",
    cta: "Check a price",
    wide: true,
  },
  {
    icon: AlertTriangle,
    title: "Scam Detector",
    desc: "Enter the offered price. Instant scam probability score and a negotiation script in your language.",
    color: "#ef4444", bg: "#fef2f2",
    href: "/scam-check",
    cta: "Detect scams",
  },
  {
    icon: BarChart2,
    title: "City Price Comparison",
    desc: "Compare the same product across multiple Indian cities to find where it's cheapest before you travel.",
    color: "#8b5cf6", bg: "#faf5ff",
    href: "/compare",
    cta: "Compare cities",
  },
  {
    icon: Globe2,
    title: "Language Translator",
    desc: "Translate bargaining phrases into 11 Indian languages with pronunciation and cultural tips.",
    color: "#0ea5e9", bg: "#f0f9ff",
    href: "/translate",
    cta: "Translate now",
  },
  {
    icon: Map,
    title: "Market Explorer",
    desc: "Trusted shops scored for fair pricing, tourist friendliness, and negotiation success rate.",
    color: "#f97316", bg: "#fff7ed",
    href: "/markets",
    cta: "Find markets",
  },
  {
    icon: Camera,
    title: "Product Recognition",
    desc: "Snap a photo — AI identifies the product, estimates its price, and warns about common fakes.",
    color: "#f59e0b", bg: "#fffbeb",
    href: "/check-price",
    cta: "Try it",
  },
  {
    icon: Trophy,
    title: "Community Rewards",
    desc: "Earn XP and badges by contributing verified prices. Help future travelers, level up your account.",
    color: "#14b8a6", bg: "#f0fdfa",
    href: "/contribute",
    cta: "Contribute",
  },
  {
    icon: MessageSquare,
    title: "AI Shopping Assistant",
    desc: "Floating chat available on every page. Ask about prices, authenticity, or how to bargain.",
    color: "#ec4899", bg: "#fdf2f8",
    href: "/",
    cta: "Ask Verifee AI",
  },
];

function FeatureCard({ feat, visible, delay }) {
  const Icon = feat.icon;
  return (
    <div
      className={`bg-white rounded-2xl border border-zinc-100 p-5 flex flex-col card-hover ${feat.wide ? "sm:col-span-2 lg:col-span-2" : ""}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `all 0.5s ease ${delay}s`,
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 shrink-0"
        style={{ background: feat.bg }}
      >
        <Icon className="w-5 h-5" style={{ color: feat.color }} strokeWidth={2} />
      </div>
      <h3 className="text-[15px] font-bold text-zinc-900 mb-2">{feat.title}</h3>
      <p className="text-[13px] text-zinc-500 leading-relaxed flex-1">{feat.desc}</p>
      <Link href={feat.href}>
        <button
          className="mt-4 text-[12px] font-semibold px-3.5 py-1.5 rounded-xl transition-all self-start"
          style={{ background: feat.bg, color: feat.color }}
        >
          {feat.cta} →
        </button>
      </Link>
    </div>
  );
}

export default function Features() {
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
    <section ref={ref} className="py-20 md:py-28" style={{ background: "#fafafa" }}>
      <div className="container">
        <div className="text-center mb-14">
          <p className="section-label mb-3">Features</p>
          <h2 className="text-[28px] md:text-[42px] font-black text-zinc-950 leading-tight mb-4">
            Everything you need to<br className="hidden sm:block" /> shop without fear.
          </h2>
          <p className="text-[15px] text-zinc-500 max-w-md mx-auto leading-relaxed">
            Built for travelers, tourists, and anyone shopping in an unfamiliar market.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feat={f} visible={vis} delay={i * 0.06} />
          ))}
        </div>
      </div>
    </section>
  );
}