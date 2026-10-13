"use client";

import { useEffect, useState } from "react";
import { Trophy, Loader2, Zap } from "lucide-react";
import { StaticPage, Section, Bullets, Card, ButtonLink } from "@/components/layout/StaticPage";
import { API_BASE } from "@/lib/site";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function CommunityPage() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/auth/top-contributors?limit=10`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setLeaders(d.data || []);
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <StaticPage
      eyebrow="Community"
      title="Prices from people who paid them"
      intro="Verifee gets more accurate with every verified receipt. Here are the people making it so."
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

      <Section title="How you earn XP">
        <Bullets
          items={[
            "Submit a price report: 50 XP.",
            "Your report is verified automatically because the price is plausible: 30 XP more, so 80 XP in total.",
            "Complete a Fair Pay payment with PayPal: it becomes a verified price report, worth 80 XP.",
            "Report a scam while signed in: 40 XP, for up to 3 reports a day.",
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