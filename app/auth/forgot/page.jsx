"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, ArrowLeft, Mail, CheckCircle, Loader2, AlertTriangle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ForgotPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res  = await fetch(`${API}/api/v1/auth/forgot-password`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Request failed");
      setSent(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16 pt-[80px]"
      style={{ background: "linear-gradient(160deg,#f0fdf4 0%,#fff 55%)" }}
    >
      <div className="relative w-full max-w-[400px]">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)" }}
            >
              <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[20px] font-bold text-zinc-950">
              Veri<span style={{ color: "#16a34a" }}>fee</span>
            </span>
          </Link>
        </div>

        {sent ? (
          <div
            className="bg-white rounded-2xl border border-zinc-100 p-8 text-center"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.06)" }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: "#f0fdf4" }}
            >
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-[20px] font-black text-zinc-950 mb-2">Check your inbox</h2>
            <p className="text-[14px] text-zinc-500 leading-relaxed mb-6">
              If an account exists for{" "}
              <span className="font-semibold text-zinc-800">{email}</span>, we sent a
              password reset link.
              <br />The link expires in 10 minutes.
            </p>
            <div className="space-y-2">
              <p className="text-[12px] text-zinc-400">Didn&apos;t receive it? Check spam, or</p>
              <button
                onClick={() => setSent(false)}
                className="text-[13px] font-semibold text-green-600 hover:underline"
              >
                try a different email
              </button>
            </div>
            <div className="mt-6 pt-5 border-t border-zinc-100">
              <Link
                href="/auth/login"
                className="flex items-center justify-center gap-2 text-[13px] font-medium text-zinc-500 hover:text-zinc-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          <div
            className="bg-white rounded-2xl border border-zinc-100 overflow-hidden"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.06)" }}
          >
            <div className="px-6 pt-6 pb-5 border-b border-zinc-50">
              <h1 className="text-[22px] font-black text-zinc-950 mb-1">Reset password</h1>
              <p className="text-[14px] text-zinc-500 leading-relaxed">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <p className="text-[12px] text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-zinc-200 pl-10 pr-3.5 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full flex items-center justify-center gap-2 text-white font-semibold text-[14px] py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#16a34a,#15803d)" }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send reset link"}
                </button>
              </form>

              <div className="rounded-xl px-4 py-3" style={{ background: "#fafafa", border: "1px solid #f4f4f5" }}>
                <p className="text-[12px] text-zinc-400 leading-relaxed">
                  The reset link is valid for 10 minutes. Signed up with Google? Use the same
                  email here to set a password for your account.
                </p>
              </div>
            </div>

            <div className="px-6 pb-5">
              <Link
                href="/auth/login"
                className="flex items-center justify-center gap-1.5 text-[13px] font-medium text-zinc-400 hover:text-zinc-700 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}