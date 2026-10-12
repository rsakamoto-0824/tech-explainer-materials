"""参考文献の本文（公開Webページ・PDF）を sources/ に保存する。

- HTML（XHTMLを含む）は sources/web/、PDF と年次報告書のXHTMLは sources/ に「発行年_発行元_タイトル」の名前で保存する
- すでに保存済みのファイルは取り直さない（取り直すときは該当ファイルを消してから実行）
- asml.com のWebページはスクリプトからの取得を拒否する（HTTP 403）。ボット対策は回避せず、同じ発表文を
  ASMLの公式資料置き場（ourbrand.asml.com のPDF）や配信先（MFN、Nasdaq）から保存する
- 取得できなかったものは一覧の最後に理由（HTTPの応答など）を表示する
- ASMLの投資家向けページ（investor.asml.com/quarterly-results）はスクリプトから接続できなかった（タイムアウト）ため、
  この一覧には載せず、アプリ内のブラウザで閲覧した本文を sources/web/ にテキストで保存した

使い方: python3 fetch_sources.py
"""

import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
WEB_DIR = BASE_DIR / "sources" / "web"
DOC_DIR = BASE_DIR / "sources"
USER_AGENT = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")
TIMEOUT_SEC = 180
WAIT_BETWEEN_REQUESTS_SEC = 1.0
OURBRAND = "https://ourbrand.asml.com/"
MFN = "https://mfn.se/one/a/asml-holding/"
DOC_SUFFIXES = (".pdf", ".xhtml")

