#!/usr/bin/env node
/**
 * deck.json から作業用ドラフト PPTX を生成する。
 *
 *   node skills/gg-proposal-deck/scripts/build_deck.js deck.json out.pptx
 *
 * 意匠は再現しない。SKILL.md の版面規約（フッター NN|総ページ数、章扉の3点セット、
 * ヘッダ／タイトル／リード文／要素／出典）に沿った構造的に正しいドラフトを出すだけ。
 * 正本 PPTX は Canva 書き出し。
 *
 * deck.json の書式は assets/deck-schema.md を参照。
 */

const fs = require("fs");
const path = require("path");
const PptxGenJS = require("pptxgenjs");

// ---- 版面定数（10 x 5.625 インチ = 16:9）----
const W = 10;
const H = 5.625;
const MARGIN = 0.55;
const BODY_W = W - MARGIN * 2;

const COLOR = {
  text: "1A1A1A",
  sub: "6B6B6B",
  rule: "D5D5D5",
  accent: "1F3A5F",
  chapterBg: "1F3A5F",
  chapterText: "FFFFFF",
};

const FONT = "Meiryo";

function fail(msg) {
  console.error(`エラー: ${msg}`);
  process.exit(1);
}

// ---- 検証：出せない deck.json は生成前に落とす ----
const SLIDE_TYPES = new Set(["cover", "summary", "chapter", "content", "table"]);

function validateDeck(deck) {
  const errors = [];
  if (!deck || typeof deck !== "object") errors.push("トップレベルがオブジェクトでない");
  if (!Array.isArray(deck.slides) || deck.slides.length === 0) errors.push("slides が空");

  (deck.slides || []).forEach((s, i) => {
    const at = `slides[${i}]`;
    if (!s || typeof s !== "object") return errors.push(`${at}: オブジェクトでない`);
    if (!SLIDE_TYPES.has(s.type)) {
      return errors.push(`${at}: type が不正（${s.type}）。使えるのは ${[...SLIDE_TYPES].join(" / ")}`);
    }
    if (s.type === "chapter" && (!s.no || !s.label || !s.name)) {
      errors.push(`${at}: 章扉には no・label・name の3点が要る（SKILL.md 版面規約）`);
    }
    if ((s.type === "content" || s.type === "table") && !s.title) {
      errors.push(`${at}: title がない`);
    }
    if (s.type === "table") {
      if (!Array.isArray(s.columns) || s.columns.length === 0) errors.push(`${at}: columns がない`);
      if (!Array.isArray(s.rows)) errors.push(`${at}: rows がない`);
      (s.rows || []).forEach((r, j) => {
        if (!Array.isArray(r)) errors.push(`${at}.rows[${j}]: 配列でない`);
        else if (s.columns && r.length !== s.columns.length) {
          errors.push(`${at}.rows[${j}]: 列数が columns と合わない（${r.length} ≠ ${s.columns.length}）`);
        }
      });
    }
  });
  return errors;
}

// ---- 各スライドの描画 ----
function addFooter(slide, pageNo, total) {
  slide.addText(`${String(pageNo).padStart(2, "0")}|${total}`, {
    x: W - MARGIN - 1.2, y: H - 0.42, w: 1.2, h: 0.25,
    align: "right", fontSize: 9, color: COLOR.sub, fontFace: FONT,
  });
}

function drawCover(slide, s, meta) {
  slide.addText(s.title || meta.title || "", {
    x: MARGIN, y: 2.0, w: BODY_W, h: 0.9,
    fontSize: 30, bold: true, color: COLOR.text, fontFace: FONT,
  });
  if (s.subtitle) {
    slide.addText(s.subtitle, {
      x: MARGIN, y: 2.9, w: BODY_W, h: 0.5,
      fontSize: 15, color: COLOR.sub, fontFace: FONT,
    });
  }
  const foot = [s.client || meta.client, meta.date, meta.author].filter(Boolean).join("　／　");
  slide.addText(foot, {
    x: MARGIN, y: H - 1.1, w: BODY_W, h: 0.4,
    fontSize: 11, color: COLOR.sub, fontFace: FONT,
  });
}

function drawChapter(slide, s) {
  slide.background = { color: COLOR.chapterBg };
  slide.addText(s.no, {
    x: MARGIN, y: 1.9, w: 1.4, h: 0.7,
    fontSize: 34, bold: true, color: COLOR.chapterText, fontFace: FONT,
  });
  slide.addText(s.label, {
    x: MARGIN, y: 2.6, w: BODY_W, h: 0.4,
    fontSize: 13, color: COLOR.chapterText, fontFace: FONT,
  });
  slide.addText(s.name, {
    x: MARGIN, y: 3.0, w: BODY_W, h: 0.6,
    fontSize: 24, bold: true, color: COLOR.chapterText, fontFace: FONT,
  });
}

