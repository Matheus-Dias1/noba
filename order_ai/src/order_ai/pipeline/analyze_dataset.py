#!/usr/bin/env python3

from email import policy
from email.parser import BytesParser
from pathlib import Path
from collections import Counter
import re
from order_ai.config import RAW_EMAILS


attachment_counter = Counter()

summary = {
    "total": 0,
    "plain": 0,
    "html_only": 0,
    "reply": 0,
    "body_lengths": [],
}


def extract_body(msg):
    plain = None
    html = None

    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_disposition() == "attachment":
                continue

            try:
                content = part.get_content()
            except Exception:
                continue

            if part.get_content_type() == "text/plain" and plain is None:
                plain = content
            elif part.get_content_type() == "text/html" and html is None:
                html = content
    else:
        try:
            content = msg.get_content()
        except Exception:
            content = ""

        if msg.get_content_type() == "text/plain":
            plain = content
        elif msg.get_content_type() == "text/html":
            html = content

    return plain, html


def detect_reply(text):
    if not text:
        return False

    patterns = [
        r"^>",
        r"On .+ wrote:",
        r"Em .+ escreveu:",
        r"-----Original Message-----",
        r"De: .*",
        r"From: .*",
    ]

    return any(
        re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        for pattern in patterns
    )


def analyze_dataset():
    print("\n========== EMAIL REPORT ==========\n")

    for eml in RAW_EMAILS.glob("*.eml"):

        summary["total"] += 1

        with open(eml, "rb") as f:
            msg = BytesParser(policy=policy.default).parse(f)

        plain, html = extract_body(msg)

        if plain:
            summary["plain"] += 1
            body = plain
        else:
            summary["html_only"] += 1
            body = html or ""

        body_length = len(body)
        summary["body_lengths"].append(body_length)

        has_reply = detect_reply(body)
        if has_reply:
            summary["reply"] += 1

        attachments = []

        for part in msg.iter_attachments():
            filename = part.get_filename() or "<unnamed>"
            mime = part.get_content_type()

            attachments.append((filename, mime))
            attachment_counter[mime] += 1

        print(f"{eml.name}")
        print(f"  From      : {msg.get('From', '-')}")
        print(f"  Subject   : {msg.get('Subject', '-')}")
        print(f"  Date      : {msg.get('Date', '-')}")
        print(f"  Plain text: {'Yes' if plain else 'No'}")
        print(f"  HTML      : {'Yes' if html else 'No'}")
        print(f"  Body size : {body_length:,} chars")
        print(f"  Reply     : {'Yes' if has_reply else 'No'}")

        if attachments:
            print("  Attachments:")
            for filename, mime in attachments:
                print(f"     • {filename} ({mime})")
        else:
            print("  Attachments: None")

        print()

    print("\n========== SUMMARY ==========\n")

    print(f"Emails              : {summary['total']}")
    print(f"Plain text          : {summary['plain']}")
    print(f"HTML only           : {summary['html_only']}")
    print(f"Reply chains        : {summary['reply']}")

    if summary["body_lengths"]:
        avg = sum(summary["body_lengths"]) / len(summary["body_lengths"])
        print(f"Average body length : {avg:.0f} chars")

    print("\nAttachment types")

    if attachment_counter:
        for mime, count in attachment_counter.most_common():
            print(f"  {mime:<60} {count}")
    else:
        print("  None")
