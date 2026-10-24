"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";

/**
 * Shown after the buyer closes PayPal checkout. Answering is optional:
 * "Skip" still records that the checkout was cancelled.
 *
 * Props:
 *   reasons   [{ id, label }]  from GET /payments/config
 *   onSubmit(reason, note)     async; send the answer to the server
 *   onSkip()                   async; record the cancel without a reason
 */
export default function CancelReasonDialog({ reasons, onSubmit, onSkip }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,.4)", backdropFilter: "blur(4px)" }}
      onClick={() => !busy && run(onSkip)}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-6 animate-fade-up"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,.15)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="text-[16px] font-bold text-zinc-900">You cancelled. Why?</h3>
          <button
            onClick={() => run(onSkip)}
            disabled={busy}
            className="p-1.5 rounded-lg hover:bg-zinc-100 shrink-0"
            aria-label="Skip"
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
        <p className="text-[12px] text-zinc-500 mb-4">
          You were not charged. One tap helps us fix what put you off.
        </p>

        <div className="space-y-2 mb-4">
          {reasons.map((r) => {
            const active = reason === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setReason(r.id)}
                aria-pressed={active}
                className="w-full text-left text-[13px] px-3.5 py-2.5 rounded-xl border transition-all"
                style={{
                  background: active ? "#f0fdf4" : "#fff",
                  borderColor: active ? "#86efac" : "#e4e4e7",
                  color: active ? "#166534" : "#3f3f46",
                  fontWeight: active ? 600 : 500,
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {reason === "other" && (
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder="Tell us more (optional)"
            className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[13px] text-zinc-800 placeholder:text-zinc-400 bg-white resize-none mb-4"
          />
        )}

        <div className="flex gap-2">
          <button
            onClick={() => run(() => onSubmit(reason, note))}
            disabled={!reason || busy}
            className="flex-1 flex items-center justify-center gap-2 btn-green text-[13px] py-2.5 rounded-xl disabled:opacity-50"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Send
          </button>
          <button
            onClick={() => run(onSkip)}
            disabled={busy}
            className="text-[13px] font-medium text-zinc-600 border border-zinc-200 px-4 py-2.5 rounded-xl hover:bg-zinc-50 transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}