from order_ai.llm import LMStudioClient
from order_ai.models import EmailDocument, ExtractionResult
from order_ai.prompts import load_prompt

SYSTEM_PROMPT = load_prompt("extract_order.md")

client = LMStudioClient()

def extract_order(email: EmailDocument) -> ExtractionResult:
    user_prompt = f"""
From: {email.sender}
Subject: {email.subject}
Date: {email.date}

Body:
{email.body}
"""
    response = client.generate(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=user_prompt,
        schema=ExtractionResult.model_json_schema(),
    )

    return ExtractionResult.model_validate_json(response)
