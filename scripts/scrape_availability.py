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
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "zh-TW,zh;q=0.9",
}

_pw = None
_browser = None
_pw_page = None

Status = Optional[str]  # "available" | "soldout" | "preorder" | None
Result = Tuple[Status, Optional[int]]  # (status, price_TWD)


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
def check_momo(keyword: str) -> Result:
    try:
        page = get_pw_page()
        url = f"https://www.momoshop.com.tw/search/searchShop.jsp?keyword={quote(keyword)}&searchType=1"
        page.goto(url, wait_until="networkidle", timeout=25000)
        items = page.query_selector_all("li.listAreaLi")
        if not items:
            return ("soldout", None)
        for item in items[:5]:
            sold = item.query_selector(".soldOut, [class*=soldOut]")
            if not sold:
                price = _parse_price(item.inner_text())
                return ("available", price)
        return ("soldout", None)
    except Exception as e:
        print(f"    MOMO error: {e}")
        return (None, None)


# -- PChome (requests) --------------------------------------------------------
def check_pchome(keyword: str) -> Result:
    for attempt in range(2):
        try:
            time.sleep(3 + attempt * 3)
            url = f"https://ecshweb.pchome.com.tw/search/v3.3/?q={quote(keyword)}&scope=all"
            r = requests.get(url, headers=HEADERS, timeout=15)
            if r.status_code == 429:
                continue
            data = r.json()
            prods = data.get("Prods") or []
            for p in prods:
                if p.get("qty", 0) > 0 or p.get("isPrecious"):
                    price = p.get("price") or p.get("Price")
                    return ("available", int(price) if price else None)
            return ("soldout" if prods else None, None)
        except Exception as e:
            print(f"    PChome error: {e}")
    return (None, None)


# -- Funbox (requests, Shopify static HTML) -----------------------------------
def check_funbox(keyword: str) -> Result:
    try:
        url = f"https://www.funbox.com.tw/?s={quote(keyword)}"
        r = requests.get(url, headers=HEADERS, timeout=12, verify=False)
        soup = BeautifulSoup(r.text, "html.parser")
        items = soup.select(".product")
        for item in items:
            text = item.get_text(" ", strip=True)
            if not any(k in text for k in ["陀螺", "ベイブレード", "Beyblade"]):
                continue
            btn = item.select_one("button, .AddCartBtn, [class*=cart]")
            if btn and "加入購物車" in btn.get_text():
                price = _parse_price(text)
                return ("available", price)
        return ("soldout" if items else None, None)
    except Exception as e:
        print(f"    Funbox error: {e}")
        return (None, None)


# -- Yahoo (Playwright) -------------------------------------------------------
def check_yahoo(keyword: str) -> Result:
    try:
        page = get_pw_page()
        url = f"https://tw.buy.yahoo.com/search/product?p={quote(keyword)}"
        page.goto(url, wait_until="networkidle", timeout=25000)
        items = page.query_selector_all("ul > li:has(a[href*='/gdsale']), ul.gridList > li")
        if not items:
            return (None, None)
        for item in items:
            text = item.inner_text()
            if "補貨中" in text or "售完" in text or "缺貨" in text:
                continue
            price = _parse_price(text)
            return ("available", price)
        return ("soldout", None)
    except Exception as e:
        print(f"    Yahoo error: {e}")
        return (None, None)


# -- Eslite (requests, often blocked by Cloudflare) ---------------------------
def check_eslite(keyword: str) -> Result:
    try:
        url = f"https://www.eslite.com/search?keyword={quote(keyword)}"
        r = requests.get(url, headers=HEADERS, timeout=12)
        if "Cloudflare" in r.text or r.status_code in (403, 503):
            return (None, None)
        soup = BeautifulSoup(r.text, "html.parser")
        items = soup.select(".product-item, [class*=product]")
        for item in items:
            sold = item.select_one(".sold-out, [class*=soldout]")
            if not sold:
                price = _parse_price(item.get_text())
                return ("available", price)
        return ("soldout" if items else None, None)
    except Exception as e:
        print(f"    Eslite error: {e}")
        return (None, None)


CHECKERS = {
    "momo":   check_momo,
    "pchome": check_pchome,
    "funbox": check_funbox,
    "yahoo":  check_yahoo,
    "eslite": check_eslite,
}


def get_search_keyword(product: dict) -> str:
    code = product["code"]
    name = product["nameZh"]
    name_first = re.split(r"[\s（(]", name)[0]
    return f"{code} {name_first[:2]}"


def main():
    products = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    now = datetime.now(timezone.utc).isoformat()

    targets = [p for p in products if p.get("releasedTW") and not p.get("isAccessory")]
    print(f"Total: {len(targets)} products to update")

    try:
        for p in targets:
            keyword = get_search_keyword(p)
            print(f"\n[{p['code']}] {p['nameZh']} (search: {keyword})")

            collected_prices = []
            for store_id, checker in CHECKERS.items():
                status, price = checker(keyword)
                p["availability"][store_id] = status
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
    finally:
        close_browser()

    DATA_FILE.write_text(json.dumps(products, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n[DONE] Updated {len(targets)} products -> {DATA_FILE}")


if __name__ == "__main__":
    main()
