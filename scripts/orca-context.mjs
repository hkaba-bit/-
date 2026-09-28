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

function orcaReady() {
  const r = run("orca", ["status", "--json"]);
  if (!r.ok) return false;
  try {
    const j = JSON.parse(r.out);
    return j.ok === true && j.result?.runtime?.reachable === true;
  } catch {
    return false;
  }
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

function modeLine(ready) {
  if (!ready) {
    return "[Orca モード C] Orca を使えない環境（クラウド等）。通常どおり作業ブランチで実装し、完了時に Codex へのレビュー依頼文（role-split.md 第3章の4項目）を、人間が Orca に貼れる形で最後に出す。";
  }
  if (inLinkedWorktree()) {
    return `[Orca モード A] Orca 管理の worktree 内（ブランチ ${branch()}）。この worktree で実装し、完了したら skills/gg-orca-flow の手順で同じ worktree の Codex にレビューを回す。`;
  }
  return `[Orca モード B] Orca は起動中だが、ここは元チェックアウト（ブランチ ${branch()}）。ファイルを変更する依頼は、着手前に skills/gg-orca-flow で worktree を切り、そこで実装させる。質問・調査だけならこのまま答えてよい。`;
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
  const steps = "Claude が skills/gg-wireframe で設計・TOP を作る → 下層の量産は Codex（role-split.md 第2章）→ レビューは Codex（修正せず指摘のみ）→ python scripts/qa-wireframe.py で検品。";
  const flow = !ready
    ? "Orca を起動できなかった。gg-wireframe で作業ブランチに作り、完了時に Codex へのレビュー依頼文を出す。"
    : inLinkedWorktree()
      ? `この worktree で進める：${steps}`
      : `skills/gg-orca-flow で worktree \`<案件スラッグ>-wireframe\` を切って進める：${steps}`;
  console.log(`${head}${modeLine(ready)} ${flow}`);
} else {
  console.log(modeLine(orcaReady()));
}
