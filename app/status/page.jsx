"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { StaticPage, Card } from "@/components/layout/StaticPage";
import { API_BASE } from "@/lib/site";

function Row({ name, value, ok }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-zinc-50 last:border-0">
      <span className="text-[13px] font-semibold text-zinc-800">{name}</span>
      <span
        className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
        style={{
          background: ok ? "#f0fdf4" : "#fffbeb",
          color: ok ? "#16a34a" : "#b45309",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function StatusPage() {
  const [phase, setPhase] = useState("loading"); // loading | up | down
  const [info, setInfo] = useState(null);
  const [latency, setLatency] = useState(null);
  const [checkedAt, setCheckedAt] = useState(null);
  const [slow, setSlow] = useState(false);

  const check = useCallback(async () => {
    setPhase("loading");
    setSlow(false);
    const slowTimer = setTimeout(() => setSlow(true), 6000);
    const started = performance.now();
    try {
      const res = await fetch(`${API_BASE}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInfo(data);
      setLatency(Math.round(performance.now() - started));
      setPhase(data.status === "ok" ? "up" : "down");
    } catch {
      setInfo(null);
      setLatency(null);
      setPhase("down");
    } finally {
      clearTimeout(slowTimer);
      setCheckedAt(new Date());
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [check]);

  const up = phase === "up";

  return (
    <StaticPage
      eyebrow="Status"
      title="System status"
      intro="A live check of the Verifee API from your browser. It refreshes every 30 seconds."
    >
      <Card
        className="mb-6 flex items-center gap-4"
        style={{ borderColor: up ? "#bbf7d0" : "#e4e4e7" }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: phase === "loading" ? "#f4f4f5" : up ? "#f0fdf4" : "#fef2f2" }}
        >
          {phase === "loading" ? (
            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
          ) : up ? (
            <CheckCircle className="w-6 h-6 text-green-600" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-red-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[18px] font-black text-zinc-950">
            {phase === "loading" ? "Checking…" : up ? "All systems operational" : "API unreachable"}
          </p>
          <p className="text-[12px] text-zinc-400">
            {checkedAt ? `Last checked ${checkedAt.toLocaleTimeString()}` : "Running first check"}
            {latency != null && ` · ${latency} ms`}
          </p>
        </div>
        <button
          onClick={check}
          disabled={phase === "loading"}
          className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50"
          aria-label="Check again"
        >
          <RefreshCw className="w-4 h-4 text-zinc-600" />
        </button>
      </Card>

      {slow && phase === "loading" && (
        <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-6 leading-relaxed">
          This is taking a while. The server may be waking up after a quiet period, which can take up
          to a minute.
        </p>
      )}

      {phase === "down" && (
        <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-6 leading-relaxed">
          Could not reach the API. If this persists, your connection may be blocking it, or the
          service may be down. Try again in a minute, or contact us.
        </p>
      )}

      {info && (
        <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden mb-4">
          <Row name="API" value="Operational" ok />
          <Row name="AI provider" value={info.provider || "unknown"} ok={!!info.provider} />
          <Row
            name="PayPal payments"
            value={info.paypal ? (info.paypalEnv === "live" ? "Enabled" : "Enabled (test mode)") : "Not configured"}
            ok={!!info.paypal}
          />
          <Row name="UPI QR payments" value={info.upi ? "Enabled" : "Not configured"} ok={!!info.upi} />
        </div>
      )}

      <p className="text-[12px] text-zinc-400 leading-relaxed">
        PayPal and UPI rows show whether those payment methods are configured on our server, not the
        uptime of PayPal or your bank.
      </p>
    </StaticPage>
  );
}