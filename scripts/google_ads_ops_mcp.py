# /// script
# requires-python = ">=3.10"
# dependencies = ["mcp>=1.10", "google-ads>=28"]
# ///
"""Google 広告の運用操作 MCP（GrowGroup 用・ローカル実行）。

公式 Google Ads MCP は読み取り専用のため、予算・配信状態・キーワードの変更だけを担う。
すべての変更は「propose_* で提案（API の検証のみ実行）→ apply_change(token) で反映」の2段階。
apply_change は Claude Code の許可プロンプトで人間が承認する前提（許可リストに入れない）。

環境変数（公式 google-ads MCP と共通。scripts/setup-ads-mcp.* が設定する）:
  GOOGLE_APPLICATION_CREDENTIALS  ADC の JSON（スコープ adwords）
  GOOGLE_ADS_DEVELOPER_TOKEN      開発者トークン
  GOOGLE_ADS_LOGIN_CUSTOMER_ID    MCC の顧客 ID（数字のみ）
  GG_ADS_OPS_DIR                  提案・変更履歴の保存先（既定 ~/.gg-ads-ops）

起動: pipx run scripts/google_ads_ops_mcp.py   （または pip install mcp google-ads 後に python で実行）
"""
from __future__ import annotations

import json
import os
import re
import secrets
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from mcp.server.fastmcp import FastMCP

STATE_DIR = Path(os.environ.get("GG_ADS_OPS_DIR", Path.home() / ".gg-ads-ops"))
PENDING_FILE = STATE_DIR / "pending.json"
LOG_FILE = STATE_DIR / "changes.jsonl"
TOKEN_TTL_SEC = 30 * 60
BIG_INCREASE_RATIO = 1.5      # 現在の1.5倍を超える増額は警告
BIG_DAILY_BUDGET = 30_000     # 日予算3万（口座通貨）超は警告
MATCH_TYPES = ("EXACT", "PHRASE", "BROAD")

mcp = FastMCP("google-ads-ops")
_client: Any = None


# ---------- 共通 ----------

def _cid(value: str) -> str:
    digits = re.sub(r"\D", "", str(value))
    if len(digits) != 10:
        raise ValueError(f"顧客 ID は10桁: {value}")
    return digits


def _id(value: str, label: str) -> str:
    digits = re.sub(r"\D", "", str(value))
    if not digits:
        raise ValueError(f"{label} が不正: {value}")
    return digits


def client() -> Any:
    global _client
    if _client is None:
        import google.auth
        from google.ads.googleads.client import GoogleAdsClient

        creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/adwords"])
        token = os.environ.get("GOOGLE_ADS_DEVELOPER_TOKEN")
        if not token:
            raise RuntimeError("GOOGLE_ADS_DEVELOPER_TOKEN が未設定")
        login = os.environ.get("GOOGLE_ADS_LOGIN_CUSTOMER_ID") or None
        _client = GoogleAdsClient(
            credentials=creds,
            developer_token=token,
            login_customer_id=re.sub(r"\D", "", login) if login else None,
            use_proto_plus=True,
        )
    return _client


def _search(customer_id: str, query: str) -> list[Any]:
    svc = client().get_service("GoogleAdsService")
    return list(svc.search(customer_id=customer_id, query=query))


def _currency(customer_id: str) -> str:
    rows = _search(customer_id, "SELECT customer.currency_code FROM customer LIMIT 1")
    return rows[0].customer.currency_code if rows else "?"


def _load_pending() -> dict[str, Any]:
    if not PENDING_FILE.exists():
        return {}
    data = json.loads(PENDING_FILE.read_text(encoding="utf-8"))
    now = time.time()
    return {k: v for k, v in data.items() if now - v["created_at"] < TOKEN_TTL_SEC}


def _save_pending(data: dict[str, Any]) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    PENDING_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")


def _log(entry: dict[str, Any]) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    with LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def _campaign(customer_id: str, campaign_id: str) -> Any:
    rows = _search(
        customer_id,
        "SELECT campaign.id, campaign.name, campaign.status, campaign_budget.resource_name, "
        "campaign_budget.amount_micros, campaign_budget.explicitly_shared "
        f"FROM campaign WHERE campaign.id = {campaign_id}",
    )
    if not rows:
        raise ValueError(f"キャンペーンが見つからない: {campaign_id}")
    return rows[0]