function drawHead(slide, s) {
  let y = MARGIN;
  if (s.chapter) {
    slide.addText(s.chapter, {
      x: MARGIN, y, w: BODY_W, h: 0.25,
      fontSize: 10, color: COLOR.sub, fontFace: FONT,
    });
    y += 0.3;
  }
  slide.addText(s.title, {
    x: MARGIN, y, w: BODY_W, h: 0.5,
    fontSize: 20, bold: true, color: COLOR.text, fontFace: FONT,
  });
  y += 0.55;
  slide.addShape("line", {
    x: MARGIN, y, w: BODY_W, h: 0,
    line: { color: COLOR.rule, width: 1 },
  });
  y += 0.15;
  if (s.lead) {
    slide.addText(s.lead, {
      x: MARGIN, y, w: BODY_W, h: 0.5,
      fontSize: 12, color: COLOR.text, fontFace: FONT, valign: "top",
    });
    y += 0.6;
  }
  return y;
}

function drawSource(slide, s) {
  if (!s.source) return;
  slide.addText(`出典: ${s.source}`, {
    x: MARGIN, y: H - 0.42, w: BODY_W - 1.3, h: 0.25,
    fontSize: 9, color: COLOR.sub, fontFace: FONT,
  });
}

function drawContent(slide, s) {
  const y = drawHead(slide, s);
  const items = s.elements || [];
  if (items.length) {
    slide.addText(items.map((t) => ({ text: String(t), options: { bullet: true, breakLine: true } })), {
      x: MARGIN, y, w: BODY_W, h: H - y - 0.6,
      fontSize: 13, color: COLOR.text, fontFace: FONT, valign: "top", lineSpacingMultiple: 1.3,
    });
  }
  drawSource(slide, s);
}

function drawTable(slide, s) {
  const y = drawHead(slide, s);
  const header = s.columns.map((c) => ({
    text: String(c),
    options: { bold: true, color: COLOR.chapterText, fill: COLOR.accent },
  }));
  const body = s.rows.map((r) => r.map((c) => ({ text: c === null || c === undefined ? "" : String(c) })));
  slide.addTable([header, ...body], {
    x: MARGIN, y, w: BODY_W,
    fontSize: 11, fontFace: FONT, color: COLOR.text,
    border: { type: "solid", color: COLOR.rule, pt: 0.5 },
    autoPage: false,
  });
  drawSource(slide, s);
}

function drawSummary(slide, s) {
  const y = drawHead(slide, { ...s, title: s.title || "本提案の全体像" });
  const points = s.points || [];
  if (!points.length) return;
  // 論点表の型（SKILL.md P5）：見出し／現在地／本提案／参照
  const header = [{ text: "", options: { fill: COLOR.accent, color: COLOR.chapterText } }].concat(
    points.map((p, i) => ({
      text: `論点${String(i + 1).padStart(2, "0")}`,
      options: { bold: true, fill: COLOR.accent, color: COLOR.chapterText },
    }))
  );
  const rows = [
    ["見出し", ...points.map((p) => p.heading || "")],
    ["現在地", ...points.map((p) => p.current || "")],
    ["本提案", ...points.map((p) => p.proposal || "")],
    ["参照", ...points.map((p) => p.refs || "")],
  ].map(([label, ...cells]) => [
    { text: label, options: { bold: true } },
    ...cells.map((c) => ({ text: String(c) })),
  ]);
  slide.addTable([header, ...rows], {
    x: MARGIN, y, w: BODY_W,
    fontSize: 11, fontFace: FONT, color: COLOR.text,
    border: { type: "solid", color: COLOR.rule, pt: 0.5 },
    colW: [1.2, ...points.map(() => (BODY_W - 1.2) / points.length)],
    autoPage: false,
  });
  drawSource(slide, s);
}

const DRAW = { cover: drawCover, summary: drawSummary, chapter: drawChapter, content: drawContent, table: drawTable };

function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error("使い方: node build_deck.js <deck.json> <out.pptx>");
    process.exit(1);
  }
  if (!fs.existsSync(input)) fail(`入力が見つからない: ${input}`);

  let deck;
  try {
    deck = JSON.parse(fs.readFileSync(input, "utf8"));
  } catch (e) {
    fail(`JSON として読めない: ${e.message}`);
  }

  const errors = validateDeck(deck);
  if (errors.length) {
    console.error("deck.json に不備があるので生成しない:");
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  const meta = deck.meta || {};
  const total = deck.slides.length;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = meta.author || "GrowGroup";
  pptx.title = meta.title || "提案書";

  deck.slides.forEach((s, i) => {
    const slide = pptx.addSlide();
    DRAW[s.type](slide, s, meta);
    if (s.type !== "cover") addFooter(slide, i + 1, total);
  });

  pptx.writeFile({ fileName: output }).then(() => {
    console.log(`生成: ${output}（${total}枚）`);
    console.log("次に pptx skill の validate.py を通し、PDF 化して目視確認すること（AGENTS.md 第6章）");
  }).catch((e) => fail(e.message));
}

main();
