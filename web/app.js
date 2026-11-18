"use strict";

const $ = (id) => document.getElementById(id);

const EXAMPLE = {
  candidateName: "Exemplo Silva",
  jobTitle: "Desenvolvedor(a) Backend Júnior",
  resumeText:
    "Estudante de Análise e Desenvolvimento de Sistemas. Projetos pessoais com Python, SQL e MySQL, " +
    "versionados no Git e GitHub. Conhecimento de Linux e de APIs REST. Experiência administrativa " +
    "com Excel e organização de processos.",
  jobDescription:
    "Buscamos pessoa desenvolvedora backend júnior para atuar com Python, Node.js e SQL. " +
    "Desejável conhecimento em AWS, Docker, Git e Linux. Diferencial: experiência com APIs REST e testes.",
};

/** Cria elementos com textContent (nunca innerHTML), evitando XSS com texto vindo da IA/usuário. */
function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  }
  node.append(...children);
  return node;
}

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Erro ${response.status}`);
  return data;
}

function showError(message) {
  const box = $("error");
  box.textContent = message || "";
  box.hidden = !message;
}

function scoreClass(score) {
  if (score >= 70) return "";
  if (score >= 40) return "mid";
  return "low";
}

function listSection(title, items) {
  if (!items || items.length === 0) return null;
  return h("div", {}, h("h3", { text: title }), h("ul", {}, ...items.map((item) => h("li", { text: item }))));
}

function renderResult(analysis) {
  const score = Number(analysis.score) || 0;
  const when = new Date(analysis.createdAt).toLocaleString("pt-BR");
  const sourceLabel = analysis.source === "claude" ? "Análise com IA (Claude)" : "Análise local";

  const gauge = h("div", { class: `gauge ${scoreClass(score)}`.trim(), style: `--score:${score}` }, h("span", { text: String(score) }));
  const header = h(
    "div",
    { class: "score-row" },
    gauge,
    h(
      "div",
      {},
      h("strong", { text: analysis.jobTitle }),
      h("div", { class: "meta", text: `${analysis.candidateName ? analysis.candidateName + " · " : ""}${when}` }),
      h("span", { class: "badge", text: sourceLabel }),
    ),
  );

  const container = h("div", { class: "result" }, header, h("p", { text: analysis.summary }));
  for (const section of [
    listSection("Pontos fortes", analysis.strengths),
    listSection("Lacunas", analysis.gaps),
    listSection("Sugestões", analysis.suggestions),
  ]) {
    if (section) container.append(section);
  }
  $("result").replaceWith(Object.assign(container, { id: "result" }));
}

function renderHistory(items) {
  const list = $("history");
  list.replaceChildren();
  if (items.length === 0) {
    list.append(h("li", { class: "empty", text: "Nenhuma análise ainda." }));
    return;
  }
  for (const item of items) {
    const button = h(
      "button",
      { type: "button" },
      h("span", { text: item.jobTitle }),
      h("span", { class: "pts", text: `${item.score}/100` }),
    );
    button.addEventListener("click", async () => {
      try {
        renderResult(await api(`/analyses/${item.id}`));
        $("result-card").scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (error) {
        showError(error.message);
      }
    });
    list.append(h("li", {}, button));
  }
}

async function loadHistory() {
  try {
    renderHistory(await api("/analyses"));
  } catch (error) {
    showError(error.message);
  }
}

$("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  showError("");

  const payload = {
    candidateName: $("candidateName").value.trim() || undefined,
    jobTitle: $("jobTitle").value.trim(),
    resumeText: $("resumeText").value.trim(),
    jobDescription: $("jobDescription").value.trim(),
  };

  const button = $("submit");
  button.disabled = true;
  button.textContent = "Analisando...";
  try {
    renderResult(await api("/analyses", { method: "POST", body: JSON.stringify(payload) }));
    await loadHistory();
  } catch (error) {
    showError(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Analisar";
  }
});

$("example").addEventListener("click", () => {
  for (const [key, value] of Object.entries(EXAMPLE)) $(key).value = value;
  showError("");
});

loadHistory();
