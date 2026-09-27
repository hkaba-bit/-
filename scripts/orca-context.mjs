#!/usr/bin/env node
// Claude Code の SessionStart フックから呼ばれ、Orca 運用のモードを判定して標準出力に書く。
// 出力はセッション冒頭のコンテキストとして Claude に渡る（.claude/settings.json）。
// 判定の意味と各モードの進め方は CLAUDE.md「Orca 運用（自動）」。
//
//   node scripts/orca-context.mjs
//
// どのモードでも終了コード 0。判定に失敗してもセッション開始を止めない。

import { spawnSync } from "node:child_process";
import path from "node:path";

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

let mode;
if (!orcaReady()) {
  mode = "C";
} else if (inLinkedWorktree()) {
  mode = "A";
} else {
  mode = "B";
}

const lines = {
  A: `[Orca モード A] Orca 管理の worktree 内（ブランチ ${branch()}）。この worktree で実装し、完了したら skills/gg-orca-flow の手順で同じ worktree の Codex にレビューを回す。`,
  B: `[Orca モード B] Orca は起動中だが、ここは元チェックアウト（ブランチ ${branch()}）。ファイルを変更する依頼は、着手前に skills/gg-orca-flow で worktree を切り、そこで実装させる。質問・調査だけならこのまま答えてよい。`,
  C: "[Orca モード C] Orca を使えない環境（クラウド等）。通常どおり作業ブランチで実装し、完了時に Codex へのレビュー依頼文（role-split.md 第3章の4項目）を、人間が Orca に貼れる形で最後に出す。",
};

console.log(lines[mode]);
