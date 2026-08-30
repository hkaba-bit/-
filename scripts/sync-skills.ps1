# skills/ を正本として Claude Code 側（%USERPROFILE%\.claude\skills）へ配布する。
# シンボリックリンクを試み、権限不足なら robocopy でミラーコピーに切り替える。
#
#   powershell -ExecutionPolicy Bypass -File scripts\sync-skills.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\sync-skills.ps1 -Copy

param([switch]$Copy)
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Src  = Join-Path $Root "skills"
$Dest = if ($env:CLAUDE_SKILLS_DIR) { $env:CLAUDE_SKILLS_DIR } else { Join-Path $env:USERPROFILE ".claude\skills" }

if (-not (Test-Path $Src)) { throw "skills/ が見つからない: $Src" }
New-Item -ItemType Directory -Force -Path $Dest | Out-Null

foreach ($dir in Get-ChildItem -Path $Src -Directory) {
  $target = Join-Path $Dest $dir.Name
  if (Test-Path $target) { Remove-Item $target -Recurse -Force }

  if (-not $Copy) {
    try {
      New-Item -ItemType SymbolicLink -Path $target -Target $dir.FullName -ErrorAction Stop | Out-Null
      Write-Host "  link  $($dir.Name) -> $($dir.FullName)"
      continue
    } catch {
      Write-Host "  ! シンボリックリンク不可（開発者モード or 管理者権限が必要）。コピー同期に切り替え" -ForegroundColor Yellow
      $Copy = $true
    }
  }

  robocopy $dir.FullName $target /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "robocopy 失敗: $($dir.Name)" }
  $global:LASTEXITCODE = 0
  Write-Host "  copy  $($dir.Name)"
}

Write-Host ""
Write-Host "配布先: $Dest"
Write-Host "※ Skill を追加・改訂したら AGENTS.md 第5章の一覧表も更新すること（python scripts\check-skills-table.py で検証）"
