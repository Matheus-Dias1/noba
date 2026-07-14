from pathlib import Path

from order_ai.models import Workbook
from order_ai.models import WorkbookAnalysis

from .lmstudio import LMStudioClient


_PROMPT = (
    Path(__file__)
    .parent.joinpath("prompts", "analyze_workbook.md")
    .read_text(encoding="utf-8")
)

_client = LMStudioClient()


def analyze_workbook(workbook: Workbook) -> WorkbookAnalysis:
    """
    Analyze a workbook and identify the structure of every order table.
    """

    response = _client.generate(
        system_prompt=_PROMPT,
        user_prompt=workbook.model_dump_json(indent=2),
        schema=WorkbookAnalysis.model_json_schema(),
    )

    return WorkbookAnalysis.model_validate_json(response)
