"""
scrape_products.py
從 Takara Tomy 官網抓完整商品列表，合併中文名稱與 Tier 排行，輸出 data/products.json
執行：python scripts/scrape_products.py
"""

import json
import re
import time
import requests
from bs4 import BeautifulSoup
from pathlib import Path
from datetime import datetime

BASE = "https://beyblade.takaratomy.co.jp/beyblade-x"
IMG_BASE = f"{BASE}/lineup/_image"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
OUT = Path(__file__).parent.parent / "data" / "products.json"

# ── 中文名稱對照表（含繁中台版名稱） ──────────────────────────────────────────
ZH_NAMES: dict[str, str] = {
    "BX-01": "蒼龍斬刃", "BX-02": "地獄鐮刀", "BX-03": "魔法弓矢",
    "BX-04": "騎士之盾", "BX-05": "魔法弓矢", "BX-06": "騎士之盾",
    "BX-07": "新手入門組", "BX-08": "3對3甲板組", "BX-09": "戰鬥通行證",
    "BX-10": "極限競技場", "BX-11": "X發射器握把", "BX-12": "隨機強化組 Vol.2",
    "BX-13": "隨機強化組 Vol.3", "BX-14": "暗鬼巨錘", "BX-15": "地獄鐮刀 改",
    "BX-16": "霸王狂鯊", "BX-17": "鳳凰飛翼", "BX-18": "鐵甲傑克",
    "BX-19": "魔法弓矢 2", "BX-20": "狂鯊銳齒", "BX-21": "隨機強化組 Vol.4",
    "BX-22": "隨機強化組 Vol.5", "BX-23": "鳳凰飛翼", "BX-24": "龍王閃擊",
    "BX-25": "陀螺收納包", "BX-26": "蒼龍斬刃 2", "BX-27": "地獄鐵鏈",
    "BX-28": "魔像岩錘", "BX-29": "騎士聖盾", "BX-30": "X發射器改造型握把（黑紅）",
    "BX-31": "天馬爆擊 改", "BX-32": "超寬競技場", "BX-33": "地獄鐮刀 2",
    "BX-34": "霸王狂鯊 2", "BX-35": "鳳凰飛翼 2", "BX-36": "蒼龍爆刃 2",
    "BX-37": "魔法弓矢 3", "BX-38": "騎士之盾 2", "BX-39": "龍神決戰組 Vol.1",
    "BX-40": "發條發射器L", "BX-41": "橡膠改造握把 黑版", "BX-42": "橡膠改造握把 藍版",
    "BX-43": "陀螺收納盒 白版", "BX-44": "三角龍壓制", "BX-45": "武士星劍",
    "BX-46": "對戰入門組∞", "BX-47": "發射器L 紅版", "BX-48": "隨機強化組 Vol.9",
    "BX-49": "蒼穹突擊", "BX-50": "隨機強化組 Vol.11", "BX-51": "發射器 黑綠版",
    "UX-01": "蒼龍爆刃", "UX-02": "惡魔戰錘", "UX-03": "銀狼霜輝",
    "UX-04": "衝擊龍神 改", "UX-05": "蠍子神矛 改", "UX-06": "雄獅巔峰",
    "UX-07": "霜輝銀狼 2", "UX-08": "霜輝銀狼", "UX-09": "武士星劍 豪華組",
    "UX-10": "騎士圓甲", "UX-11": "衝擊龍神", "UX-12": "天馬爆擊 豪華組",
    "UX-13": "魔像奇岩", "UX-14": "蠍子神矛", "UX-15": "鯊魚鱗甲甲板組",
    "UX-16": "時鐘幻影精選組", "UX-17": "流星龍", "UX-18": "隨機強化組 Vol.8",
    "UX-19": "子彈獅鷲", "UX-20": "榮耀女武神",
    "CX-01": "蒼龍勇氣", "CX-02": "魔法神弓", "CX-03": "冥界黑暗",
    "CX-04": "對戰入門組C", "CX-05": "隨機強化組 Vol.6", "CX-06": "狐狸精選組",
    "CX-07": "天馬爆擊", "CX-08": "隨機強化組 Vol.7", "CX-09": "天馬爆擊 改",
    "CX-10": "銀狼獵殺", "CX-11": "皇帝之力甲板組", "CX-12": "鳳凰爆焰",
    "CX-13": "巴哈姆特閃擊", "CX-14": "騎士要塞", "CX-15": "拉格納烈焰",
    "CX-16": "異色龍王決鬥盤組", "CX-17": "隨機強化組 Vol.10", "CX-18": "腕龍精選組",
}

