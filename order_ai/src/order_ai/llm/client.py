from typing import Protocol


class LLMClient(Protocol):
    """Interface implemented by all LLM providers."""

    def generate(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        schema: dict,
    ) -> str:
        """
        Sends a prompt to the model.

        Returns the raw JSON string produced by the model.
        """
        ...
