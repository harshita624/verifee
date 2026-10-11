"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Shield, Eye, EyeOff, Lock, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const router = useRouter();
  const { setLoggedIn } = useAuth();

  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [show,     setShow]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/auth/reset-password/${encodeURIComponent(token)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not reset password");
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
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)" }}>
              <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[20px] font-bold text-zinc-950">
              Veri<span style={{ color: "#16a34a" }}>fee</span>
            </span>
          </Link>
          <h1 className="text-[26px] font-black text-zinc-950 mb-1">Choose a new password</h1>
          <p className="text-[14px] text-zinc-500">At least 8 characters</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] text-red-600">{error}</p>
                {/expired|invalid/i.test(error) && (
                  <Link href="/auth/forgot" className="text-[12px] font-semibold text-green-700 hover:underline">
                    Request a new link
                  </Link>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">New password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type={show ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full rounded-xl border border-zinc-200 pl-10 pr-10 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Confirm password</label>
              <input
                type={show ? "text" : "password"}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-800 placeholder:text-zinc-400 bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-white font-semibold text-[14px] py-2.5 rounded-xl transition-colors disabled:opacity-60"
              style={{ background: "#16a34a" }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}