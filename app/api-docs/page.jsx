import { StaticPage, Section, P, Bullets, Callout } from "@/components/layout/StaticPage";
import { API_BASE } from "@/lib/site";

export const metadata = { title: "API Docs — Verifee" };

const BASE = `${API_BASE}/api/v1`;

const PUBLIC_ENDPOINTS = [
  { m: "POST", path: "/ai/fair-price",        d: "Fair range, bargaining plan and confidence for a product in a city." },
  { m: "POST", path: "/ai/scam-check",        d: "Scam probability and verdict for a quoted price." },
  { m: "POST", path: "/ai/translate",         d: "Translate a shopping phrase into an Indian language." },
  { m: "POST", path: "/ai/chat",              d: "Conversational shopping assistant." },
  { m: "POST", path: "/ai/markets-search",    d: "Search markets by name or city." },
  { m: "GET",  path: "/ai/city-places/:city", d: "Popular shopping areas in a city." },
  { m: "GET",  path: "/prices",               d: "Community price reports (filters: product, city, category, limit, page)." },
  { m: "GET",  path: "/prices/stats/:product", d: "Average, min, max and count of verified reports (optional ?city=)." },
  { m: "GET",  path: "/scam-reports",         d: "Recent overcharging reports (filters: city, category, limit, page)." },
  { m: "GET",  path: "/shops",                d: "Shops and markets directory." },
  { m: "GET",  path: "/payments/config",      d: "Plans and which payment methods are enabled." },
];

const LIMITED_ENDPOINTS = [
  { m: "POST", path: "/payments/guard",    d: "AI Pay Guard verdict before paying a vendor." },
  { m: "POST", path: "/ai/bargain-script", d: "Full bargaining script in a chosen language." },
  { m: "POST", path: "/ai/bargain-reply",  d: "Live comeback to what a seller just said." },
  { m: "POST", path: "/ai/verify-receipt", d: "Check a receipt photo against fair prices." },
];

const CURL_FAIR = `curl -X POST ${BASE}/ai/fair-price \\
  -H "Content-Type: application/json" \\
  -d '{"product":"Pashmina shawl","city":"Srinagar"}'`;

const CURL_SCAM = `curl -X POST ${BASE}/ai/scam-check \\
  -H "Content-Type: application/json" \\
  -d '{"product":"Pashmina shawl","offeredPrice":8000,"city":"Srinagar"}'`;

const RESPONSE = `{
  "success": true,
  "data": {
    "fairPriceMin": 2400,
    "fairPriceMax": 3200,
    "dataSource": "ai_estimate",
    "confidenceScore": 45
  }
}`;

const ERROR = `{
  "success": false,
  "message": "Product is required"
}`;

const AUTH = `# 1. sign in
curl -X POST ${BASE}/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"your-password"}'

# 2. use the returned token
curl ${BASE}/auth/me -H "Authorization: Bearer <token>"`;

function Table({ rows }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 overflow-x-auto mb-4">
      <table className="w-full text-left">
        <tbody>
          {rows.map((r) => (
            <tr key={r.m + r.path} className="border-b border-zinc-50 last:border-0">
              <td className="px-4 py-3 align-top whitespace-nowrap">
                <span
                  className="text-[10px] font-black px-2 py-0.5 rounded-md"
                  style={{
                    background: r.m === "GET" ? "#f0f9ff" : "#f0fdf4",
                    color: r.m === "GET" ? "#0369a1" : "#15803d",
                  }}
                >
                  {r.m}
                </span>
              </td>
              <td className="px-2 py-3 align-top whitespace-nowrap text-[12px] font-mono text-zinc-800">{r.path}</td>
              <td className="px-4 py-3 text-[12px] text-zinc-500 leading-relaxed">{r.d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Code({ children }) {
  return (
    <pre className="bg-zinc-950 text-zinc-100 text-[12px] leading-relaxed rounded-2xl p-4 overflow-x-auto mb-4">
      <code>{children}</code>
    </pre>
  );
}

export default function ApiDocsPage() {
  return (
    <StaticPage
      wide
      eyebrow="API"
      title="Verifee API"
      intro="The same JSON API that powers this website. Public endpoints need no key."
    >
      <Callout tone="amber">
        This API is in beta. It has no keys, no uptime guarantee and no stability promise, and fields
        may change. Please do not use it for anything where a wrong price would cause real harm.
      </Callout>

      <Section title="Base URL">
        <Code>{BASE}</Code>
        <P>
          Responses use one envelope: <code className="text-[12px] bg-zinc-100 px-1.5 py-0.5 rounded">{"{ success, data }"}</code>{" "}
          on success and <code className="text-[12px] bg-zinc-100 px-1.5 py-0.5 rounded">{"{ success: false, message }"}</code> on
          failure. A health check is at <code className="text-[12px] bg-zinc-100 px-1.5 py-0.5 rounded">{API_BASE}/health</code>.
        </P>
      </Section>

      <Section title="Public endpoints">
        <Table rows={PUBLIC_ENDPOINTS} />
        <P>Example: fair price</P>
        <Code>{CURL_FAIR}</Code>
        <Code>{RESPONSE}</Code>
        <P>Example: scam check</P>
        <Code>{CURL_SCAM}</Code>
        <P>Errors look like this:</P>
        <Code>{ERROR}</Code>
      </Section>

      <Section title="Free daily quota">
        <P>
          These endpoints cost more to run, so free users get 3 calls per day (counted per account, or
          per IP address when signed out). Verifee Pro is unlimited. Past the quota you get HTTP 402
          with <code className="text-[12px] bg-zinc-100 px-1.5 py-0.5 rounded">code: &quot;UPGRADE_REQUIRED&quot;</code>.
        </P>
        <Table rows={LIMITED_ENDPOINTS} />
      </Section>

      <Section title="Authentication">
        <P>
          Account endpoints use a JWT. Sign in to get a token, then send it as a Bearer token.
        </P>
        <Code>{AUTH}</Code>
      </Section>

      <Section title="Rate limits">
        <Bullets
          items={[
            "150 requests per 15 minutes per IP across the whole API.",
            "30 requests per minute per IP on /ai/*.",
            "15 requests per minute per IP on /payments/guard.",
            "20 requests per 15 minutes per IP on /auth/*.",
          ]}
        />
        <P>Exceeding a limit returns HTTP 429. Back off and retry later.</P>
      </Section>
    </StaticPage>
  );
}