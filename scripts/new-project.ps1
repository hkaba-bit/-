# 案件ディレクトリを projects\_template\ から作る。
#
#   powershell -ExecutionPolicy Bypass -File scripts\new-project.ps1 tokyo-weld "東京ウェルディングパーツ リニューアル"

param(
  [Parameter(Mandatory = $true)][string]$Slug,
  [string]$Name
)
$ErrorActionPreference = "Stop"

if (-not $Name) { $Name = $Slug }
if ($Slug -notmatch '^[a-z0-9]+(-[a-z0-9]+)*$') {
  throw "案件スラッグは英小文字・数字・ハイフンのみ（例: bikkuri-donkey）: $Slug"
}

$Root     = Split-Path -Parent $PSScriptRoot
$Template = Join-Path $Root "projects\_template"
$Dest     = Join-Path $Root "projects\$Slug"

if (-not (Test-Path $Template)) { throw "雛形が見つからない: projects\_template" }
if (Test-Path $Dest) { throw "すでに存在する: projects\$Slug" }

Copy-Item $Template $Dest -Recurse
$statusPath = Join-Path $Dest "STATUS.md"
$date = Get-Date -Format "yyyy-MM-dd"
(Get-Content $statusPath -Raw -Encoding UTF8).
  Replace("{{SLUG}}", $Slug).Replace("{{NAME}}", $Name).Replace("{{DATE}}", $date) |
  Set-Content $statusPath -Encoding UTF8 -NoNewline

Write-Host "作成した: projects\$Slug\"
Write-Host "  - STATUS.md（案件単位の進捗）"
Write-Host "  - outputs\（納品候補。Git 追跡外）"
Write-Host ""
Write-Host "次: projects\$Slug\STATUS.md の「案件情報」と「与件」を埋める"