# ---------- 変更の組み立て（提案と反映で同じ関数を使う） ----------

def _mutate(spec: dict[str, Any], validate_only: bool) -> list[str]:
    from google.api_core import protobuf_helpers

    c = client()
    cid = spec["customer_id"]
    kind = spec["kind"]

    if kind == "budget":
        op = c.get_type("CampaignBudgetOperation")
        b = op.update
        b.resource_name = spec["budget_resource"]
        b.amount_micros = int(round(spec["after"] * 1_000_000))
        c.copy_from(op.update_mask, protobuf_helpers.field_mask(None, b._pb))
        req = c.get_type("MutateCampaignBudgetsRequest")
        req.customer_id, req.validate_only = cid, validate_only
        req.operations.append(op)
        res = c.get_service("CampaignBudgetService").mutate_campaign_budgets(request=req)

    elif kind == "status":
        op = c.get_type("CampaignOperation")
        camp = op.update
        camp.resource_name = c.get_service("CampaignService").campaign_path(cid, spec["campaign_id"])
        camp.status = c.enums.CampaignStatusEnum[spec["after"]]
        c.copy_from(op.update_mask, protobuf_helpers.field_mask(None, camp._pb))
        req = c.get_type("MutateCampaignsRequest")
        req.customer_id, req.validate_only = cid, validate_only
        req.operations.append(op)
        res = c.get_service("CampaignService").mutate_campaigns(request=req)

    elif kind == "keywords":
        path = c.get_service("AdGroupService").ad_group_path(cid, spec["ad_group_id"])
        req = c.get_type("MutateAdGroupCriteriaRequest")
        req.customer_id, req.validate_only = cid, validate_only
        for text in spec["keywords"]:
            op = c.get_type("AdGroupCriterionOperation")
            crit = op.create
            crit.ad_group = path
            crit.status = c.enums.AdGroupCriterionStatusEnum.ENABLED
            crit.keyword.text = text
            crit.keyword.match_type = c.enums.KeywordMatchTypeEnum[spec["match_type"]]
            req.operations.append(op)
        res = c.get_service("AdGroupCriterionService").mutate_ad_group_criteria(request=req)

    elif kind == "negative_keywords":
        path = c.get_service("CampaignService").campaign_path(cid, spec["campaign_id"])
        req = c.get_type("MutateCampaignCriteriaRequest")
        req.customer_id, req.validate_only = cid, validate_only
        for text in spec["keywords"]:
            op = c.get_type("CampaignCriterionOperation")
            crit = op.create
            crit.campaign = path
            crit.negative = True
            crit.keyword.text = text
            crit.keyword.match_type = c.enums.KeywordMatchTypeEnum[spec["match_type"]]
            req.operations.append(op)
        res = c.get_service("CampaignCriterionService").mutate_campaign_criteria(request=req)

    else:
        raise ValueError(f"未知の変更種別: {kind}")

    return [r.resource_name for r in res.results]


def _propose(spec: dict[str, Any], summary: dict[str, Any]) -> dict[str, Any]:
    _mutate(spec, validate_only=True)  # API 側の検証だけ通す（反映はしない）
    token = secrets.token_hex(4)
    pending = _load_pending()
    pending[token] = {"spec": spec, "summary": summary, "created_at": time.time()}
    _save_pending(pending)
    return {
        "token": token,
        "summary": summary,
        "next": "ユーザーに summary を表で見せ、明示的な OK をもらってから apply_change(token) を呼ぶ。30分で失効。",
    }


# ---------- ツール：読み取り ----------

