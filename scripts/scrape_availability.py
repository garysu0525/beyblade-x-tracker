"""
scrape_availability.py
自動抓各電商平台陀螺庫存狀態及市場價格，更新 data/products.json
執行：python scripts/scrape_availability.py
GitHub Actions 每天 08:00 / 20:00 (UTC+8) 自動執行
"""

import json
import time
import re
import requests
import urllib3
from bs4 import BeautifulSoup
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import quote
from typing import Tuple, Optional

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

DATA_FILE = Path(__file__).parent.parent / "data" / "products.json"
GM_HISTORY_FILE = Path(__file__).parent.parent / "data" / "gray-market-history.json"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "zh-TW,zh;q=0.9",
}

_pw = None
_browser = None
_pw_page = None

Status = Optional[str]  # "available" | "soldout" | "preorder" | None
Result = Tuple[Status, Optional[int], Optional[str]]  # (status, price_TWD, url)


def get_pw_page():
    global _pw, _browser, _pw_page
    if _pw_page is None:
        from playwright.sync_api import sync_playwright
        _pw = sync_playwright().start()
        _browser = _pw.chromium.launch(headless=True)
        ctx = _browser.new_context(user_agent=HEADERS["User-Agent"], locale="zh-TW")
        _pw_page = ctx.new_page()
    return _pw_page


def close_browser():
    global _pw, _browser, _pw_page
    if _browser:
        _browser.close()
    if _pw:
        _pw.stop()
    _pw = _browser = _pw_page = None


def _parse_price(text: str) -> Optional[int]:
    """從文字中取出最小的 NT$ 價格"""
    prices = [int(m.replace(",", "")) for m in re.findall(r"[\$＄]?\s*(\d{2,6}(?:,\d{3})*)", text)
              if 200 <= int(m.replace(",", "")) <= 9999]
    return min(prices) if prices else None


# -- MOMO (Playwright) --------------------------------------------------------
MOMO_SOLDOUT_WORDS = {"缺貨", "售完", "補貨中", "暫時缺貨", "無法購買"}

def _keyword_in_text(keyword: str, text: str) -> bool:
    """確認商品文字包含搜尋關鍵字中的型號（如 BX-03）"""
    code = keyword.split()[0]  # 取第一個 token（型號）
    return code.upper() in text.upper()

def check_momo(keyword: str) -> Result:
    search_url = f"https://www.momoshop.com.tw/search/searchShop.jsp?keyword={quote(keyword)}&searchType=1"
    try:
        page = get_pw_page()
        page.goto(search_url, wait_until="networkidle", timeout=25000)
        items = page.query_selector_all("li.listAreaLi")
        if not items:
            return ("soldout", None, search_url)
        for item in items[:5]:
            text = item.inner_text()
            if not _keyword_in_text(keyword, text):
                continue  # 商品與型號不符，跳過
            sold_class = item.query_selector(".soldOut, [class*=soldOut]")
            sold_text = any(w in text for w in MOMO_SOLDOUT_WORDS)
            if sold_class or sold_text:
                continue
            price = _parse_price(text)
            if price:
                return ("available", price, search_url)
        return ("soldout", None, search_url)
    except Exception as e:
        print(f"    MOMO error: {e}")
        return (None, None, search_url)


# -- PChome (requests) --------------------------------------------------------
def check_pchome(keyword: str) -> Result:
    search_url = f"https://shopping.pchome.com.tw/?q={quote(keyword)}"
    for attempt in range(2):
        try:
            time.sleep(3 + attempt * 3)
            api_url = f"https://ecshweb.pchome.com.tw/search/v3.3/?q={quote(keyword)}&scope=all"
            r = requests.get(api_url, headers=HEADERS, timeout=15)
            if r.status_code == 429:
                continue
            data = r.json()
            prods = data.get("Prods") or []
            for p in prods:
                if p.get("qty", 0) > 0 or p.get("isPrecious"):
                    price = p.get("price") or p.get("Price")
                    return ("available", int(price) if price else None, search_url)
            return ("soldout" if prods else None, None, search_url)
        except Exception as e:
            print(f"    PChome error: {e}")
    return (None, None, search_url)


