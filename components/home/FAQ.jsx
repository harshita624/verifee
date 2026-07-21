"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const FAQS = [
  {
    q: "How does Verifee know the real local price?",
    a: "Verifee combines three sources: (1) community-submitted prices from real buyers with photo receipts, (2) AI trained on Indian market data, and (3) historical price trends. The confidence score tells you how reliable each estimate is.",
  },
  {
    q: "Is Verifee free to use?",
    a: "Yes, checking prices, using the scam detector, and the basic language translator are completely free. Premium features like offline mode, AI shopping assistant, and price alerts require a Pro subscription.",
  },
  {
    q: "Which cities are covered?",
    a: "We currently cover 1,200+ markets across 180+ Indian cities including Delhi, Mumbai, Jaipur, Agra, Varanasi, Goa, Kerala, Hyderabad, Bangalore, and all major tourist destinations.",
  },
  {
    q: "Can I trust the community prices?",
    a: "Every submitted price goes through AI verification and is cross-referenced with OCR receipt scanning. Contributors with verified buyer badges and higher reputation scores carry more weight in our pricing algorithm.",
  },
  {
    q: "How does the scam detector work?",
    a: "Enter the product name, the price you were quoted, and your location. Our AI compares it against community-verified prices, calculates the overcharging percentage, and gives you a scam probability score along with negotiation advice.",
  },
  {
    q: "What languages does the translator support?",
    a: "Verifee supports Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi, Odia, and English. Voice translation and camera translation are supported for all languages.",
  },
  {
    q: "How do I contribute prices?",
    a: "After buying something, click 'Contribute' and upload your receipt or bill. Our OCR automatically extracts the product, price, date, and shop. You earn XP and badges for every verified contribution.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState(null);

  return (
    <section className="py-20 md:py-28">
      <div className="max-w-3xl mx-auto px-5">
        <div className="text-center mb-14">
          <p className="text-[13px] font-semibold text-green-600 uppercase tracking-widest mb-3">
            FAQ
          </p>
          <h2 className="text-[36px] md:text-[44px] font-black text-zinc-950 leading-tight">
            Common questions.
          </h2>
        </div>

        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="border border-zinc-200 rounded-2xl overflow-hidden"
              style={{ background: open === i ? "#fafafa" : "#ffffff" }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left gap-4 group"
              >
                <span className="text-[15px] font-semibold text-zinc-900 group-hover:text-green-700 transition-colors">
                  {faq.q}
                </span>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors"
                  style={{ background: open === i ? "#f0fdf4" : "#f4f4f5" }}
                >
                  {open === i
                    ? <Minus className="w-3.5 h-3.5 text-green-600" />
                    : <Plus className="w-3.5 h-3.5 text-zinc-500" />}
                </div>
              </button>
              {open === i && (
                <div className="px-5 pb-4">
                  <p className="text-[14px] text-zinc-500 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}