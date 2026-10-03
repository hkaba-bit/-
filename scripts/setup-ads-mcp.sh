#!/usr/bin/env bash
# 広告・解析の MCP を Claude Code（ユーザー設定）に登録する。
# 対象：Google 広告（公式・読み取り）＋ google-ads-ops（自作・運用操作）／GA4（公式・読み取り）／Meta 広告（公式・読み書き）
#
#   bash scripts/setup-ads-mcp.sh            # 3つとも
#   bash scripts/setup-ads-mcp.sh google-ads analytics   # 選んで登録
#
# 事前に必要なもの（references/mcp-ad-ops.md 第4章）:
#   - Google Cloud プロジェクト ID と、OAuth クライアント（デスクトップ）の JSON
#   - Google 広告 API の開発者トークン（MCC の API センターで発行）と MCC の顧客 ID
# 値は対話で入力する。リポジトリには何も書き込まない。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

TARGETS=("$@")
[ ${#TARGETS[@]} -eq 0 ] && TARGETS=(google-ads analytics meta-ads)
want() { local t; for t in "${TARGETS[@]}"; do [ "$t" = "$1" ] && return 0; done; return 1; }

need() { command -v "$1" >/dev/null 2>&1 || { echo "見つからない: $1 — $2" >&2; exit 1; }; }
need claude "Claude Code CLI を入れる（npm install -g @anthropic-ai/claude-code）"

if want google-ads || want analytics; then
  need pipx "python3 -m pip install --user pipx && python3 -m pipx ensurepath"
  need gcloud "https://cloud.google.com/sdk/docs/install"

  read -r -p "Google Cloud プロジェクト ID: " PROJECT_ID
  read -r -p "OAuth クライアント JSON のパス: " CLIENT_JSON
  [ -f "$CLIENT_JSON" ] || { echo "ファイルが無い: $CLIENT_JSON" >&2; exit 1; }

  SCOPES="https://www.googleapis.com/auth/cloud-platform"
  want google-ads && SCOPES="$SCOPES,https://www.googleapis.com/auth/adwords"
  want analytics && SCOPES="$SCOPES,https://www.googleapis.com/auth/analytics.readonly"

  echo "ブラウザで Google ログイン → 許可（広告・GA4 を見られるアカウントで）"
  gcloud auth application-default login --scopes "$SCOPES" --client-id-file="$CLIENT_JSON"
  ADC="${CLOUDSDK_CONFIG:-$HOME/.config/gcloud}/application_default_credentials.json"
  [ -f "$ADC" ] || { echo "認証ファイルが作られていない: $ADC" >&2; exit 1; }
fi

if want google-ads; then
  read -r -s -p "Google 広告 API 開発者トークン（表示されない）: " DEV_TOKEN; echo
  read -r -p "MCC の顧客 ID（ハイフンありで可）: " MCC_ID
  MCC_ID="${MCC_ID//-/}"
  claude mcp remove google-ads --scope user >/dev/null 2>&1 || true
  claude mcp add google-ads --scope user \
    -e "GOOGLE_APPLICATION_CREDENTIALS=$ADC" \
    -e "GOOGLE_PROJECT_ID=$PROJECT_ID" \
    -e "GOOGLE_ADS_DEVELOPER_TOKEN=$DEV_TOKEN" \
    -e "GOOGLE_ADS_LOGIN_CUSTOMER_ID=$MCC_ID" \
    -- pipx run --spec git+https://github.com/googleads/google-ads-mcp.git google-ads-mcp
  # 運用操作（予算・停止/再開・キーワード）。apply_change は許可リストに入れず、毎回承認する
  claude mcp remove google-ads-ops --scope user >/dev/null 2>&1 || true
  claude mcp add google-ads-ops --scope user \
    -e "GOOGLE_APPLICATION_CREDENTIALS=$ADC" \
    -e "GOOGLE_ADS_DEVELOPER_TOKEN=$DEV_TOKEN" \
    -e "GOOGLE_ADS_LOGIN_CUSTOMER_ID=$MCC_ID" \
    -- pipx run "$ROOT/scripts/google_ads_ops_mcp.py"
fi

if want analytics; then
  claude mcp remove google-analytics --scope user >/dev/null 2>&1 || true
  claude mcp add google-analytics --scope user \
    -e "GOOGLE_APPLICATION_CREDENTIALS=$ADC" \
    -e "GOOGLE_PROJECT_ID=$PROJECT_ID" \
    -- pipx run analytics-mcp
fi

if want meta-ads; then
  claude mcp remove meta-ads --scope user >/dev/null 2>&1 || true
  claude mcp add --transport http meta-ads --scope user https://mcp.facebook.com/ads
  echo "Meta は Claude Code で /mcp → meta-ads → Authenticate でログインする"
fi

echo
claude mcp list
echo
echo "確認：Claude Code を開き直して「Google 広告のアクセス可能なアカウント数を教えて」「GA4 のプロパティ一覧を出して」"