# ── 類型對照（依陀螺特性分類） ──────────────────────────────────────────────
TYPE_MAP: dict[str, str] = {
    "BX-01": "attack",  "BX-02": "defense", "BX-03": "stamina",
    "BX-04": "defense", "BX-05": "stamina", "BX-06": "defense",
    "BX-14": "defense", "BX-15": "defense", "BX-16": "attack",
    "BX-17": "attack",  "BX-20": "attack",  "BX-23": "attack",
    "BX-24": "balance", "BX-26": "attack",  "BX-27": "defense",
    "BX-28": "defense", "BX-29": "defense", "BX-33": "defense",
    "BX-34": "attack",  "BX-35": "attack",  "BX-36": "attack",
    "BX-44": "defense", "BX-45": "attack",  "BX-49": "attack",
    "UX-01": "attack",  "UX-02": "attack",  "UX-03": "balance",
    "UX-06": "balance", "UX-07": "balance", "UX-08": "balance",
    "UX-10": "defense", "UX-11": "stamina", "UX-13": "defense",
    "UX-14": "balance", "UX-17": "attack",  "UX-19": "attack",
    "UX-20": "attack",
    "CX-01": "attack",  "CX-02": "stamina", "CX-03": "defense",
    "CX-07": "attack",  "CX-09": "attack",  "CX-10": "balance",
    "CX-12": "attack",  "CX-13": "attack",  "CX-14": "defense",
    "CX-15": "attack",  "CX-16": "balance",
}

# ── Tier 排行（來源：TierMaker + 巴哈姆特 2026/06） ───────────────────────
TIER_MAP: dict[str, tuple[str, float]] = {
    "UX-01": ("S", 98.2), "BX-23": ("S", 96.5), "UX-10": ("S", 95.1),
    "CX-12": ("S", 94.0), "BX-36": ("S", 93.0), "UX-19": ("S", 91.5),
    "BX-49": ("A", 80.0), "UX-13": ("A", 88.4), "UX-14": ("A", 86.0),
    "CX-16": ("A", 85.0), "UX-11": ("A", 83.7), "BX-45": ("A", 82.0),
    "CX-13": ("A", 81.5), "CX-14": ("A", 79.0), "UX-17": ("A", 78.5),
    "CX-15": ("A", 77.0), "BX-44": ("A", 76.0),
    "CX-09": ("B", 74.2), "UX-06": ("B", 70.5), "BX-35": ("B", 69.0),
    "BX-24": ("B", 68.0), "CX-10": ("B", 67.5), "BX-16": ("B", 66.0),
    "UX-08": ("B", 65.0), "BX-20": ("B", 63.0),
    "BX-01": ("C", 55.0), "BX-02": ("C", 52.0), "BX-06": ("C", 50.0),
    "BX-14": ("C", 48.0), "CX-03": ("C", 46.0), "CX-07": ("C", 58.0),
}

# ── 已知發售日期（台灣版，格式 YYYY-MM-DD） ──────────────────────────────
RELEASE_DATES: dict[str, str] = {
    "BX-01": "2023-07-15", "BX-02": "2023-07-15", "BX-03": "2023-07-15",
    "BX-04": "2023-07-15", "BX-05": "2023-07-15", "BX-06": "2023-07-15",
    "BX-07": "2023-07-15", "BX-08": "2023-07-15", "BX-09": "2023-07-15",
    "BX-10": "2023-07-15", "BX-11": "2023-10-07", "BX-12": "2023-10-07",
    "BX-13": "2024-01-06", "BX-14": "2024-01-06", "BX-15": "2024-01-06",
    "BX-16": "2024-01-06", "BX-17": "2024-01-06", "BX-18": "2024-04-06",
    "BX-19": "2024-04-06", "BX-20": "2024-04-06", "BX-21": "2024-04-06",
    "BX-22": "2024-07-06", "BX-23": "2024-01-06", "BX-24": "2024-07-06",
    "BX-25": "2024-07-06", "BX-26": "2024-07-06", "BX-27": "2024-10-05",
    "BX-28": "2024-10-05", "BX-29": "2024-10-05", "BX-30": "2024-04-06",
    "BX-31": "2024-10-05", "BX-32": "2024-04-06", "BX-33": "2025-01-11",
    "BX-34": "2025-01-11", "BX-35": "2025-01-11", "BX-36": "2025-04-05",
    "BX-37": "2025-04-05", "BX-38": "2025-04-05", "BX-39": "2025-07-05",
    "BX-40": "2025-07-05", "BX-41": "2025-07-05", "BX-42": "2025-10-04",
    "BX-43": "2025-10-04", "BX-44": "2025-10-04", "BX-45": "2026-01-11",
    "BX-46": "2026-01-11", "BX-47": "2026-04-05", "BX-48": "2026-04-05",
    "BX-49": "2026-04-05", "BX-50": "2026-07-19", "BX-51": "2026-07-19",
    "UX-01": "2024-07-06", "UX-02": "2024-07-06", "UX-03": "2024-10-05",
    "UX-04": "2024-10-05", "UX-05": "2024-10-05", "UX-06": "2024-07-06",
    "UX-07": "2024-10-05", "UX-08": "2024-10-05", "UX-09": "2025-01-11",
    "UX-10": "2024-10-05", "UX-11": "2024-12-07", "UX-12": "2025-01-11",
    "UX-13": "2025-04-05", "UX-14": "2025-07-05", "UX-15": "2025-07-05",
    "UX-16": "2025-10-04", "UX-17": "2025-10-04", "UX-18": "2026-01-11",
    "UX-19": "2026-04-05", "UX-20": "2026-07-19",
    "CX-01": "2025-04-05", "CX-02": "2025-04-05", "CX-03": "2025-04-05",
    "CX-04": "2025-04-05", "CX-05": "2025-04-05", "CX-06": "2025-07-05",
    "CX-07": "2025-07-05", "CX-08": "2025-07-05", "CX-09": "2025-04-05",
    "CX-10": "2025-10-04", "CX-11": "2025-10-04", "CX-12": "2025-10-04",
    "CX-13": "2026-01-11", "CX-14": "2026-01-11", "CX-15": "2026-04-05",
    "CX-16": "2026-04-05", "CX-17": "2026-04-05", "CX-18": "2026-07-19",
}

