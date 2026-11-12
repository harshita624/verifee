"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Printer, ShieldCheck } from "lucide-react";
import { api, formatInr } from "@/lib/payments";

const dateTime = (value) => value
  ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })
  : "Not available";

export default function PaymentReceiptPage() {
  const { paymentId } = useParams();
  const router = useRouter();
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!paymentId) return;
    api(`/payments/receipt/${paymentId}`)
      .then(setReceipt)
      .catch((err) => setError(err.message || "Could not load this receipt."))
      .finally(() => setLoading(false));
  }, [paymentId]);

  if (loading) return <main className="min-h-screen pt-28 text-center text-zinc-500">Loading receipt…</main>;
  if (error) return (
    <main className="min-h-screen pt-28 px-5 text-center">
      <p className="text-red-600 font-semibold">{error}</p>
      <button onClick={() => router.back()} className="mt-4 text-green-700 underline">Go back</button>
    </main>
  );

  const hasExpected = receipt.referenceAvailable && receipt.expectedPriceMin != null && receipt.expectedPriceMax != null;

  return (
    <main className="vf-page min-h-screen py-10 print:bg-white print:py-0">
      <div className="container max-w-2xl">
        <div className="flex justify-between items-center mb-5 print:hidden">
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600"><ArrowLeft size={16} /> Back</button>
          <button onClick={() => window.print()} className="btn-green inline-flex items-center gap-2 px-4 py-2 rounded-xl"><Printer size={16} /> Print / Save PDF</button>
        </div>

        <article className="bg-white rounded-3xl border border-zinc-100 p-7 md:p-10 shadow-sm print:shadow-none print:border-0">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 text-green-700 font-bold"><ShieldCheck size={19} /> Verifee</div>
              <h1 className="text-2xl font-black text-zinc-950 mt-3">Payment receipt</h1>
              <p className="text-sm text-zinc-500 mt-1">Receipt {receipt.receiptNumber}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 px-3 py-2 rounded-full"><CheckCircle size={14} /> {receipt.paymentStatus === "refunded" ? "Payment refunded" : "PayPal payment captured"}</span>
          </div>

          <section className="grid sm:grid-cols-2 gap-5 py-6 border-b border-zinc-100 text-sm">
            <div><p className="text-zinc-400">Product or service</p><p className="font-semibold text-zinc-900 mt-1">{receipt.productOrService}</p></div>
            <div><p className="text-zinc-400">Merchant or seller noted</p><p className="font-semibold text-zinc-900 mt-1">{receipt.merchantName}</p>{receipt.merchantNameSource === "buyer_provided" && <p className="text-[10px] text-zinc-400">Name supplied by the buyer at checkout</p>}{receipt.merchantNameSource === "verified_merchant_profile" && <p className="text-[10px] text-green-700">Connected seller profile</p>}</div>
            <div><p className="text-zinc-400">PayPal recipient</p><p className="font-semibold text-zinc-900 mt-1">{receipt.paypalRecipient}</p></div>
            <div><p className="text-zinc-400">City</p><p className="font-semibold text-zinc-900 mt-1">{receipt.city || "Not provided"}</p></div>
            <div><p className="text-zinc-400">Payment time (IST)</p><p className="font-semibold text-zinc-900 mt-1">{dateTime(receipt.paymentTimestamp)}</p></div>
          </section>

          <section className="py-6 border-b border-zinc-100">
            <h2 className="font-bold text-zinc-900 mb-4">Price check</h2>
            <div className="flex justify-between gap-4 text-sm py-2"><span className="text-zinc-500">Verifee reference price</span><span className="font-semibold text-zinc-900 text-right">{hasExpected ? `${formatInr(receipt.expectedPriceMin)} – ${formatInr(receipt.expectedPriceMax)}` : "No reference captured"}</span></div>
            {hasExpected && <p className="text-xs text-zinc-400">{receipt.expectedPriceSource === "community_verified" ? `Based on ${receipt.expectedPriceDataPoints} verified community reports` : receipt.expectedPriceSource === "ai_estimate" ? "AI estimate at the time of checkout" : "Price source not recorded"}</p>}
            <div className="flex justify-between gap-4 text-sm py-3 mt-2 border-t border-zinc-100"><span className="font-semibold text-zinc-800">{receipt.paypalRecipient === "Verifee platform account" ? "Paid to Verifee via PayPal" : "Paid to connected seller via PayPal"}</span><span className="font-black text-zinc-950">{receipt.actualPriceInr != null ? formatInr(receipt.actualPriceInr) : `${receipt.currency} ${Number(receipt.chargedAmount).toFixed(2)}`}</span></div>
            {receipt.currency !== "INR" && <p className="text-xs text-zinc-400">PayPal charged {receipt.currency} {Number(receipt.chargedAmount).toFixed(2)}. INR value is the conversion recorded by Verifee at checkout.</p>}
          </section>

          <section className="py-6 text-sm">
            <h2 className="font-bold text-zinc-900 mb-3">Transaction details</h2>
            <div className="flex justify-between gap-4 py-2"><span className="text-zinc-500">Payment method</span><span className="font-semibold">PayPal</span></div>
            <div className="flex justify-between gap-4 py-2"><span className="text-zinc-500">PayPal transaction ID</span><span className="font-mono text-xs font-semibold text-right break-all">{receipt.paypalTransactionId}</span></div>
          </section>

          <p className="text-[11px] text-zinc-400 border-t border-zinc-100 pt-5 leading-relaxed">{receipt.paypalRecipient === "Verifee platform account" ? "This receipt records a PayPal payment to Verifee. A seller name is buyer-provided and does not mean the seller received funds." : "This receipt records the PayPal capture routed to the connected seller profile; it is not a tax invoice."} The reference price is guidance, not proof of merchant misconduct.</p>{receipt.refund && <p className="mt-3 text-xs font-semibold text-amber-700">Refund: {receipt.refund.status || receipt.paymentStatus}{receipt.refund.id ? ` · PayPal refund ${receipt.refund.id}` : ""}</p>}
        </article>
      </div>
      <style jsx global>{`@media print { header, footer, nav { display: none !important; } body { background: #fff !important; } }`}</style>
    </main>
  );
}
