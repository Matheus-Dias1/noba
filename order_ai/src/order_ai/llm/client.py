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
        Sends a prompt to the model and returns the raw JSON response.

        Args:
            system_prompt: System instructions.
            user_prompt: User input.
            schema: JSON Schema used for structured output.

        Returns:
            A JSON string produced by the model.
        """
        ...
