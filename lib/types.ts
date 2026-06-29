export type BeyType = "attack" | "defense" | "balance" | "stamina";
export type Tier = "S" | "A" | "B" | "C";
export type StockStatus = "available" | "soldout" | "preorder" | null;

export interface PricePoint {
  date: string;           // YYYY-MM-DD
  shopeeMin?: number | null;
  rutenMin?: number | null;
}

export interface GrayMarketInfo {
  shopeeUrl: string;
  rutenUrl: string;
  yahooJpUrl: string;
  shopeePrice?: number | null;
  rutenPrice?: number | null;
  priceHistory?: PricePoint[];  // 最近 30 天，由爬蟲累積
  lastUpdated?: string | null;
}

export interface PreorderStore {
  name: string;
  url?: string | null;
  method?: string | null;
  note?: string | null;
}

export interface PreorderInfo {
  available: boolean;
  startDate?: string | null;
  endDate?: string | null;
  estimatedShipDate?: string | null;
  stores?: PreorderStore[];
  notes?: string | null;
}

export interface Product {
  id: string;
  code: string;
  nameZh: string;
  nameJa: string;
  imageUrl: string;
  type: BeyType | null;
  series: "BX" | "UX" | "CX";
  isAccessory?: boolean;
  tier: Tier | null;
  tierScore: number | null;
  releaseDate: string;
  releasedTW: boolean;
  priceJPY: number | null;
  priceTWD: number | null;      // 官方建議售價 MSRP
  marketPriceTWD: number | null; // 爬蟲抓到的最低市場價
  preorder?: PreorderInfo;
  grayMarket?: GrayMarketInfo;
  availability: {
    momo: StockStatus;
    pchome: StockStatus;
    funbox: StockStatus;
    eslite: StockStatus;
    yahoo: StockStatus;
  };
  storeUrls?: {
    momo?: string;
    pchome?: string;
    funbox?: string;
    eslite?: string;
    yahoo?: string;
  };
  lastUpdated: string;
}

export interface Store {
  id: string;
  name: string;
  url: string;
  type: "online" | "physical";
  icon: string;
}
