from __future__ import annotations

import httpx

from .client import LLMClient


class LMStudioClient(LLMClient):
    def __init__(
        self,
        base_url: str = "http://127.0.0.1:1234/v1",
        model: str = "qwen/qwen3.6-27b",
        timeout: float = 120.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout

        self.http = httpx.Client(
            base_url=self.base_url,
            timeout=self.timeout,
        )

    def generate(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        schema: dict,
    ) -> str:
        payload = {
            "model": self.model,
            "temperature": 0,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": user_prompt,
                },
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "response",
                    "schema": schema,
                },
            },
        }

        response = self.http.post(
            "/chat/completions",
            json=payload,
        )

        if response.status_code != 200:
            print(response.text)
            response.raise_for_status()

        data = response.json()

        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            raise RuntimeError(
                f"Unexpected LM Studio response:\n{data}"
            ) from e
