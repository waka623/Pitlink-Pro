"""公式LINE Messaging API 連携"""

import logging
from typing import Optional

import httpx

from config import settings

logger = logging.getLogger(__name__)

LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push"


class LineMessagingService:
    def __init__(self):
        self.channel_token = settings.LINE_CHANNEL_ACCESS_TOKEN.strip()

    async def send_message(
        self,
        line_user_id: str,
        body: str,
        customer_id: str,
    ) -> bool:
        try:
            if not self.channel_token:
                logger.info("[DRY-RUN] LINE送信: %s — %s", line_user_id, body[:80])
                return True

            async with httpx.AsyncClient() as client:
                res = await client.post(
                    LINE_PUSH_URL,
                    headers={
                        "Authorization": f"Bearer {self.channel_token}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "to": line_user_id,
                        "messages": [{"type": "text", "text": body[:5000]}],
                    },
                    timeout=15.0,
                )
                res.raise_for_status()

            logger.info("✅ LINE送信成功: %s (customer=%s)", line_user_id, customer_id)
            return True
        except Exception as e:
            logger.error("❌ LINE送信失敗: %s", str(e))
            return False


line_service = LineMessagingService()

# デモ用インメモリ連携レジストリ
_line_links: dict[str, dict] = {}


def register_line_link(customer_id: str, line_user_id: str, line_display_name: str) -> dict:
    record = {
        "customer_id": customer_id,
        "line_user_id": line_user_id,
        "line_display_name": line_display_name,
    }
    _line_links[customer_id] = record
    return record


def get_line_link(customer_id: str) -> Optional[dict]:
    return _line_links.get(customer_id)
