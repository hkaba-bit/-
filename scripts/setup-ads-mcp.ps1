# 広告・解析の MCP を Claude Code（ユーザー設定）に登録する。
# 対象：Google 広告（公式・読み取り）＋ google-ads-ops（自作・運用操作）／GA4（公式・読み取り）／Meta 広告（公式・読み書き）
#
#   scripts\setup-ads-mcp.ps1                          # 3つとも
#   scripts\setup-ads-mcp.ps1 -Targets google-ads,analytics
#
# 事前に必要なもの（references/mcp-ad-ops.md 第4章）:
#   - Google Cloud プロジェクト ID と、OAuth クライアント（デスクトップ）の JSON
#   - Google 広告 API の開発者トークン（MCC の API センターで発行）と MCC の顧客 ID
# 値は対話で入力する。リポジトリには何も書き込まない。
param(
  [ValidateSet('google-ads', 'analytics', 'meta-ads')]
  [string[]]$Targets = @('google-ads', 'analytics', 'meta-ads')
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Need($cmd, $hint) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { throw "見つからない: $cmd — $hint" }
}
function Want($t) { return $Targets -contains $t }

Need 'claude' 'Claude Code CLI を入れる（npm install -g @anthropic-ai/claude-code）'

if ((Want 'google-ads') -or (Want 'analytics')) {
  Need 'pipx' 'py -m pip install --user pipx; py -m pipx ensurepath（入れたらターミナルを開き直す）'
  Need 'gcloud' 'https://cloud.google.com/sdk/docs/install'

  $projectId = Read-Host 'Google Cloud プロジェクト ID'
  $clientJson = Read-Host 'OAuth クライアント JSON のパス'
  if (-not (Test-Path $clientJson)) { throw "ファイルが無い: $clientJson" }

  $scopes = @('https://www.googleapis.com/auth/cloud-platform')
  if (Want 'google-ads') { $scopes += 'https://www.googleapis.com/auth/adwords' }
  if (Want 'analytics') { $scopes += 'https://www.googleapis.com/auth/analytics.readonly' }

  Write-Host 'ブラウザで Google ログイン → 許可（広告・GA4 を見られるアカウントで）'
  gcloud auth application-default login --scopes ($scopes -join ',') --client-id-file="$clientJson"
  if ($LASTEXITCODE -ne 0) { throw 'gcloud の認証に失敗した' }
  $adc = Join-Path $env:APPDATA 'gcloud\application_default_credentials.json'
  if (-not (Test-Path $adc)) { throw "認証ファイルが作られていない: $adc" }
}

if (Want 'google-ads') {
  $secure = Read-Host 'Google 広告 API 開発者トークン（表示されない）' -AsSecureString
  $devToken = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
  $mccId = (Read-Host 'MCC の顧客 ID（ハイフンありで可）') -replace '-', ''
  claude mcp remove google-ads --scope user 2>$null | Out-Null
  claude mcp add google-ads --scope user `
    -e "GOOGLE_APPLICATION_CREDENTIALS=$adc" `
    -e "GOOGLE_PROJECT_ID=$projectId" `
    -e "GOOGLE_ADS_DEVELOPER_TOKEN=$devToken" `
    -e "GOOGLE_ADS_LOGIN_CUSTOMER_ID=$mccId" `
    -- pipx run --spec git+https://github.com/googleads/google-ads-mcp.git google-ads-mcp
  # 運用操作（予算・停止/再開・キーワード）。apply_change は許可リストに入れず、毎回承認する
  claude mcp remove google-ads-ops --scope user 2>$null | Out-Null
  claude mcp add google-ads-ops --scope user `
    -e "GOOGLE_APPLICATION_CREDENTIALS=$adc" `
    -e "GOOGLE_ADS_DEVELOPER_TOKEN=$devToken" `
    -e "GOOGLE_ADS_LOGIN_CUSTOMER_ID=$mccId" `
    -- pipx run (Join-Path $root 'scripts\google_ads_ops_mcp.py')
}

if (Want 'analytics') {
  claude mcp remove google-analytics --scope user 2>$null | Out-Null
  claude mcp add google-analytics --scope user `
    -e "GOOGLE_APPLICATION_CREDENTIALS=$adc" `
    -e "GOOGLE_PROJECT_ID=$projectId" `
    -- pipx run analytics-mcp
}

if (Want 'meta-ads') {
  claude mcp remove meta-ads --scope user 2>$null | Out-Null
  claude mcp add --transport http meta-ads --scope user https://mcp.facebook.com/ads
  Write-Host 'Meta は Claude Code で /mcp → meta-ads → Authenticate でログインする'
}

Write-Host ''
claude mcp list
Write-Host ''
Write-Host '確認：Claude Code を開き直して「Google 広告のアクセス可能なアカウント数を教えて」「GA4 のプロパティ一覧を出して」'
