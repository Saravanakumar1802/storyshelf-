"""
Text -> meaning vectors, computed on our own server.

Search, "similar in spirit" and the retrieval step of Ask My Library all run
on these vectors, so they cost no API quota and keep working when every LLM
is resting. BAAI/bge-small-en-v1.5 is small (384 dimensions, ~130 MB ONNX,
CPU only) and strong at English passage retrieval. Every vector in the
database must come from the same model; changing EMBEDDING_MODEL means
re-embedding the library (python -m app.scripts.embed_library --reset).

Vectors are L2-normalised, so cosine similarity equals the dot product, and
they are stored as BSON binary float32 (a quarter of the size of a list of doubles).
"""

import asyncio
import logging
import os
from collections.abc import Sequence
from functools import cached_property
from typing import Any

import numpy as np
from bson.binary import Binary, BinaryVectorDtype

from app.core.config import BACKEND_DIR

log = logging.getLogger(__name__)

DIMENSIONS = 384
MODEL_CACHE = BACKEND_DIR / ".cache" / "models"
# BGE retrieves better when a short query carries this instruction (passages don't)
_BGE_QUERY_PREFIX = "Represent this sentence for searching relevant passages: "
_BATCH = 64

Vector = np.ndarray[Any, np.dtype[np.float32]]

os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")


class Embedder:
    def __init__(self, model_name: str) -> None:
        self.model_name = model_name

    @cached_property
    def _model(self) -> Any:
        # imported lazily: loading the ONNX runtime takes seconds and most commands never need it
        from fastembed import TextEmbedding

        log.info("Loading embedding model %s", self.model_name)
        return TextEmbedding(self.model_name, cache_dir=str(MODEL_CACHE))

    @property
    def ready(self) -> bool:
        return "_model" in self.__dict__

    def embed_passages_sync(self, texts: Sequence[str]) -> list[Vector]:
        return [np.asarray(v, dtype=np.float32) for v in self._model.embed(list(texts), batch_size=_BATCH)]

    def embed_query_sync(self, text: str) -> Vector:
        prefix = _BGE_QUERY_PREFIX if "bge" in self.model_name.lower() else ""
        return np.asarray(next(iter(self._model.embed([prefix + text]))), dtype=np.float32)

    # CPU-bound work runs off the event loop so the API stays responsive
    async def embed_passages(self, texts: Sequence[str]) -> list[Vector]:
        return await asyncio.to_thread(self.embed_passages_sync, texts)

    async def embed_query(self, text: str) -> Vector:
        return await asyncio.to_thread(self.embed_query_sync, text)

    async def warm_up(self) -> None:
        await asyncio.to_thread(lambda: self._model)


def to_bson(vector: Vector) -> Binary:
    return Binary.from_vector(vector.astype(np.float32).tolist(), BinaryVectorDtype.FLOAT32)


def from_bson(value: Binary) -> Vector:
    return np.asarray(value.as_vector().data, dtype=np.float32)


def normalise(vector: Vector) -> Vector:
    norm = float(np.linalg.norm(vector))
    return vector / norm if norm else vector