@mcp.tool()
def list_accounts() -> list[dict[str, Any]]:
    """MCC 配下の運用中アカウント（顧客 ID・名前・通貨）を返す。"""
    login = os.environ.get("GOOGLE_ADS_LOGIN_CUSTOMER_ID")
    if not login:
        raise RuntimeError("GOOGLE_ADS_LOGIN_CUSTOMER_ID（MCC）が未設定")
    rows = _search(
        _cid(login),
        "SELECT customer_client.id, customer_client.descriptive_name, customer_client.currency_code, "
        "customer_client.status FROM customer_client "
        "WHERE customer_client.manager = FALSE AND customer_client.status = 'ENABLED'",
    )
    return [
        {
            "customer_id": str(r.customer_client.id),
            "name": r.customer_client.descriptive_name,
            "currency": r.customer_client.currency_code,
        }
        for r in rows
    ]


@mcp.tool()
def list_campaigns(customer_id: str, include_paused: bool = True) -> list[dict[str, Any]]:
    """アカウントのキャンペーン一覧（状態・種別・日予算・直近7日の費用/CV）を返す。"""
    cid = _cid(customer_id)
    statuses = "('ENABLED','PAUSED')" if include_paused else "('ENABLED')"
    rows = _search(
        cid,
        "SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, "
        "campaign.bidding_strategy_type, campaign_budget.amount_micros, campaign_budget.explicitly_shared, "
        "metrics.cost_micros, metrics.conversions "
        f"FROM campaign WHERE campaign.status IN {statuses} AND segments.date DURING LAST_7_DAYS",
    )
    agg: dict[int, dict[str, Any]] = {}
    for r in rows:
        a = agg.setdefault(r.campaign.id, {
            "campaign_id": str(r.campaign.id),
            "name": r.campaign.name,
            "status": r.campaign.status.name,
            "type": r.campaign.advertising_channel_type.name,
            "bidding": r.campaign.bidding_strategy_type.name,
            "daily_budget": r.campaign_budget.amount_micros / 1_000_000,
            "shared_budget": r.campaign_budget.explicitly_shared,
            "cost_7d": 0.0,
            "conversions_7d": 0.0,
        })
        a["cost_7d"] += r.metrics.cost_micros / 1_000_000
        a["conversions_7d"] += r.metrics.conversions
    return sorted(agg.values(), key=lambda x: -x["cost_7d"])


@mcp.tool()
def list_pending() -> list[dict[str, Any]]:
    """未反映の提案（30分以内）を返す。"""
    return [{"token": k, "summary": v["summary"]} for k, v in _load_pending().items()]


@mcp.tool()
def recent_changes(limit: int = 20) -> list[dict[str, Any]]:
    """このツールで反映した変更の履歴（新しい順）。"""
    if not LOG_FILE.exists():
        return []
    lines = LOG_FILE.read_text(encoding="utf-8").splitlines()
    return [json.loads(x) for x in reversed(lines[-limit:])]


# ---------- ツール：提案（反映しない） ----------

@mcp.tool()
def propose_budget(customer_id: str, campaign_id: str, daily_budget: float) -> dict[str, Any]:
    """キャンペーンの日予算（口座通貨）の変更を提案する。反映はしない。"""
    cid, camp_id = _cid(customer_id), _id(campaign_id, "キャンペーン ID")
    if daily_budget <= 0:
        raise ValueError("日予算は正の数")
    row = _campaign(cid, camp_id)
    before = row.campaign_budget.amount_micros / 1_000_000
    warnings = []
    if row.campaign_budget.explicitly_shared:
        warnings.append("共有予算。同じ予算を使う他のキャンペーンにも効く")
    if before > 0 and daily_budget > before * BIG_INCREASE_RATIO:
        warnings.append(f"現在の{daily_budget / before:.1f}倍への増額")
    if daily_budget > BIG_DAILY_BUDGET:
        warnings.append(f"日予算が{BIG_DAILY_BUDGET:,}を超える")
    spec = {"kind": "budget", "customer_id": cid, "campaign_id": camp_id,
            "budget_resource": row.campaign_budget.resource_name, "before": before, "after": daily_budget}
    summary = {"操作": "日予算の変更", "アカウント": cid, "キャンペーン": row.campaign.name,
               "現在": before, "変更後": daily_budget, "通貨": _currency(cid), "注意": warnings}
    return _propose(spec, summary)


