#!/usr/bin/env node
// Codex の Stop フック（.codex/hooks.json）から呼ばれる。
// Codex が作業の最後に「②完了」と書いたら、同じ作業フォルダで ③ Claude Code（チェック・ブラッシュアップ）を自動で起動する。
// 運用は references/orca-workflow.md 第2章、Codex 側のルールは AGENTS.md 第4章。
//
//   起動先：Orca に接続できれば Orca のターミナル、できなければ Windows の新しいコンソール
//   重複防止：同じ作業フォルダ・同じ状態（HEAD と未コミット差分）では1回だけ起動する（.orca-pipeline/reviewed.json）
//
// どの場合も終了コード 0。Codex の動作を止めない。

import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const MARKER = /②\s*完了/;

function readInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return {};
  }
}

function git(cwd, args) {
  const r = spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8", windowsHide: true });
  return r.status === 0 ? (r.stdout || "").trim() : "";
}

// worktree から呼ばれても、元チェックアウトの .orca-pipeline に記録する
function mainCheckout(top) {
  const common = git(top, ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
  return common && path.basename(common) === ".git" ? path.dirname(common) : top;
}

function orcaCli() {
  const candidates = [["orca", process.platform === "win32"]];
  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    const exe = path.join(process.env.LOCALAPPDATA, "Programs", "orca", "resources", "bin", "orca.exe");
    if (existsSync(exe)) candidates.push([exe, false]);
  }
  for (const [cmd, viaShell] of candidates) {
    const r = spawnSync(cmd, ["status", "--json"], { encoding: "utf8", timeout: 5000, shell: viaShell, windowsHide: true });
    try {
      if (r.status === 0 && JSON.parse(r.stdout).result?.runtime?.reachable === true) return [cmd, viaShell];
    } catch {}
  }
  return null;
}

function reviewPrompt({ top, base, codexMessage }) {
  return `# ③ チェック・ブラッシュアップ依頼（Codex の Stop フックが自動作成）

あなたは ③ チェック・ブラッシュアップ担当です。**Orca を使わずに、この作業フォルダで直接作業してください。**

- 作業フォルダ：${top}
- 対象：② Codex が作った変更（\`git diff ${base || "origin/main"}...HEAD\` と未コミットの変更）

## Codex の完了報告（抜粋）
${(codexMessage || "").slice(0, 2000)}

## 手順
1. 変更ファイルを確認する。依頼書（projects/*/handoff/*.md）があれば、その Done when と「③ チェック観点」を基準にする。無ければ AGENTS.md と該当 Skill（ワイヤーなら skills/gg-wireframe、提案書なら skills/gg-proposal-deck、Excel なら skills/gg-sitemap-spec）を基準にする。判断は skills/gg-proposal-standard。
2. 問題はその場で直す（指摘だけで終わらない）。ワイヤーは \`python scripts/qa-wireframe.py <HTML>\` を通す。
3. STATUS.md と projects/<案件>/STATUS.md に1件追記する。依頼書があれば status を review にし、末尾に「## ③ 結果」を書く。
4. いまのブランチが main なら、先に \`codex/<案件>-<内容>\` のブランチを作る。コミットして push し、\`gh pr create\` で PR を作る。マージはしない。
5. 最後に、直した点・残った要確認・PR の URL を表で出す。
`;
}

const input = readInput();
const message = typeof input.last_assistant_message === "string" ? input.last_assistant_message : "";
if (input.stop_hook_active || !MARKER.test(message)) process.exit(0);

const cwd = input.cwd || process.cwd();
const top = git(cwd, ["rev-parse", "--show-toplevel"]);
if (!top) process.exit(0);

const root = mainCheckout(top);
const stateDir = path.join(root, ".orca-pipeline");
const statePath = path.join(stateDir, "reviewed.json");
const head = git(top, ["rev-parse", "HEAD"]);
const dirty = git(top, ["status", "--porcelain"]);
const key = `${top}@${head}@${createHash("sha1").update(dirty).digest("hex").slice(0, 12)}`;

let state = {};
try {
  state = JSON.parse(readFileSync(statePath, "utf8"));
} catch {}
if (state[key]) process.exit(0);

const base = git(top, ["merge-base", "HEAD", "origin/main"]);
mkdirSync(stateDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "");
const promptPath = path.join(stateDir, `review-${stamp}.md`);
writeFileSync(promptPath, reviewPrompt({ top, base, codexMessage: message }));
const launch = `claude "Read ${promptPath.replace(/\\/g, "/")} and follow it."`;

let via = null;
const orca = orcaCli();
if (orca) {
  const [cmd, viaShell] = orca;
  const r = spawnSync(cmd, ["terminal", "create", "--worktree", `path:${top}`, "--command", launch, "--json"], {
    encoding: "utf8",
    timeout: 15000,
    shell: viaShell,
    windowsHide: true,
  });
  if (r.status === 0) via = "orca";
}
if (!via && process.platform === "win32") {
  // start の第1引数（引用符つき）はウィンドウタイトル。Node に引用符を書き換えさせないため verbatim で渡す
  spawn("cmd.exe", ["/c", `start "Claude Code review" cmd /k ${launch}`], {
    cwd: top,
    detached: true,
    stdio: "ignore",
    windowsVerbatimArguments: true,
  }).unref();
  via = "console";
}

if (via) {
  state[key] = { at: new Date().toISOString(), via, prompt: promptPath };
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}
process.exit(0);