# (保存名, URL)
SOURCES = [
    # ASMLの決算・年次報告書（公式資料置き場のPDF、年次報告書はESEF形式の全文）
    ("2026_ASML_Press release Q4 and full year 2025 financial results.pdf",
     OURBRAND + "m/c416bb685db46ca0/original/ASML-Press-Release-Q4-and-full-year-2025-financial-results.pdf"),
    ("2026_ASML_Investor Relations presentation Q4 2025.pdf",
     OURBRAND + "m/3136300aa4999bc1/original/2026_01_28_Presentation-Investor-Relations-Q4-2025.pdf"),
    ("2026_ASML_Annual Report 2025 strategic report section.pdf",
     OURBRAND + "m/8ab959d4926657b/original/asml-2025-annual-report-strategic-report-section.pdf"),
    ("2026_ASML_Annual Report 2025 (IFRS-EU, ESEF).xhtml",
     "https://filings.xbrl.org/724500Y6DUVHQD6OXN27/2025-12-31/ESEF/NL/0/asml-2025-12-31-1-en/reports/asml-2025-12-31-1-en.xhtml"),
    ("2026_ASML_Q1 2026 financial results (MFN).html",
     MFN + "asml-reports-eu8-8-billion-total-net-sales-and-eu2-8-billion-net-income-in-q1-2026-cdb323f9"),
    ("2026_ASML_Investor Relations presentation Q1 2026.pdf",
     OURBRAND + "asset/d7b914e6-fdd1-4262-b805-d80f3efcb39a/2026_04_15_Presentation-Investor-Relations-Q1-2026.pdf"),
    ("2026_ASML_Press release Q2 2026 financial results.pdf",
     OURBRAND + "asset/c8dbf3fc-4c5e-4406-83f6-27694b138245/Press-Release-Financial-Results-Q2-2026.pdf"),
    ("2026_ASML_Investor Relations presentation Q2 2026.pdf",
     OURBRAND + "asset/9078cf4d-91fd-4dd9-a5d5-d1caab6dc046/2026_07_15_Presentation-Investor-Relations-Q2-2026.pdf"),
    ("2026_ASML_Transcript investor call Q2 2026.pdf",
     OURBRAND + "asset/1fd3908a-0381-47b5-9b69-a3094f656651/2026_07_15-ASML-Transcript-investor-call-Q2-2026.pdf"),
    # ASMLのその他の発表（配信先のコピー）
    ("2026_ASML_High NA EUV reaches new readiness milestone (MFN).html",
     MFN + "high-na-euv-reaches-new-readiness-milestone-with-first-high-volume-logic-product-dd245453"),
    ("2026_ASML_Construction of new Eindhoven campus BIC North (MFN).html",
     MFN + "asml-begins-construction-of-new-eindhoven-campus-strengthening-its-presence-in-the-brainport-region-2a2db7dd"),
    ("2025_ASML_ASML and Mistral AI enter strategic partnership (Nasdaq).html",
     "https://www.nasdaq.com/press-release/asml-mistral-ai-enter-strategic-partnership-2025-09-09"),
    ("2026_Mistral AI_ASML customer story.html", "https://mistral.ai/customers/asml/"),
    # サプライヤー
    ("2018_Electro Optics_Driving Moore's law with CO2 lasers (TRUMPF).html",
     "https://www.electrooptics.com/analysis-opinion/driving-moore-s-law-co2-lasers"),
    ("2020_Homburger_ASML planned acquisition of all shares of Berliner Glas.html",
     "https://www.homburger.ch/de/aktuell/asml-planned-acquisition-shares-berliner-glas/"),
    ("2021_FHI_VDL wins prizes during ASML Supplier Day.html",
     "https://fhi.nl/en/news/vdl-in-de-prijzen-tijdens-supplier-day-asml"),
    # 政治・通商
    ("2025_Government of the Netherlands_Export controls on advanced semiconductor manufacturing equipment to be tightened.html",
     "https://www.government.nl/latest/news/2025/01/15/klever-export-controls-on-advanced-semiconductor-manufacturing-equipment-to-be-tightened"),
    ("2026_TrendForce_US may push near-total ASML China ban on DUV sales and servicing.html",
     "https://www.trendforce.com/news/2026/08/25/news-u-s-may-push-near-total-asml-china-ban-on-duv-sales-and-servicing-amid-chinas-domestic-lithography-push/"),
    ("2026_The Motley Fool_ASML just got hit by a new China export threat.html",
     "https://www.fool.com/investing/2026/04/20/asml-just-got-hit-by-a-new-china-export-threat-is/"),
    ("2026_DutchNews_ASML denies US accusation an advanced machine reached China.html",
     "https://www.dutchnews.nl/2026/06/asml-denies-us-accusation-an-advanced-machine-reached-china/"),
    ("2025_TechRepublic_China EUV prototype (Reuters report).html",
     "https://www.techrepublic.com/article/news-china-euv-prototype/"),
    ("2025_Thompson Hine_White House announces one-year suspension of the BIS Affiliates Rule.html",
     "https://www.thompsonhinesmartrade.com/2025/11/white-house-announces-one-year-suspension-of-the-bis-affiliates-rule/"),
    ("2025_Clark Hill_China hits pause on rare-earth export controls.html",
     "https://clarkhill.com/news-events/news/china-hits-pause-on-rare-earth-export-controls-and-what-it-means-for-supply-chains"),
    ("2025_The Register_EU and US framework confirms 15 percent tariff cap.html",
     "https://www.theregister.com/2025/08/21/eu_us_15_percent_tariff_cap/"),
    ("2026_Skadden_The Supreme Court ends IEEPA tariffs.html",
     "https://www.skadden.com/insights/publications/2026/02/the-supreme-court-ends-ieepa-tariffs"),
    ("2026_Sandler Travis & Rosenberg_Section 232 tariffs on semiconductors.html",
     "https://www.strtrade.com/trade-news-resources/tariff-actions-resources/section-232-investigation-semiconductors"),
    ("2026_European Commission_Proposal for a Chips Act 2.0.html",
     "https://digital-strategy.ec.europa.eu/en/library/proposal-chips-act-20"),
    # オランダの事業環境
    ("2024_NL Times_Over 2.5 billion euros confirmed for Eindhoven area to keep ASML.html",
     "https://nltimes.nl/node/71993"),
    ("2026_DutchNews_After record year ASML is to cut 1700 jobs.html",
     "https://www.dutchnews.nl/2026/01/after-record-year-asml-is-to-cut-1700-jobs-mainly-in-nl/"),
    ("2026_DutchNews_How 30 percent ruling changes may affect your paycheck.html",
     "https://www.dutchnews.nl/2026/09/mind-the-gap-how-30-ruling-changes-may-affect-your-paycheck/"),
    ("2026_NL Times_Business leaders call on cabinet to fix power grid congestion.html",
     "https://nltimes.nl/2026/05/18/business-leaders-call-cabinet-fix-power-grid-congestion"),
    # 市場・技術・競合
    ("2026_SEMI_Global semiconductor equipment sales forecast to reach a record 229 billion dollars in 2028.html",
     "https://www.semi.org/en/semi-press-release/global-semiconductor-equipment-sales-forecast-to-reach-a-record-229-billion-dollars-in-2028-semi-reports"),
    ("2026_TrendForce_TSMC after earnings call EUV-driven capex surge.html",
     "https://www.trendforce.com/news/2026/07/17/news-tsmc-after-earnings-call-foreign-brokerages-see-euv-driven-capex-surge-and-2027-price-hikes/"),
    ("2026_TrendForce_ASML High-NA EUV for 2027-28 which giants are betting big.html",
     "https://www.trendforce.com/news/2026/02/16/news-asmls-high-na-euv-for-2027-28-which-giants-are-betting-big-intel-samsung-sk-hynix-or-tsmc/"),
    ("2025_Tom's Hardware_US government awards xLight 150 million dollars.html",
     "https://www.tomshardware.com/tech-industry/semiconductors/u-s-government-awards-gelsinger-backed-euv-developer-xlight-with-usd150-million-in-federal-incentives-company-to-develop-new-electron-based-light-source-for-lithography-tools"),
    ("2024_Canon_Canon ships nanoimprint lithography system to Texas Institute for Electronics.html",
     "https://global.canon/en/news/2024/20240926.html"),
]


def fetch(url):
    request = urllib.request.Request(url, headers={
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ja;q=0.8",
    })
    with urllib.request.urlopen(request, timeout=TIMEOUT_SEC) as response:
        return response.status, response.headers.get("Content-Type", ""), response.read()


def main():
    WEB_DIR.mkdir(parents=True, exist_ok=True)
    failures = []
    saved = 0
    for name, url in SOURCES:
        target = (DOC_DIR if name.endswith(DOC_SUFFIXES) else WEB_DIR) / name
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
