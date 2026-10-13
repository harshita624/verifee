import Link from "next/link";

/**
 * Shared shell for About, Help, legal pages, etc.
 * NOTE: we use `max-w-* mx-auto px-5` instead of the global `.container` class,
 * because `.container` sets its own max-width and would override max-w-3xl.
 */
export function StaticPage({ eyebrow, title, intro, updated, wide = false, children }) {
  return (
    <div className="vf-page">
      <div className="bg-white border-b border-zinc-100 py-10">
        <div className={`${wide ? "max-w-5xl" : "max-w-3xl"} mx-auto px-5`}>
          {eyebrow && <p className="section-label mb-3">{eyebrow}</p>}
          <h1 className="text-[28px] md:text-[38px] font-black text-zinc-950 leading-tight mb-3">
            {title}
          </h1>
          {intro && (
            <p className="text-[15px] text-zinc-500 leading-relaxed max-w-xl">{intro}</p>
          )}
          {updated && <p className="text-[12px] text-zinc-400 mt-3">Last updated {updated}</p>}
        </div>
      </div>
      <div className={`${wide ? "max-w-5xl" : "max-w-3xl"} mx-auto px-5 py-10`}>{children}</div>
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <section className="mb-9">
      <h2 className="text-[18px] font-black text-zinc-900 mb-3">{title}</h2>
      {children}
    </section>
  );
}

export function P({ children }) {
  return <p className="text-[14px] text-zinc-600 leading-relaxed mb-3">{children}</p>;
}

export function Bullets({ items }) {
  return (
    <ul className="space-y-2 mb-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[14px] text-zinc-600 leading-relaxed">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 mt-[9px]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Card({ children, className = "", style }) {
  return (
    <div className={`bg-white rounded-2xl border border-zinc-100 p-5 ${className}`} style={style}>
      {children}
    </div>
  );
}

export function Callout({ tone = "green", children }) {
  const tones = {
    green: { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534" },
    amber: { bg: "#fffbeb", border: "#fde68a", color: "#92400e" },
    zinc: { bg: "#fafafa", border: "#e4e4e7", color: "#52525b" },
  };
  const t = tones[tone] || tones.green;
  return (
    <div
      className="rounded-2xl p-4 mb-6 text-[13px] leading-relaxed"
      style={{ background: t.bg, border: `1px solid ${t.border}`, color: t.color }}
    >
      {children}
    </div>
  );
}

export function ButtonLink({ href, children, variant = "solid", external = false }) {
  const cls =
    variant === "solid"
      ? "btn-green text-[13px] px-5 py-2.5 rounded-xl inline-flex items-center gap-2"
      : "text-[13px] font-semibold text-zinc-700 border border-zinc-200 bg-white px-5 py-2.5 rounded-xl hover:bg-zinc-50 transition-colors inline-flex items-center gap-2";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

/** Renders [{ h, p: [], ul: [] }] as numbered sections. Used by the legal pages. */
export function LegalSections({ sections }) {
  return sections.map((s, i) => (
    <Section key={s.h} title={`${i + 1}. ${s.h}`}>
      {(s.p || []).map((t, j) => (
        <P key={`p${j}`}>{t}</P>
      ))}
      {s.ul && <Bullets items={s.ul} />}
      {(s.after || []).map((t, j) => (
        <P key={`a${j}`}>{t}</P>
      ))}
    </Section>
  ));
}