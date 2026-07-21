"use client";

import { Search, Cpu, ShieldCheck } from "lucide-react";

const STEPS = [
  {
    icon: Search,
    step: "01",
    title: "Search anything",
    description:
      "Type any product, service, hotel, or experience. Tell us which city you're in. That's it.",
    example: '"Pashmina Shawl in Srinagar"',
    color: "#0ea5e9",
    bg: "#f0f9ff",
  },
  {
    icon: Cpu,
    step: "02",
    title: "AI checks real prices",
    description:
      "Our AI cross-references community-verified prices, historical data, and local market intelligence to find the true fair price.",
    example: 'Fair range: ₹2,400 – ₹3,200 · Confidence 92%',
    color: "#8b5cf6",
    bg: "#faf5ff",
  },
  {
    icon: ShieldCheck,
    step: "03",
    title: "Shop with confidence",
    description:
      "Know exactly what to pay, what to say to bargain, and which shops are verified trustworthy by locals.",
    example: '"Don\'t pay above ₹3,200. Start at ₹2,000."',
    color: "#16a34a",
    bg: "#f0fdf4",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-16">
          <p className="text-[13px] font-semibold text-green-600 uppercase tracking-widest mb-3">
            How it works
          </p>
          <h2 className="text-[36px] md:text-[48px] font-black text-zinc-950 leading-tight mb-4">
            Know the fair price in
            <br />
            under 10 seconds.
          </h2>
          <p className="text-[17px] text-zinc-500 max-w-xl mx-auto leading-relaxed">
            No signups needed to check prices. Just search, and our AI tells you
            exactly what you should pay.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.step}
                className="relative rounded-2xl p-6 border border-zinc-100 card-hover"
                style={{ background: "#ffffff" }}
              >
                {/* Step number */}
                <div className="flex items-start justify-between mb-5">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: step.bg }}
                  >
                    <Icon className="w-6 h-6" style={{ color: step.color }} />
                  </div>
                  <span
                    className="text-[40px] font-black leading-none"
                    style={{ color: "#f4f4f5" }}
                  >
                    {step.step}
                  </span>
                </div>

                <h3 className="text-[19px] font-bold text-zinc-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-[14px] text-zinc-500 leading-relaxed mb-4">
                  {step.description}
                </p>

                <div
                  className="rounded-xl px-3.5 py-2.5 text-[12px] font-mono font-medium"
                  style={{ background: step.bg, color: step.color }}
                >
                  {step.example}
                </div>

                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div
                    className="hidden md:block absolute top-1/3 -right-3 w-6 h-[1px]"
                    style={{ background: "#e4e4e7" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}