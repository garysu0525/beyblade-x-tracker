@echo off
cd /d "D:\AI應用\BaybladeXtracker\beyblade-x-tracker"
python scripts\scrape_availability.py >> scripts\scraper_log.txt 2>&1
if %errorlevel% neq 0 goto :end
git add data/products.json
git diff --cached --quiet || git commit -m "data: 自動更新庫存 %date% %time:~0,5%"
git push origin master
:end
