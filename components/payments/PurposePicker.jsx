"use client";

/**
 * "Why are you paying?" chips. `purposes` comes from GET /payments/config
 * so the list always matches what the server accepts.
 */
export default function PurposePicker({ purposes, value, onChange }) {
  if (!purposes?.length) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
        What is this payment for?
      </p>
      <div className="flex flex-wrap gap-1.5">
        {purposes.map((p) => {
          const active = value === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.id)}
              aria-pressed={active}
              className="text-[12px] font-medium px-3 py-1.5 rounded-xl border transition-all"
              style={{
                background: active ? "#f0fdf4" : "#fff",
                borderColor: active ? "#86efac" : "#e4e4e7",
                color: active ? "#16a34a" : "#52525b",
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}