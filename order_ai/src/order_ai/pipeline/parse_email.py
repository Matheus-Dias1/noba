from datetime import datetime
from email import policy
from email.parser import BytesParser
from pathlib import Path
from email.utils import parsedate_to_datetime
from order_ai.models import Attachment, EmailDocument


def parse_email(path: Path) -> EmailDocument:
    with path.open("rb") as f:
        msg = BytesParser(policy=policy.default).parse(f)

    body = ""
    attachments = []

    date = None
    if msg["Date"]:
        date = parsedate_to_datetime(msg["Date"])

    if msg.is_multipart():
        for part in msg.walk():
            disposition = part.get_content_disposition()
            content_type = part.get_content_type()

            # Attachment
            if disposition == "attachment":
                payload = part.get_payload(decode=True) or b""

                attachments.append(
                    Attachment(
                        filename=part.get_filename() or "unknown",
                        mime_type=content_type,
                        size=len(payload),
                    )
                )
                continue

            # Prefer plain text
            if content_type == "text/plain" and not body:
                body = part.get_content()

            # Fall back to HTML
            elif content_type == "text/html" and not body:
                body = part.get_content()

    else:
        body = msg.get_content()

    return EmailDocument(
        source=path,
        sender=msg.get("From", ""),
        subject=msg.get("Subject", ""),
        date=date,
        body=body,
        attachments=attachments,
    )
