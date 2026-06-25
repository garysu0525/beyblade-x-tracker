"use client";
import { useState, useMemo } from "react";
import Image from "next/image";
import { products, TYPE_LABELS, TYPE_COLORS, TIER_COLORS } from "@/lib/data";
import type { BeyType, Tier } from "@/lib/types";

const TIERS: Tier[] = ["S", "A", "B", "C"];
const TIER_BG: Record<Tier, string> = {
  S: "bg-amber-500",
  A: "bg-blue-500",
  B: "bg-green-500",
  C: "bg-gray-400",
};
const TIER_DESC: Record<Tier, string> = {
  S: "頂尖",
  A: "強力",
  B: "普通",
  C: "入門",
};

const TYPE_FILTERS = [
  { id: "all",      label: "全部" },
  { id: "attack",   label: "攻擊型" },
  { id: "defense",  label: "防守型" },
  { id: "balance",  label: "平衡型" },
  { id: "stamina",  label: "持久型" },
];

export default function RankingPage() {
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const ranked = useMemo(() => {
    return products
      .filter((p) => p.tier !== null && p.tierScore !== null)
      .filter((p) => typeFilter === "all" || p.type === typeFilter)
      .sort((a, b) => (b.tierScore ?? 0) - (a.tierScore ?? 0));
  }, [typeFilter]);

  const byTier = useMemo(() => {
    const map: Record<Tier, typeof ranked> = { S: [], A: [], B: [], C: [] };
    ranked.forEach((p) => { if (p.tier) map[p.tier as Tier].push(p); });
    return map;
  }, [ranked]);

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">戰力排行</h1>
          <p className="text-xs text-gray-400 mt-0.5">社群票選 · 2026/06 更新</p>
        </div>
        <span className="text-xs bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400 px-2.5 py-1 rounded-full">
          每月自動更新
        </span>
      </div>

      {/* Type filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setTypeFilter(f.id)}
            className={`text-xs px-4 py-1.5 rounded-full whitespace-nowrap font-medium transition-colors flex-shrink-0 ${
              typeFilter === f.id
                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                : "bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 text-gray-500"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tier sections */}
      {TIERS.map((tier) => {
        const items = byTier[tier];
        if (items.length === 0) return null;
        return (
          <div key={tier} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className={`${TIER_BG[tier]} text-white text-xs font-bold px-2.5 py-1 rounded-lg`}>{tier}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{TIER_DESC[tier]}</span>
              <span className="text-xs text-gray-400 ml-auto">{items.length} 款</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {items.map((p, i) => {
                const globalRank = ranked.indexOf(p) + 1;
                return (
                  <div key={p.id} className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl p-3 flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-200 dark:text-neutral-700 w-7 text-center flex-shrink-0">
                      {globalRank <= 3 ? ["🥇","🥈","🥉"][globalRank - 1] : globalRank}
                    </span>
                    <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <Image
                        src={p.imageUrl}
                        alt={p.nameZh}
                        width={48}
                        height={48}
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white leading-tight">{p.nameZh}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.code}</p>
                      {p.type && (
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[p.type]}`}>
                          {TYPE_LABELS[p.type]}
                        </span>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`text-xl font-bold ${TIER_COLORS[tier].split(" ")[0]}`}>{tier}</div>
                      <div className="text-xs text-gray-400">{p.tierScore?.toFixed(1)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-center text-gray-300 dark:text-neutral-600 mt-4">
        資料來源：TierMaker 社群票選 + 巴哈姆特討論版
      </p>
    </div>
  );
}
