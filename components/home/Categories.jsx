"use client";

import Link from "next/link";
import { CATEGORIES } from "@/lib/utils";

export default function Categories() {
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-12">
          <p className="text-[13px] font-semibold text-green-600 uppercase tracking-widest mb-3">
            What you can check
          </p>
          <h2 className="text-[36px] md:text-[44px] font-black text-zinc-950 leading-tight">
            Fair prices for everything.
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/check-price?category=${cat.id}`}
              className="group flex flex-col items-center gap-3 bg-white rounded-2xl p-5 border border-zinc-100 hover:border-zinc-200 card-hover text-center cursor-pointer"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110"
                style={{ background: `${cat.color}12` }}
              >
                {cat.icon}
              </div>
              <span className="text-[13px] font-semibold text-zinc-700 group-hover:text-zinc-900 transition-colors leading-tight">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}