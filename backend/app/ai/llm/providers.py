"""
The free-tier models the library can use, and the order it tries them in.

Each *deployment* is one model at one provider. Each task *group* is an ordered
fallback chain of deployments:

- fast:  short, cheap jobs (mood parsing, query rewriting, tags). High daily limits matter most.
- smart: answers people read (Ask My Library, recommendation reasons). Quality first.
- long:  whole-book summaries. A big context window comes first.

A deployment whose API key is missing is simply left out of every chain, so
the app runs with any subset of keys, including none at all.
"""

from dataclasses import dataclass
from typing import Literal

from app.core.config import Settings

Group = Literal["fast", "smart", "long"]
GROUPS: tuple[Group, ...] = ("fast", "smart", "long")

CHAINS: dict[Group, tuple[str, ...]] = {
    "fast": ("groq-fast", "cerebras", "gemini-lite", "mistral", "openrouter"),
    "smart": ("groq-smart", "cerebras", "gemini", "github", "mistral", "openrouter"),
    "long": ("gemini", "gemini-lite", "mistral", "openrouter"),
}


@dataclass(frozen=True)
class Deployment:
    id: str
    provider: str  # shown to people: "Groq", "Google Gemini", …
    model: str  # LiteLLM "provider/model" id, from .env
    api_key: str | None
    # whether the provider honours response_format={"type": "json_object"}
    json_mode: bool = True

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    @property
    def model_name(self) -> str:
        """The model without its LiteLLM provider prefix, e.g. "gpt-oss-120b"."""
        return self.model.split("/", 1)[1] if "/" in self.model else self.model


def build_deployments(s: Settings) -> dict[str, Deployment]:
    def key(secret: object) -> str | None:
        value = secret.get_secret_value() if secret is not None else ""  # type: ignore[attr-defined]
        return value or None

    groq, gemini = key(s.groq_api_key), key(s.gemini_api_key)
    deployments = [
        Deployment("groq-fast", "Groq", s.llm_groq_fast, groq),
        Deployment("groq-smart", "Groq", s.llm_groq_smart, groq),
        Deployment("cerebras", "Cerebras", s.llm_cerebras, key(s.cerebras_api_key)),
        Deployment("gemini", "Google Gemini", s.llm_gemini, gemini),
        Deployment("gemini-lite", "Google Gemini", s.llm_gemini_lite, gemini),
        Deployment("mistral", "Mistral", s.llm_mistral, key(s.mistral_api_key)),
        Deployment("github", "GitHub Models", s.llm_github, key(s.github_models_token)),
        # free OpenRouter models vary in JSON support, so JSON is asked for in the prompt only
        Deployment("openrouter", "OpenRouter", s.llm_openrouter, key(s.openrouter_api_key), json_mode=False),
    ]
    return {d.id: d for d in deployments}
