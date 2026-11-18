"""Lógica de análise de aderência entre currículo e vaga.

Fluxo principal: o Claude (API da Anthropic) devolve um JSON estruturado.
Fallback: se não houver ANTHROPIC_API_KEY (ou a chamada falhar), usa uma
análise local por palavras-chave, para o projeto continuar funcionando em
desenvolvimento e nos testes.
"""
from __future__ import annotations

import json
import logging
import os
import re
import unicodedata
from typing import Any, Dict, List, Set

logger = logging.getLogger("jobmatch.analyzer")

DEFAULT_MODEL = "claude-sonnet-5-5"

SYSTEM_PROMPT = (
    "Você é um recrutador técnico sênior que avalia a aderência de um currículo a uma vaga. "
    "Seja honesto, específico e construtivo. Responda SOMENTE com um objeto JSON válido, "
    "sem texto antes ou depois e sem blocos de código, neste formato:\n"
    '{"score": <inteiro de 0 a 100>, "summary": "<2 frases>", '
    '"strengths": ["..."], "gaps": ["..."], "suggestions": ["..."]}\n'
    "Regras: no máximo 5 itens em cada lista; cada item com uma frase curta; "
    "baseie-se apenas no que está escrito no currículo e na vaga; não invente experiências; "
    "escreva em português do Brasil."
)

# Tecnologias reconhecidas pela análise local (chave normalizada -> nome de exibição).
TECH_TERMS: Dict[str, str] = {
    "python": "Python",
    "java": "Java",
    "php": "PHP",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "nodejs": "Node.js",
    "c++": "C++",
    "c#": "C#",
    "sql": "SQL",
    "mysql": "MySQL",
    "postgresql": "PostgreSQL",
    "mongodb": "MongoDB",
    "redis": "Redis",
    "aws": "AWS",
    "azure": "Azure",
    "linux": "Linux",
    "git": "Git",
    "github": "GitHub",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "terraform": "Terraform",
    "react": "React",
    "angular": "Angular",
    "vue": "Vue",
    "django": "Django",
    "flask": "Flask",
    "fastapi": "FastAPI",
    "spring": "Spring",
    "laravel": "Laravel",
    "html": "HTML",
    "css": "CSS",
    "rest": "REST",
    "api": "APIs",
    "excel": "Excel",
    "ci/cd": "CI/CD",
    "scrum": "Scrum",
}


# --------------------------------------------------------------------------- #
# Claude
# --------------------------------------------------------------------------- #
def build_user_prompt(resume_text: str, job_description: str) -> str:
    return (
        "<curriculo>\n" + resume_text.strip() + "\n</curriculo>\n\n"
        "<vaga>\n" + job_description.strip() + "\n</vaga>\n\n"
        "Avalie a aderência do currículo à vaga."
    )


def normalize_result(data: Dict[str, Any]) -> Dict[str, Any]:
    """Valida e normaliza o JSON devolvido pelo modelo."""
    if not isinstance(data, dict) or "score" not in data:
        raise ValueError("JSON do modelo sem o campo 'score'.")
    try:
        score = int(round(float(data["score"])))
    except (TypeError, ValueError) as exc:
        raise ValueError("Campo 'score' inválido.") from exc

    def as_list(key: str) -> List[str]:
        value = data.get(key, [])
        if not isinstance(value, list):
            return []
        items = [str(item).strip() for item in value if str(item).strip()]
        return items[:5]

    return {
        "score": max(0, min(100, score)),
        "summary": str(data.get("summary", "")).strip(),
        "strengths": as_list("strengths"),
        "gaps": as_list("gaps"),
        "suggestions": as_list("suggestions"),
    }


def parse_model_json(text: str) -> Dict[str, Any]:
    """Extrai o primeiro objeto JSON do texto devolvido pelo modelo."""
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("A resposta do modelo não contém JSON.")
    return normalize_result(json.loads(text[start : end + 1]))


def analyze_with_claude(resume_text: str, job_description: str, api_key: str) -> Dict[str, Any]:
    import anthropic  # import tardio: só é necessário quando há chave configurada

    client = anthropic.Anthropic(api_key=api_key, timeout=45.0)
    message = client.messages.create(
        model=os.getenv("CLAUDE_MODEL", DEFAULT_MODEL),
        max_tokens=1200,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": build_user_prompt(resume_text, job_description)}],
    )
    text = "".join(block.text for block in message.content if getattr(block, "type", "") == "text")
    return parse_model_json(text)


# --------------------------------------------------------------------------- #
# Análise local (fallback)
# --------------------------------------------------------------------------- #
def _strip_accents(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text.lower())
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch))


def _tech_terms(text: str) -> Set[str]:
    found: Set[str] = set()
    for raw in re.findall(r"[a-z0-9+#./]+", _strip_accents(text)):
        token = raw.strip("./")
        if token == "node.js":
            token = "nodejs"
        if token.endswith("s") and token[:-1] in TECH_TERMS:
            token = token[:-1]  # "apis" -> "api"
        if token in TECH_TERMS:
            found.add(token)
    return found


def analyze_locally(resume_text: str, job_description: str) -> Dict[str, Any]:
    job_terms = _tech_terms(job_description)
    resume_terms = _tech_terms(resume_text)

    if not job_terms:
        return {
            "score": 50,
            "summary": (
                "A vaga não cita tecnologias conhecidas pela análise local, "
                "então a nota é apenas neutra."
            ),
            "strengths": [],
            "gaps": [],
            "suggestions": ["Configure a ANTHROPIC_API_KEY para uma análise completa com IA."],
        }

    matched = sorted(job_terms & resume_terms)
    missing = sorted(job_terms - resume_terms)
    score = round(100 * len(matched) / len(job_terms))

    suggestions = [
        f"Se você tem experiência com {TECH_TERMS[t]}, inclua no currículo; "
        f"se não, faça um projeto pequeno usando {TECH_TERMS[t]}."
        for t in missing[:3]
    ]
    suggestions.append("Ative a análise com IA (ANTHROPIC_API_KEY) para um parecer mais completo.")

    return {
        "score": score,
        "summary": (
            f"O currículo cobre {len(matched)} de {len(job_terms)} tecnologias citadas na vaga "
            "(análise local por palavras-chave)."
        ),
        "strengths": [f"Cita {TECH_TERMS[t]}, pedido na vaga." for t in matched[:5]],
        "gaps": [f"Não menciona {TECH_TERMS[t]}, citado na vaga." for t in missing[:5]],
        "suggestions": suggestions[:5],
    }


# --------------------------------------------------------------------------- #
# Ponto de entrada
# --------------------------------------------------------------------------- #
def analyze(resume_text: str, job_description: str) -> Dict[str, Any]:
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if api_key:
        try:
            result = analyze_with_claude(resume_text, job_description, api_key)
            result["source"] = "claude"
            return result
        except Exception:  # noqa: BLE001 - qualquer falha cai no fallback local
            logger.exception("Falha ao consultar o Claude; usando análise local.")

    result = analyze_locally(resume_text, job_description)
    result["source"] = "local"
    return result
