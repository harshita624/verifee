import { StaticPage, LegalSections } from "@/components/layout/StaticPage";
import { SITE } from "@/lib/site";

export const metadata = { title: "Terms of Service — Verifee" };

// TEMPLATE: matches the product as built today. Have a qualified lawyer review
// it before launch. Values such as the refund window and minimum age come from
// lib/site.js, so change them there to what you actually decide.

const SECTIONS = [
  {
    h: "Agreeing to these terms",
    p: [
      `By using Verifee you agree to these Terms of Service and to our Privacy Policy. If you do not agree, please do not use the service. You must be at least ${SITE.minAge} years old.`,
    ],
  },
  {
    h: "What Verifee provides",
    p: [
      "Verifee gives information about prices in physical markets: community reports, statistics and AI estimates, plus tools to bargain, translate and pay. This information is for guidance only. Prices change, items differ and AI estimates can be wrong. Please read the Disclaimer.",
    ],
  },
  {
    h: "Your account",
    ul: [
      "Give accurate information and keep your password secret. You are responsible for activity on your account.",
      "Tell us promptly if you think your account has been misused.",
      "We may suspend or close accounts that break these terms.",
    ],
  },
  {
    h: "Acceptable use",
    p: ["Do not:"],
    ul: [
      "submit false, misleading or defamatory price reports or scam reports, or name private individuals in them;",
      "scrape, overload or probe the service beyond its published rate limits, or try to get around quotas or security;",
      "use Verifee for anything unlawful, or to harass, defraud or mislead others;",
      "upload content you do not have the right to share.",
    ],
  },
  {
    h: "Content you submit",
    p: [
      "You keep ownership of what you submit. You give us a worldwide, non-exclusive, royalty-free licence to store, display and use it to run and improve Verifee, including to compute price statistics and show reports to other users. You confirm that your reports are truthful to the best of your knowledge.",
    ],
  },
  {
    h: "Verifee Pro",
    ul: [
      "Pro removes the free daily limit on premium AI actions. The plans and prices are shown at checkout.",
      "Each purchase is a one-time payment for a fixed period (for example 30 or 365 days). Pro does not renew automatically, and buying again extends your end date.",
      "PayPal payments activate automatically. UPI payments are confirmed manually after you submit your transaction ID, so activation can take time.",
      `If something went wrong with a purchase, contact us within ${SITE.refundWindowDays} days at ${SITE.contactEmail} and we will review it and, where appropriate, refund it.`,
    ],
  },
  {
    h: "Fair Pay",
    p: [
      "Fair Pay checks a quoted price before you pay. Where you pay a vendor by UPI, the payment goes directly from you to the vendor, and Verifee is not a party to that sale and does not hold or refund that money. Any dispute is between you and the vendor.",
      "Where Fair Pay is offered in test mode (for example the PayPal sandbox), no real money moves. A completed Fair Pay payment may be saved as a price report so it can help other users.",
      "The Pay Guard result is advice, not a guarantee that a price is fair or that goods are genuine.",
    ],
  },
  {
    h: "Third-party services",
    p: [
      "Verifee relies on third parties such as PayPal, your bank or UPI app, AI providers and hosting companies. Their own terms apply to their services, and we are not responsible for their outages or actions.",
    ],
  },
  {
    h: "Availability and changes",
    p: [
      "We try to keep Verifee available but do not promise it will be uninterrupted or error free. We may change, suspend or end features, and we may update these terms. If a change is significant we will tell you. Continuing to use Verifee after a change means you accept it.",
    ],
  },
  {
    h: "Disclaimers and limits on liability",
    p: [
      "Verifee is provided “as is” and “as available”. To the fullest extent the law allows, we are not liable for indirect or consequential loss, for losses from relying on a price estimate, or for what happens in a transaction between you and a vendor. Nothing in these terms limits liability that cannot be limited by law.",
    ],
  },
  {
    h: "Ending your use",
    p: [
      "You can stop using Verifee at any time and ask us to delete your account. We may suspend or close your access if you break these terms or put the service or other users at risk.",
    ],
  },
  {
    h: "Governing law",
    p: [
      `These terms are governed by the laws of ${SITE.jurisdiction}. Disputes are subject to the courts of competent jurisdiction in ${SITE.jurisdiction}.`,
    ],
  },
  {
    h: "Contact",
    p: [`Questions about these terms: ${SITE.contactEmail}.`],
  },
];

export default function TermsPage() {
  return (
    <StaticPage
      eyebrow="Legal"
      title="Terms of Service"
      intro="The rules for using Verifee."
      updated={SITE.legalUpdated}
    >
      <LegalSections sections={SECTIONS} />
    </StaticPage>
  );
}