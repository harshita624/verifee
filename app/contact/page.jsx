"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, AlertTriangle, Loader2, Mail, Send } from "lucide-react";
import { StaticPage, Card } from "@/components/layout/StaticPage";
import { API_BASE, SITE } from "@/lib/site";

const TOPICS = ["General", "Support", "Payments", "Report a problem", "Press", "Partnerships"];

const label = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5";
const input = "w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 bg-white";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", topic: "General", message: "", website: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not send your message. Please try again.");
      setDone(true);
    } catch (err) {
      setError(err.message || "Could not send your message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <StaticPage
      eyebrow="Contact"
      title="Talk to us"
      intro="Questions, feedback, a payment problem or a press request. Send a message and we will reply by email."
    >
      <div className="grid md:grid-cols-[1fr_260px] gap-6">
        <Card className="p-6">
          {done ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#f0fdf4" }}>
                <CheckCircle className="w-7 h-7 text-green-500" />
              </div>
              <h2 className="text-[18px] font-black text-zinc-950 mb-1">Message sent</h2>
              <p className="text-[13px] text-zinc-500">Thank you. We will reply to {form.email}.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[13px] text-red-600">{error}</p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={label}>Your name</label>
                  <input className={input} required maxLength={80} value={form.name} onChange={set("name")} placeholder="Your name" />
                </div>
                <div>
                  <label className={label}>Email</label>
                  <input className={input} type="email" required maxLength={120} value={form.email} onChange={set("email")} placeholder="you@example.com" />
                </div>
              </div>

              <div>
                <label className={label}>Topic</label>
                <select className={input} value={form.topic} onChange={set("topic")}>
                  {TOPICS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className={label}>Message</label>
                <textarea
                  className={`${input} resize-none`}
                  rows={6}
                  required
                  minLength={10}
                  maxLength={3000}
                  value={form.message}
                  onChange={set("message")}
                  placeholder="How can we help?"
                />
              </div>

              {/* Honeypot: real people never see or fill this. Bots do. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={set("website")}
                className="absolute opacity-0 pointer-events-none h-0 w-0"
                aria-hidden="true"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 btn-green text-[14px] py-3 rounded-xl disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send message
              </button>
            </form>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-green-600" />
              <p className="text-[13px] font-bold text-zinc-900">Email</p>
            </div>
            <a href={`mailto:${SITE.contactEmail}`} className="text-[13px] text-green-600 font-semibold hover:underline break-all">
              {SITE.contactEmail}
            </a>
          </Card>
          <Card>
            <p className="text-[13px] font-bold text-zinc-900 mb-1.5">Were you overcharged?</p>
            <p className="text-[12px] text-zinc-500 leading-relaxed mb-2">
              Warn other travelers directly in the Scam Feed.
            </p>
            <Link href="/scam-feed" className="text-[12px] font-semibold text-green-700 hover:underline">
              Report a scam →
            </Link>
          </Card>
          <Card>
            <p className="text-[13px] font-bold text-zinc-900 mb-1.5">Quick answers</p>
            <Link href="/help" className="text-[12px] font-semibold text-green-700 hover:underline">
              Visit the Help Center →
            </Link>
          </Card>
        </div>
      </div>
    </StaticPage>
  );
}