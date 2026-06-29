"use client";
import { useState, useMemo } from "react";
import { products } from "@/lib/data";
import type { Product, PricePoint } from "@/lib/types";

const TIER_COLOR: Record<string, string> = {
  S: "bg-yellow-100 text-yellow-800 border-yellow-300",
  A: "bg-blue-100 text-blue-700 border-blue-200",
  B: "bg-green-100 text-green-700 border-green-200",
  C: "bg-gray-100 text-gray-500 border-gray-200",
};

const TIER_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };

function Sparkline({ history }: { history: PricePoint[] }) {
  const values = history
    .map((p) => p.shopeeMin ?? p.rutenMin ?? null)
    .filter((v): v is number => v !== null);

  if (values.length < 2) {
    return (
      <span className="text-xs text-gray-300 italic">尚無趨勢</span>
    );
  }

  const W = 80, H = 24, PAD = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (v - min) / range) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  const trend = last < prev ? "text-green-500" : last > prev ? "text-red-500" : "text-gray-400";
  const arrow = last < prev ? "↓" : last > prev ? "↑" : "→";

  return (
    <div className="flex items-center gap-1.5">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke="#6366f1"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={parseFloat(pts[pts.length - 1].split(",")[0])}
          cy={parseFloat(pts[pts.length - 1].split(",")[1])}
          r="2"
          fill="#6366f1"
        />
      </svg>
      <span className={`text-xs font-bold ${trend}`}>{arrow}</span>
    </div>
  );
}

function PremiumBadge({ msrp, grayPrice }: { msrp: number; grayPrice: number }) {
  const pct = Math.round(((grayPrice - msrp) / msrp) * 100);
  if (pct > 0) return (
    <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full">
      +{pct}% 溢價
    </span>
  );
  if (pct < 0) return (
    <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-1.5 py-0.5 rounded-full">
      {pct}% 折扣
    </span>
  );
  return null;
}

function GrayCard({ product: p }: { product: Product }) {
  const gm = p.grayMarket;
  const grayPrice = gm?.shopeePrice ?? gm?.rutenPrice ?? null;
  const msrp = p.priceTWD;
  const history = gm?.priceHistory ?? [];

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 px-4 py-3">
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-neutral-800 flex items-center justify-center shrink-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.imageUrl} alt={p.nameZh} className="w-full h-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${p.tier ? TIER_COLOR[p.tier] : "bg-gray-100 text-gray-400 border-gray-200"}`}>
              {p.tier ?? "?"}
            </span>
            <span className="text-xs text-gray-400 font-mono">{p.code}</span>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{p.nameZh}</span>
          </div>

          {/* Price row */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {msrp && (
              <span className="text-xs text-gray-400">
                官價 <span className="font-semibold text-gray-600 dark:text-gray-300">NT${msrp}</span>
              </span>
            )}
            {grayPrice && (
              <>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                  水貨約 NT${grayPrice}
                </span>
                {msrp && <PremiumBadge msrp={msrp} grayPrice={grayPrice} />}
              </>
            )}
            {!grayPrice && (
              <span className="text-xs text-gray-300">水貨價格未取得</span>
            )}
          </div>
        </div>
      </div>

      {/* Sparkline + Last updated */}
      {history.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <Sparkline history={history} />
          {gm?.lastUpdated && (
            <span className="text-xs text-gray-300 ml-auto">{gm.lastUpdated}</span>
          )}
        </div>
      )}

      {/* Action buttons */}
      {gm && (
        <div className="flex gap-2 mt-2.5 flex-wrap">
          <a
            href={gm.shopeeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-colors"
          >
            🛒 蝦皮
          </a>
          <a
            href={gm.rutenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-colors"
          >
            🏪 露天
          </a>
          <a
            href={gm.yahooJpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-colors"
          >
            🇯🇵 Yahoo JP
          </a>
        </div>
      )}
    </div>
  );
}

const TIER_FILTERS = ["全部", "S", "A", "B", "C"];

export default function GrayMarketPage() {
  const [tierFilter, setTierFilter] = useState("全部");

  const gmProducts = useMemo(() => {
    return products
      .filter((p) => p.grayMarket && !p.isAccessory && p.tier)
      .sort((a, b) => {
        const td = (TIER_ORDER[a.tier!] ?? 9) - (TIER_ORDER[b.tier!] ?? 9);
        if (td !== 0) return td;
        return (b.tierScore ?? 0) - (a.tierScore ?? 0);
      });
  }, []);

  const filtered = useMemo(() => {
    if (tierFilter === "全部") return gmProducts;
    return gmProducts.filter((p) => p.tier === tierFilter);
  }, [gmProducts, tierFilter]);

  const hasGrayPrice = filtered.filter((p) =>
    (p.grayMarket?.shopeePrice ?? p.grayMarket?.rutenPrice) != null
  ).length;

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">水貨雷達</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            蝦皮 · 露天 · Yahoo JP 二手/水貨行情
          </p>
        </div>
        {hasGrayPrice > 0 && (
          <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 px-2.5 py-1 rounded-full">
            {hasGrayPrice} 款有報價
          </span>
        )}
      </div>

      {/* Info banner */}
      <div className="mb-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
        <p className="text-xs text-amber-700 dark:text-amber-300">
          ⚠️ 水貨為非官方代理進口，無保固。點下方按鈕前往各平台搜尋。價格趨勢由爬蟲每日自動更新。
        </p>
      </div>

      {/* Tier filter */}
      <div className="flex gap-2 mb-4">
        {TIER_FILTERS.map((t) => (
          <button
            key={t}
            onClick={() => setTierFilter(t)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
              tierFilter === t
                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent"
                : t === "S"
                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                : t === "A"
                ? "bg-blue-50 text-blue-600 border-blue-200"
                : t === "B"
                ? "bg-green-50 text-green-600 border-green-200"
                : "bg-gray-50 text-gray-500 border-gray-200"
            }`}
          >
            {t === "全部" ? t : `${t} Tier`}
          </button>
        ))}
      </div>

      {/* Product list */}
      <div className="flex flex-col gap-3">
        {filtered.map((p) => (
          <GrayCard key={p.id} product={p} />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-12">沒有商品</p>
        )}
      </div>
    </div>
  );
}
