"use client";
import Image from "next/image";
import type { Product, PreorderStore } from "@/lib/types";
import { TYPE_LABELS, TYPE_COLORS, TIER_COLORS, STOCK_LABELS, getOverallStatus, daysUntil } from "@/lib/data";
import { useState } from "react";

const STORE_NAMES: Record<string, string> = {
  momo: "MOMO", pchome: "PChome", funbox: "FunBox", eslite: "誠品", yahoo: "Yahoo",
};

function PreorderSection({ product }: { product: Product }) {
  const po = product.preorder;
  if (!po?.available) return null;

  const fmt = (d?: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <div className="mb-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 p-3">
      <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-2 flex items-center gap-1">
        <span>🛒</span> 預購資訊
      </p>

      {/* 日期資訊 */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-xs text-indigo-900 dark:text-indigo-200">
        {po.startDate && (
          <span><span className="text-indigo-500">預購開始：</span>{fmt(po.startDate)}</span>
        )}
        {po.endDate && (
          <span><span className="text-indigo-500">預購截止：</span>{fmt(po.endDate)}</span>
        )}
        {po.estimatedShipDate && (
          <span><span className="text-indigo-500">預計出貨：</span>{fmt(po.estimatedShipDate)}</span>
        )}
      </div>

      {/* 預購通路 */}
      {po.stores && po.stores.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {po.stores.map((store: PreorderStore, i: number) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="shrink-0 font-semibold text-indigo-700 dark:text-indigo-300 w-16">{store.name}</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {store.method && (
                  <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                    {store.method}
                  </span>
                )}
                {store.url && (
                  <a
                    href={store.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800"
                  >
                    前往預購 →
                  </a>
                )}
                {store.note && (
                  <span className="text-indigo-500 dark:text-indigo-400">{store.note}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 備注 */}
      {po.notes && (
        <p className="text-xs text-indigo-600 dark:text-indigo-400 border-t border-indigo-200 dark:border-indigo-800 pt-2 mt-1">
          {po.notes}
        </p>
      )}
    </div>
  );
}

function PriceBadge({ msrp, market }: { msrp: number | null; market: number | null }) {
  if (!msrp) return null;

  if (!market) {
    // 只有 MSRP，沒有市場價格：顯示參考售價
    return (
      <span className="text-xs text-gray-400 font-medium">
        定價 NT${msrp.toLocaleString()}
      </span>
    );
  }

  const ratio = (market - msrp) / msrp;
  const pct = Math.round(ratio * 100);

  if (ratio > 0.1) {
    // 溢價超過 10%
    return (
      <span className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full font-medium">
        溢價 +{pct}%
      </span>
    );
  }
  if (ratio < -0.05) {
    // 打折超過 5%
    return (
      <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
        折扣 {pct}%
      </span>
    );
  }
  // 原價（±10% 範圍內）
  return (
    <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
      原價
    </span>
  );
}

export default function ProductCard({ product }: { product: Product }) {
  const [expanded, setExpanded] = useState(false);
  const overall = getOverallStatus(product);

  const statusBadge = () => {
    if (overall === "upcoming") {
      const days = daysUntil(product.releaseDate);
      return (
        <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">
          {days > 0 ? `${days} 天後發售` : "即將發售"}
        </span>
      );
    }
    if (overall === "available") return <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">✓ 有貨</span>;
    if (overall === "preorder") return <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">預購中</span>;
    return <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-medium">全部缺貨</span>;
  };

  return (
    <div className={`bg-white dark:bg-neutral-900 rounded-2xl border ${overall === "upcoming" ? "border-indigo-200" : overall === "soldout" ? "border-gray-100 dark:border-neutral-800 opacity-75" : "border-gray-100 dark:border-neutral-800"} overflow-hidden`}>
      <button className="w-full text-left p-4" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-xl bg-gray-50 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <Image
              src={product.imageUrl}
              alt={product.nameZh}
              width={56}
              height={56}
              className="object-contain"
              unoptimized
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs text-gray-400 font-mono">{product.code}</span>
              {product.tier && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${TIER_COLORS[product.tier]}`}>{product.tier}</span>
              )}
              {statusBadge()}
            </div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white leading-tight">{product.nameZh}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {product.type && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[product.type]}`}>
                  {TYPE_LABELS[product.type]}
                </span>
              )}
              <PriceBadge msrp={product.priceTWD} market={product.marketPriceTWD} />
            </div>
          </div>
          <svg className={`w-4 h-4 text-gray-300 flex-shrink-0 mt-1 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 dark:border-neutral-800 pt-3">
          {/* 預購資訊 */}
          <PreorderSection product={product} />

          {/* Price comparison detail */}
          {product.priceTWD && (
            <div className="mb-3 flex items-center gap-3 text-xs text-gray-500">
              <span>定價 <strong className="text-gray-700 dark:text-gray-300">NT${product.priceTWD.toLocaleString()}</strong></span>
              {product.marketPriceTWD && (
                <>
                  <span className="text-gray-200 dark:text-neutral-700">|</span>
                  <span>市場最低 <strong className={product.marketPriceTWD > product.priceTWD * 1.1 ? "text-orange-600" : "text-green-600"}>NT${product.marketPriceTWD.toLocaleString()}</strong></span>
                </>
              )}
            </div>
          )}

          <p className="text-xs text-gray-400 mb-2 font-medium">各平台庫存</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(product.availability).map(([storeId, status]) => {
              if (!status) return null;
              const info = STOCK_LABELS[status];
              const url = product.storeUrls?.[storeId as keyof typeof product.storeUrls];
              const cls = `text-xs px-2.5 py-1 rounded-full ${info.cls}`;
              const label = `${STORE_NAMES[storeId]} · ${info.label}`;
              return url ? (
                <a key={storeId} href={url} target="_blank" rel="noopener noreferrer" className={`${cls} hover:opacity-80 underline-offset-2`}>
                  {label}
                </a>
              ) : (
                <span key={storeId} className={cls}>{label}</span>
              );
            })}
          </div>
          <p className="text-xs text-gray-300 dark:text-neutral-600 mt-3">
            更新時間：{new Date(product.lastUpdated).toLocaleDateString("zh-TW")}
          </p>
        </div>
      )}
    </div>
  );
}
