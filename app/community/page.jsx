"use client";

import { useEffect, useState } from "react";
import { Trophy, Loader2, Zap } from "lucide-react";
import { StaticPage, Section, Bullets, Card, ButtonLink } from "@/components/layout/StaticPage";
import { API_BASE } from "@/lib/site";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function CommunityPage() {
  const [leaders, setLeaders] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contributionsLoading, setContributionsLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/auth/top-contributors?limit=10`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setLeaders(d.data || []);
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/prices?limit=10`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (d.success) setContributions(d.data || []); })
      .catch(() => {})
      .finally(() => setContributionsLoading(false));
  }, []);

  return (
    <StaticPage
      eyebrow="Community"
      title="Prices from people who paid them"
      intro="Verifee gets more accurate with every verified price report. Here are the people contributing them."
    >
      <Section title="Top contributors">
        <Card className="p-3">
          {loading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
            </div>
          ) : failed ? (
            <p className="text-[13px] text-zinc-500 text-center py-8">
              The leaderboard could not be loaded right now. Please try again later.
            </p>
          ) : leaders.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-10 h-10 text-zinc-200 mx-auto mb-2" />
              <p className="text-[13px] font-semibold text-zinc-600 mb-1">No contributors yet</p>
              <p className="text-[12px] text-zinc-400">Be the first to share a price.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {leaders.map((p, i) => (
                <div
                  key={p._id || i}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: i === 0 ? "#fffbeb" : "transparent" }}
                >
                  <span className="text-[16px] w-7 text-center shrink-0">
                    {i < 3 ? MEDALS[i] : `${i + 1}.`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-zinc-900 truncate">{p.name || "Anonymous"}</p>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {p.city || "India"} · Level {p.level || 1} · {p.contributionCount || 0} contributions
                    </p>
                  </div>
                  <span className="text-[13px] font-black text-green-600 shrink-0">
                    +{(p.xp || 0).toLocaleString()} XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Section>

      <Section title="Recent community prices">
        <Card className="divide-y divide-zinc-100">
          {contributionsLoading ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 text-green-600 animate-spin" /></div>
          ) : contributions.length === 0 ? (
            <p className="text-[13px] text-zinc-500 text-center py-8">No price contributions have been shared yet.</p>
          ) : contributions.map((report) => (
            <div key={report._id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-zinc-900">{report.product}</p>
                <p className="truncate text-[11px] text-zinc-500">
                  {report.city}{report.marketName ? ` · ${report.marketName}` : ""} · {report.submittedBy?.name || "Community member"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[13px] font-bold text-green-700">₹{Number(report.pricePaid || 0).toLocaleString("en-IN")}</p>
                <p className="text-[10px] text-zinc-400">{report.isVerified ? "Verified" : "Shared"}</p>
              </div>
            </div>
          ))}
        </Card>
      </Section>

      <Section title="How you earn XP">
        <Bullets
          items={[
            "Submit a price report: 50 XP.",
            "A price report earns 50 XP when submitted. It stays marked as shared until it has been reviewed and approved.",
            "Fair Pay payments are not used as public price evidence because a payment to Verifee does not confirm a sale by the named seller.",
            "Scam reports are shared as community reports and do not currently award XP.",
            "Every 1,000 XP raises your level. Reaching 1,000 XP earns the Top Contributor badge.",
          ]}
        />
        <p className="text-[12px] text-zinc-400">
          Only first name and last initial appear on this leaderboard.
        </p>
      </Section>

      <Section title="Take part">
        <div className="flex flex-wrap gap-2.5">
          <ButtonLink href="/contribute">
            <Zap className="w-4 h-4" /> Contribute a price
          </ButtonLink>
          <ButtonLink href="/scam-feed" variant="outline">Report a scam</ButtonLink>
          <ButtonLink href="/markets" variant="outline">Explore markets</ButtonLink>
        </div>
      </Section>
    </StaticPage>
  );
}
