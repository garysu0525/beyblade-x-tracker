import productsRaw from "@/data/products.json";
import storesRaw from "@/data/stores.json";
import type { Product, Store } from "./types";

export const products = productsRaw as Product[];
export const stores = storesRaw as Store[];

export const TYPE_LABELS: Record<string, string> = {
  attack: "攻擊型",
  defense: "防守型",
  balance: "平衡型",
  stamina: "持久型",
};

export const TYPE_COLORS: Record<string, string> = {
  attack: "bg-red-50 text-red-700 border border-red-200",
  defense: "bg-blue-50 text-blue-700 border border-blue-200",
  balance: "bg-green-50 text-green-700 border border-green-200",
  stamina: "bg-amber-50 text-amber-700 border border-amber-200",
};

export const TIER_COLORS: Record<string, string> = {
  S: "text-amber-700 bg-amber-50",
  A: "text-blue-700 bg-blue-50",
  B: "text-green-700 bg-green-50",
  C: "text-gray-500 bg-gray-100",
};

export const STOCK_LABELS: Record<string, { label: string; cls: string }> = {
  available: { label: "有貨", cls: "bg-green-50 text-green-700 border border-green-200" },
  soldout:   { label: "缺貨", cls: "bg-red-50 text-red-600 border border-red-200" },
  preorder:  { label: "預購中", cls: "bg-blue-50 text-blue-700 border border-blue-200" },
};

export function getOverallStatus(product: Product) {
  const vals = Object.values(product.availability).filter(Boolean);
  if (!product.releasedTW) return "upcoming";
  if (vals.some((v) => v === "available")) return "available";
  if (vals.some((v) => v === "preorder")) return "preorder";
  return "soldout";
}

export function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}
