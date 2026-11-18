"""API HTTP do serviço de IA (FastAPI)."""
import logging
from typing import List

from fastapi import FastAPI
from pydantic import BaseModel, Field

from analyzer import analyze

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="JobMatch AI - Serviço de IA", version="1.0.0")


class AnalyzeRequest(BaseModel):
    resume_text: str = Field(..., min_length=30, max_length=20000)
    job_description: str = Field(..., min_length=30, max_length=20000)


class AnalyzeResponse(BaseModel):
    score: int = Field(..., ge=0, le=100)
    summary: str
    strengths: List[str]
    gaps: List[str]
    suggestions: List[str]
    source: str  # "claude" ou "local"


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_endpoint(payload: AnalyzeRequest) -> dict:
    # Função síncrona de propósito: o FastAPI a executa em um pool de threads,
    # então a chamada de rede ao Claude não bloqueia o servidor.
    return analyze(payload.resume_text, payload.job_description)
