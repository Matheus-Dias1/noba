from pathlib import Path

from order_ai.models import EmailDocument
from order_ai.models import ExtractionResult

from .lmstudio import LMStudioClient


_PROMPT = (
    Path(__file__)
    .parent.joinpath("prompts", "extract_email.md")
    .read_text(encoding="utf-8")
)

_client = LMStudioClient()


def extract_order(email: EmailDocument) -> ExtractionResult:
    """
    Extract one or more orders from an email.

    The email body is sent to the LLM together with a JSON schema.
    The returned JSON is validated using Pydantic.
    """

    response = _client.generate(
        system_prompt=_PROMPT,
        user_prompt=email.model_dump_json(
            indent=2,
            exclude={"attachments"},
        ),
        schema=ExtractionResult.model_json_schema(),
    )

    return ExtractionResult.model_validate_json(response)
