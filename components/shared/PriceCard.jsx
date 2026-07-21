"use client";

import { useState } from "react";
import {
  TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Info, Heart, Share2,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default function PriceCard({ data, compact = false }) {
  const [saved, setSaved] = useState(false);

  if (!data) return null;

  const {
    product, city, fairPriceMin, fairPriceMax,
    localMarketAvg, bargainingStart, bargainingTarget,
    confidenceScore, aiRecommendation, scamWarning,
    touristPremium, trend,
  } = data;

  const riskColor = touristPremium >= 60 ? "#dc2626" : touristPremium >= 30 ? "#f59e0b" : "#16a34a";
  const trendIcon = trend === "Rising" ? TrendingUp : trend === "Falling" ? TrendingDown : null;
  const TrendIcon = trendIcon;

  if (compact) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-100 p-4 card-hover">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-[13px] font-bold text-zinc-900">{product}</p>
            <p className="text-[11px] text-zinc-400">{city}</p>
          </div>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${riskColor}12`, color: riskColor }}
          >
            +{touristPremium}%
          </span>
        </div>
        <p className="text-[18px] font-black text-zinc-950">
          {formatPrice(fairPriceMin)} – {formatPrice(fairPriceMax)}
        </p>
        <p className="text-[11px] text-zinc-400 mt-0.5">Fair price range</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden shadow-sm">
      {/* Header bar */}
      <div
        className="h-1.5 w-full"
        style={{
          background: `linear-gradient(90deg, ${riskColor}, ${riskColor}88)`,
          width: `${Math.min(confidenceScore, 100)}%`,
        }}
      />

      <div className="p-5">
        {/* Title + actions */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-[17px] font-bold text-zinc-950">{product}</h3>
            <p className="text-[12px] text-zinc-400 mt-0.5">{city} market price</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSaved(!saved)}
              className="p-2 rounded-xl hover:bg-zinc-50 transition-colors"
            >
              <Heart
                className="w-4 h-4"
                style={{ color: saved ? "#dc2626" : "#d4d4d8", fill: saved ? "#dc2626" : "none" }}
              />
            </button>
            <button className="p-2 rounded-xl hover:bg-zinc-50 transition-colors">
              <Share2 className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Price range */}
        <div className="mb-4">
          <p className="text-[11px] text-zinc-400 mb-1">Fair price range</p>
          <p className="text-[28px] font-black text-zinc-950">
            {formatPrice(fairPriceMin)} – {formatPrice(fairPriceMax)}
          </p>
        </div>

        {/* Price grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-zinc-50 rounded-xl p-3">
            <p className="text-[10px] text-zinc-400 mb-1">Local avg</p>
            <p className="text-[15px] font-bold text-zinc-900">{formatPrice(localMarketAvg)}</p>
          </div>
          <div className="bg-zinc-50 rounded-xl p-3">
            <p className="text-[10px] text-zinc-400 mb-1">Tourist premium</p>
            <p className="text-[15px] font-bold" style={{ color: riskColor }}>+{touristPremium}%</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3">
            <p className="text-[10px] text-red-400 mb-1">Start bargaining</p>
            <p className="text-[15px] font-bold text-red-700">{formatPrice(bargainingStart)}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3">
            <p className="text-[10px] text-green-500 mb-1">Target price</p>
            <p className="text-[15px] font-bold text-green-700">{formatPrice(bargainingTarget)}</p>
          </div>
        </div>

        {/* Confidence */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${confidenceScore}%`, background: confidenceScore >= 70 ? "#16a34a" : "#f59e0b" }}
            />
          </div>
          <span className="text-[11px] font-bold text-zinc-600">{confidenceScore}% confidence</span>
        </div>

        {/* AI recommendation */}
        {aiRecommendation && (
          <div className="bg-green-50 rounded-xl p-3 flex items-start gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            <p className="text-[12px] text-green-800 leading-relaxed">{aiRecommendation}</p>
          </div>
        )}

        {/* Scam warning */}
        {scamWarning && (
          <div className="bg-amber-50 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[12px] text-amber-800 leading-relaxed">{scamWarning}</p>
          </div>
        )}
      </div>
    </div>
  );
}