"""FastAPI dependencies shared by every module (overridable in tests)."""

from typing import Annotated

from fastapi import Depends, Request

from app.ai.embeddings import Embedder
from app.ai.llm.client import LlmClient
from app.ai.vector_store import VectorIndex
from app.core.config import Settings, get_settings
from app.db.mongo import Database, mongo


def get_db() -> Database:
    return mongo.db


def get_llm(request: Request) -> LlmClient:
    llm: LlmClient = request.app.state.llm
    return llm


def get_embedder(request: Request) -> Embedder:
    embedder: Embedder = request.app.state.embedder
    return embedder


def get_vectors(request: Request) -> VectorIndex:
    vectors: VectorIndex = request.app.state.vectors
    return vectors


SettingsDep = Annotated[Settings, Depends(get_settings)]
EmbedderDep = Annotated[Embedder, Depends(get_embedder)]
VectorsDep = Annotated[VectorIndex, Depends(get_vectors)]
LlmDep = Annotated[LlmClient, Depends(get_llm)]
DbDep = Annotated[Database, Depends(get_db)]
