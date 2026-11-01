"""
Ping every configured model once, directly (no fallback), and report.

    python -m uv run python -m app.scripts.check_models

Run it after adding or changing keys and model ids in .env: free model ids
change often, and this shows straight away which ones answer, which are
rate-limited, and which keys are wrong. Each ping costs a few tokens.
"""

import asyncio
import time

import litellm

from app.ai.llm.health import classify
from app.ai.llm.providers import CHAINS, GROUPS, build_deployments
from app.core.config import get_settings

PROMPT = [{"role": "user", "content": "Reply with the single word: ready"}]


async def main() -> None:
    settings = get_settings()
    deployments = build_deployments(settings)
    print(f"{'deployment':<12} {'provider':<14} {'model':<44} result")
    print("-" * 96)
    ready = set()
    for d in deployments.values():
        if not d.configured:
            print(f"{d.id:<12} {d.provider:<14} {d.model:<44} -  no key")
            continue
        start = time.perf_counter()
        try:
            resp = await litellm.acompletion(
                model=d.model, messages=PROMPT, api_key=d.api_key, max_tokens=8, timeout=30, num_retries=0
            )
            ms = int((time.perf_counter() - start) * 1000)
            answer = (resp.choices[0].message.content or "").strip()[:20]
            print(f"{d.id:<12} {d.provider:<14} {d.model:<44} OK {ms} ms ({answer!r})")
            ready.add(d.id)
        except Exception as exc:
            print(f"{d.id:<12} {d.provider:<14} {d.model:<44} FAIL {classify(exc).value}: {str(exc)[:80]}")
    print()
    for g in GROUPS:
        chain = " -> ".join(f"{i}{'' if i in ready else ' (x)'}" for i in CHAINS[g])
        status = "OK" if any(i in ready for i in CHAINS[g]) else "NO MODEL AVAILABLE"
        print(f"{g:<6} {status:<20} {chain}")


if __name__ == "__main__":
    asyncio.run(main())
