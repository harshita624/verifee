import { StaticPage, Section, P, Callout } from "@/components/layout/StaticPage";
import { SITE } from "@/lib/site";

export const metadata = { title: "Cookie Policy — Verifee" };

// TEMPLATE: accurate for the code as it stands today. If you add analytics,
// ads or other tracking, update this page and add a consent banner.

const ITEMS = [
  {
    name: "vf_token",
    where: "Local storage",
    purpose: "Keeps you signed in. It holds your login token until you sign out or it expires.",
    kind: "Essential",
  },
  {
    name: "vf_city",
    where: "Local storage",
    purpose: "Remembers the city you chose or detected so prices default to it.",
    kind: "Preference",
  },
  {
    name: "vf_session_id",
    where: "Session storage",
    purpose: "Lets the AI assistant follow the context of one chat session. It is cleared when you close the tab.",
    kind: "Essential",
  },
];

export default function CookiesPage() {
  return (
    <StaticPage
      eyebrow="Legal"
      title="Cookie Policy"
      intro="What Verifee stores in your browser."
      updated={SITE.legalUpdated}
    >
      <Callout tone="green">
        Verifee does not use advertising or analytics cookies, and does not track you across other websites.
      </Callout>

      <Section title="What we store">
        <P>
          We keep a few small items in your browser’s local and session storage so the site works. They
          are not sent to advertisers.
        </P>
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-x-auto mb-4">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-100">
                {["Name", "Where", "Purpose", "Type"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ITEMS.map((i) => (
                <tr key={i.name} className="border-b border-zinc-50 last:border-0 align-top">
                  <td className="px-4 py-3 text-[12px] font-mono text-zinc-800 whitespace-nowrap">{i.name}</td>
                  <td className="px-4 py-3 text-[12px] text-zinc-500 whitespace-nowrap">{i.where}</td>
                  <td className="px-4 py-3 text-[12px] text-zinc-500 leading-relaxed">{i.purpose}</td>
                  <td className="px-4 py-3 text-[12px] text-zinc-500 whitespace-nowrap">{i.kind}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Third-party cookies">
        <P>
          When you open PayPal checkout, PayPal’s own scripts load and may set their own cookies to
          process the payment and prevent fraud. Those are controlled by PayPal under its own policy.
          If you sign in with Google, Google may also set cookies on its own pages.
        </P>
      </Section>

      <Section title="Your choices">
        <P>
          You can clear these items at any time in your browser settings, or by signing out. Clearing
          them will sign you out and forget your saved city. Blocking all storage will stop sign-in
          from working.
        </P>
      </Section>

      <Section title="Contact">
        <P>Questions: {SITE.contactEmail}.</P>
      </Section>
    </StaticPage>
  );
}