import { StaticPage, LegalSections } from "@/components/layout/StaticPage";
import { SITE } from "@/lib/site";

export const metadata = { title: "Privacy Policy — Verifee" };

// TEMPLATE: written to match how the app works today. Have a qualified lawyer
// review it before launch, and update it whenever you add analytics, ads or new
// third-party services.

const SECTIONS = [
  {
    h: "Who we are",
    p: [
      `${SITE.legalName} (“Verifee”, “we”, “us”) runs the Verifee website and API. This policy explains what personal data we collect, why we collect it, who we share it with and the choices you have.`,
      `For questions or requests about your data, write to ${SITE.contactEmail}.`,
    ],
  },
  {
    h: "What we collect",
    ul: [
      "Account details: your name and email address, and a password that we store only as a one-way hash. Optional profile fields you add: phone number, city, country, language, bio, travel frequency and avatar link.",
      "Contributions: price reports and scam reports you submit (product, price, city, market, shop, notes). Your name may be shown next to scam reports you submit while signed in. The public leaderboard shows only your first name and last initial.",
      "Payment records: the plan or purchase, amount, currency, status, PayPal order and capture IDs, the payer email PayPal returns, and the UPI transaction ID (UTR) you submit. We never see or store your card number. PayPal handles card and wallet details.",
      "What you send to our AI features: product names, prices, cities, chat messages and receipt photos you choose to upload.",
      "Technical data: your IP address and request metadata, used for rate limiting, free-quota counting, security and troubleshooting.",
      "Messages you send us through the contact form: name, email, topic and message.",
    ],
  },
  {
    h: "Location and camera",
    p: [
      "We ask for your location only when you press the detect-location button. Your browser sends your coordinates to OpenStreetMap’s Nominatim service to find your city. We keep the resulting city name in your browser, and we do not store your coordinates on our servers.",
      "The QR scanner uses your camera inside your browser to read a UPI QR code. Camera frames are processed on your device and are not uploaded. If you upload a receipt photo for verification, that image is sent to our AI provider to be read.",
    ],
  },
  {
    h: "How we use your data",
    ul: [
      "To run your account, show your XP, level and badges, and keep you signed in.",
      "To calculate fair prices, spot overcharging and improve accuracy using verified community reports.",
      "To process payments and activate or extend Verifee Pro.",
      "To send transactional email, such as password reset links and replies to your messages.",
      "To prevent abuse, enforce rate limits and the free daily quota, and keep the service secure.",
    ],
  },
  {
    h: "Who we share it with",
    p: [
      "We do not sell your personal data. We share data only with service providers that help us run Verifee, and only as needed:",
    ],
    ul: [
      "Database hosting: MongoDB Atlas.",
      "Website and API hosting: Vercel and Render.",
      "Payments: PayPal. UPI payments go from your bank app to the vendor or to us directly.",
      "AI processing: our configured AI provider (Groq by default, or OpenAI or Google Gemini if enabled). Prompts can include product names, prices, cities, your chat messages and receipt images.",
      "Email delivery: Resend.",
      "Reverse geocoding from your browser: OpenStreetMap Nominatim.",
      "Sign-in with Google, if you choose to use it.",
    ],
    after: [
      "We may also disclose data when required by law or to protect our users and service.",
    ],
  },
  {
    h: "Browser storage",
    p: [
      "Verifee uses your browser’s local and session storage, not advertising or analytics cookies, to keep you signed in and remember your city. See the Cookie Policy for the exact items.",
    ],
  },
  {
    h: "How long we keep data",
    ul: [
      "Account details: until you delete your account. Price and scam reports you submitted stay as anonymous community data after deletion.",
      "Payment records: as long as needed for accounting, tax and dispute handling.",
      "AI price estimates: cached for about 24 hours.",
      "Contact messages: until the matter is resolved and a reasonable period afterwards.",
    ],
  },
  {
    h: "Security",
    p: [
      "Passwords are stored as salted hashes. Traffic is encrypted in transit. We limit who can access production data. No system is perfectly secure, so please use a strong, unique password.",
    ],
  },
  {
    h: "Your choices and rights",
    p: [
      "You can view and edit your profile on the Profile page, and delete your account yourself under Profile, Settings, Danger zone. Deleting erases your name, email, phone, city, bio and avatar and signs you out everywhere. Price reports you submitted remain in the community data without your name, and payment records are kept as long as accounting and tax rules require. You can also ask us to access or correct your data, or withdraw consent, by emailing us from the address on your account. Where laws such as India’s Digital Personal Data Protection Act, 2023 apply, you may have further rights, and we will respond as the law requires.",
    ],
  },
  {
    h: "Children",
    p: [
      `Verifee is not intended for anyone under ${SITE.minAge}. If you believe a child has given us personal data, contact us and we will delete it.`,
    ],
  },
  {
    h: "Changes to this policy",
    p: [
      "We will update this page when our practices change and revise the date at the top. If a change is significant, we will tell signed-in users.",
    ],
  },
  {
    h: "Contact",
    p: [`Email ${SITE.contactEmail}.`],
  },
];

export default function PrivacyPage() {
  return (
    <StaticPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="What we collect, why, and the choices you have."
      updated={SITE.legalUpdated}
    >
      <LegalSections sections={SECTIONS} />
    </StaticPage>
  );
}