"""
verify_names.py
從 Funbox（台灣官方代理）抓各型號正確中文名稱，與 products.json 比對
"""
import sys, json, time, re, requests, urllib3
from bs4 import BeautifulSoup
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
urllib3.disable_warnings()

DATA_FILE = Path(__file__).parent.parent / "data" / "products.json"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "zh-TW,zh;q=0.9",
}

products = json.loads(DATA_FILE.read_text(encoding="utf-8"))
# 只比對本體陀螺（非配件）
targets = [p for p in products if not p.get("isAccessory")]

mismatches = []
not_found = []

print(f"比對 {len(targets)} 款陀螺名稱...\n")

for p in targets:
    code = p["code"]
    our_name = p["nameZh"]

    # 搜尋 Funbox
    url = f"https://www.funbox.com.tw/?s={code}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=12, verify=False)
        soup = BeautifulSoup(r.text, "html.parser")
        items = soup.select(".product")

        # 找最相關的商品（名稱含有該型號代碼）
        best_name = None
        for item in items:
            text = item.get_text(" ", strip=True)
            # 找含有精確代碼的品項（避免 BX-1 匹配到 BX-10）
            if re.search(rf'\b{re.escape(code)}\b', text, re.IGNORECASE):
                # 取商品標題
                title_el = item.select_one(".product_name, h2, h3, .title, a")
                if title_el:
                    title = title_el.get_text(strip=True)
                    # 清掉前綴如 【TAKARA TOMY】
                    title = re.sub(r'【[^】]+】', '', title).strip()
                    title = re.sub(r'\s+', ' ', title)
                    if title and len(title) > 3:
                        best_name = title
                        break

        if best_name:
            # 比對是否一致（用包含關係，因翻譯可能有些微差異）
            match = (our_name in best_name) or (best_name in our_name)
            if not match:
                mismatches.append({
                    "code": code,
                    "ours": our_name,
                    "funbox": best_name,
                })
                print(f"[不符] {code}")
                print(f"  我們: {our_name}")
                print(f"  Funbox: {best_name}")
        else:
            not_found.append(code)
            print(f"[找不到] {code} ({our_name})")

        time.sleep(0.6)

    except Exception as e:
        print(f"[ERR] {code}: {e}")
        time.sleep(1)

print(f"\n========== 比對結果 ==========")
print(f"名稱不符: {len(mismatches)} 款")
print(f"Funbox 找不到: {len(not_found)} 款")

if mismatches:
    print("\n--- 需要修正的名稱 ---")
    for m in mismatches:
        print(f"  {m['code']}: 「{m['ours']}」→ 「{m['funbox']}」")

if not_found:
    print(f"\n--- Funbox 找不到的型號 ---")
    print("  " + ", ".join(not_found))
