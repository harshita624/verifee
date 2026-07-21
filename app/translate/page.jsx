"use client";

import { useState } from "react";
import { Globe2, Loader2, Volume2, ArrowRight, ArrowLeftRight } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { LANGUAGES } from "@/lib/utils";

const QUICK_PHRASES = [
  "What is your best price?",
  "Is this your final price?",
  "I will pay ₹500 for this.",
  "This is too expensive.",
  "Do you have a cheaper one?",
  "I am a local, not a tourist.",
  "I will look at another shop.",
  "Can I get a discount?",
  "Where is the nearest ATM?",
  "Is this authentic?",
];

export default function TranslatePage() {
  const [text, setText] = useState("");
  const [targetLang, setTargetLang] = useState("hi");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleTranslate = async (inputText) => {
    const t = inputText || text;
    if (!t.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/v1/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t, targetLang }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      const data = await res.json();
      setResult(data.data);
    } catch (err) {
      setError(err.message || "Translation failed.");
    } finally {
      setLoading(false);
    }
  };

  const speak = (t, lang) => {
    if (!("speechSynthesis" in window)) return;
    const utt = new SpeechSynthesisUtterance(t);
    utt.lang = lang;
    window.speechSynthesis.speak(utt);
  };

  return (
    <div className="min-h-screen pt-[62px]" style={{ background: "#fafafa" }}>
      <div className="py-12 border-b border-zinc-100 bg-white">
        <div className="max-w-3xl mx-auto px-5">
          <Badge variant="blue" className="mb-3">
            <Globe2 className="w-3.5 h-3.5" />
            Language Assistant
          </Badge>
          <h1 className="text-[32px] md:text-[40px] font-black text-zinc-950 mb-2">
            Bargain in any language.
          </h1>
          <p className="text-[15px] text-zinc-500 mb-8">
            Translate shopping phrases into 11 Indian languages. Get the pronunciation
            and a cultural tip to shop like a local.
          </p>

          <div className="space-y-3">
            <div className="flex gap-3">
              <div
                className="flex-1 bg-white rounded-xl border border-zinc-200 p-4 focus-within:border-green-400 transition-colors"
              >
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a shopping phrase in English..."
                  rows={3}
                  className="w-full text-[14px] text-zinc-800 placeholder:text-zinc-400 bg-transparent resize-none"
                  style={{ outline: "none", border: "none", boxShadow: "none" }}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="flex-1 text-[14px] text-zinc-700 bg-white border border-zinc-200 rounded-xl px-4 py-2.5"
                style={{ outline: "none" }}
              >
                {LANGUAGES.filter((l) => l.code !== "en").map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} — {lang.native}
                  </option>
                ))}
              </select>

              <Button
                variant="primary"
                size="md"
                loading={loading}
                onClick={() => handleTranslate()}
                className="shrink-0"
              >
                Translate
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-8">
        <div className="grid md:grid-cols-[1fr_300px] gap-6">
          <div>
            {/* Result */}
            {loading && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-8 text-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
                <p className="text-[14px] text-zinc-500">Translating...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                <p className="text-[13px] text-red-600">{error}</p>
              </div>
            )}

            {result && (
              <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden animate-fade-up">
                <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-zinc-500">
                    {result.language} Translation
                  </p>
                  <Badge variant="blue">{result.shoppingPhraseType}</Badge>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-[11px] text-zinc-400 mb-1">Original (English)</p>
                    <p className="text-[15px] text-zinc-600">{result.original}</p>
                  </div>

                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-[11px] text-blue-400 mb-1">In {result.language}</p>
                        <p className="text-[22px] font-bold text-blue-900 leading-snug">
                          {result.translated}
                        </p>
                      </div>
                      <button
                        onClick={() => speak(result.translated, targetLang)}
                        className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors ml-3"
                        title="Listen"
                      >
                        <Volume2 className="w-4 h-4 text-blue-600" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-zinc-50 rounded-xl p-4">
                    <p className="text-[11px] text-zinc-400 mb-1">How to pronounce</p>
                    <p className="text-[16px] font-mono text-zinc-700 italic">{result.romanized}</p>
                    <button
                      onClick={() => speak(result.romanized, "en")}
                      className="flex items-center gap-1.5 mt-2 text-[11px] text-zinc-500 hover:text-zinc-700"
                    >
                      <Volume2 className="w-3 h-3" />
                      Listen in English
                    </button>
                  </div>

                  {result.culturalTip && (
                    <div className="bg-green-50 rounded-xl p-4">
                      <p className="text-[11px] text-green-500 font-semibold mb-1">💡 Cultural tip</p>
                      <p className="text-[13px] text-green-800 leading-relaxed">{result.culturalTip}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!result && !loading && !error && (
              <div className="bg-white rounded-2xl border border-zinc-100 p-8 text-center">
                <Globe2 className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
                <p className="text-[14px] font-medium text-zinc-500">
                  Type a phrase or pick from quick phrases →
                </p>
              </div>
            )}
          </div>

          {/* Quick phrases */}
          <div>
            <h3 className="text-[13px] font-semibold text-zinc-700 mb-3">
              Shopping phrases
            </h3>
            <div className="space-y-1.5">
              {QUICK_PHRASES.map((phrase) => (
                <button
                  key={phrase}
                  onClick={() => {
                    setText(phrase);
                    handleTranslate(phrase);
                  }}
                  className="w-full text-left text-[13px] text-zinc-600 hover:text-zinc-900 bg-white hover:bg-zinc-50 border border-zinc-100 hover:border-zinc-200 rounded-xl px-4 py-2.5 transition-all"
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}