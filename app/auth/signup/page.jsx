"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff, ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function SignupPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setLoggedIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) { setError("Please accept the terms to continue."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/v1/auth/signup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Signup failed");
      localStorage.setItem("vf_token", data.data.token);
      setLoggedIn(data.data.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5 py-16"
      style={{ background: "linear-gradient(160deg,#f0fdf4 0%,#fff 55%)" }}
    >
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
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
          <h1 className="text-[26px] font-black text-zinc-950 mb-1">Create your account</h1>
          <p className="text-[14px] text-zinc-500">Free — no credit card needed</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 mb-4">
              <p className="text-[13px] text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {[
              { key: "name", label: "Full name", type: "text", placeholder: "Your name" },
              { key: "email", label: "Email", type: "email", placeholder: "you@example.com" },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                  {label}
                </label>
                <input
                  type={type}
                  required
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 bg-white"
                  style={{ outline: "none" }}
                />
              </div>
            ))}

            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 bg-white pr-10"
                  style={{ outline: "none" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <div
                onClick={() => setAgreed(!agreed)}
                className="w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors"
                style={{
                  background: agreed ? "#16a34a" : "#fff",
                  borderColor: agreed ? "#16a34a" : "#d4d4d8",
                }}
              >
                {agreed && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-[12px] text-zinc-500 leading-relaxed">
                I agree to the{" "}
                <Link href="#" className="text-green-600 hover:underline">Terms of Service</Link>{" "}
                and{" "}
                <Link href="#" className="text-green-600 hover:underline">Privacy Policy</Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !agreed}
              className="w-full flex items-center justify-center gap-2 text-white font-semibold text-[14px] py-2.5 rounded-xl transition-colors"
              style={{ background: loading || !agreed ? "#86efac" : "#16a34a", cursor: !agreed ? "not-allowed" : "pointer" }}
            >
              {loading ? (
                <span
                  className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full"
                  style={{ animation: "spin 0.7s linear infinite" }}
                />
              ) : (
                <>Create account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] text-zinc-500 mt-5">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-green-600 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}