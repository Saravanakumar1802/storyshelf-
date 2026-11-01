from app.core.config import Settings


def test_cors_origins_are_split_and_trimmed() -> None:
    s = Settings(_env_file=None, api_cors_origins=" http://a.test , http://b.test,, ")  # type: ignore[call-arg]
    assert s.cors_origins == ["http://a.test", "http://b.test"]


def test_missing_llm_keys_default_to_none() -> None:
    s = Settings(_env_file=None)  # type: ignore[call-arg]
    assert s.groq_api_key is None and s.openrouter_api_key is None
    assert s.llm_gemini.startswith("gemini/")


def test_secrets_never_render_in_repr() -> None:
    s = Settings(_env_file=None, jwt_secret="super-secret-value", mongodb_uri="mongodb+srv://u:p@h/")  # type: ignore[call-arg]
    assert "super-secret-value" not in repr(s)
    assert "u:p@" not in repr(s)
