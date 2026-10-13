import { Shield } from "lucide-react";
import { StaticPage, Section, P, Bullets, Card, ButtonLink } from "@/components/layout/StaticPage";
import { SITE } from "@/lib/site";

export const metadata = { title: "Press — Verifee" };

const COLORS = [
  { name: "Verifee green", hex: "#16a34a" },
  { name: "Bright green", hex: "#22c55e" },
  { name: "Deep green",   hex: "#14532d" },
  { name: "Ink",          hex: "#09090b" },
];

export default function PressPage() {
  return (
    <StaticPage
      eyebrow="Press"
      title="Press kit"
      intro="Everything you need to write about Verifee accurately."
    >
      <Section title="About Verifee in one paragraph">
        <Card>
          <p className="text-[14px] text-zinc-700 leading-relaxed">
            Verifee is a price-transparency tool for physical markets in India. It combines
            community-verified receipts, statistical scam detection and AI to tell travelers and
            locals what a fair price is before they pay. Its Fair Pay feature checks a vendor’s
            quote and then lets the buyer pay by UPI QR or PayPal.
          </p>
        </Card>
      </Section>

      <Section title="Product facts">
        <Bullets
          items={[
            "Check Price: fair range, bargaining plan and confidence score for any item in a city.",
            "Scam Detector: scores a quoted price and suggests what to say.",
            "Fair Pay: AI check before payment, with UPI QR and PayPal.",
            "Bargain Coach: step-by-step scripts in ten Indian languages.",
            "Markets, Compare Cities, Translate and Scam Feed.",
            "Prices are labeled as community verified or as an AI estimate.",
          ]}
        />
      </Section>

      <Section title="Brand">
        <P>The wordmark is “Veri” in dark ink followed by “fee” in green, set in Inter, with the shield mark.</P>
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)" }}
          >
            <Shield className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[26px] font-bold text-zinc-950 tracking-tight">
            Veri<span style={{ color: "#16a34a" }}>fee</span>
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {COLORS.map((c) => (
            <div key={c.hex} className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              <div className="h-14" style={{ background: c.hex }} />
              <div className="p-3">
                <p className="text-[12px] font-semibold text-zinc-800">{c.name}</p>
                <p className="text-[11px] text-zinc-400 font-mono">{c.hex}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Media contact">
        <P>
          For interviews, screenshots or questions, email{" "}
          <a className="text-green-600 font-semibold hover:underline" href={`mailto:${SITE.contactEmail}`}>
            {SITE.contactEmail}
          </a>{" "}
          or use the contact form.
        </P>
        <div className="mt-3">
          <ButtonLink href="/contact">Contact us</ButtonLink>
        </div>
      </Section>
    </StaticPage>
  );
}