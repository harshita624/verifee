"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const FAQS = [
  {
    q: "How does Verifee know the real local price?",
    a: "Verifee uses an AI estimate until at least three verified price reports match the product and city. Then the price range is calculated from those reports. Uploaded receipts are stored with a contribution, but are not currently read automatically to fill in or verify its price.",
  },
  {
    q: "Is Verifee free to use?",
    a: "Yes, checking prices, using the scam detector, and the basic language translator are completely free. Premium features like offline mode, AI shopping assistant, and price alerts require a Pro subscription.",
  },
  {
    q: "Which cities are covered?",
    a: "You can request a price estimate for a city in India. Community-based ranges appear when at least three verified reports match that product and city; otherwise, Verifee shows an AI estimate.",
  },
  {
    q: "Can I trust the community prices?",
    a: "A price report counts toward community estimates after an admin reviews its receipt. The estimate shows how many approved reports it used. Compare the range with the item's quality and other details before deciding.",
  },
  {
    q: "How does the scam detector work?",
    a: "Enter the product name, the price you were quoted, and your location. Verifee compares it against admin-reviewed community prices or an estimated range, then gives a risk indicator and negotiation advice. The score is guidance, not proof of fraud.",
  },
  {
    q: "What languages does the translator support?",
    a: "Verifee supports Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi, Odia, and English. Voice translation and camera translation are supported for all languages.",
  },
  {
    q: "How do I contribute prices?",
    a: "Open Contribute and enter the product, price paid, and city. You can attach a receipt, but its details are not automatically extracted. Plausible reports are marked verified and used in community estimates; other reports are saved for review.",
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
