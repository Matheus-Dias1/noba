from email import policy
from email.parser import BytesParser
from email.utils import getaddresses, parsedate_to_datetime
from pathlib import Path

from bs4 import BeautifulSoup

from order_ai.models import EmailAttachment, EmailDocument


def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    return soup.get_text("\n", strip=True)


def parse_email(path: Path) -> EmailDocument:
    with path.open("rb") as f:
        msg = BytesParser(policy=policy.default).parse(f)

    body = ""

    if msg.is_multipart():
        for part in msg.walk():
            disposition = part.get_content_disposition()

            if disposition == "attachment":
                continue

            content_type = part.get_content_type()

            if content_type == "text/plain":
                body = part.get_content()
                break

        if not body:
            for part in msg.walk():
                if part.get_content_type() == "text/html":
                    body = html_to_text(part.get_content())
                    break

    else:
        if msg.get_content_type() == "text/plain":
            body = msg.get_content()
        else:
            body = html_to_text(msg.get_content())

    attachments = []

    for part in msg.iter_attachments():
        attachments.append(
            EmailAttachment(
                filename=part.get_filename() or "attachment",
                mime_type=part.get_content_type(),
                data=part.get_payload(decode=True),
            )
        )

    sender = getaddresses([msg.get("From", "")])

    from_name = None
    from_email = None

    if sender:
        from_name, from_email = sender[0]

    date = None
    if msg["Date"]:
        date = parsedate_to_datetime(msg["Date"])

    return EmailDocument(
        from_name=from_name,
        from_email=from_email,
        subject=msg.get("Subject"),
        date=date,
        body=body.strip(),
        attachments=attachments,
    )
