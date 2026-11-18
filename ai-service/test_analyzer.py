"""Testes do analisador. Rode com `pytest` ou `python test_analyzer.py`."""
from analyzer import analyze_locally, normalize_result, parse_model_json

RESUME = "Desenvolvedor com Python, SQL, MySQL, Git e GitHub. Experiência em Linux e APIs REST."
JOB = "Vaga júnior: Python, SQL, AWS, Docker e Linux. Diferencial: Node.js."


def test_local_score_and_gaps():
    result = analyze_locally(RESUME, JOB)
    # Vaga pede 5 tecnologias reconhecidas (Python, SQL, AWS, Docker, Linux) + Node.js = 6
    assert 0 <= result["score"] <= 100
    assert result["score"] == 50  # Python, SQL e Linux cobertos: 3 de 6
    assert any("AWS" in gap for gap in result["gaps"])
    assert any("Python" in item for item in result["strengths"])


def test_local_without_known_terms_is_neutral():
    result = analyze_locally("Profissional de vendas com 5 anos de experiência.", "Vaga para atendimento ao cliente.")
    assert result["score"] == 50
    assert result["strengths"] == [] and result["gaps"] == []


def test_parse_model_json_ignores_text_around_json():
    text = 'Claro! {"score": 87.6, "summary": "Boa aderência.", "strengths": ["Python"], "gaps": [], "suggestions": []} Fim.'
    result = parse_model_json(text)
    assert result["score"] == 88
    assert result["strengths"] == ["Python"]


def test_normalize_result_clamps_score_and_limits_lists():
    result = normalize_result({"score": 250, "summary": "ok", "strengths": [str(i) for i in range(10)]})
    assert result["score"] == 100
    assert len(result["strengths"]) == 5
    assert result["gaps"] == []


def test_invalid_json_raises():
    for bad in ("sem json aqui", '{"summary": "sem nota"}'):
        try:
            parse_model_json(bad)
        except ValueError:
            continue
        raise AssertionError(f"Deveria falhar para: {bad!r}")


if __name__ == "__main__":
    for name, func in list(globals().items()):
        if name.startswith("test_") and callable(func):
            func()
            print(f"ok - {name}")
