from order_ai.models import (
    AttachmentKind,
    Document,
    EmailDocument,
)
from order_ai.workbook.inspect import inspect_attachment


def build_documents(email: EmailDocument) -> list[Document]:
    """
    Convert an EmailDocument into a list of Documents that can be
    independently processed by the extraction pipeline.
    """

    documents: list[Document] = []

    # Email body

    if email.body.strip():
        documents.append(
            Document(
                source="email",
                kind=AttachmentKind.UNKNOWN,
                text=email.body,
            )
        )

    # Attachments

    for attachment in email.attachments:
        inspection = inspect_attachment(attachment)

        documents.append(
            Document(
                source="attachment",
                kind=inspection.kind,
                filename=attachment.filename,
                mime_type=attachment.mime_type,
                binary=attachment.data,
            )
        )

    return documents
