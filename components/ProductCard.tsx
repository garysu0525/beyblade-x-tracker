"use client";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { TYPE_LABELS, TYPE_COLORS, TIER_COLORS, STOCK_LABELS, getOverallStatus, daysUntil } from "@/lib/data";
import { useState } from "react";

const STORE_NAMES: Record<string, string> = {
  momo: "MOMO", pchome: "PChome", funbox: "FunBox", eslite: "誠品", yahoo: "Yahoo",
};

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
            {product.type && (
              <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[product.type]}`}>
                {TYPE_LABELS[product.type]}
              </span>
            )}
          </div>
          <svg className={`w-4 h-4 text-gray-300 flex-shrink-0 mt-1 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 dark:border-neutral-800 pt-3">
          <p className="text-xs text-gray-400 mb-2 font-medium">各平台庫存</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(product.availability).map(([storeId, status]) => {
              if (!status) return null;
              const info = STOCK_LABELS[status];
              return (
                <span key={storeId} className={`text-xs px-2.5 py-1 rounded-full ${info.cls}`}>
                  {STORE_NAMES[storeId]} · {info.label}
                </span>
              );
            })}
          </div>
          {product.priceTWD && (
            <p className="text-xs text-gray-400 mt-3">售價約 NT$ {product.priceTWD}</p>
          )}
          <p className="text-xs text-gray-300 dark:text-neutral-600 mt-1">
            更新時間：{new Date(product.lastUpdated).toLocaleDateString("zh-TW")}
          </p>
        </div>
      )}
    </div>
  );
}
