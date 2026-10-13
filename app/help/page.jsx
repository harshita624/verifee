import Link from "next/link";
import { StaticPage, Section, ButtonLink } from "@/components/layout/StaticPage";

export const metadata = { title: "Help Center — Verifee" };

const GROUPS = [
  {
    title: "Prices and AI",
    items: [
      {
        q: "How does Verifee know the fair price?",
        a: "When at least three verified community receipts exist for an item in a city, the range comes from those receipts. Otherwise it is an AI estimate, clearly labeled with a confidence score. Estimates are saved for 24 hours so every page shows the same numbers.",
      },
      {
        q: "What does “AI estimate” mean?",
        a: "It means there is not enough community data yet, so an AI model estimated what a local pays in a physical market. Treat it as a starting point and contribute your receipt to improve it.",
      },
      {
        q: "Why is the range so wide?",
        a: "Vague item names give wide ranges. “Bed” could be anything from a basic frame to carved teak. Add size, material or quality, for example “wooden double bed”, for a tighter estimate.",
      },
      {
        q: "How is the scam probability calculated?",
        a: "From numbers, not guesswork. With community data it uses a Z-score. With an AI estimate it uses where your quote sits against the fair range. Prices inside the range score as fair, and the score climbs as the quote goes above the top of the range.",
      },
      {
        q: "Which languages does the translator support?",
        a: "Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi and Odia, with pronunciation and a Listen button that uses your browser’s speech engine.",
      },
    ],
  },
  {
    title: "Payments",
    items: [
      {
        q: "How can I pay?",
        a: "In Fair Pay you can pay a vendor by UPI QR (India) or with PayPal. For Verifee Pro you can pay with PayPal or UPI QR. If you see a “Test mode” note, no real money moves.",
      },
      {
        q: "Does Verifee handle my money when I pay a vendor by UPI?",
        a: "No. Verifee only builds the payment QR. The payment goes from your UPI app straight to the vendor.",
      },
      {
        q: "Why is my UPI Pro payment pending?",
        a: "UPI payments for Pro are confirmed manually after you submit the 12-digit transaction ID (UTR) from your payment receipt. PayPal payments activate automatically.",
      },
      {
        q: "Does Pro renew automatically?",
        a: "No. Each purchase adds a fixed period (30 or 365 days) to your account. Buying again extends it.",
      },
      {
        q: "The QR scanner will not open my camera.",
        a: "Camera access needs HTTPS and your permission in the browser. If it still fails, use “Upload a QR screenshot instead”.",
      },
    ],
  },
  {
    title: "Your account",
    items: [
      {
        q: "I forgot my password.",
        a: "Use “Forgot?” on the sign-in page. We email a reset link that works for 10 minutes. If you signed up with Google, use the same email to set a password.",
      },
      {
        q: "How do I contribute a price?",
        a: "Open Contribute, enter what you bought, what you paid and where. Plausible prices are verified automatically and earn XP. Prices that look far off are held for review.",
      },
      {
        q: "How do I report a scam?",
        a: "Open the Scam Feed and press “Report a scam”. Include what was charged and what you think was fair. If you are signed in you earn 40 XP for up to 3 reports a day.",
      },
      {
        q: "How do I delete my account?",
        a: "Go to Profile, open the Settings tab and press Delete account in the Danger zone. Confirm with your password (or your email if you signed up with Google). Your personal details are erased, your price reports stay in the community data anonymously, and payment records are kept as needed for accounting.",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <StaticPage
      eyebrow="Help Center"
      title="How can we help?"
      intro="Quick answers about prices, payments and your account."
    >
      {GROUPS.map((g) => (
        <Section key={g.title} title={g.title}>
          <div className="space-y-2">
            {g.items.map((item) => (
              <details
                key={item.q}
                className="group bg-white rounded-2xl border border-zinc-100 px-5 py-4 open:bg-zinc-50"
              >
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-[14px] font-semibold text-zinc-900">
                  {item.q}
                  <span className="text-zinc-400 text-[18px] leading-none group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-[13px] text-zinc-500 leading-relaxed mt-3">{item.a}</p>
              </details>
            ))}
          </div>
        </Section>
      ))}

      <Section title="Still stuck?">
        <p className="text-[14px] text-zinc-600 leading-relaxed mb-4">
          Send us a message and include what you were doing and what you expected to happen. You can
          also check the{" "}
          <Link href="/status" className="text-green-600 font-semibold hover:underline">status page</Link>.
        </p>
        <ButtonLink href="/contact">Contact us</ButtonLink>
      </Section>
    </StaticPage>
  );
}