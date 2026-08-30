#!/usr/bin/env python3
"""ワイヤーフレーム HTML を実際にブラウザで開いて検品する。

    python3 scripts/qa-wireframe.py projects/<案件>/wireframe/*.html
    python3 scripts/qa-wireframe.py --shots out/ projects/<案件>/wireframe/top.html

gg-wireframe の SKILL.md は「SPボタンを押して崩れを確認する工程を飛ばさない」と定めている。
その工程を自動化する。1ページごとに次を見る。

  - JS エラー / コンソールエラー
  - wireframe.css が効いているか（.wf-canvas の container-type）
  - PC → SP でキャンバス幅が 390px になるか
  - **グリッドが実際に組み替わるか**（@container が発火しているか）
  - 注釈トグルが効くか
  - ローカルリンクの切れ

終了コード 0=全ページ問題なし / 1=問題あり。
Playwright と Chromium が要る（`pip install playwright`）。
"""
import argparse
import json
import pathlib
import sys

CHROMIUM_CANDIDATES = [
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    "/opt/pw-browsers/chromium/chrome-linux/chrome",
]


def find_chromium():
    for c in CHROMIUM_CANDIDATES:
        if pathlib.Path(c).exists():
            return c
    return None  # Playwright の既定に任せる


def check_page(page, target: pathlib.Path, shots: pathlib.Path | None):
    errors = []
    page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.goto(target.as_uri())
    page.wait_for_timeout(300)

    problems = []
    if not page.locator(".wf-canvas").count():
        problems.append(".wf-canvas がない（gg-wireframe の型に沿っていない）")
        return problems, errors

    canvas = page.locator(".wf-canvas").first
    if page.evaluate("() => getComputedStyle(document.querySelector('.wf-canvas')).containerType") != "inline-size":
        problems.append("wireframe.css が効いていない（container-type が inline-size でない）")

    # 列数で比べる。px 文字列で比べるとキャンバスが縮んだだけでも「変わった」と誤判定する
    count_cols = "el => getComputedStyle(el).gridTemplateColumns.trim().split(/\\s+/).length"
    grid = page.locator("[class*='wf-grid']").first
    pc_cols = grid.evaluate(count_cols) if grid.count() else None

    page.click('[data-wf="sp"]')
    page.wait_for_timeout(300)
    sp_width = round(canvas.evaluate("el => el.getBoundingClientRect().width"))
    sp_cols = grid.evaluate(count_cols) if grid.count() else None

    if sp_width != 390:
        problems.append(f"SP切替でキャンバスが 390px にならない（{sp_width}px）")
    if pc_cols is not None and pc_cols > 1 and pc_cols == sp_cols:
        problems.append(
            f"SP切替でグリッドが組み替わらない（PC {pc_cols}列 → SP {sp_cols}列）。"
            "メディアクエリで組んでいないか確認する（@container を使う）")

    if shots:
        page.screenshot(path=str(shots / f"{target.stem}-sp.png"), full_page=True)
    page.click('[data-wf="pc"]')
    page.wait_for_timeout(200)
    if shots:
        page.screenshot(path=str(shots / f"{target.stem}-pc.png"), full_page=True)

    before = page.evaluate("() => document.body.dataset.notes")
    page.click('[data-wf="notes"]')
    page.wait_for_timeout(150)
    if page.evaluate("() => document.body.dataset.notes") == before:
        problems.append("注釈トグルが効かない")

    hrefs = page.eval_on_selector_all("a[href]", "els => els.map(e => e.getAttribute('href'))")
    for h in hrefs:
        if h and not h.startswith(("http", "#", "mailto:", "tel:")) and not (target.parent / h).exists():
            problems.append(f"リンク切れ: {h}")

    return problems, errors


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+", help="検品する HTML")
    ap.add_argument("--shots", help="スクリーンショットの出力先ディレクトリ")
    args = ap.parse_args()

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("playwright が入っていない: pip install playwright", file=sys.stderr)
        return 1

    shots = pathlib.Path(args.shots) if args.shots else None
    if shots:
        shots.mkdir(parents=True, exist_ok=True)

    exe = find_chromium()
    ng = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=exe) if exe else p.chromium.launch()
        for f in args.files:
            target = pathlib.Path(f).resolve()
            if not target.exists():
                print(f"  NG  {f}: ファイルがない")
                ng += 1
                continue
            page = browser.new_page(viewport={"width": 1440, "height": 1000})
            problems, errors = check_page(page, target, shots)
            page.close()

            issues = problems + errors
            print(f"  {'OK ' if not issues else 'NG '} {target.name}")
            for i in issues:
                print(f"        {i}")
            ng += bool(issues)
        browser.close()

    print("\n  OK  全ページ問題なし" if not ng else f"\n{ng} ページに問題あり。")
    return 0 if not ng else 1


if __name__ == "__main__":
    sys.exit(main())
