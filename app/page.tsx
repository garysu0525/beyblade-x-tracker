"use client";
import { useState, useMemo } from "react";
import ProductCard from "@/components/ProductCard";
import { products, getOverallStatus, daysUntil } from "@/lib/data";

const FILTERS = [
  { id: "all",       label: "全部" },
  { id: "upcoming",  label: "即將發售" },
  { id: "available", label: "可以買到" },
  { id: "soldout",   label: "缺貨" },
  { id: "BX",        label: "BX 系列" },
  { id: "UX",        label: "UX 系列" },
  { id: "CX",        label: "CX 系列" },
];

export default function HomePage() {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchQuery = !query || p.nameZh.includes(query) || p.code.toLowerCase().includes(query.toLowerCase());
      const status = getOverallStatus(p);
      const isSeries = ["BX", "UX", "CX"].includes(filter);
      const matchFilter = filter === "all"
        || (isSeries ? p.series === filter : status === filter);
      return matchQuery && matchFilter;
    });
  }, [filter, query]);

  const upcoming = products.filter((p) => !p.releasedTW).sort(
    (a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
  );

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">陀螺雷達</h1>
          <p className="text-xs text-gray-400 mt-0.5">戰鬥陀螺X 即時情報</p>
        </div>
        <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
          即時更新
        </span>
      </div>

      {/* Preorder + Upcoming section */}
      {upcoming.length > 0 && (
        <div className="mb-4 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-2xl overflow-hidden">
          {/* Section header */}
          <div className="px-4 pt-3 pb-2 border-b border-indigo-100 dark:border-indigo-900 flex items-center gap-2">
            <span className="text-sm">🛒</span>
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">預購 / 即將發售</span>
            <span className="ml-auto text-xs text-indigo-400">{upcoming.length} 款</span>
          </div>

          {upcoming.map((p, idx) => {
            const days = daysUntil(p.releaseDate);
            const po = p.preorder;
            return (
              <div
                key={p.id}
                className={`px-4 py-3 ${idx < upcoming.length - 1 ? "border-b border-indigo-100 dark:border-indigo-900" : ""}`}
              >
                {/* 商品基本資訊 */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-white dark:bg-indigo-900 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imageUrl} alt={p.nameZh} className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs text-indigo-400 font-mono">{p.code}</span>
                      <span className="font-semibold text-sm text-indigo-900 dark:text-indigo-100 truncate">{p.nameZh}</span>
                    </div>
                    <p className="text-xs text-indigo-400 mt-0.5">
                      發售日：{new Date(p.releaseDate).toLocaleDateString("zh-TW")}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-bold text-indigo-600 leading-none">{days}</p>
                    <p className="text-xs text-indigo-400">天後</p>
                  </div>
                </div>

                {/* 預購詳情 */}
                {po?.available ? (
                  <div className="bg-white dark:bg-indigo-900/50 rounded-xl px-3 py-2 space-y-1.5">
                    {/* 日期列 */}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-indigo-700 dark:text-indigo-300">
                      {po.startDate && (
                        <span>📅 預購開始：{new Date(po.startDate).toLocaleDateString("zh-TW")}</span>
                      )}
                      {po.endDate && (
                        <span>⏰ 截止：{new Date(po.endDate).toLocaleDateString("zh-TW")}</span>
                      )}
                      {po.estimatedShipDate && (
                        <span>📦 預計出貨：{new Date(po.estimatedShipDate).toLocaleDateString("zh-TW")}</span>
                      )}
                    </div>

                    {/* 通路列 */}
                    {po.stores && po.stores.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {po.stores.map((store, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs">
                            <span className="font-semibold text-indigo-700 dark:text-indigo-300">{store.name}</span>
                            {store.method && (
                              <span className="bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                                {store.method}
                              </span>
                            )}
                            {store.url && (
                              <a
                                href={store.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-indigo-600 text-white px-2 py-0.5 rounded font-medium hover:bg-indigo-700 transition-colors"
                              >
                                前往預購 →
                              </a>
                            )}
                            {store.note && (
                              <span className="text-indigo-400">{store.note}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 備注 */}
                    {po.notes && (
                      <p className="text-xs text-indigo-400">{po.notes}</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-indigo-900/30 rounded-xl px-3 py-2">
                    <p className="text-xs text-indigo-400">預購資訊待公告</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="搜尋型號或名稱（BX-23、鳳凰...）"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl outline-none focus:border-indigo-400"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`text-xs px-4 py-1.5 rounded-full whitespace-nowrap font-medium transition-colors flex-shrink-0 ${
              filter === f.id
                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                : "bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 text-gray-500"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Product list */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">沒有符合的商品</p>
        ) : (
          filtered.map((p) => <ProductCard key={p.id} product={p} />)
        )}
      </div>
    </div>
  );
}
