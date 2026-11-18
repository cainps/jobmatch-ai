/** Resposta do serviço de IA (Python). */
export interface AiResult {
  score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  suggestions: string[];
  source: "claude" | "local";
}

/** Dados enviados pelo frontend para criar uma análise. */
export interface NewAnalysis {
  candidateName?: string;
  jobTitle: string;
  resumeText: string;
  jobDescription: string;
}

/** Análise completa, como a API devolve. */
export interface Analysis extends AiResult {
  id: number;
  candidateName: string | null;
  jobTitle: string;
  resumeText: string;
  jobDescription: string;
  createdAt: string;
}

/** Versão resumida usada na listagem do histórico. */
export type AnalysisSummary = Pick<
  Analysis,
  "id" | "candidateName" | "jobTitle" | "score" | "summary" | "source" | "createdAt"
>;
