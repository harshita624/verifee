import { StaticPage, Card } from "@/components/layout/StaticPage";
import { POSTS } from "@/lib/blog";

export const metadata = { title: "Blog — Verifee" };

export default function BlogPage() {
  return (
    <StaticPage
      eyebrow="Blog"
      title="Behind the numbers"
      intro="How Verifee works, in plain language."
    >
      <div className="flex flex-wrap gap-2 mb-8">
        {POSTS.map((p) => (
          <a
            key={p.id}
            href={`#${p.id}`}
            className="text-[12px] font-medium text-zinc-600 border border-zinc-200 bg-white px-3 py-1.5 rounded-full hover:border-green-300 hover:text-green-700 transition-colors"
          >
            {p.title}
          </a>
        ))}
      </div>

      <div className="space-y-6">
        {POSTS.map((p) => (
          <article key={p.id} id={p.id} className="scroll-mt-24">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #dcfce7" }}
                >
                  {p.tag}
                </span>
                {p.date && <span className="text-[11px] text-zinc-400">{p.date}</span>}
              </div>
              <h2 className="text-[22px] font-black text-zinc-950 leading-tight mb-2">{p.title}</h2>
              <p className="text-[14px] text-zinc-500 mb-4">{p.summary}</p>
              {p.body.map((para, i) => (
                <p key={i} className="text-[14px] text-zinc-600 leading-relaxed mb-3">
                  {para}
                </p>
              ))}
            </Card>
          </article>
        ))}
      </div>
    </StaticPage>
  );
}