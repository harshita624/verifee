"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ScanLine, ShieldCheck, AlertTriangle, CheckCircle, Loader2,
  MapPin, QrCode, CreditCard, Sparkles, Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "@/hooks/useLocation";
import { CATEGORIES } from "@/lib/utils";
import { api, parseUpiUri, buildUpiUri, isValidVpa, formatInr } from "@/lib/payments";
import QrScanner from "@/components/payments/QrScanner";
import UpiQr from "@/components/payments/UpiQr";
import PayPalButton from "@/components/payments/PayPalButton";

const VERDICT = {
  Scam:       { color: "#dc2626", bg: "#fef2f2", label: "Likely overpriced" },
  Suspicious: { color: "#f59e0b", bg: "#fffbeb", label: "Higher than usual" },
  Fair:       { color: "#16a34a", bg: "#f0fdf4", label: "Fair price" },
};

const label = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5";
const input = "w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 bg-white";

export default function FairPayPage() {
  const { user, setLoggedIn } = useAuth();
  const { city: detectedCity } = useLocation();

  const [cfg, setCfg] = useState(null);
  const [vendor, setVendor] = useState({ pa: "", pn: "" });
  const [form, setForm] = useState({ product: "", city: "", category: "souvenirs", amount: "" });
  const [scanning, setScanning] = useState(false);
  const [guard, setGuard] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null); // { text, upgrade }
  const [method, setMethod] = useState("upi");
  const [ack, setAck] = useState(false);
  const [paid, setPaid] = useState(null);

  useEffect(() => {
    api("/payments/config", { auth: false }).then(setCfg).catch(() => {});
  }, []);

  useEffect(() => {
    if (detectedCity) setForm((f) => (f.city ? f : { ...f, city: detectedCity }));
  }, [detectedCity]);

  // Any change to what's being checked invalidates the AI verdict.
  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setGuard(null);
    setAck(false);
    setPaid(null);
  };

  const handleScan = (text) => {
    const parsed = parseUpiUri(text);
    if (!parsed) {
      setError({ text: "That QR isn't a UPI payment QR. Scan the vendor's UPI code (GPay, PhonePe, Paytm…)." });
      setScanning(false);
      return;
    }
    setError(null);
    setVendor({ pa: parsed.pa, pn: parsed.pn });
    if (parsed.am) update("amount", String(parsed.am));
    setScanning(false);
  };

  const runGuard = async () => {
    setError(null);
    setChecking(true);
    setGuard(null);
    setAck(false);
    setPaid(null);
    try {
      const g = await api("/payments/guard", {
        method: "POST",
        body: {
          product: form.product,
          city: form.city,
          category: form.category,
          quotedPriceInr: Number(form.amount),
          vendorName: vendor.pn,
        },
      });
      setGuard(g);
    } catch (e) {
      setError({ text: e.message, upgrade: e.status === 402 });
    } finally {
      setChecking(false);
    }
  };

  const canCheck = form.product.trim().length > 1 && Number(form.amount) > 0 && !checking;
  const vpaOk = isValidVpa(vendor.pa);
  const blocked = !!guard?.requiresConfirmation && !ack;
  const amount = Number(form.amount);

  const upiUri = useMemo(
    () =>
      vpaOk && amount > 0
        ? buildUpiUri({ pa: vendor.pa.trim(), pn: vendor.pn, am: amount, tn: `${form.product} via Verifee` })
        : "",
    [vpaOk, vendor, amount, form.product]
  );

  // ── PayPal ────────────────────────────────────────────────────────────────
  const createOrder = async () => {
    setError(null);
    const d = await api("/payments/paypal/create-order", {
      method: "POST",
      body: {
        kind: "fair_pay",
        guardToken: guard.guardToken,
        amountInr: amount,
        category: form.category,
        vendorName: vendor.pn,
        confirmRisk: ack,
      },
    });
    return d.orderId;
  };

  const onApproved = async (orderId) => {
    try {
      const d = await api("/payments/paypal/capture-order", { method: "POST", body: { orderId } });
      if (d.user) setLoggedIn(d.user);
      setPaid(d.payment);
    } catch (e) {
      setError({ text: e.message });
    }
  };

  const approx =
    cfg?.paypal.currency === "INR"
      ? formatInr(amount)
      : `$${(amount / (cfg?.inrPerUsd || 88)).toFixed(2)}`;

  const v = guard ? VERDICT[guard.verdict] || VERDICT.Suspicious : null;

  return (
    <div className="vf-page">
      <div className="bg-white border-b border-zinc-100 py-8">
        <div className="container">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-4" style={{ background: "#f0fdf4", border: "1px solid #dcfce7" }}>
            <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
            <span className="text-[12px] font-semibold text-green-700">AI Pay Guard</span>
          </div>
          <h1 className="text-[28px] md:text-[36px] font-black text-zinc-950 mb-3 leading-tight">Check it before you pay it.</h1>
          <p className="text-[15px] text-zinc-500 max-w-xl leading-relaxed">
            Scan the vendor&apos;s UPI QR, tell us what you&apos;re buying, and our AI compares the price with
            community data first. Then pay by UPI in India, or with PayPal from anywhere.
          </p>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid md:grid-cols-[380px_1fr] gap-6">
          {/* ── Left: inputs ── */}
          <div className="space-y-4">
            {scanning ? (
              <QrScanner onResult={handleScan} onClose={() => setScanning(false)} />
            ) : (
              <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                <h3 className="text-[14px] font-bold text-zinc-900 mb-4">1. Vendor</h3>
                <button
                  onClick={() => setScanning(true)}
                  className="w-full flex items-center justify-center gap-2 btn-green text-[14px] py-3 rounded-xl mb-3"
                >
                  <ScanLine className="w-4 h-4" /> Scan vendor&apos;s UPI QR
                </button>
                <label className={label}>or enter their UPI ID (optional)</label>
                <input
                  value={vendor.pa}
                  onChange={(e) => setVendor((s) => ({ ...s, pa: e.target.value.trim() }))}
                  placeholder="shopname@okaxis"
                  className={input}
                />
                {vendor.pa && !vpaOk && <p className="text-[11px] text-red-500 mt-1.5">That doesn&apos;t look like a valid UPI ID.</p>}
                {vpaOk && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "#f0fdf4", border: "1px solid #dcfce7" }}>
                    <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                    <p className="text-[12px] text-green-800 truncate">{vendor.pn || "Vendor"} · {vendor.pa}</p>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-2xl border border-zinc-100 p-5">
              <h3 className="text-[14px] font-bold text-zinc-900 mb-4">2. What are you buying?</h3>
              <div className="space-y-3">
                <div>
                  <label className={label}>Product or service</label>
                  <input value={form.product} onChange={(e) => update("product", e.target.value)} placeholder="e.g. Pashmina shawl, auto ride" className={input} />
                </div>
                <div>
                  <label className={label}>City</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                    <input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="e.g. Jaipur" className={`${input} pl-9`} />
                  </div>
                </div>
                <div>
                  <label className={label}>Category</label>
                  <select value={form.category} onChange={(e) => update("category", e.target.value)} className={input}>
                    {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label}>Price they want (₹)</label>
                  <input type="number" min="1" value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="e.g. 3500" className={input} />
                  <p className="text-[11px] text-zinc-400 mt-1">Bargained a lower price? Enter it here and re-check.</p>
                </div>
                <button
                  onClick={runGuard}
                  disabled={!canCheck}
                  className="w-full flex items-center justify-center gap-2 btn-green text-[14px] py-3 rounded-xl disabled:opacity-50"
                >
                  {checking ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</> : <><Sparkles className="w-4 h-4" /> Check with AI Pay Guard</>}
                </button>
              </div>
            </div>
          </div>

          {/* ── Right: verdict + payment ── */}
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] text-red-600 leading-relaxed">{error.text}</p>
                  {error.upgrade && (
                    <Link href="/pricing" className="inline-block mt-2 text-[12px] font-semibold text-green-700 hover:underline">See Verifee Pro →</Link>
                  )}
                </div>
              </div>
            )}

            {checking && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center">
                <Loader2 className="w-10 h-10 text-green-600 animate-spin mx-auto mb-4" />
                <p className="text-[15px] font-semibold text-zinc-700">Comparing with community prices…</p>
              </div>
            )}

            {!guard && !checking && !paid && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-10 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#f0fdf4" }}>
                  <ShieldCheck className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-[15px] font-semibold text-zinc-700 mb-2">Your AI verdict appears here</p>
                <p className="text-[13px] text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  Payment options unlock after the check, so you never pay a tourist price by accident.
                </p>
              </div>
            )}

            {guard && v && !paid && (
              <>
                <div className="rounded-2xl p-5" style={{ background: v.bg, border: `2px solid ${v.color}` }}>
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: v.color }}>AI verdict</p>
                      <p className="text-[22px] font-black" style={{ color: v.color }}>{v.label}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[36px] font-black leading-none" style={{ color: v.color }}>{guard.scamProbability}%</p>
                      <p className="text-[10px] text-zinc-500">overcharge risk</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { l: "They quoted", val: formatInr(guard.quotedPriceInr), c: "#dc2626" },
                      { l: "Fair range", val: `${formatInr(guard.fairPriceMin)}–${formatInr(guard.fairPriceMax)}`, c: "#16a34a" },
                      { l: "Offer", val: formatInr(guard.counterOffer), c: "#0ea5e9" },
                    ].map((s) => (
                      <div key={s.l} className="rounded-xl bg-white/70 p-2.5 text-center">
                        <p className="text-[10px] text-zinc-500 mb-0.5">{s.l}</p>
                        <p className="text-[13px] font-black" style={{ color: s.c }}>{s.val}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] mt-3" style={{ color: v.color }}>
                    {guard.dataSource === "community_verified"
                      ? `Based on ${guard.dataPoints} verified community receipts${guard.zScore != null ? ` (Z-score ${Number(guard.zScore).toFixed(1)})` : ""}.`
                      : "AI estimate. No community data for this item yet."}
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                  <p className="text-[11px] font-semibold text-green-600 uppercase tracking-wide mb-2">Say this now</p>
                  <p className="text-[15px] font-bold text-zinc-900">{guard.say}</p>
                  {guard.sayHindi && <p className="text-[13px] text-zinc-500 italic mt-1">{guard.sayHindi}</p>}
                  {guard.why && <p className="text-[12px] text-zinc-500 mt-2 leading-relaxed">{guard.why}</p>}
                  <Link
                    href={`/bargain?product=${encodeURIComponent(form.product)}&city=${encodeURIComponent(form.city)}`}
                    className="inline-block mt-3 text-[12px] font-semibold text-green-700 hover:underline"
                  >
                    Full bargaining script →
                  </Link>
                </div>

                {/* Payment */}
                <div className="bg-white rounded-2xl border border-zinc-100 p-5">
                  <h3 className="text-[14px] font-bold text-zinc-900 mb-4">3. Pay {formatInr(amount)}</h3>

                  {guard.requiresConfirmation && (
                    <label className="flex items-start gap-2.5 cursor-pointer mb-4 rounded-xl p-3" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                      <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5" />
                      <span className="text-[12px] text-red-700 leading-relaxed">
                        I understand the AI flagged this price as likely overpriced and I still want to pay it.
                      </span>
                    </label>
                  )}

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { id: "upi", label: "UPI QR (India)", icon: QrCode },
                      { id: "paypal", label: "PayPal / Card", icon: CreditCard },
                    ].map(({ id, label: l, icon: Icon }) => (
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
                        <Icon className="w-4 h-4" />{l}
                      </button>
                    ))}
                  </div>

                  {method === "upi" && (
                    !vpaOk ? (
                      <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 leading-relaxed">
                        Scan the vendor&apos;s UPI QR or enter their UPI ID on the left to generate the payment QR.
                      </p>
                    ) : blocked ? (
                      <p className="text-[12px] text-zinc-500 text-center py-4">Tick the box above to continue.</p>
                    ) : (
                      <div className="space-y-3">
                        <UpiQr uri={upiUri} vpa={vendor.pa} />
                        <p className="text-[11px] text-zinc-400 text-center leading-relaxed">
                          Scan with any UPI app, or tap Open UPI app on your phone. This payment goes straight to
                          the vendor; Verifee never handles the money.
                        </p>
                        <Link href="/contribute" className="block text-center text-[12px] font-semibold text-green-700 hover:underline">
                          Paid? Share the price and earn XP →
                        </Link>
                      </div>
                    )
                  )}

                  {method === "paypal" && (
                    !cfg?.paypal.enabled ? (
                      <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">PayPal isn&apos;t configured on the server yet.</p>
                    ) : !user ? (
                      <div className="rounded-xl p-4 text-center" style={{ background: "#fafafa", border: "1px solid #f4f4f5" }}>
                        <p className="text-[13px] text-zinc-600 mb-3">Sign in to pay with PayPal.</p>
                        <Link href="/auth/login?next=/pay" className="btn-green text-[13px] px-5 py-2 rounded-xl inline-block">Sign in</Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-[12px] text-zinc-500">You&apos;ll be charged about <b>{approx}</b> ({formatInr(amount)}).</p>
                        <PayPalButton
                          clientId={cfg.paypal.clientId}
                          currency={cfg.paypal.currency}
                          disabled={blocked}
                          createOrder={createOrder}
                          onApproved={onApproved}
                          onError={(e) => setError({ text: e?.message || "PayPal checkout failed. Please try again." })}
                          onCancel={() => setError({ text: "Checkout cancelled. You haven't been charged." })}
                        />
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          {cfg.paypal.env === "sandbox" && "Test mode: use a PayPal sandbox buyer account, no real money moves. "}
                          A captured payment is added to the community price data automatically.
                        </p>
                      </div>
                    )
                  )}
                </div>
              </>
            )}

            {paid && (
              <div className="bg-white rounded-2xl border border-green-100 p-8 text-center" style={{ boxShadow: "0 8px 32px rgba(22,163,74,0.08)" }}>
                <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)" }}>
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-[22px] font-black text-zinc-950 mb-1">
                  {paid.status === "captured" ? "Payment complete" : "Payment pending"}
                </h2>
                <p className="text-[13px] text-zinc-500 leading-relaxed mb-5">
                  {paid.status === "captured"
                    ? `${formatInr(paid.amountInr)} for ${paid.metadata?.product || "your purchase"} was captured. It's now a verified price in the community data, and you earned +80 XP.`
                    : "PayPal is still processing this payment. It will be recorded when it clears."}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Link href="/dashboard" className="btn-green text-[13px] px-5 py-2.5 rounded-xl inline-flex items-center gap-2"><Zap className="w-4 h-4" /> View XP</Link>
                  <button
                    onClick={() => { setPaid(null); setGuard(null); setForm((f) => ({ ...f, product: "", amount: "" })); }}
                    className="text-[13px] font-semibold text-zinc-700 border border-zinc-200 px-5 py-2.5 rounded-xl hover:bg-zinc-50"
                  >
                    Another payment
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}