"""
scrape_availability.py
自動抓各電商平台陀螺庫存狀態，更新 data/products.json 的 availability 欄位
執行：python scripts/scrape_availability.py
GitHub Actions 每天 08:00 / 20:00 (UTC+8) 自動執行
"""

import json
import time
import re
import requests
from bs4 import BeautifulSoup
from pathlib import Path
from datetime import datetime, timezone

DATA_FILE = Path(__file__).parent.parent / "data" / "products.json"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "zh-TW,zh;q=0.9",
}


# ── MOMO ──────────────────────────────────────────────────────────────────────
def check_momo(keyword: str) -> str:
    """搜尋 MOMO，回傳 available / soldout / null"""
    try:
        url = f"https://www.momoshop.com.tw/search/searchShop.jsp?keyword={keyword}&searchType=1&curPage=1&_=pc"
        r = requests.get(url, headers=HEADERS, timeout=12)
        soup = BeautifulSoup(r.text, "html.parser")
        items = soup.select("li.goodsItemLi")
        for item in items:
            name = item.get_text(" ", strip=True)
            if not any(k in name for k in ["戰鬥陀螺", "ベイブレード", "BeybladeX"]):
                continue
            sold = item.select_one(".soldOut, .oos")
            if sold:
                return "soldout"
            btn = item.select_one("button.addCarBtn, a.buy-btn")
            if btn:
                return "available"
        return "soldout"
    except Exception as e:
        print(f"    MOMO error: {e}")
        return "soldout"


# ── PChome ────────────────────────────────────────────────────────────────────
def check_pchome(keyword: str) -> str:
    try:
        url = f"https://ecshweb.pchome.com.tw/search/v3.3/?q={keyword}&scope=all"
        r = requests.get(url, headers=HEADERS, timeout=12)
        data = r.json()
        prods = data.get("Prods") or []
        for p in prods:
            if not any(k in p.get("name","") for k in ["陀螺", "ベイブレード", "Beyblade"]):
                continue
            if p.get("isPrecious") or p.get("qty", 1) > 0:
                return "available"
        return "soldout"
    except Exception as e:
        print(f"    PChome error: {e}")
        return "soldout"


# ── Funbox（官網商店搜尋）────────────────────────────────────────────────────
def check_funbox(keyword: str) -> str:
    try:
        url = f"https://www.funbox.com.tw/search?q={keyword}"
        r = requests.get(url, headers=HEADERS, timeout=12)
        soup = BeautifulSoup(r.text, "html.parser")
        items = soup.select(".product-item, .product-card")
        for item in items:
            sold = item.select_one(".sold-out, [data-sold-out]")
            if not sold:
                return "available"
        return "soldout"
    except Exception as e:
        print(f"    Funbox error: {e}")
        return "soldout"


# ── Yahoo 購物 ────────────────────────────────────────────────────────────────
def check_yahoo(keyword: str) -> str:
    try:
        url = f"https://tw.buy.yahoo.com/search/product?p={keyword}"
        r = requests.get(url, headers=HEADERS, timeout=12)
        soup = BeautifulSoup(r.text, "html.parser")
        items = soup.select("li[class*='ProductItem']")
        for item in items:
            if item.select_one("[class*='soldout'], [class*='SoldOut']"):
                continue
            btn = item.select_one("button, a[href*='item']")
            if btn:
                return "available"
        return "soldout"
    except Exception as e:
        print(f"    Yahoo error: {e}")
        return "soldout"


# ── Eslite 誠品 ───────────────────────────────────────────────────────────────
def check_eslite(keyword: str) -> str:
    try:
        url = f"https://www.esliteshopping.com/Search/?SearchString={keyword}"
        r = requests.get(url, headers=HEADERS, timeout=12)
        soup = BeautifulSoup(r.text, "html.parser")
        items = soup.select(".product-item, .item-list li")
        for item in items:
            sold = item.select_one(".sold-out, .item-soldout")
            if not sold:
                return "available"
        return "soldout"
    except Exception as e:
        print(f"    Eslite error: {e}")
        return "soldout"


CHECKERS = {
    "momo":   check_momo,
    "pchome": check_pchome,
    "funbox": check_funbox,
    "yahoo":  check_yahoo,
    "eslite": check_eslite,
}


def get_search_keyword(product: dict) -> str:
    """組合搜尋關鍵字：中文名 + 型號"""
    name = product["nameZh"]
    code = product["code"]
    # 拿掉配件描述，只保留主名稱
    name_clean = re.split(r"[\s（(]", name)[0]
    return f"戰鬥陀螺 {name_clean}"


def main():
    products = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    now = datetime.now(timezone.utc).isoformat()

    # 只抓已發售的本體陀螺（跳過配件和未發售）
    targets = [p for p in products if p.get("releasedTW") and not p.get("isAccessory")]
    print(f"共 {len(targets)} 款陀螺需要更新庫存")

    for p in targets:
        keyword = get_search_keyword(p)
        print(f"\n[{p['code']}] {p['nameZh']} (搜尋：{keyword})")

        for store_id, checker in CHECKERS.items():
            result = checker(keyword)
            p["availability"][store_id] = result
            icon = "✅" if result == "available" else "❌"
            print(f"  {store_id:8s} {icon} {result}")
            time.sleep(0.8)

        p["lastUpdated"] = now

    DATA_FILE.write_text(json.dumps(products, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n✅ 全部更新完成！→ {DATA_FILE}")


if __name__ == "__main__":
    main()
