import Link from "next/link";
import { Shield, MapPin, Mail } from "lucide-react";

const LINKS = {
  Product:  ["Check Price","Scam Detector","Market Explorer","Translate","Contribute"],
  Company:  ["About","Blog","Careers","Press","Contact"],
  Support:  ["Help Center","Community","Report Scam","API Docs","Status"],
  Legal:    ["Privacy Policy","Terms of Service","Cookie Policy","Disclaimer"],
};

export default function Footer() {
  return (
    <footer className="border-t border-zinc-100 bg-white">
      <div className="container py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)" }}
              >
                <Shield className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-[18px] font-bold text-zinc-950 tracking-tight">
                Veri<span style={{ color: "#16a34a" }}>fee</span>
              </span>
            </Link>

            <p className="text-[13px] text-zinc-500 leading-relaxed mb-5 max-w-[180px]">
              Know the fair price. Shop without fear. Travel with confidence.
            </p>

            <div className="space-y-2">
              <a href="mailto:hello@verifee.in" className="flex items-center gap-2 text-[12px] text-zinc-400 hover:text-green-600 transition-colors">
                <Mail className="w-3.5 h-3.5" />
                hello@verifee.in
              </a>
              <div className="flex items-center gap-2 text-[12px] text-zinc-400">
                <MapPin className="w-3.5 h-3.5" />
                Bangalore, India
              </div>
            </div>

            <div className="mt-4">
              <span
                className="text-[11px] font-semibold px-3 py-1 rounded-full"
                style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #dcfce7" }}
              >
                Made in India
              </span>
            </div>
          </div>

          {Object.entries(LINKS).map(([section, items]) => (
            <div key={section}>
              <h4 className="text-[11px] font-semibold text-zinc-900 uppercase tracking-widest mb-4">
                {section}
              </h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="text-[13px] text-zinc-500 hover:text-zinc-900 transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-8 border-t border-zinc-100"
        >
          <p className="text-[12px] text-zinc-400">
            © 2025 Verifee Technologies Pvt. Ltd. All rights reserved.
          </p>
          <p className="text-[12px] text-zinc-400">
            Protecting travelers, one price at a time.
          </p>
        </div>
      </div>
    </footer>
  );
}