import sys, time
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, '.')

from scripts.scrape_availability import (
    check_momo, check_funbox, check_yahoo, close_browser, get_search_keyword
)

test_products = [
    {"code": "BX-23", "nameZh": "鳳凰飛翼"},
    {"code": "UX-01", "nameZh": "蒼龍爆刃"},
    {"code": "BX-36", "nameZh": "蒼龍爆刃 2"},
]

try:
    for p in test_products:
        kw = get_search_keyword(p)
        print(f"\n[{p['code']}] {p['nameZh']} (search: {kw})")
        print(f"  MOMO  : {check_momo(kw)}")
        time.sleep(0.5)
        print(f"  Funbox: {check_funbox(kw)}")
        time.sleep(0.5)
        print(f"  Yahoo : {check_yahoo(kw)}")
        time.sleep(0.5)
finally:
    close_browser()
