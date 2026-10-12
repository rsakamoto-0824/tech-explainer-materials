"""参考文献の本文（公開Webページ・PDF）を sources/ に保存する。

- HTML は sources/web/、PDF は sources/ に「発行年_発行元_タイトル」の名前で保存する
- すでに保存済みのファイルは取り直さない（取り直すときは該当ファイルを消してから実行）
- ソニーの分析資料（../Sonyイメージセンサー事業_SWOT・PEST分析_src）と共通の資料は、
  そちらで 2026-09-27 に保存したファイルをコピーして使っている。フォルダを単独で動かせるよう、ここにも URL を載せている
- 取得できなかったものは一覧の最後に理由（HTTPの応答など）を表示する

使い方: python3 fetch_sources.py
"""

import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
WEB_DIR = BASE_DIR / "sources" / "web"
PDF_DIR = BASE_DIR / "sources"
USER_AGENT = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")
TIMEOUT_SEC = 30
WAIT_BETWEEN_REQUESTS_SEC = 1.0
EETJ = "https://eetimes.itmedia.co.jp/ee/articles/"
SAMSUNG_NEWS = "https://news.samsung.com/global/"
YOLE = "https://www.yolegroup.com/press-release/"

# (保存名, URL)。複数ページの記事はページごとに保存する
SOURCES = [
    # サムスン電子の発表（決算・製品）
    ("2026_Samsung Electronics_First quarter 2026 results.html",
     SAMSUNG_NEWS + "samsung-electronics-announces-first-quarter-2026-results"),
    ("2026_Samsung Electronics_Second quarter 2026 results.html",
     SAMSUNG_NEWS + "samsung-electronics-announces-second-quarter-2026-results"),
    ("2021_Samsung Electronics_ISOCELL Auto 4AC first automotive ISOCELL.html",
     SAMSUNG_NEWS + "samsung-introduces-its-first-isocell-image-sensor-tailored-for-automotive-applications"),
    ("2021_Samsung Electronics_ISOCELL HP1 and GN5 ultra-fine pixel technologies.html",
     SAMSUNG_NEWS + "samsung-brings-advanced-ultra-fine-pixel-technologies-to-new-mobile-image-sensors"),
    ("2023_Samsung Electronics_ISOCELL Vizion 63D and 931 for robotics and XR.html",
     SAMSUNG_NEWS + "samsung-unveils-two-new-isocell-vizion-sensors-tailored-for-robotics-and-xr-applications"),
    ("2024_Samsung Electronics_ISOCELL HP9, GNJ and JN5.html",
     SAMSUNG_NEWS + "samsung-unveils-versatile-image-sensors-for-superior-smartphone-photography"),
    ("2026_Samsung Semiconductor_ISOCELL HP5 CES Innovation Awards 2026 honoree.html",
     "https://news.samsungsemiconductor.com/global/ces-innovation-awards-2026-honoree-isocell-hp5-"
     "advancing-mobile-imaging-with-the-industrys-smallest-0-5%E3%8E%9B-pixels/"),
    # 市場調査（シェアの推移）
    ("2021_THE ELEC_Samsung narrows CIS market share with Sony in 2020.html",
     "https://www.thelec.net/news/articleView.html?idxno=3231"),
    ("2023_EE Times Japan_首位ソニーが3年ぶりシェア拡大、2022年CIS市場_p1.html", EETJ + "2307/27/news084.html"),
    ("2023_EE Times Japan_首位ソニーが3年ぶりシェア拡大、2022年CIS市場_p2.html", EETJ + "2307/27/news084_2.html"),
    ("2024_Yole Group_Sony is set to capture 50% of the CIS market.html",
     YOLE + "sony-is-set-to-capture-50-of-the-cis-market/"),
    ("2024_EE Times Japan_首位ソニーはシェア45％に拡大、2023年のCIS市場_p1.html", EETJ + "2407/04/news078.html"),
    ("2024_EE Times Japan_首位ソニーはシェア45％に拡大、2023年のCIS市場_p2.html", EETJ + "2407/04/news078_2.html"),
    ("2025_EE Times Japan_24年のスマホ用CIS出荷台数、首位はソニーで2位＆3位に中国勢.html", EETJ + "2505/28/news061.html"),
    ("2025_Yole Group_CIS market to reach more than 30 billion USD by 2030.html",
     YOLE + "cis-market-to-reach-more-than-30-billion-by-2030-driven-by-mobile-automotive-and-security-applications/"),
    ("2025_EE Times Japan_2024年のイメージセンサー市場もソニーがトップ、高まる中国の存在感.html", EETJ + "2508/07/news045.html"),
    ("2026_Yole Group_CIS industry Sony extends its lead as China overtakes South Korea.html",
     YOLE + "cis-industry-sony-extends-its-lead-as-china-overtakes-south-korea/"),
    ("2026_EE Times Japan_25年のイメージセンサー市場は過去最高、ソニーはシェア5割_p1.html", EETJ + "2608/26/news049.html"),
    ("2026_EE Times Japan_25年のイメージセンサー市場は過去最高、ソニーはシェア5割_p2.html", EETJ + "2608/26/news049_2.html"),
    ("2026_デジカメライフ_日経業界地図 CMOSイメージセンサー出荷額ベース世界シェア2025.html", "https://dclife.jp/archives/18627"),
    ("2026_IT之家_豪威2025年全球份额首超三星.html", "https://www.ithome.com/0/999/120.htm"),
    ("2025_TechInsights_Smartphone image sensor market share Q2 2025.html",
     "https://www.techinsights.com/blog/narrative-smartphone-image-sensor-market-share-q2-2025"),
    # 韓国の報道・業界
    ("2018_Edaily_이미지센서 캐파 전환 결정된 바 없어（삼성전자 컨콜）.html",
     "https://edaily.co.kr/News/Read?mediaCodeNo=257&newsId=02974966619180056"),
    ("2025_TrendForce_SK hynix reportedly exits CIS to focus on AI memory.html",
     "https://www.trendforce.com/news/2025/03/06/news-sk-hynix-reportedly-exits-cis-to-focus-on-ai-memory-amid-weak-demand-and-fierce-china-competition/"),
    ("2026_DIGITIMES_Samsung System LSI talent exits raise risks for Exynos and image sensors.html",
     "https://www.digitimes.com/news/a20260415PD234/samsung-lsi-exynos-cis-talent-design.html"),
    ("2026_The Korea Herald_Long-stalled chip bill clears National Assembly.html",
     "https://www.koreaherald.com/article/10665897"),
    # スマートフォン市場
    ("2026_IDC_Worldwide smartphone market to decline 13.9% in 2026.html",
     "https://www.idc.com/resource-center/blog/worldwide-smartphone-market-to-decline-13-9-in-2026-as-memory-crisis-and-us-iran-war-constrain-growth/"),
    ("2026_IDC_Smartphone shipments set for record 16.7% drop in 2026.html",
     "https://www.idc.com/resource-center/blog/smartphone-shipments-set-for-record-16-7-drop-in-2026-as-the-memory-crisis-hits-full-force/"),
    ("2026_GSMArena_Samsung Galaxy S26 Ultra review camera.html",
     "https://www.gsmarena.com/samsung_galaxy_s26_ultra-review-2939p5.php"),
    # Apple と Samsung（Appleの発表と報道）
    ("2025_Apple_Apple increases US commitment to 600 billion USD.html",
     "https://www.apple.com/newsroom/2025/08/apple-increases-us-commitment-to-600-billion-usd-announces-ambitious-program/"),
    ("2025_TrendForce_Samsung tapped to produce Apple new chips at Austin fab.html",
     "https://www.trendforce.com/news/2025/08/07/news-samsung-tapped-to-produce-apples-new-chips-at-austin-fab-likely-for-iphone-image-sensors/"),
    ("2025_DIGITIMES_Samsung to produce iPhone image sensors in Texas but keep packaging in Korea.html",
     "https://www.digitimes.com/news/a20250811PD218/samsung-texas-fab-cis-apple-iphone-packaging.html"),
    ("2025_MacRumors_Suppliers already preparing for iPhone 18 camera.html",
     "https://www.macrumors.com/2025/10/15/suppliers-already-preparing-for-iphone-18-camera/"),
    ("2025_MacRumors_iPhone 18 camera sensor to be made in Texas.html",
     "https://www.macrumors.com/2025/12/24/iphone-18-camera-sensor-to-be-made-in-texas/"),
    ("2025_9to5Mac_iPhone 18 Pro camera sensors look set to be made in the USA.html",
     "https://9to5mac.com/2025/12/24/iphone-18-pro-camera-sensors-look-set-to-be-made-in-the-usa/"),
    ("2026_Sammy Fans_Apple could pay Samsung 1.5 billion a year for iPhone camera.html",
     "https://www.sammyfans.com/2026/01/11/apple-could-pay-samsung-1-5-billion-a-year-for-iphone-camera/"),
    ("2026_Sammy Fans_Apple iPhone 18 reportedly adopts Samsung camera sensors.html",
     "https://www.sammyfans.com/2026/07/03/apple-reportedly-adopts-samsung-camera-sensors/"),
    ("2026_EE Times Japan_iPhoneのイメージセンサー、ソニーの独占供給「崩壊のとき」は近いのか.html", EETJ + "2601/15/news062.html"),
    # 通商・産業政策
    # 米商務省の発表（2024年12月）は HTTP 403 で取得できないため、同じ内容をまとめた NIST の CHIPS のページを保存する
    ("2026_NIST CHIPS_Samsung Electronics (Texas) award.html",
     "https://www.nist.gov/chips/samsung-electronics-texas-taylor"),
    ("2025_The White House_Joint fact sheet on President Trump's meeting with President Lee Jae Myung.html",
     "https://www.whitehouse.gov/fact-sheets/2025/11/joint-fact-sheet-on-president-donald-j-trumps-meeting-with-president-lee-jae-myung/"),
    ("2026_Skadden_The Supreme Court ends IEEPA tariffs.html",
     "https://www.skadden.com/insights/publications/2026/02/the-supreme-court-ends-ieepa-tariffs"),
    ("2026_Sandler Travis & Rosenberg_Section 232 tariffs on semiconductors.html",
     "https://www.strtrade.com/trade-news-resources/tariff-actions-resources/section-232-investigation-semiconductors"),
    # 競合（ソニー）の動き
    ("2026_ソニーセミコンダクタソリューションズ_LOFIC搭載モバイル用センサー LYTIA L910.html",
     "https://www.sony-semicon.com/ja/info/2026/2026061701.html"),
    ("2026_ソニーセミコンダクタソリューションズ_TSMCとの合弁会社設立の確定契約.html",
     "https://www.sony-semicon.com/ja/news/2026/2026081101.html"),
]


