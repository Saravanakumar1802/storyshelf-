# Ask & help evals

Retrieval only (`evals/ask_eval.py`): no LLM keys needed, and the answers can only be as good as this.

| eval | cases | result |
|---|---|---|
| Ask My Library · top passage from the right book (8-book shelf) | 14 | 86% |
| Ask My Library · passages from the right book (precision@8) | 14 | 82% |
| Help assistant · right FAQ first | 12 | 100% |
| Help assistant · off-topic handed to a person | 3 | 100% |

Misses:

```
  'Why does the creature ask Victor to make him a companion?': wanted frankenstein, top passage from the-adventures-of-sherlock-holmes
  'How does the creature learn to speak and read?': wanted frankenstein, top passage from dracula
```
