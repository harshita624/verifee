"use client";

import Link from "next/link";
import { ArrowRight, Shield } from "lucide-react";

export default function CTA() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-5">
        <div
          className="rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #14532d 0%, #15803d 50%, #16a34a 100%)",
          }}
        >
          {/* Background pattern */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mb-8">
              <Shield className="w-4 h-4 text-green-300" />
              <span className="text-[13px] font-medium text-green-100">
                Free to use — no credit card required
              </span>
            </div>

            <h2 className="text-[36px] md:text-[56px] font-black text-white leading-tight mb-6">
              Stop paying tourist prices.
              <br />
              Start shopping smart.
            </h2>

            <p className="text-[18px] text-green-100/80 mb-10 max-w-xl mx-auto leading-relaxed">
              Join 50,000+ travelers who check Verifee before every purchase.
              Free, instant, and powered by real community data.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/check-price">
                <button className="flex items-center gap-2 bg-white hover:bg-green-50 text-green-800 font-bold text-[15px] px-8 py-3.5 rounded-2xl transition-colors shadow-lg">
                  Check a price now
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
              <Link href="/auth/signup">
                <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-[15px] px-8 py-3.5 rounded-2xl transition-colors">
                  Create free account
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}