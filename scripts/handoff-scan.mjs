#!/usr/bin/env node
// Orca パイプライン用：projects/*/handoff/*.md の依頼書（status: ready）を探す。
// 運用は references/orca-workflow.md 第3章、依頼書の書式は skills/gg-handoff/SKILL.md。
//
//   node scripts/handoff-scan.mjs --check            # main を pull し、未着手の ready があれば exit 0、無ければ exit 1（Orca automation の precheck 用）
//   node scripts/handoff-scan.mjs --next             # 未着手の ready を1件取り出して JSON で出し、着手済みとして記録する。無ければ exit 1
//   node scripts/handoff-scan.mjs --release <path>   # 着手記録を消す（処理に失敗したとき、次回に再挑戦させる）
//   node scripts/handoff-scan.mjs --list             # ready の一覧（着手済みかどうか付き）
//
// 着手記録は .orca-pipeline/claimed.json（Git 追跡外）。同じ依頼書を二重に処理しないためだけに使う。
// front matter の runner が dots の依頼書は OpenAI Dots（クラウド）が処理するので、--check / --next では拾わない（references/dots-workflow.md）。

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// worktree から呼ばれても、元チェックアウト（main）を見る。git-common-dir の親が元チェックアウト
function mainCheckout() {
  const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const r = spawnSync("git", ["-C", here, "rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8" });
  const common = (r.stdout || "").trim();
  return r.status === 0 && path.basename(common) === ".git" ? path.dirname(common) : here;
}

const ROOT = mainCheckout();
const STATE_DIR = path.join(ROOT, ".orca-pipeline");
const STATE = path.join(STATE_DIR, "claimed.json");

function frontMatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim();
  }
  return out;
}

function readyHandoffs() {
  const projects = path.join(ROOT, "projects");
  if (!existsSync(projects)) return [];
  const found = [];
  for (const slug of readdirSync(projects)) {
    if (slug.startsWith("_")) continue; // _template
    const dir = path.join(projects, slug, "handoff");
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).sort()) {
      if (!f.endsWith(".md")) continue;
      const rel = path.posix.join("projects", slug, "handoff", f);
      const text = readFileSync(path.join(dir, f), "utf8");
      const fm = frontMatter(text);
      if (fm.status !== "ready") continue;
      const title = (text.match(/^#\s+(.+)$/m) || [, f])[1].trim();
      found.push({ path: rel, slug: fm.slug || slug, type: fm.type || "other", runner: fm.runner || "orca", title });
    }
  }
  return found;
}

function loadClaimed() {
  try {
    return JSON.parse(readFileSync(STATE, "utf8"));
  } catch {
    return {};
  }
}

function saveClaimed(c) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE, JSON.stringify(c, null, 2));
}

function pullMain() {
  // 手元の作業を壊さないよう、main 上で fast-forward できるときだけ取り込む
  const b = spawnSync("git", ["-C", ROOT, "branch", "--show-current"], { encoding: "utf8" });
  if ((b.stdout || "").trim() !== "main") return;
  spawnSync("git", ["-C", ROOT, "pull", "--ff-only", "-q", "origin", "main"], { stdio: "ignore", timeout: 60000 });
}

const [cmd, arg] = process.argv.slice(2);
const claimed = loadClaimed();
const pending = () => readyHandoffs().filter((h) => h.runner !== "dots" && !claimed[h.path]);

switch (cmd) {
  case "--check": {
    pullMain();
    const n = pending().length;
    console.log(`ready（未着手）: ${n} 件`);
    process.exit(n > 0 ? 0 : 1);
  }
  case "--next": {
    pullMain();
    const h = pending()[0];
    if (!h) process.exit(1);
    claimed[h.path] = new Date().toISOString();
    saveClaimed(claimed);
    console.log(JSON.stringify(h));
    break;
  }
  case "--release": {
    if (!arg) {
      console.error("使い方: --release <projects/.../handoff/xxx.md>");
      process.exit(2);
    }
    delete claimed[arg.replace(/\\/g, "/")];
    saveClaimed(claimed);
    console.log(`解除: ${arg}`);
    break;
  }
  case "--list": {
    for (const h of readyHandoffs()) {
      const state = h.runner === "dots" ? "Dots  " : claimed[h.path] ? "着手済" : "未着手";
      console.log(`${state}  ${h.path}  [${h.type}] ${h.title}`);
    }
    break;
  }
  default:
    console.error("使い方: --check | --next | --release <path> | --list");
    process.exit(2);
}