# -- Funbox (requests, Shopify static HTML) -----------------------------------
def check_funbox(keyword: str) -> Result:
    search_url = f"https://www.funbox.com.tw/?s={quote(keyword)}"
    try:
        r = requests.get(search_url, headers=HEADERS, timeout=12, verify=False)
        soup = BeautifulSoup(r.text, "html.parser")
        items = soup.select(".product")
        for item in items:
            text = item.get_text(" ", strip=True)
            if not _keyword_in_text(keyword, text):
                continue  # 型號不符
            if not any(k in text for k in ["陀螺", "ベイブレード", "Beyblade"]):
                continue
            btn = item.select_one("button, .AddCartBtn, [class*=cart]")
            if btn and "加入購物車" in btn.get_text():
                price = _parse_price(text)
                return ("available", price, search_url)
        return ("soldout" if items else None, None, search_url)
    except Exception as e:
        print(f"    Funbox error: {e}")
        return (None, None, search_url)


# -- Yahoo (Playwright) -------------------------------------------------------
YAHOO_SOLDOUT_WORDS = {"補貨中", "售完", "缺貨", "暫時缺貨", "已售完"}

def check_yahoo(keyword: str) -> Result:
    search_url = f"https://tw.buy.yahoo.com/search/product?p={quote(keyword)}"
    try:
        page = get_pw_page()
        page.goto(search_url, wait_until="networkidle", timeout=12000)  # 縮短 timeout
        items = page.query_selector_all("ul > li:has(a[href*='/gdsale']), ul.gridList > li")
        if not items:
            return (None, None, search_url)
        for item in items[:5]:
            text = item.inner_text()
            if not _keyword_in_text(keyword, text):
                continue  # 商品與型號不符，跳過
            if any(w in text for w in YAHOO_SOLDOUT_WORDS):
                continue
            price = _parse_price(text)
            if price:
                return ("available", price, search_url)
        return ("soldout", None, search_url)
    except Exception as e:
        print(f"    Yahoo error: {e}")
        return (None, None, search_url)


# -- Eslite (requests, often blocked by Cloudflare) ---------------------------
def check_eslite(keyword: str) -> Result:
    search_url = f"https://www.eslite.com/search?keyword={quote(keyword)}"
    try:
        r = requests.get(search_url, headers=HEADERS, timeout=12)
        if "Cloudflare" in r.text or r.status_code in (403, 503):
            return (None, None, search_url)
        soup = BeautifulSoup(r.text, "html.parser")
        items = soup.select(".product-item, [class*=product]")
        for item in items:
            sold = item.select_one(".sold-out, [class*=soldout]")
            if not sold:
                price = _parse_price(item.get_text())
                return ("available", price, search_url)
        return ("soldout" if items else None, None, search_url)
    except Exception as e:
        print(f"    Eslite error: {e}")
        return (None, None, search_url)


# -- Shopee TW gray market -----------------------------------------------------
# 蝦皮封鎖 headless browser 且 API 需登入，僅提供搜尋連結，價格不爬
def check_shopee_gm(code: str, zh_name: str) -> Tuple[Optional[int], str]:
    kw = f"戰鬥陀螺X {code}"
    return (None, f"https://shopee.tw/search?keyword={quote(kw)}")


