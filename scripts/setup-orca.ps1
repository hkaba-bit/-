# Windows に Orca（stablyai/orca）と周辺ツールを入れる。手順ごとに結果を出す。
#
#   powershell -ExecutionPolicy Bypass -File scripts\setup-orca.ps1
#
# 署名が Valid でなければ中止する。サイレント導入できなければ「PC画面で操作が必要」と出して止まる。

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"  # 5.1 の Invoke-WebRequest は進捗表示で極端に遅くなる

function Step($n, $msg) { Write-Host "[$n] $msg" }
function Update-Path {
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
              [Environment]::GetEnvironmentVariable("Path", "User")
}
function Get-Ver($cmd, $arg = "--version") {
  if (Get-Command $cmd -ErrorAction SilentlyContinue) {
    try { return ((& $cmd $arg 2>&1) | Select-Object -First 1).ToString().Trim() } catch { return "取得失敗" }
  }
  return "未導入"
}

# 1. winget で Git / Node.js LTS / GitHub CLI
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  throw "winget が見つからない。Microsoft Store の「アプリ インストーラー」を更新してから再実行する"
}
$pkgs = @(
  @{ Id = "Git.Git";           Cmd = "git"  },
  @{ Id = "OpenJS.NodeJS.LTS"; Cmd = "node" },
  @{ Id = "GitHub.cli";        Cmd = "gh"   }
)
$installed = $false
foreach ($p in $pkgs) {
  $listed = winget list --id $p.Id -e --accept-source-agreements 2>$null | Select-String -SimpleMatch $p.Id
  if ($listed -or (Get-Command $p.Cmd -ErrorAction SilentlyContinue)) {
    Step 1 "$($p.Id): 導入済み。スキップ"
    continue
  }
  winget install --id $p.Id -e --silent --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) { throw "$($p.Id) の導入に失敗（exit $LASTEXITCODE）" }
  Step 1 "$($p.Id): 導入した"
  $installed = $true
}
Update-Path
Step 1 ("PATH 再読込" + $(if ($installed) { "（新規導入あり）" } else { "" }))

# 2. 長いパス
git config --global core.longpaths true
Step 2 "core.longpaths = $(git config --global core.longpaths)"

# 3. Codex CLI（npm のグローバル bin が PATH に無いと codex が見えないので先に足す）
$npmBin = (npm prefix -g).Trim()
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if (($userPath -split ';') -notcontains $npmBin) {
  [Environment]::SetEnvironmentVariable("Path", "$userPath;$npmBin", "User")
  Step 3 "npm グローバル bin を PATH に追加: $npmBin"
}
Update-Path
if (Get-Command codex -ErrorAction SilentlyContinue) {
  Step 3 "codex: 導入済み。スキップ"
} else {
  npm install -g @openai/codex
  if ($LASTEXITCODE -ne 0) { throw "npm install -g @openai/codex に失敗（exit $LASTEXITCODE）" }
  Update-Path
  Step 3 "codex: 導入した"
}

# 4. インストーラー取得
$url       = "https://github.com/stablyai/orca/releases/latest/download/orca-windows-setup.exe"
$installer = Join-Path $env:TEMP "orca-windows-setup.exe"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $url -OutFile $installer -UseBasicParsing
Step 4 ("取得: $installer（{0:N1} MB）" -f ((Get-Item $installer).Length / 1MB))

# 5. 署名確認
$sig = Get-AuthenticodeSignature $installer
if ($sig.Status -ne "Valid") {
  Step 5 "署名が Valid ではない（$($sig.Status): $($sig.StatusMessage)）。中止する"
  exit 1
}
# 公式リリースは SignPath Foundation 名義で署名されている（2026-09 時点）
if ($sig.SignerCertificate.Subject -notmatch 'CN=SignPath Foundation') {
  Step 5 "署名は Valid だが署名者が想定外（$($sig.SignerCertificate.Subject)）。中止する"
  exit 1
}
Step 5 "署名 Valid: $($sig.SignerCertificate.Subject)"

# 6. サイレント導入（NSIS 3.04・ユーザー単位導入なので /S が効く想定）。5 分で終わらなければ GUI 待ちとみなす
$proc = Start-Process -FilePath $installer -ArgumentList "/S" -PassThru
if (-not $proc.WaitForExit(300000)) {
  Step 6 "5 分経っても終わらない。PC画面で操作が必要（インストーラーの画面を確認）"
  exit 2
}
if ($proc.ExitCode -ne 0) {
  Step 6 "サイレント導入が exit $($proc.ExitCode) で終了。PC画面で操作が必要（$installer を手動で実行）"
  exit 2
}
Step 6 "サイレント導入 完了"

# 7. まとめ（未ログイン時の gh の stderr で止まらないよう、ここからは Continue）
$ErrorActionPreference = "Continue"
Update-Path
$orcaDir = $null
$uninstallKeys = @(
  "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
  "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
  "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
)
$entry = Get-ItemProperty $uninstallKeys -ErrorAction SilentlyContinue |
  Where-Object { $_.DisplayName -match '(?i)^orca' } | Select-Object -First 1
if ($entry -and $entry.InstallLocation) { $orcaDir = $entry.InstallLocation }
if (-not $orcaDir) {
  $orcaDir = @(
    (Join-Path $env:LOCALAPPDATA "Programs\orca"),
    (Join-Path $env:LOCALAPPDATA "Programs\Orca"),
    (Join-Path $env:ProgramFiles "Orca")
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $orcaDir) { $orcaDir = "見つからない" }

$ghAuth = if (Get-Command gh -ErrorAction SilentlyContinue) {
  $out = (gh auth status 2>&1 | Out-String).Trim()
  if ($LASTEXITCODE -eq 0) { ($out -split "`r?`n" | Where-Object { $_ -match 'Logged in' } | Select-Object -First 1).Trim() }
  else { "未ログイン（gh auth login が必要）" }
} else { "未導入" }

Write-Host ""
Write-Host "| 項目 | 結果 |"
Write-Host "|---|---|"
Write-Host "| git | $(Get-Ver git) |"
Write-Host "| node | $(Get-Ver node) |"
Write-Host "| gh | $(Get-Ver gh) |"
Write-Host "| codex | $(Get-Ver codex) |"
Write-Host "| claude | $(Get-Ver claude) |"
Write-Host "| gh auth status | $ghAuth |"
Write-Host "| Orca インストール先 | $orcaDir |"
