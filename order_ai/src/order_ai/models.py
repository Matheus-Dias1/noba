from datetime import date
from datetime import datetime
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field


Cell = str | int | float | datetime | None


class AttachmentKind(StrEnum):
    SPREADSHEET = "spreadsheet"
    PDF = "pdf"
    IMAGE = "image"
    DOCUMENT = "document"
    UNKNOWN = "unknown"


class EmailAttachment(BaseModel):
    filename: str
    mime_type: str
    data: bytes


class EmailDocument(BaseModel):
    from_name: str | None = None
    from_email: str | None = None

    subject: str | None = None
    date: datetime | None = None

    body: str

    attachments: list[EmailAttachment] = Field(default_factory=list)


class Document(BaseModel):
    source: Literal["email", "attachment"]

    kind: AttachmentKind

    filename: str | None = None
    mime_type: str | None = None

    text: str | None = None
    binary: bytes | None = None


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

class WorkbookSheet(BaseModel):
    name: str
    rows: list[list[Cell]] = Field(default_factory=list)

class Workbook(BaseModel):
    sheets: list[WorkbookSheet] = Field(default_factory=list)

class WorkbookRow(BaseModel):
    product: Cell = None
    quantity: Cell = None
    unit: Cell = None
    unit_price: Cell = None
    line_total: Cell = None

class Worksheet(BaseModel):
    name: str
    rows: list[WorkbookRow] = Field(default_factory=list)

class WorkbookLayout(BaseModel):
    sheet: str

    header_row: int
    first_data_row: int

    product_column: int
    quantity_column: int

    unit_column: int | None = None
    unit_price_column: int | None = None
    line_total_column: int | None = None

    quantity_filter: Literal[
        "all",
        "non_empty",
        "greater_than_zero",
    ] = "greater_than_zero"


class WorkbookAnalysis(BaseModel):
    layouts: list[WorkbookLayout] = Field(default_factory=list)
