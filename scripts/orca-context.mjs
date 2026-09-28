#!/usr/bin/env node
// Claude Code のフックから呼ばれ、Orca 運用のモードを判定して標準出力に書く。
// 出力はコンテキストとして Claude に渡る（.claude/settings.json）。
// 判定の意味と各モードの進め方は CLAUDE.md「Orca 運用（自動）」。
//
//   node scripts/orca-context.mjs              # SessionStart：モードを1行出す
//   node scripts/orca-context.mjs --on-prompt  # UserPromptSubmit：ワイヤー依頼なら Orca を起動してから出す
//
// どのモードでも終了コード 0。判定に失敗しても Claude Code の動作を止めない。

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// ワイヤー依頼とみなす語（gg-wireframe の description と揃える）
const WIREFRAME_RE = /ワイヤー|ワイヤーフレーム|\bWF\b|wireframe|画面設計|構成イメージ|たたき台|プロトタイプ/i;
const LAUNCH_WAIT_MS = 60000;

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    timeout: 5000,
    shell: process.platform === "win32", // orca / git が .cmd の場合に備える
    windowsHide: true,
  });
  return { ok: r.status === 0, out: (r.stdout || "").trim() };
}

// Windows の Orca 同梱 CLI（Orca の src/main/cli/bundled-cli-launcher-path.ts）。
// Claude デスクトップアプリ等、Orca CLI 登録前に起動したプロセスは PATH に orca が無いので直接探す
function bundledOrcaCli() {
  if (process.platform !== "win32" || !process.env.LOCALAPPDATA) return null;
  const exe = path.join(process.env.LOCALAPPDATA, "Programs", "orca", "resources", "bin", "orca.exe");
  return existsSync(exe) ? exe : null;
}

// 使える orca コマンドを1度だけ解決する：[cmd, viaShell] か null
let orcaCliCache;
function orcaCli() {
  if (orcaCliCache !== undefined) return orcaCliCache;
  const candidates = [["orca", process.platform === "win32"]];
  const exe = bundledOrcaCli();
  if (exe) candidates.push([exe, false]);
  orcaCliCache = null;
  for (const c of candidates) {
    if (orcaJson(c, ["status", "--json"])?.result?.runtime?.reachable === true) {
      orcaCliCache = c;
      break;
    }
  }
  return orcaCliCache;
}

function orcaJson([cmd, viaShell], args) {
  const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 5000, shell: viaShell, windowsHide: true });
  if (r.status !== 0) return null;
  try {
    const j = JSON.parse((r.stdout || "").trim());
    return j.ok === true ? j : null;
  } catch {
    return null;
  }
}

function orcaReady() {
  orcaCliCache = undefined; // 起動待ちのたびに解決し直す
  return orcaCli() !== null;
}

// Orca が管理している worktree の中か。Orca のターミナルなら ORCA_TERMINAL_HANDLE が入る。
// Claude デスクトップアプリ等が作った git worktree は Orca が知らないので、worktree current が失敗する
function inOrcaWorktree() {
  if (process.env.ORCA_TERMINAL_HANDLE) return true;
  if (!inLinkedWorktree()) return false;
  const cli = orcaCli();
  return cli ? orcaJson(cli, ["worktree", "current", "--json"]) !== null : false;
}

// git の linked worktree では git-dir と git-common-dir が一致しない
function inLinkedWorktree() {
  const gitDir = run("git", ["rev-parse", "--path-format=absolute", "--git-dir"]);
  const common = run("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
  if (!gitDir.ok || !common.ok) return false;
  return path.resolve(gitDir.out) !== path.resolve(common.out);
}

function branch() {
  const r = run("git", ["branch", "--show-current"]);
  return r.ok && r.out ? r.out : "(detached)";
}

// Windows で Orca 本体を起動し、CLI が応答するまで待つ。起動できれば true
function launchOrca() {
  if (process.platform !== "win32" || !process.env.LOCALAPPDATA) return false;
  const exe = path.join(process.env.LOCALAPPDATA, "Programs", "orca", "Orca.exe");
  if (!existsSync(exe)) return false;
  spawn(exe, [], { detached: true, stdio: "ignore", windowsHide: false }).unref();
  const until = Date.now() + LAUNCH_WAIT_MS;
  while (Date.now() < until) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000);
    if (orcaReady()) return true;
  }
  return false;
}

// 分担（references/role-split.md）：①claude.ai で整理 → 依頼書 → ②Codex が作る → ③Claude Code がチェック
function modeLine(ready) {
  if (!ready) {
    if (process.platform === "win32") {
      return "[Orca モード C] この PC 上で動いているが Orca CLI に接続できない（Orca 未起動か、CLI が見つからない）。クラウドではない。資料・ワイヤーの作成依頼は、Orca を起動してから skills/gg-orca-flow で回す。起動できなければ skills/gg-handoff で依頼書だけ作って main に入れる。";
    }
    return "[Orca モード C] Orca を使えない環境（クラウド等）＝①情報整理の担当。資料・ワイヤーの作成依頼は、自分では作らず skills/gg-handoff で依頼書を作って main に入れる（PC の Orca が15分以内に②Codex→③Claude Code で処理する）。";
  }
  if (inOrcaWorktree()) {
    return `[Orca モード A] Orca 管理の worktree 内（ブランチ ${branch()}）。役割は③チェック・ブラッシュアップ、または gg-orca-flow の進行役。受け取った依頼文の指示に従う。依頼書（projects/*/handoff）があれば、その Done when と③チェック観点で確認・修正して PR にする。`;
  }
  return `[Orca モード B] Orca 起動中・Orca の worktree の外（ブランチ ${branch()}）。資料・ワイヤーなどファイルを作る依頼は自分で作らず、skills/gg-orca-flow で ②Codex → ③Claude Code に回す（依頼書が無ければ先に gg-handoff の書式で作る）。質問・調査はこのまま答えてよい。`;
}

function readPrompt() {
  try {
    const j = JSON.parse(readFileSync(0, "utf8"));
    return typeof j.prompt === "string" ? j.prompt : "";
  } catch {
    return "";
  }
}

if (process.argv.includes("--on-prompt")) {
  // ワイヤー依頼以外は何も出さない（毎回のコンテキストを増やさない）
  if (!WIREFRAME_RE.test(readPrompt())) process.exit(0);

  let ready = orcaReady();
  let launched = false;
  if (!ready) {
    ready = launchOrca();
    launched = ready;
  }
  const head = launched ? "[Orca] ワイヤー依頼を検知し、Orca を起動した。" : "[Orca] ワイヤー依頼を検知。";
  const flow = !ready
    ? "Orca を起動できなかった。ワイヤーは作らず、skills/gg-handoff で依頼書（type: wireframe）を作って main に入れる。"
    : inOrcaWorktree()
      ? "③として：依頼書があればそのチェック観点で確認・修正し python scripts/qa-wireframe.py を通す。依頼書の無い新規作成なら skills/gg-orca-flow で②Codex に回す。"
      : "skills/gg-orca-flow で処理する：依頼書（type: wireframe）が無ければ gg-handoff の書式で作って main に入れ、②Codex（gg-wireframe で作成）→ ③Claude Code（チェック・qa-wireframe.py・PR）を回す。";
  console.log(`${head}${modeLine(ready)} ${flow}`);
} else {
  console.log(modeLine(orcaReady()));
}
