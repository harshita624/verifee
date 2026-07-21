"use client";

import { useEffect, useRef, useState } from "react";

const STATS = [
  { display: "2.4M+",  label: "Verified prices",   note: "Community submitted" },
  { display: "1,200+", label: "Markets covered",    note: "Across 180+ cities"  },
  { display: "380K+",  label: "Active users",       note: "Travelers & locals"  },
  { display: "40%",    label: "Average savings",    note: "vs. tourist pricing" },
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