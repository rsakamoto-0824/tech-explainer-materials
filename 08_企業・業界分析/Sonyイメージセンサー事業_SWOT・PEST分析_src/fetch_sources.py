"""参考文献の本文（公開Webページ・PDF）を sources/ に保存する。

- HTML は sources/web/、PDF は sources/ に「発行年_発行元_タイトル」の名前で保存する
- すでに保存済みのファイルは取り直さない（取り直すときは該当ファイルを消してから実行）
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
SSS = "https://www.sony-semicon.com/ja/"

# (保存名, URL)。複数ページの記事はページごとに保存する
SOURCES = [
    # ソニーセミコンダクタソリューションズ（SSS）の発表
    ("2021_ソニーセミコンダクタソリューションズ_2層トランジスタ画素積層型CMOSイメージセンサー技術を開発.html", SSS + "news/2021/2021121601.html"),
    ("2025_ソニーセミコンダクタソリューションズ_I&SS分野 事業説明資料の公開.html", SSS + "info/2025/2025061301.html"),
    ("2026_ソニーセミコンダクタソリューションズ_TSMCとの戦略的提携に向けた基本合意.html", SSS + "news/2026/2026050801.html"),
    ("2026_ソニーセミコンダクタソリューションズ_LOFIC搭載モバイル用センサー LYTIA L910.html", SSS + "info/2026/2026061701.html"),
    ("2026_ソニーセミコンダクタソリューションズ_三菱電機とのAIビジョンセンサー合弁会社設立に合意.html", SSS + "news/2026/2026072201.html"),
    ("2026_ソニーセミコンダクタソリューションズ_熊本地震の影響について（第1報）.html", SSS + "info/2026/2026072901.html"),
    ("2026_ソニーセミコンダクタソリューションズ_熊本地震の影響について（第2報）.html", SSS + "info/2026/2026073101.html"),
    ("2026_ソニーセミコンダクタソリューションズ_TSMCとの合弁会社設立の確定契約.html", SSS + "news/2026/2026081101.html"),
    ("2026_ソニーセミコンダクタソリューションズ_拠点一覧（日本）.html", SSS + "company/base/index.html"),
    ("2026_ソニーセミコンダクタソリューションズ_ソニーの半導体の歴史・沿革.html", SSS + "company/history/index.html"),
    ("2026_ソニーセミコンダクタソリューションズ_インテリジェントビジョンセンサー（AIセンサー）.html", SSS + "technology/ivs/index.html"),
    # 政府
    ("2026_経済産業省_供給確保計画の概要（ソニーセミコンダクタマニュファクチャリング）.pdf",
     "https://www.meti.go.jp/policy/economy/economic_security/semicon/nintei_anpohandoutai_keikaku_28.pdf"),
    # EE Times Japan（ソニーの事業説明会・決算説明会・インタビューの報道）
    ("2024_EE Times Japan_イメージセンサーの成長を今後けん引するのは（事業説明会）_p1.html", EETJ + "2406/03/news056.html"),
    ("2024_EE Times Japan_イメージセンサーの成長を今後けん引するのは（事業説明会）_p2.html", EETJ + "2406/03/news056_2.html"),
    ("2024_EE Times Japan_イメージセンサーの成長を今後けん引するのは（事業説明会）_p3.html", EETJ + "2406/03/news056_3.html"),
    ("2024_EE Times Japan_イメージセンサーの成長を今後けん引するのは（事業説明会）_p4.html", EETJ + "2406/03/news056_4.html"),
    ("2025_EE Times Japan_イメージセンサー金額シェア60％目標「数年遅れる」.html", EETJ + "2506/13/news108.html"),
    ("2025_EE Times Japan_センサーで微細プロセス、ロジックも12nm導入へ.html", EETJ + "2506/19/news091.html"),
    ("2025_EE Times Japan_26年度には世界大手の9割が採用、黒字化も（車載）.html", EETJ + "2507/07/news061.html"),
    ("2025_EE Times Japan_ソニーが初の車室内用イメージセンサー投入.html", EETJ + "2510/02/news038.html"),
    ("2025_EE Times Japan_ソニー半導体、過去最高更新で見通しを上方修正_p1.html", EETJ + "2511/11/news110.html"),
    ("2025_EE Times Japan_ソニー半導体、過去最高更新で見通しを上方修正_p2.html", EETJ + "2511/11/news110_2.html"),
    ("2026_EE Times Japan_iPhoneのイメージセンサー、ソニーの独占供給「崩壊のとき」は近いのか.html", EETJ + "2601/15/news062.html"),
    ("2026_EE Times Japan_経産省がソニー画像センサー新工場に最大600億円補助.html", EETJ + "2604/17/news121.html"),
    ("2026_EE Times Japan_十時氏が語るソニー×TSMC合弁の狙いと期待.html", EETJ + "2605/08/news114.html"),
    ("2026_EE Times Japan_ソニーセミコンCTOに聞く（前編）_p1.html", EETJ + "2605/11/news104.html"),
    ("2026_EE Times Japan_ソニーセミコンCTOに聞く（前編）_p2.html", EETJ + "2605/11/news104_2.html"),
    ("2026_EE Times Japan_ソニーセミコンCTOに聞く（前編）_p3.html", EETJ + "2605/11/news104_3.html"),
    ("2026_EE Times Japan_ソニーセミコンCTOが語る技術戦略（後編）_p1.html", EETJ + "2605/15/news024.html"),
    ("2026_EE Times Japan_ソニーセミコンCTOが語る技術戦略（後編）_p2.html", EETJ + "2605/15/news024_2.html"),
    ("2026_EE Times Japan_ソニーセミコンCTOが語る技術戦略（後編）_p3.html", EETJ + "2605/15/news024_3.html"),
    ("2026_EE Times Japan_iPhone好調で過去最高も、「世界一」維持へ動くソニー半導体.html", EETJ + "2605/18/news060.html"),
    ("2026_EE Times Japan_三菱電機とソニー、AIビジョンセンサーで新会社設立へ.html", EETJ + "2607/23/news079.html"),
    ("2026_EE Times Japan_ソニー半導体は1Q過去最高益_p1.html", EETJ + "2607/31/news110.html"),
    ("2026_EE Times Japan_ソニー半導体は1Q過去最高益_p2.html", EETJ + "2607/31/news110_2.html"),
    ("2026_EE Times Japan_ソニーとTSMC、イメージセンサー合弁会社に7470億円_p1.html", EETJ + "2608/12/news054.html"),
    ("2026_EE Times Japan_ソニーとTSMC、イメージセンサー合弁会社に7470億円_p2.html", EETJ + "2608/12/news054_2.html"),
    ("2026_EE Times Japan_25年のイメージセンサー市場は過去最高、ソニーはシェア5割_p1.html", EETJ + "2608/26/news049.html"),
    ("2026_EE Times Japan_25年のイメージセンサー市場は過去最高、ソニーはシェア5割_p2.html", EETJ + "2608/26/news049_2.html"),
    ("2026_EE Times Japan_ついにイメージセンサー世界シェア5割、ソニーが迎える正念場.html", EETJ + "2609/03/news054.html"),
    # 市場調査・業界
    ("2026_Yole Group_CIS industry Sony extends its lead as China overtakes South Korea.html",
     "https://www.yolegroup.com/press-release/cis-industry-sony-extends-its-lead-as-china-overtakes-south-korea/"),
    ("2026_デジカメライフ_日経業界地図 CMOSイメージセンサー出荷額ベース世界シェア2025.html", "https://dclife.jp/archives/18627"),
    ("2026_IT之家_豪威2025年全球份额首超三星.html", "https://www.ithome.com/0/999/120.htm"),
    ("2025_TechInsights_Smartphone image sensor market share Q2 2025.html",
     "https://www.techinsights.com/blog/narrative-smartphone-image-sensor-market-share-q2-2025"),
    ("2025_TrendForce_SK hynix reportedly exits CIS to focus on AI memory.html",
     "https://www.trendforce.com/news/2025/03/06/news-sk-hynix-reportedly-exits-cis-to-focus-on-ai-memory-amid-weak-demand-and-fierce-china-competition/"),
    ("2026_IDC_Worldwide smartphone market to decline 13.9% in 2026.html",
     "https://www.idc.com/resource-center/blog/worldwide-smartphone-market-to-decline-13-9-in-2026-as-memory-crisis-and-us-iran-war-constrain-growth/"),
    ("2026_IDC_Smartphone shipments set for record 16.7% drop in 2026.html",
     "https://www.idc.com/resource-center/blog/smartphone-shipments-set-for-record-16-7-drop-in-2026-as-the-memory-crisis-hits-full-force/"),
    # Apple と Samsung
    ("2025_Apple_Apple increases US commitment to 600 billion USD.html",
     "https://www.apple.com/newsroom/2025/08/apple-increases-us-commitment-to-600-billion-usd-announces-ambitious-program/"),
    ("2025_TrendForce_Samsung tapped to produce Apple new chips at Austin fab.html",
     "https://www.trendforce.com/news/2025/08/07/news-samsung-tapped-to-produce-apples-new-chips-at-austin-fab-likely-for-iphone-image-sensors/"),
    ("2025_MacRumors_iPhone 18 camera sensor to be made in Texas.html",
     "https://www.macrumors.com/2025/12/24/iphone-18-camera-sensor-to-be-made-in-texas/"),
    ("2026_Sammy Fans_Apple could pay Samsung 1.5 billion a year for iPhone camera.html",
     "https://www.sammyfans.com/2026/01/11/apple-could-pay-samsung-1-5-billion-a-year-for-iphone-camera/"),
    # 通商・地政学
    ("2026_Congressional Research Service_US tariffs and the 2025 US-Japan framework agreement.pdf",
     "https://www.congress.gov/crs_external_products/IN/PDF/IN12608/IN12608.3.pdf"),
    ("2026_Skadden_The Supreme Court ends IEEPA tariffs.html",
     "https://www.skadden.com/insights/publications/2026/02/the-supreme-court-ends-ieepa-tariffs"),
    ("2026_Sandler Travis & Rosenberg_Section 232 tariffs on semiconductors.html",
     "https://www.strtrade.com/trade-news-resources/tariff-actions-resources/section-232-investigation-semiconductors"),
    ("2026_TMI総合法律事務所_中国による日本企業の輸出管理規制リストへの追加と実務対応.html",
     "https://www.tmi.gr.jp/eyes/blog/2026/18033.html"),
    # 地域社会
    ("2025_地方経済総合研究所_熊本の水資源と半導体産業.html",
     "https://www.reri.or.jp/report-and-news/ckm-semiconductor-water/"),
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