@mcp.tool()
def propose_status(customer_id: str, campaign_id: str, status: str) -> dict[str, Any]:
    """キャンペーンの停止（PAUSED）・再開（ENABLED）を提案する。反映はしない。"""
    cid, camp_id = _cid(customer_id), _id(campaign_id, "キャンペーン ID")
    status = status.upper()
    if status not in ("PAUSED", "ENABLED"):
        raise ValueError("status は PAUSED か ENABLED")
    row = _campaign(cid, camp_id)
    before = row.campaign.status.name
    warnings = ["配信が始まり費用が発生する"] if status == "ENABLED" else []
    spec = {"kind": "status", "customer_id": cid, "campaign_id": camp_id, "before": before, "after": status}
    summary = {"操作": "配信状態の変更", "アカウント": cid, "キャンペーン": row.campaign.name,
               "現在": before, "変更後": status, "注意": warnings}
    return _propose(spec, summary)


@mcp.tool()
def propose_keywords(customer_id: str, ad_group_id: str, keywords: list[str],
                     match_type: str = "PHRASE") -> dict[str, Any]:
    """広告グループへのキーワード追加を提案する（既存は変更しない）。反映はしない。"""
    cid, ag = _cid(customer_id), _id(ad_group_id, "広告グループ ID")
    match_type = match_type.upper()
    if match_type not in MATCH_TYPES:
        raise ValueError(f"match_type は {MATCH_TYPES}")
    kws = [k.strip() for k in keywords if k.strip()]
    if not kws:
        raise ValueError("キーワードが空")
    spec = {"kind": "keywords", "customer_id": cid, "ad_group_id": ag, "keywords": kws, "match_type": match_type}
    summary = {"操作": "キーワード追加", "アカウント": cid, "広告グループ": ag,
               "追加": kws, "マッチタイプ": match_type, "注意": []}
    return _propose(spec, summary)


@mcp.tool()
def propose_negative_keywords(customer_id: str, campaign_id: str, keywords: list[str],
                              match_type: str = "PHRASE") -> dict[str, Any]:
    """キャンペーンへの除外キーワード追加を提案する。反映はしない。"""
    cid, camp_id = _cid(customer_id), _id(campaign_id, "キャンペーン ID")
    match_type = match_type.upper()
    if match_type not in MATCH_TYPES:
        raise ValueError(f"match_type は {MATCH_TYPES}")
    kws = [k.strip() for k in keywords if k.strip()]
    if not kws:
        raise ValueError("キーワードが空")
    row = _campaign(cid, camp_id)
    spec = {"kind": "negative_keywords", "customer_id": cid, "campaign_id": camp_id,
            "keywords": kws, "match_type": match_type}
    summary = {"操作": "除外キーワード追加", "アカウント": cid, "キャンペーン": row.campaign.name,
               "除外": kws, "マッチタイプ": match_type, "注意": []}
    return _propose(spec, summary)


# ---------- ツール：反映 ----------

@mcp.tool()
def apply_change(token: str) -> dict[str, Any]:
    """propose_* の token を反映する。ユーザーが表を見て明示的に OK した後だけ呼ぶ。"""
    pending = _load_pending()
    item = pending.pop(token, None)
    if item is None:
        raise ValueError("token が無いか30分を過ぎて失効した。propose からやり直す")
    spec = item["spec"]

    # 提案後に誰かが変えていないか確認（予算・状態のみ）
    if spec["kind"] in ("budget", "status"):
        row = _campaign(spec["customer_id"], spec["campaign_id"])
        now = (row.campaign_budget.amount_micros / 1_000_000 if spec["kind"] == "budget"
               else row.campaign.status.name)
        if now != spec["before"]:
            _save_pending(pending)
            raise RuntimeError(f"提案後に値が変わっている（提案時 {spec['before']} → 現在 {now}）。propose からやり直す")

    results = _mutate(spec, validate_only=False)
    _save_pending(pending)
    entry = {"at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "token": token,
             "summary": item["summary"], "resources": results}
    _log(entry)
    return {"applied": True, **entry}


if __name__ == "__main__":
    mcp.run()
