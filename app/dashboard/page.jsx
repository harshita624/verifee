"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Loader2, Shield, AlertTriangle, Globe2,
  MapPin, Upload, User, TrendingDown,
  Zap, Trophy, ChevronRight, Plus,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const QUICK_ACTIONS = [
  { label: "Check Price",    href: "/check-price",  icon: Shield,        color: "#16a34a", bg: "#f0fdf4" },
  { label: "Scam Detector",  href: "/scam-check",   icon: AlertTriangle, color: "#ef4444", bg: "#fef2f2" },
  { label: "Translate",      href: "/translate",    icon: Globe2,        color: "#0ea5e9", bg: "#f0f9ff" },
  { label: "Find Markets",   href: "/markets",      icon: MapPin,        color: "#8b5cf6", bg: "#faf5ff" },
  { label: "Contribute",     href: "/contribute",   icon: Upload,        color: "#f59e0b", bg: "#fffbeb" },
];

function StatCard({ label, value, icon: Icon, color, bg, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-medium text-zinc-500">{label}</p>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: bg }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="text-[22px] font-black text-zinc-950">{value}</p>
      {sub && <p className="text-[11px] text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [profileData, setProfileData]  = useState(null);
  const [loading,     setLoading]      = useState(false);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("vf_token");
    if (!token) return;
    setLoading(true);
    fetch(`${API}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setProfileData(d.data.user); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen pt-[60px] flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-green-600 animate-spin" />
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="min-h-screen pt-[60px] flex items-center justify-center px-5">
        <div className="text-center max-w-sm">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "#f0fdf4" }}
          >
            <User className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-[22px] font-black text-zinc-950 mb-2">Sign in to continue</h1>
          <p className="text-[14px] text-zinc-500 mb-6 leading-relaxed">
            Track your contributions, XP, and price checks after signing in.
          </p>
          <div className="flex gap-2 justify-center">
            <Link href="/auth/login">
              <button className="border border-zinc-200 text-zinc-700 font-semibold text-[13px] px-5 py-2.5 rounded-xl hover:bg-zinc-50 transition-colors">
                Sign in
              </button>
            </Link>
            <Link href="/auth/signup">
              <button
                className="text-white font-semibold text-[13px] px-5 py-2.5 rounded-xl transition-all active:scale-95"
                style={{ background: "#16a34a" }}
              >
                Create free account
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const u            = profileData || user;
  const xp           = u.xp            || 0;
  const level        = u.level          || 1;
  const contributions= u.contributionCount || 0;
  const badges       = (u.badges        || []).length;
  const xpToNext     = 1000;
  const xpProgress   = Math.min(((xp % xpToNext) / xpToNext) * 100, 100);

  const initial = (u.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen pt-[60px]" style={{ background: "#fafafa" }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg,#14532d,#16a34a)",
          paddingTop: 32,
          paddingBottom: 56,
        }}
      >
        <div className="container">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-[18px] font-black shrink-0 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              {u.avatar
                ? <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                : initial}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[20px] font-black text-white truncate">
                Welcome back, {(u.name || "there").split(" ")[0]}
              </h1>
              <p className="text-[13px] text-green-200 truncate">{u.email}</p>
            </div>
            <Link href="/profile">
              <button
                className="shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-xl transition-colors"
                style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}
              >
                View profile
              </button>
            </Link>
          </div>

          {/* XP bar */}
          <div className="mt-5 max-w-md">
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-green-300">{xp} XP · Level {level}</span>
              <span className="text-green-400">{xpToNext - (xp % xpToNext)} XP to Level {level + 1}</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${xpProgress}%`, background: "linear-gradient(90deg,#86efac,#22c55e)" }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container -mt-7 pb-16">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="Total XP"
            value={xp > 0 ? xp.toLocaleString() : "0"}
            icon={Zap}
            color="#f59e0b"
            bg="#fffbeb"
            sub="Lifetime points"
          />
          <StatCard
            label="Contributions"
            value={contributions.toString()}
            icon={Upload}
            color="#8b5cf6"
            bg="#faf5ff"
            sub="Price reports"
          />
          <StatCard
            label="Badges"
            value={badges.toString()}
            icon={Trophy}
            color="#16a34a"
            bg="#f0fdf4"
            sub="Earned so far"
          />
          <StatCard
            label="Level"
            value={`Level ${level}`}
            icon={TrendingDown}
            color="#0ea5e9"
            bg="#f0f9ff"
            sub="Keep contributing"
          />
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-5 mb-5">
          <h2 className="text-[14px] font-bold text-zinc-900 mb-4">Quick actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {QUICK_ACTIONS.map(({ label, href, icon: Icon, color, bg }) => (
              <Link key={label} href={href}>
                <div className="flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border border-zinc-100 hover:border-zinc-200 transition-all card-hover text-center">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: bg }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <span className="text-[12px] font-semibold text-zinc-700 leading-tight">{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Getting started — shown when no contributions */}
        {contributions === 0 && (
          <div className="bg-white rounded-2xl border border-zinc-100 p-5 mb-5">
            <h2 className="text-[14px] font-bold text-zinc-900 mb-1">Get started</h2>
            <p className="text-[13px] text-zinc-500 mb-4">
              Complete these steps to get the most out of Verifee.
            </p>
            <div className="space-y-2">
              {[
                {
                  label:  "Complete your profile",
                  desc:   "Add your city so prices are city-specific",
                  href:   "/profile",
                  done:   !!(u.city),
                  icon:   User,
                },
                {
                  label:  "Check your first price",
                  desc:   "Know the fair price before you buy anything",
                  href:   "/check-price",
                  done:   false,
                  icon:   Shield,
                },
                {
                  label:  "Contribute a price",
                  desc:   "Earn 50 XP and help future travelers",
                  href:   "/contribute",
                  done:   contributions > 0,
                  icon:   Upload,
                },
              ].map(({ label, desc, href, done, icon: Icon }) => (
                <Link key={label} href={href}>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition-colors">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: done ? "#f0fdf4" : "#fafafa" }}
                    >
                      {done
                        ? <CheckCircle className="w-4 h-4 text-green-500" />
                        : <Icon className="w-4 h-4 text-zinc-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-semibold ${done ? "text-zinc-400 line-through" : "text-zinc-800"}`}>
                        {label}
                      </p>
                      <p className="text-[11px] text-zinc-400">{desc}</p>
                    </div>
                    {!done && <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Contribute CTA when active user */}
        {contributions > 0 && (
          <div
            className="rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "1px solid #bbf7d0" }}
          >
            <div className="flex-1">
              <p className="text-[15px] font-bold text-green-900">
                You have {contributions} contribution{contributions !== 1 ? "s" : ""}
              </p>
              <p className="text-[13px] text-green-700 mt-0.5">
                Keep contributing to level up and unlock badges.
              </p>
            </div>
            <Link href="/contribute">
              <button
                className="flex items-center gap-2 text-white font-semibold text-[13px] px-5 py-2.5 rounded-xl transition-all active:scale-95 shrink-0"
                style={{ background: "#16a34a" }}
              >
                <Plus className="w-4 h-4" /> Add another
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// Need CheckCircle import
import { CheckCircle } from "lucide-react";