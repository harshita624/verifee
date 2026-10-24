"use client";

import { useEffect, useRef, useState } from "react";

const STATS = [
  { display: "3+", label: "Verified reports", note: "Needed for a community range" },
  { display: "11", label: "Bargaining languages", note: "Phrase and translation support" },
  { display: "24h", label: "Estimate cache", note: "Shared across pricing screens" },
  { display: "2", label: "Price sources", note: "AI estimates and community reports" },
];

export default function Stats() {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVis(true); },
      { threshold: 0.2 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-16 border-y border-zinc-100"
      style={{ background: "#fafafa" }}
    >
      <div className="container">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className="text-center"
              style={{
                opacity:   vis ? 1 : 0,
                transform: vis ? "translateY(0)" : "translateY(20px)",
                transition: `all 0.5s ease ${i * 0.1}s`,
              }}
            >
              <p className="text-[36px] sm:text-[44px] font-black text-zinc-950 mb-1 tracking-tight">
                {s.display}
              </p>
              <p className="text-[14px] font-semibold text-zinc-700 mb-0.5">{s.label}</p>
              <p className="text-[12px] text-zinc-400">{s.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
