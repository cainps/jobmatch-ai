import { config } from "./config.js";
import { HttpError } from "./errors.js";
import type { AiResult } from "./types.js";

/** Chama o serviço de IA em Python (FastAPI). */
export async function requestAnalysis(resumeText: string, jobDescription: string): Promise<AiResult> {
  let response: Response;
  try {
    response = await fetch(`${config.aiServiceUrl}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_text: resumeText, job_description: jobDescription }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    console.error("Falha ao contatar o serviço de IA:", error);
    throw new HttpError(502, "Serviço de IA indisponível. Tente novamente em instantes.");
  }

  if (!response.ok) {
    console.error("Serviço de IA respondeu com status", response.status);
    throw new HttpError(502, "O serviço de IA não conseguiu analisar este conteúdo.");
  }
  return (await response.json()) as AiResult;
}
