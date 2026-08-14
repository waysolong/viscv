"""更新检查：对 update_url 拉取版本信息，返回 UpdateInfo（与前端契约一致）。"""
from __future__ import annotations

import json
from typing import Any, Dict
from urllib.request import urlopen
from urllib.error import URLError

CURRENT = "0.1.0"
DEFAULT_UPDATE_URL = "https://example.com/viscv/latest.json"


def check_update(update_url: str = DEFAULT_UPDATE_URL, current: str = CURRENT) -> Dict[str, Any]:
    latest = current
    try:
        with urlopen(update_url, timeout=5) as resp:  # noqa: S310
            payload = resp.read().decode("utf-8", "replace")
        data = json.loads(payload)
        latest = str(data.get("version") or data.get("latest") or current)
    except (URLError, ValueError, KeyError, OSError, json.JSONDecodeError):
        latest = current

    update_available = latest != current
    return {
        "current": current,
        "latest": latest,
        "updateAvailable": update_available,
        "message": "发现新版本，请从官网下载" if update_available else "已是最新版本",
    }