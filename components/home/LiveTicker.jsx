"use client";

import { useEffect, useRef } from "react";

// These are realistic ranges, not AI-generated fake data — shown as illustrative examples only
const ITEMS = [
  { product: "Auto ride", city: "Delhi",     fair: "₹60–₹90"    },
  { product: "Pashmina",  city: "Srinagar",  fair: "₹2,400–₹3,200" },
  { product: "Hotel room",city: "Goa",       fair: "₹1,200–₹2,800" },
  { product: "Marble bowl",city:"Agra",      fair: "₹350–₹600"  },
  { product: "Silk saree",city: "Varanasi",  fair: "₹1,800–₹3,000" },
  { product: "Chai",      city: "Mumbai",    fair: "₹10–₹20"    },
  { product: "Rickshaw",  city: "Jaipur",    fair: "₹50–₹80"    },
  { product: "Handicraft",city: "Udaipur",   fair: "₹400–₹900"  },
  { product: "Carpet",    city: "Srinagar",  fair: "₹4,000–₹12,000"},
  { product: "Spices 100g",city:"Kochi",     fair: "₹40–₹80"    },
];

export default function LiveTicker() {
  const trackRef = useRef(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let pos = 0;
    const speed = 0.5;
    let raf;
    const animate = () => {
      pos -= speed;
      if (pos <= -(el.scrollWidth / 2)) pos = 0;
      el.style.transform = `translateX(${pos}px)`;
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  const doubled = [...ITEMS, ...ITEMS];

  return (
    <div
      className="overflow-hidden border-y border-zinc-100 py-3"
      style={{ background: "#fafafa" }}
    >
      <div className="flex items-center gap-3 px-4 mb-1">
        <span className="live-dot shrink-0" />
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider shrink-0">
          Live fair prices
        </span>
      </div>
      <div className="overflow-hidden">
        <div ref={trackRef} className="flex items-center gap-4 whitespace-nowrap" style={{ willChange: "transform" }}>
          {doubled.map((item, i) => (
            <div
              key={i}
              className="inline-flex items-center gap-2.5 bg-white border border-zinc-100 rounded-xl px-3.5 py-2 shrink-0"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
            >
              <span className="text-[12px] font-bold text-zinc-900">{item.product}</span>
              <span className="text-[10px] text-zinc-400">{item.city}</span>
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#f0fdf4", color: "#16a34a" }}
              >
                {item.fair}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}