def fetch(url):
    request = urllib.request.Request(url, headers={
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
    })
    with urllib.request.urlopen(request, timeout=TIMEOUT_SEC) as response:
        return response.status, response.headers.get("Content-Type", ""), response.read()


def main():
    WEB_DIR.mkdir(parents=True, exist_ok=True)
    failures = []
    saved = 0
    for name, url in SOURCES:
        target = (PDF_DIR if name.endswith(".pdf") else WEB_DIR) / name
        if target.exists() and target.stat().st_size > 0:
            continue
        try:
            status, content_type, body = fetch(url)
        except urllib.error.HTTPError as error:
            failures.append((name, url, f"HTTP {error.code}"))
            continue
        except (urllib.error.URLError, TimeoutError) as error:
            failures.append((name, url, f"接続できない（{error}）"))
            continue
        if name.endswith(".pdf") and not body.startswith(b"%PDF"):
            failures.append((name, url, f"PDFではない応答（{content_type}）"))
            continue
        target.write_bytes(body)
        saved += 1
        print(f"保存: {target.relative_to(BASE_DIR)}（{len(body):,} bytes）")
        time.sleep(WAIT_BETWEEN_REQUESTS_SEC)
    print(f"\n新しく保存 {saved} 件 / 一覧 {len(SOURCES)} 件 / 失敗 {len(failures)} 件")
    for name, url, reason in failures:
        print(f"失敗: {name}\n  {url}\n  理由: {reason}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
