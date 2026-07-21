"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, X, Shield, ChevronDown,
  User, LogOut, Upload, LayoutDashboard, BarChart2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const NAV = [
  { label: "Check Price",    href: "/check-price"      },
  { label: "Scam Detector",  href: "/scam-check"       },
  { label: "Bargain Coach",  href: "/bargain"           },
  { label: "Markets",        href: "/markets"           },
  { label: "Compare Cities", href: "/compare"           },
  { label: "Translate",      href: "/translate"         },
  { label: "Scam Feed",      href: "/scam-feed"         },
];

function UserDropdown({ user, logout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const initial = (user?.name || user?.email || "U").charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-zinc-100 transition-colors"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[13px] font-bold overflow-hidden"
          style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)" }}
        >
          {user?.avatar
            ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            : initial}
        </div>
        <span className="text-[13px] font-semibold text-zinc-800 hidden sm:block max-w-[80px] truncate">
          {user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "Me"}
        </span>
        <ChevronDown
          className="w-3.5 h-3.5 text-zinc-400 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-zinc-100 py-1.5 z-50 animate-fade-in"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.10)" }}
        >
          <div className="px-4 py-2.5 border-b border-zinc-50 mb-1">
            <p className="text-[13px] font-bold text-zinc-900 truncate">
              {user?.name || "My Account"}
            </p>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5">{user?.email}</p>
          </div>
          {[
            { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
            { icon: User,            label: "Profile",   href: "/profile"   },
            { icon: BarChart2,       label: "Compare",   href: "/compare"   },
            { icon: Upload,          label: "Contribute",href: "/contribute" },
          ].map(({ icon: Icon, label, href }) => (
            <Link key={label} href={href} onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-zinc-700 hover:bg-zinc-50 transition-colors">
              <Icon className="w-4 h-4 text-zinc-400" />{label}
            </Link>
          ))}
          <div className="border-t border-zinc-50 mt-1 pt-1">
            <button onClick={() => { setOpen(false); logout(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors">
              <LogOut className="w-4 h-4" />Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobile,   setMobile]   = useState(false);
  const pathname                = usePathname();
  const { user, loading, logout } = useAuth();
  const isAuth = pathname?.startsWith("/auth");

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => setMobile(false), [pathname]);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(255,255,255,0.97)" : "rgba(255,255,255,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: scrolled ? "1px solid #f4f4f5" : "1px solid transparent",
        boxShadow: scrolled ? "0 1px 20px rgba(0,0,0,0.05)" : "none",
      }}
    >
      <div className="container">
        <div className="flex items-center h-[60px] gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)" }}>
              <Shield className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[17px] font-bold text-zinc-950 tracking-tight">
              Veri<span style={{ color: "#16a34a" }}>fee</span>
            </span>
          </Link>

          {/* Desktop nav */}
          {!isAuth && (
            <nav className="hidden lg:flex items-center gap-0.5 flex-1">
              {NAV.map(link => {
                const active = pathname === link.href;
                return (
                  <Link key={link.href} href={link.href}
                    className="text-[13px] font-medium px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                    style={{
                      color:      active ? "#16a34a" : "#52525b",
                      background: active ? "#f0fdf4" : "transparent",
                    }}>
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Auth */}
          <div className="hidden md:flex items-center gap-2 ml-auto shrink-0">
            {loading ? (
              <div className="w-28 h-8 shimmer rounded-xl" />
            ) : user ? (
              <UserDropdown user={user} logout={logout} />
            ) : (
              <>
                <Link href="/auth/login">
                  <button className="text-[13px] font-medium text-zinc-600 hover:text-zinc-900 px-3 py-2 rounded-lg hover:bg-zinc-100 transition-colors">
                    Sign in
                  </button>
                </Link>
                <Link href="/auth/signup">
                  <button className="btn-green text-[13px] px-4 py-2 rounded-xl">
                    Get started free
                  </button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          {!isAuth && (
            <button
              onClick={() => setMobile(!mobile)}
              className="lg:hidden ml-auto p-2 rounded-xl hover:bg-zinc-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobile
                ? <X className="w-5 h-5 text-zinc-700" />
                : <Menu className="w-5 h-5 text-zinc-700" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {mobile && !isAuth && (
        <div className="lg:hidden border-t border-zinc-100 animate-fade-in"
          style={{ background: "rgba(255,255,255,0.99)" }}>
          <div className="container py-3">
            <div className="space-y-0.5 mb-3">
              {NAV.map(link => {
                const active = pathname === link.href;
                return (
                  <Link key={link.href} href={link.href}
                    className="flex items-center px-3 py-3 rounded-xl text-[14px] font-medium transition-colors"
                    style={{
                      color:      active ? "#16a34a" : "#3f3f46",
                      background: active ? "#f0fdf4" : "transparent",
                    }}>
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <div className="border-t border-zinc-100 pt-3">
              {user ? (
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[14px] font-bold shrink-0 overflow-hidden"
                    style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)" }}>
                    {user.avatar
                      ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      : (user.name?.charAt(0) || "U").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-zinc-900 truncate">
                      {user.name || user.email}
                    </p>
                    <Link href="/profile" className="text-[11px] text-green-600 hover:underline">
                      View profile
                    </Link>
                  </div>
                  <button onClick={logout}
                    className="text-[12px] text-red-500 font-semibold border border-red-100 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 px-1">
                  <Link href="/auth/login" className="flex-1">
                    <button className="w-full text-[14px] font-medium border border-zinc-200 text-zinc-700 py-2.5 rounded-xl hover:bg-zinc-50 transition-colors">
                      Sign in
                    </button>
                  </Link>
                  <Link href="/auth/signup" className="flex-1">
                    <button className="w-full btn-green text-[14px] py-2.5 rounded-xl">
                      Get started
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}