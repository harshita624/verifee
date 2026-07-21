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

  const handleGoogle = () => {
    // Redirect to backend Google OAuth — set up in your Express app
    window.location.href = `${API}/api/v1/auth/google/callback?next=/auth/reset-success`;
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16 pt-[80px]"
      style={{ background: "linear-gradient(160deg,#f0fdf4 0%,#fff 55%)" }}
    >
      {/* Background accent */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 20%, rgba(22,163,74,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-[400px]">
        {/* Logo */}
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
          /* ── Success state ── */
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
              We sent a password reset link to{" "}
              <span className="font-semibold text-zinc-800">{email}</span>.
              <br />The link expires in 10 minutes.
            </p>
            <div className="space-y-2">
              <p className="text-[12px] text-zinc-400">Didn't receive it?</p>
              <button
                onClick={() => setSent(false)}
                className="text-[13px] font-semibold text-green-600 hover:underline"
              >
                Try again with a different email
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
          /* ── Form state ── */
          <div
            className="bg-white rounded-2xl border border-zinc-100 overflow-hidden"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.06)" }}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-5 border-b border-zinc-50">
              <h1 className="text-[22px] font-black text-zinc-950 mb-1">Reset password</h1>
              <p className="text-[14px] text-zinc-500 leading-relaxed">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Google option */}
              <div>
                <p className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                  If you signed up with Google
                </p>
                <button
                  onClick={handleGoogle}
                  className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 font-semibold text-[14px] py-2.5 rounded-xl transition-colors"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google instead
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-100" />
                <span className="text-[11px] text-zinc-400 font-medium">or reset with email</span>
                <div className="flex-1 h-px bg-zinc-100" />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <p className="text-[12px] text-red-600">{error}</p>
                </div>
              )}

              {/* Email form */}
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
                  {loading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : "Send reset link"}
                </button>
              </form>

              {/* Info */}
              <div
                className="rounded-xl px-4 py-3"
                style={{ background: "#fafafa", border: "1px solid #f4f4f5" }}
              >
                <p className="text-[12px] text-zinc-400 leading-relaxed">
                  The reset link is valid for 10 minutes. Check your spam folder
                  if you don't see it in your inbox.
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