import { ShieldCheck, Sparkles, QrCode } from "lucide-react";
import { StaticPage, Section, P, Card, ButtonLink } from "@/components/layout/StaticPage";

export const metadata = { title: "About — Verifee" };

const STEPS = [
  {
    icon: Sparkles,
    title: "Check the price",
    text: "Search any product, hotel or ride in a city. You get a fair range, a bargaining plan and a confidence score.",
  },
  {
    icon: ShieldCheck,
    title: "Test the quote",
    text: "Type what the vendor asked. The Scam Detector scores it against the fair range and tells you what to say.",
  },
  {
    icon: QrCode,
    title: "Pay with a safety check",
    text: "Fair Pay runs the same check before you pay, then lets you pay the vendor by UPI QR or by PayPal.",
  },
];

export default function AboutPage() {
  return (
    <StaticPage
      eyebrow="About"
      title="Know what a local pays, before you pay."
      intro="Verifee helps travelers and locals in India avoid tourist pricing at bazaars, hotels and transport stands."
    >
      <Section title="Why Verifee exists">
        <P>
          Prices on shopping sites say very little about what a person actually pays at a physical
          market. A shawl, an auto ride or a hotel room can be quoted at two or three times the
          local rate, and a visitor has no way to tell. Verifee closes that gap with community
          receipts, statistics and AI.
        </P>
      </Section>

      <Section title="How it works">
        <div className="grid sm:grid-cols-3 gap-3 mb-2">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "#f0fdf4" }}
              >
                <Icon className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-[14px] font-bold text-zinc-900 mb-1.5">{title}</h3>
              <p className="text-[12px] text-zinc-500 leading-relaxed">{text}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Where our prices come from">
        <P>
          When at least three verified community price reports exist for an item in a city, the fair
          range comes from those receipts and the verdict compares a quote with what local buyers
          typically paid. When there is not enough community data, the range is an AI estimate and is labeled “AI estimate” with a
          confidence score.
        </P>
        <P>
          AI estimates are saved for 24 hours, so Check Price, the Scam Detector and Fair Pay always
          show the same numbers for the same item.
        </P>
      </Section>

      <Section title="What we commit to">
        <P>
          We label AI estimates as estimates. Vendors cannot pay to change a price, a score or a
          ranking on Verifee. Verifee does not hold the money when you pay a vendor by UPI. Read the
          Disclaimer for the limits of what any estimate can tell you.
        </P>
      </Section>

      <Section title="Help make it better">
        <P>
          Every verified price report makes the next traveler’s answer more accurate. Share what you paid,
          report an overcharge, or tell us what is missing.
        </P>
        <div className="flex flex-wrap gap-2.5 mt-4">
          <ButtonLink href="/contribute">Contribute a price</ButtonLink>
          <ButtonLink href="/contact" variant="outline">Contact us</ButtonLink>
        </div>
      </Section>
    </StaticPage>
  );
}