# ── 不是陀螺本體的型號（配件/工具/組合）───────────────────────────────────
ACCESSORY_CODES = {
    "BX-07","BX-08","BX-09","BX-10","BX-11","BX-12","BX-13",
    "BX-21","BX-22","BX-25","BX-30","BX-31","BX-32","BX-39",
    "BX-40","BX-41","BX-42","BX-43","BX-46","BX-47","BX-48",
    "BX-50","BX-51",
    "UX-09","UX-12","UX-15","UX-16","UX-18",
    "CX-04","CX-05","CX-06","CX-08","CX-11","CX-17","CX-18",
}


def img_url(code: str) -> str:
    key = code.replace("-", "").upper()  # BX01, UX13...
    return f"{IMG_BASE}/{key}_list.png"


def scrape_lineup() -> list[dict]:
    """從官方 lineup 頁面抓所有商品 slug"""
    print("抓取 lineup 頁面...")
    r = requests.get(f"{BASE}/lineup/", headers=HEADERS, timeout=15)
    soup = BeautifulSoup(r.text, "html.parser")
    slugs = []
    for a in soup.select("a[href*='/lineup/']"):
        href = a["href"]
        slug = href.split("/lineup/")[-1].rstrip("/").replace(".html", "")
        if slug and slug not in slugs and not slug.startswith("http"):
            slugs.append(slug)
    return slugs


def parse_code_from_slug(slug: str) -> str | None:
    """從 slug 解析型號，例如 bx01 → BX-01，ux13 → UX-13"""
    m = re.match(r"^(bx|ux|cx)(\d+)$", slug.lower())
    if not m:
        return None
    prefix = m.group(1).upper()
    num = int(m.group(2))
    return f"{prefix}-{num:02d}"


def scrape_release_date(slug: str) -> str | None:
    """從商品詳情頁抓發售日"""
    try:
        r = requests.get(f"{BASE}/lineup/{slug}.html", headers=HEADERS, timeout=10)
        soup = BeautifulSoup(r.text, "html.parser")
        for el in soup.find_all(string=re.compile(r"\d{4}[年/]\d{1,2}[月/]\d{1,2}")):
            m = re.search(r"(\d{4})[年/](\d{1,2})[月/](\d{1,2})", el)
            if m:
                return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    except Exception:
        pass
    return None


def build_product(code: str, slug: str, release_date: str | None) -> dict:
    today = datetime.utcnow().isoformat() + "Z"
    release_date = release_date or RELEASE_DATES.get(code)
    is_released = True
    if release_date:
        is_released = release_date <= datetime.utcnow().strftime("%Y-%m-%d")

    tier, score = TIER_MAP.get(code, (None, None))
    bey_type = TYPE_MAP.get(code) if code not in ACCESSORY_CODES else None

    return {
        "id": code,
        "code": code,
        "nameZh": ZH_NAMES.get(code, code),
        "nameJa": "",          # 可後續補充
        "imageUrl": img_url(code),
        "type": bey_type,
        "series": code.split("-")[0],
        "isAccessory": code in ACCESSORY_CODES,
        "tier": tier,
        "tierScore": score,
        "releaseDate": release_date or "",
        "releasedTW": is_released,
        "priceJPY": None,
        "priceTWD": None,
        "availability": {
            "momo": None,
            "pchome": None,
            "funbox": None,
            "eslite": None,
            "yahoo": None,
        },
        "lastUpdated": today,
    }


# 全部已知型號（從 Takara Tomy lineup 頁面確認）
ALL_CODES = [
    # BX 系列
    *[f"BX-{i:02d}" for i in range(1, 52)],
    # UX 系列
    *[f"UX-{i:02d}" for i in range(1, 21)],
    # CX 系列
    *[f"CX-{i:02d}" for i in range(1, 19)],
]


def main():
    products = []

    for code in ALL_CODES:
        slug = code.replace("-", "").lower()  # BX-01 → bx01
        print(f"  {code} ({slug})...", end=" ", flush=True)
        release = scrape_release_date(slug)
        print(release or "unknown")
        products.append(build_product(code, slug, release))
        time.sleep(0.3)

    def sort_key(p):
        series_order = {"BX": 0, "UX": 1, "CX": 2}
        num = int(p["code"].split("-")[1])
        return (series_order.get(p["series"], 9), num)

    products.sort(key=sort_key)
    OUT.write_text(json.dumps(products, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nDone! {len(products)} products -> {OUT}")


if __name__ == "__main__":
    main()
