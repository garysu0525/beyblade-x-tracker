export type BeyType = "attack" | "defense" | "balance" | "stamina";
export type Tier = "S" | "A" | "B" | "C";
export type StockStatus = "available" | "soldout" | "preorder" | null;

export interface Product {
  id: string;
  code: string;
  nameZh: string;
  nameJa: string;
  imageUrl: string;
  type: BeyType | null;
  series: "BX" | "UX" | "CX";
  tier: Tier | null;
  tierScore: number | null;
  releaseDate: string;
  releasedTW: boolean;
  priceJPY: number | null;
  priceTWD: number | null;
  preorderAvailable?: boolean;
  availability: {
    momo: StockStatus;
    pchome: StockStatus;
    funbox: StockStatus;
    eslite: StockStatus;
    yahoo: StockStatus;
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
