"""
メール配信・ダイナミックプライシング統合サービス
"""

import logging
from typing import Dict, List, Optional

from config import settings

logger = logging.getLogger(__name__)


class EmailDispatchService:
    """SendGrid連携メール自動配信"""

    def __init__(self):
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail

            self.client = SendGridAPIClient(settings.SENDGRID_API_KEY) if settings.SENDGRID_API_KEY else None
            self.Mail = Mail
        except ImportError:
            logger.warning("SendGrid not installed. Email will be logged only.")
            self.client = None
            self.Mail = None

    async def send_email(
        self,
        recipient_email: str,
        subject: str,
        body: str,
        customer_id: int,
        campaign_id: Optional[int] = None,
        use_html: bool = False,
    ) -> bool:
        try:
            if not self.client or not self.Mail:
                logger.info("[DRY-RUN] メール送信: %s - %s", recipient_email, subject)
                return True

            message = self.Mail(
                from_email=settings.SENDGRID_FROM_EMAIL,
                to_emails=recipient_email,
                subject=subject,
                plain_text_content=body if not use_html else None,
                html_content=body if use_html else None,
            )

            response = self.client.send(message)
            logger.info("✅ メール送信成功: %s", recipient_email)
            return response.status_code == 202

        except Exception as e:
            logger.error("❌ メール送信失敗: %s", str(e))
            return False

    async def send_bulk_email(
        self,
        recipients: List[Dict],
        subject: str,
        body_template: str,
        campaign_id: Optional[int] = None,
    ) -> Dict:
        results = {
            "total": len(recipients),
            "success": 0,
            "failed": 0,
            "errors": [],
        }

        for recipient in recipients:
            body = body_template.replace("{customer_name}", recipient.get("name", "顧客"))

            success = await self.send_email(
                recipient_email=recipient["email"],
                subject=subject,
                body=body,
                customer_id=recipient["customer_id"],
                campaign_id=campaign_id,
            )

            if success:
                results["success"] += 1
            else:
                results["failed"] += 1
                results["errors"].append(recipient["email"])

        logger.info("📧 一括メール配信完了: %s/%s 成功", results["success"], results["total"])
        return results


email_service = EmailDispatchService()
