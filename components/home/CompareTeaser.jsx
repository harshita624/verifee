"use client";

import Link from "next/link";
import { BarChart2, ArrowRight, MapPin } from "lucide-react";

const DEMO = [
  { city: "Jaipur",   price: 1800, best: true  },
  { city: "Mumbai",   price: 3200, best: false },
  { city: "Delhi",    price: 2800, best: false },
  { city: "Varanasi", price: 2200, best: false },
];

export default function CompareTeaser() {
  const max = Math.max(...DEMO.map(d => d.price));
  const min = Math.min(...DEMO.map(d => d.price));

  return (
    <section className="py-20" style={{ background: "#fafafa" }}>
      <div className="container">
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 mb-5">
              <BarChart2 className="w-3.5 h-3.5 text-green-600" />
              <span className="text-[12px] font-semibold text-green-700">New feature</span>
            </div>
            <h2 className="text-[28px] md:text-[36px] font-black text-zinc-950 leading-tight mb-4">
              Compare prices<br />
              across cities.
            </h2>
            <p className="text-[15px] text-zinc-500 leading-relaxed mb-6 max-w-sm">
              Planning a shopping trip? Find out which Indian city gives you
              the best deal on what you want to buy — before you even pack.
            </p>
            <Link href="/compare">
              <button className="inline-flex items-center gap-2 btn-green text-[14px] px-6 py-3 rounded-xl">
                Try price comparison
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>

          {/* Right — demo chart */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-5"
            style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}>
            <p className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">
              Example: Banarasi Saree
            </p>
            <p className="text-[11px] text-zinc-300 mb-4">Illustrative price ranges</p>

            <div className="space-y-3">
              {DEMO.map(d => {
                const pct = Math.max(20, ((d.price - min) / (max - min + 500)) * 100 + 20);
                return (
                  <div key={d.city} className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 w-20 shrink-0">
                      <MapPin className="w-3 h-3 text-zinc-400" />
                      <span className="text-[12px] font-medium text-zinc-600">{d.city}</span>
                    </div>
                    <div className="flex-1 h-8 bg-zinc-100 rounded-xl overflow-hidden relative">
                      <div
                        className="h-full rounded-xl flex items-center justify-end pr-3 transition-all"
                        style={{
                          width: `${pct}%`,
                          background: d.best
                            ? "linear-gradient(90deg,#16a34a,#22c55e)"
                            : "linear-gradient(90deg,#e4e4e7,#d4d4d8)",
                        }}
                      >
                        <span className={`text-[11px] font-bold ${d.best ? "text-white" : "text-zinc-600"}`}>
                          ₹{d.price.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {d.best && (
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full shrink-0">
                        Best
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-zinc-400 mt-4 pt-3 border-t border-zinc-50">
              Save up to ₹1,400 by choosing the right city to shop in.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}