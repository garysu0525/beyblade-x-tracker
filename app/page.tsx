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

      {/* Upcoming banner */}
      {upcoming.map((p) => {
        const days = daysUntil(p.releaseDate);
        return (
          <div key={p.id} className="mb-4 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-indigo-900 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imageUrl} alt={p.nameZh} className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-indigo-500 font-medium mb-0.5">即將發售</p>
              <p className="font-semibold text-sm text-indigo-900 dark:text-indigo-100 truncate">{p.nameZh}</p>
              <p className="text-xs text-indigo-400">{p.code} · {new Date(p.releaseDate).toLocaleDateString("zh-TW")}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-bold text-indigo-600">{days}</p>
              <p className="text-xs text-indigo-400">天後</p>
            </div>
          </div>
        );
      })}

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
