import { StaticPage, Section, P, Bullets, Card, ButtonLink } from "@/components/layout/StaticPage";
import { SITE } from "@/lib/site";

export const metadata = { title: "Careers — Verifee" };

// Add roles here when you are hiring, for example:
// { title: "Full-stack engineer", type: "Part-time", location: "Remote, India", href: "mailto:hello@example.com" }
const OPEN_ROLES = [];

export default function CareersPage() {
  return (
    <StaticPage
      eyebrow="Careers"
      title="Work on price transparency"
      intro="Verifee is an early-stage project building trust at the market counter."
    >
      <Section title="Open roles">
        {OPEN_ROLES.length === 0 ? (
          <Card>
            <p className="text-[14px] font-semibold text-zinc-800 mb-1">No open roles right now.</p>
            <p className="text-[13px] text-zinc-500 leading-relaxed">
              If you would like to help anyway, send a short note about what you could build or
              improve and we will keep it on file.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {OPEN_ROLES.map((r) => (
              <Card key={r.title} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[14px] font-bold text-zinc-900">{r.title}</p>
                  <p className="text-[12px] text-zinc-400">
                    {r.type} · {r.location}
                  </p>
                </div>
                <ButtonLink href={r.href} external>Apply</ButtonLink>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section title="Ways to help without a job title">
        <Bullets
          items={[
            "Contribute prices and receipts from your city, because verified data is what makes the answers accurate.",
            "Report overcharging so the next traveler is warned.",
            "Tell us which cities, markets and languages we should cover next.",
            ...(SITE.githubUrl ? ["Contribute code or ideas on GitHub."] : []),
          ]}
        />
        <div className="flex flex-wrap gap-2.5 mt-4">
          <ButtonLink href="/contribute">Contribute a price</ButtonLink>
          <ButtonLink href="/contact" variant="outline">Get in touch</ButtonLink>
          {SITE.githubUrl && (
            <ButtonLink href={SITE.githubUrl} variant="outline" external>GitHub</ButtonLink>
          )}
        </div>
      </Section>

      <Section title="Contact">
        <P>
          Email{" "}
          <a className="text-green-600 font-semibold hover:underline" href={`mailto:${SITE.contactEmail}`}>
            {SITE.contactEmail}
          </a>
          .
        </P>
      </Section>
    </StaticPage>
  );
}