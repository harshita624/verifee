"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle, Crown, Loader2, AlertTriangle, CreditCard,
  QrCode, ShieldCheck, Clock, Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import PayPalButton from "@/components/payments/PayPalButton";
import CancelReasonDialog from "@/components/payments/CancelReasonDialog";
import UpiQr from "@/components/payments/UpiQr";
import { api, formatInr } from "@/lib/payments";

const STATUS_STYLE = {
  captured:             { label: "Paid",              bg: "#f0fdf4", color: "#16a34a" },
  pending_verification: { label: "Awaiting check",    bg: "#fffbeb", color: "#d97706" },
  approved:             { label: "Pending",           bg: "#fffbeb", color: "#d97706" },
  created:              { label: "Not completed",     bg: "#f4f4f5", color: "#71717a" },
  failed:               { label: "Failed",            bg: "#fef2f2", color: "#dc2626" },
  rejected:             { label: "Rejected",          bg: "#fef2f2", color: "#dc2626" },
  refunded:             { label: "Refunded",          bg: "#f4f4f5", color: "#71717a" },
  cancelled:            { label: "Cancelled",         bg: "#f4f4f5", color: "#71717a" },
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

export default function PricingPage() {
  const { user, loading: authLoading, setLoggedIn } = useAuth();

  const [cfg, setCfg] = useState(null);
  const [plan, setPlan] = useState("yearly");
  const [method, setMethod] = useState("paypal");
  const [msg, setMsg] = useState(null); // { type: "ok" | "err", text }
  const [upi, setUpi] = useState(null);
  const [utr, setUtr] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const [cancelFor, setCancelFor] = useState(null); // orderId waiting for a cancel reason
  const lastOrderRef = useRef(null);

  useEffect(() => {
    api("/payments/config", { auth: false })
      .then(setCfg)
      .catch((e) => setMsg({ type: "err", text: e.message }));
  }, []);

  const loadHistory = useCallback(() => {
    if (!user) return;
    api("/payments/mine").then(setHistory).catch(() => {});
  }, [user]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const monthly = cfg?.plans.find((p) => p.id === "monthly");
  const yearly = cfg?.plans.find((p) => p.id === "yearly");
  const selected = cfg?.plans.find((p) => p.id === plan);
  const savePct = monthly && yearly ? Math.round((1 - yearly.usd / (monthly.usd * 12)) * 100) : 0;

  const payPrice = (p) =>
    cfg?.paypal.currency === "INR" ? formatInr(p.inr) : `$${p.usd.toFixed(2)}`;

  // ── PayPal ─────────────────────────────────────────────────────────────────
  const createOrder = async () => {
    setMsg(null);
    const d = await api("/payments/paypal/create-order", { method: "POST", body: { kind: "pro_plan", plan } });
    lastOrderRef.current = d.orderId;
    return d.orderId;
  };

  // ── Cancellation reason ─────────────────────────────────────────────────────
  const sendCancel = async (reason, note) => {
    try {
      if (cancelFor) {
        await api("/payments/paypal/cancel-order", {
          method: "POST",
          body: { orderId: cancelFor, reason, note },
        });
      }
    } catch {
      /* the checkout is cancelled either way; the reason is best-effort */
    }
    setCancelFor(null);
    setMsg({ type: "err", text: "Checkout cancelled. You were not charged." });
    loadHistory();
  };

  const onApproved = async (orderId) => {
    try {
      const d = await api("/payments/paypal/capture-order", { method: "POST", body: { orderId } });
      if (d.user) setLoggedIn(d.user);
      setMsg({
        type: "ok",
        text: d.user ? "Payment successful. Verifee Pro is now active." : "Payment pending with PayPal. Pro activates when it clears.",
      });
      loadHistory();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  };

  // ── UPI ────────────────────────────────────────────────────────────────────
  const startUpi = async () => {
    setBusy(true);
    setMsg(null);
    try {
      setUpi(await api("/payments/upi/create", { method: "POST", body: { plan } }));
      setUtr("");
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const submitUtr = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const d = await api("/payments/upi/submit", { method: "POST", body: { paymentId: upi.paymentId, utr } });
      setMsg({ type: "ok", text: d.message || "Submitted. We'll confirm your payment shortly." });
      setUpi(null);
      loadHistory();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const proUntil = user?.isPro && user?.planExpires ? fmtDate(user.planExpires) : null;

  return (
    <div className="vf-page">
      <div className="bg-white border-b border-zinc-100 py-10">
        <div className="container">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-4" style={{ background: "#f0fdf4", border: "1px solid #dcfce7" }}>
            <Crown className="w-3.5 h-3.5 text-green-600" />
            <span className="text-[12px] font-semibold text-green-700">Verifee Pro</span>
          </div>
          <h1 className="text-[28px] md:text-[38px] font-black text-zinc-950 mb-3 leading-tight">
            Unlimited AI protection<br className="hidden sm:block" /> at every counter.
          </h1>
          <p className="text-[15px] text-zinc-500 max-w-xl leading-relaxed">
            Free accounts get {cfg?.freeDailyPremiumCalls ?? 3} premium AI actions a day (AI Pay Guard,
            Bargain Coach, Receipt Verifier). Pro removes the limit.
          </p>
        </div>
      </div>

      <div className="container py-8">
        {proUntil && (
          <div className="rounded-2xl p-4 mb-6 flex items-center gap-3" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            <p className="text-[14px] font-semibold text-green-800">You&apos;re on Pro until {proUntil}. Buying again extends it.</p>
          </div>
        )}

        {msg && (
          <div
            className="rounded-2xl p-4 mb-6 flex items-start gap-3"
            style={{
              background: msg.type === "ok" ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${msg.type === "ok" ? "#bbf7d0" : "#fecaca"}`,
            }}
          >
            {msg.type === "ok"
              ? <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              : <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
            <p className="text-[13px] leading-relaxed" style={{ color: msg.type === "ok" ? "#166534" : "#b91c1c" }}>{msg.text}</p>
          </div>
        )}

        <div className="grid md:grid-cols-[1fr_420px] gap-6">
          {/* Plans */}
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                <p className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Free</p>
                <p className="text-[28px] font-black text-zinc-950 mb-4">₹0</p>
                <ul className="space-y-2.5">
                  {[
                    "Fair price checks",
                    "Scam detector",
                    "Markets, city compare, translator",
                    `${cfg?.freeDailyPremiumCalls ?? 3} premium AI actions per day`,
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-zinc-600">
                      <CheckCircle className="w-4 h-4 text-zinc-300 shrink-0 mt-0.5" />{f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl p-5 relative" style={{ background: "linear-gradient(135deg,#14532d,#16a34a)" }}>
                <p className="text-[12px] font-semibold text-green-200 uppercase tracking-wide mb-1">Pro</p>
                <p className="text-[28px] font-black text-white mb-4">
                  {selected ? payPrice(selected) : "—"}
                  <span className="text-[13px] font-medium text-green-200"> / {plan === "yearly" ? "year" : "month"}</span>
                </p>
                <ul className="space-y-2.5">
                  {[
                    "Unlimited AI Pay Guard before every payment",
                    "Unlimited Bargain Coach + Live Mode",
                    "Unlimited Receipt Verifier",
                    "Pro badge on your account",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-green-50">
                      <CheckCircle className="w-4 h-4 text-green-300 shrink-0 mt-0.5" />{f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Payment history */}
            {user && history.length > 0 && (
              <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-zinc-50">
                  <h3 className="text-[13px] font-bold text-zinc-900">Your payments</h3>
                </div>
                <div className="divide-y divide-zinc-50">
                  {history.map((p) => {
                    const st = STATUS_STYLE[p.status] || STATUS_STYLE.created;
                    return (
                      <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-zinc-800 truncate">
                            {p.kind === "pro_plan" ? `Verifee ${p.plan === "yearly" ? "Pro Yearly" : "Pro Monthly"}` : `Fair Pay · ${p.metadata?.product || "purchase"}`}
                          </p>
                          <p className="text-[11px] text-zinc-400">{fmtDate(p.createdAt)} · {p.provider === "paypal" ? "PayPal" : "UPI"}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-bold text-zinc-900">
                            {p.currency === "INR" ? formatInr(p.amount) : `$${Number(p.amount).toFixed(2)}`}
                          </p>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Checkout */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-5 h-fit" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}>
            <h3 className="text-[15px] font-bold text-zinc-900 mb-4">Get Pro</h3>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {[monthly, yearly].filter(Boolean).map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setPlan(p.id); setUpi(null); }}
                  className="rounded-xl border p-3 text-left transition-all"
                  style={{
                    background: plan === p.id ? "#f0fdf4" : "#fff",
                    borderColor: plan === p.id ? "#86efac" : "#e4e4e7",
                  }}
                >
                  <p className="text-[12px] font-semibold" style={{ color: plan === p.id ? "#16a34a" : "#52525b" }}>
                    {p.id === "yearly" ? "Yearly" : "Monthly"}
                    {p.id === "yearly" && savePct > 0 && <span className="ml-1 text-[10px] text-green-600">save {savePct}%</span>}
                  </p>
                  <p className="text-[18px] font-black text-zinc-950">{payPrice(p)}</p>
                  <p className="text-[10px] text-zinc-400">or {formatInr(p.inr)} via UPI</p>
                </button>
              ))}
            </div>

            {authLoading ? (
              <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 text-green-600 animate-spin" /></div>
            ) : !user ? (
              <div className="rounded-xl p-4 text-center" style={{ background: "#fafafa", border: "1px solid #f4f4f5" }}>
                <p className="text-[13px] text-zinc-600 mb-3">Sign in to upgrade. Your plan is tied to your account.</p>
                <div className="flex gap-2 justify-center">
                  <Link href="/auth/login?next=/pricing" className="text-[13px] font-semibold border border-zinc-200 text-zinc-700 px-4 py-2 rounded-xl hover:bg-white">Sign in</Link>
                  <Link href="/auth/signup?next=/pricing" className="btn-green text-[13px] px-4 py-2 rounded-xl">Create account</Link>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { id: "paypal", label: "PayPal / Card", icon: CreditCard },
                    { id: "upi", label: "UPI QR (India)", icon: QrCode },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setMethod(id)}
                      className="flex items-center justify-center gap-2 text-[12px] font-semibold py-2.5 rounded-xl border transition-all"
                      style={{
                        background: method === id ? "#f0fdf4" : "#fff",
                        borderColor: method === id ? "#86efac" : "#e4e4e7",
                        color: method === id ? "#16a34a" : "#52525b",
                      }}
                    >
                      <Icon className="w-4 h-4" />{label}
                    </button>
                  ))}
                </div>

                {method === "paypal" && (
                  cfg?.paypal.enabled ? (
                    <div className="space-y-3">
                      <PayPalButton
                        clientId={cfg.paypal.clientId}
                        currency={cfg.paypal.currency}
                        createOrder={createOrder}
                        onApproved={onApproved}
                        onError={(e) => setMsg({ type: "err", text: e?.message || "PayPal checkout failed. Please try again." })}
                        onCancel={(orderId) => setCancelFor(orderId || lastOrderRef.current)}
                      />
                      <p className="text-[11px] text-zinc-400 leading-relaxed flex items-start gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        Secure checkout by PayPal. {cfg.paypal.env === "sandbox" && "Test mode: use a PayPal sandbox buyer account, no real money moves."}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">PayPal isn&apos;t configured on the server yet.</p>
                  )
                )}

                {method === "upi" && (
                  cfg?.upi.enabled ? (
                    !upi ? (
                      <div className="space-y-3">
                        <button onClick={startUpi} disabled={busy} className="w-full flex items-center justify-center gap-2 btn-green text-[14px] py-3 rounded-xl disabled:opacity-50">
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                          Show UPI QR for {selected ? formatInr(selected.inr) : ""}
                        </button>
                        <p className="text-[11px] text-zinc-400 leading-relaxed flex items-start gap-1.5">
                          <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          UPI payments are confirmed manually after you submit the transaction ID, so Pro may take a little while to activate.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <UpiQr uri={upi.uri} vpa={upi.vpa} />
                        <p className="text-[12px] text-zinc-500 text-center leading-relaxed">
                          Scan with GPay, PhonePe, Paytm or any UPI app and pay <b>{formatInr(upi.amountInr)}</b>.
                          Then enter the 12-digit UPI transaction ID (UTR) from the receipt.
                        </p>
                        <input
                          value={utr}
                          onChange={(e) => setUtr(e.target.value.replace(/\D/g, "").slice(0, 12))}
                          inputMode="numeric"
                          placeholder="12-digit UTR, e.g. 412345678901"
                          className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 bg-white text-center tracking-widest"
                        />
                        <button onClick={submitUtr} disabled={busy || utr.length !== 12} className="w-full flex items-center justify-center gap-2 btn-green text-[14px] py-3 rounded-xl disabled:opacity-50">
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                          I&apos;ve paid, submit transaction ID
                        </button>
                        <p className="text-[10px] text-zinc-400 text-center">Reference {upi.txnRef}</p>
                      </div>
                    )
                  ) : (
                    <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">UPI isn&apos;t configured on the server yet.</p>
                  )
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {cancelFor && cfg?.cancelReasons?.pro_plan && (
        <CancelReasonDialog
          reasons={cfg.cancelReasons.pro_plan}
          onSubmit={sendCancel}
          onSkip={() => sendCancel("skipped", "")}
        />
      )}
    </div>
  );
}