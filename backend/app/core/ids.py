import secrets

# no 0/O, 1/I: references are read out on the phone
_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def reference(prefix: str, length: int = 8) -> str:
    """A short, unguessable, human-friendly reference such as TKT-7KQ2M9XA."""
    return f"{prefix}-{''.join(secrets.choice(_ALPHABET) for _ in range(length))}"
