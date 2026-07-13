import httpx

from .client import LLMClient


class LMStudioClient(LLMClient):
    def __init__(
        self,
        base_url: str = "http://127.0.0.1:1234/v1",
        model: str = "qwen/qwen3.6-27b",
    ):
        self.base_url = base_url
        self.model = model

    def generate(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        schema: dict,
    ) -> str:

        payload = {
            "model": self.model,
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
            "temperature": 0,
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "response",
                    "schema": schema,
                },
            },
        }

        response = httpx.post(
            f"{self.base_url}/chat/completions",
            json=payload,
            timeout=120,
        )

        if response.status_code != 200:
            print(response.text)
            response.raise_for_status()

        data = response.json()

        return data["choices"][0]["message"]["content"]
