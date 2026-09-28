# Orca に「gg handoff pipeline」（15分ごとに依頼書を確認して ②Codex → ③Claude Code を回す）を登録する。
# 運用は references/orca-workflow.md 第3章。Orca を起動した状態で、元チェックアウト（main）で実行する。
#
#   powershell -ExecutionPolicy Bypass -File scripts\setup-orca-pipeline.ps1            # 登録（有効）
#   powershell -ExecutionPolicy Bypass -File scripts\setup-orca-pipeline.ps1 -Disabled  # 無効のまま登録（試運転用）

param([switch]$Disabled)
$ErrorActionPreference = "Stop"

$Name = "gg handoff pipeline"
$Root = Split-Path -Parent $PSScriptRoot
$RootFwd = $Root -replace '\\', '/'

# orca CLI：PATH に無ければ Orca 同梱のものを使う
$orca = "orca"
if (-not (Get-Command orca -ErrorAction SilentlyContinue)) {
  $orca = Join-Path $env:LOCALAPPDATA "Programs\orca\resources\bin\orca.exe"
  if (-not (Test-Path $orca)) { throw "orca CLI が見つからない。Orca の Settings → General → Orca CLI を有効にする" }
}

$status = & $orca status --json | Out-String | ConvertFrom-Json
if (-not $status.ok) { throw "Orca に接続できない。Orca を起動してから再実行する" }

$branch = (git -C $Root branch --show-current).Trim()
if ($branch -ne "main") { Write-Host "注意: $Root のブランチが main ではない（$branch）。依頼書は main から取り込むので main に戻しておくこと" -ForegroundColor Yellow }

# このリポジトリの Orca 上の id
$repos = (& $orca repo list --json | Out-String | ConvertFrom-Json).result.repos
$repo = $repos | Where-Object { ($_.path -replace '\\', '/').TrimEnd('/') -ieq $RootFwd.TrimEnd('/') } | Select-Object -First 1
if (-not $repo) { throw "Orca にこのリポジトリ（$Root）が登録されていない。サイドバーの Add Repo で追加する" }

$existing = & $orca automations list --json | Out-String
if ($existing -match [regex]::Escape($Name)) {
  Write-Host "すでに登録済み: $Name（変更は Orca の Automations 画面、または orca automations edit）"
  exit 0
}

$prompt = "skills/gg-orca-flow/SKILL.md の手順 1〜7 で、依頼書（projects/*/handoff/*.md、status: ready）を1件処理してください。処理対象が無ければ何もせず終了してください。"
$cliArgs = @(
  "automations", "create",
  "--name", $Name,
  "--trigger", "*/15 * * * *",
  "--precheck", "node $RootFwd/scripts/handoff-scan.mjs --check",
  "--prompt", $prompt,
  "--provider", "claude",
  "--repo", "id:$($repo.id)",
  "--json"
)
if ($Disabled) { $cliArgs += "--disabled" }

& $orca @cliArgs
if ($LASTEXITCODE -ne 0) { throw "orca automations create に失敗（exit $LASTEXITCODE）" }
Write-Host ""
Write-Host "登録した: $Name（15分ごと。依頼書が無い回は precheck で止まり、エージェントは起動しない）"
Write-Host "確認: orca automations list --json / Orca の Automations 画面"
