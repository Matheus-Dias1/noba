from datetime import datetime
from datetime import date
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field


class Attachment(BaseModel):
    filename: str
    mime_type: str
    size: int
    path: Path | None = None


class EmailDocument(BaseModel):
    source: Path

    sender: str
    subject: str
    date: datetime | None

    body: str

    attachments: list[Attachment] = Field(default_factory=list)


class Document(BaseModel):
    source: Path

    kind: Literal[
        "email",
        "spreadsheet",
        "pdf",
        "image",
        "word",
        "unknown",
    ]

    mime_type: str

    text: str | None = None

    attachment: Attachment | None = None

class CandidateItem(BaseModel):
    description: str
    quantity: float
    unit: str | None = None


class CandidateOrder(BaseModel):
    client: str | None = None
    delivery_date: date | None = None
    items: list[CandidateItem] = Field(default_factory=list)


class ExtractionResult(BaseModel):
    orders: list[CandidateOrder] = Field(default_factory=list)
