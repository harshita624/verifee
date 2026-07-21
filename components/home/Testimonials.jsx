"use client";

import { Star, MapPin } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Sarah Mitchell",
    role: "Tourist from London",
    avatar: "SM",
    avatarColor: "#0ea5e9",
    location: "Jaipur, Rajasthan",
    rating: 5,
    text: "A shopkeeper quoted me ₹8,000 for a Rajasthani quilt. Verifee showed the fair price was ₹2,200. I bargained to ₹2,500 and he accepted immediately. Saved ₹5,500 in one purchase!",
    saved: "Saved ₹5,500",
  },
  {
    name: "Tanmay Bhat",
    role: "Student from Pune",
    avatar: "TB",
    avatarColor: "#16a34a",
    location: "Delhi, First time",
    rating: 5,
    text: "Moved to Delhi for college and had no idea about local prices. Got scammed in my first week. After Verifee, I check every purchase. The scam detector is frighteningly accurate.",
    saved: "Saves weekly",
  },
  {
    name: "Yuki Tanaka",
    role: "Backpacker from Japan",
    avatar: "YT",
    avatarColor: "#ec4899",
    location: "Varanasi, UP",
    rating: 5,
    text: "The language translator helped me bargain in Hindi at Varanasi silk shops. The shopkeepers were shocked and gave me local prices. This app literally changes how you travel in India.",
    saved: "Saved ₹12,000+",
  },
  {
    name: "Priya Menon",
    role: "Kerala Tourist",
    avatar: "PM",
    avatarColor: "#f59e0b",
    location: "Mumbai, Maharashtra",
    rating: 5,
    text: "Was quoted ₹3,500 for a Ganesh idol at Colaba. Verifee said fair price is ₹800. The community photos showed the exact same item. Walked out without buying and found it for ₹900 nearby.",
    saved: "Saved ₹2,600",
  },
];

export default function Testimonials() {
  return (
    <section className="py-20 md:py-28" style={{ background: "#fafafa" }}>
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-14">
          <p className="text-[13px] font-semibold text-green-600 uppercase tracking-widest mb-3">
            Real stories
          </p>
          <h2 className="text-[36px] md:text-[48px] font-black text-zinc-950 leading-tight mb-4">
            Trusted by travelers
            <br />
            across India.
          </h2>
          <p className="text-[17px] text-zinc-500">
            From international tourists to domestic travelers — Verifee has their back.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-white rounded-2xl p-6 border border-zinc-100 card-hover"
            >
              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              <p className="text-[15px] text-zinc-700 leading-relaxed mb-5">
                &ldquo;{t.text}&rdquo;
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white"
                    style={{ background: t.avatarColor }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-zinc-900">{t.name}</p>
                    <p className="text-[12px] text-zinc-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {t.location} · {t.role}
                    </p>
                  </div>
                </div>
                <span className="text-[12px] font-bold bg-green-50 text-green-700 border border-green-100 px-3 py-1 rounded-full">
                  {t.saved}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}