# -- Ruten TW gray market (Playwright) ----------------------------------------
def check_ruten_gm(code: str) -> Tuple[Optional[int], str]:
    """回傳 (最低價, search_url)；失敗回傳 (None, search_url)"""
    kw = f"戰鬥陀螺X {code}"
    search_url = f"https://www.ruten.com.tw/find/?q={quote(kw)}"
    try:
        page = get_pw_page()
        page.goto(search_url, wait_until="networkidle", timeout=20000)
        page.wait_for_timeout(1500)
        els = page.query_selector_all("[class*=price]")
        prices = []
        for el in els[:30]:
            p = _parse_price(el.inner_text())
            if p and 300 <= p <= 8000:
                prices.append(p)
        return (min(prices) if prices else None, search_url)
    except Exception as e:
        print(f"    Ruten GM error: {e}")
        return (None, search_url)


def update_gm_history(code: str, date_str: str, shopee_price: Optional[int], ruten_price: Optional[int]):
    """把今天的水貨價格存進 gray-market-history.json"""
    try:
        hist = json.loads(GM_HISTORY_FILE.read_text(encoding="utf-8")) if GM_HISTORY_FILE.exists() else {"prices": {}}
        history = hist.setdefault("prices", {}).setdefault(code, [])
        # 若今天已有記錄就更新，否則 append
        if history and history[-1].get("date") == date_str:
            history[-1]["shopeeMin"] = shopee_price
            history[-1]["rutenMin"] = ruten_price
        else:
            history.append({"date": date_str, "shopeeMin": shopee_price, "rutenMin": ruten_price})
        # 只保留最近 90 天
        hist["prices"][code] = history[-90:]
        GM_HISTORY_FILE.write_text(json.dumps(hist, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"    GM history error: {e}")


CHECKERS = {
    "momo":   check_momo,
    "pchome": check_pchome,
    "funbox": check_funbox,
    # yahoo: 持續 timeout，暫時停用
    # eslite: Cloudflare 封鎖，暫時停用
}


def get_search_keyword(product: dict) -> str:
    code = product["code"]
    name = product["nameZh"]
    name_first = re.split(r"[\s（(]", name)[0]
    return f"{code} {name_first[:2]}"


def main():
    products = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    now = datetime.now(timezone.utc).isoformat()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    targets = [p for p in products if p.get("releasedTW") and not p.get("isAccessory")]
    print(f"Total: {len(targets)} products to update")

    try:
        for p in targets:
            keyword = get_search_keyword(p)
            print(f"\n[{p['code']}] {p['nameZh']} (search: {keyword})")

            collected_prices = []
            if "storeUrls" not in p:
                p["storeUrls"] = {}
            for store_id, checker in CHECKERS.items():
                status, price, url = checker(keyword)
                p["availability"][store_id] = status
                if url:
                    p["storeUrls"][store_id] = url
                if price:
                    collected_prices.append(price)
                icon = "[OK]" if status == "available" else ("[??]" if status is None else "[--]")
                price_str = f" NT${price}" if price else ""
                print(f"  {store_id:8s} {icon} {status}{price_str}")
                time.sleep(0.5)

            # 取各平台最低價作為 marketPriceTWD
            if collected_prices:
                p["marketPriceTWD"] = min(collected_prices)
            p["lastUpdated"] = now

            # 水貨價格（只抓有 tier 的商品）
            gm = p.get("grayMarket")
            if gm and p.get("tier"):
                print(f"  [灰] Shopee & Ruten 水貨價...")
                shopee_price, _ = check_shopee_gm(p["code"], p["nameZh"])
                ruten_price, _ = check_ruten_gm(p["code"])
                update_gm_history(p["code"], today, shopee_price, ruten_price)
                # 更新 products.json 內的最新價格
                gm["shopeePrice"] = shopee_price
                gm["rutenPrice"] = ruten_price
                gm["lastUpdated"] = today
                if shopee_price:
                    print(f"    Shopee: NT${shopee_price}")
                if ruten_price:
                    print(f"    Ruten:  NT${ruten_price}")
                time.sleep(1)
    finally:
        close_browser()

    DATA_FILE.write_text(json.dumps(products, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n[DONE] Updated {len(targets)} products -> {DATA_FILE}")


if __name__ == "__main__":
    main()
