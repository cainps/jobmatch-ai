import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "./db.js";
import type { AiResult, Analysis, AnalysisSummary, NewAnalysis } from "./types.js";

function toIso(value: Date | string): string {
  return new Date(value).toISOString();
}

export async function insertAnalysis(input: NewAnalysis, ai: AiResult): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO analyses
       (candidate_name, job_title, resume_text, job_description,
        score, summary, strengths, gaps, suggestions, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.candidateName ?? null,
      input.jobTitle,
      input.resumeText,
      input.jobDescription,
      ai.score,
      ai.summary,
      JSON.stringify(ai.strengths),
      JSON.stringify(ai.gaps),
      JSON.stringify(ai.suggestions),
      ai.source,
    ],
  );
  return result.insertId;
}

export async function listAnalyses(limit = 50): Promise<AnalysisSummary[]> {
  const safeLimit = Math.max(1, Math.min(200, Math.trunc(limit)));
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, candidate_name, job_title, score, summary, source, created_at
       FROM analyses
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
    [safeLimit],
  );
  return rows.map((row) => ({
    id: row.id,
    candidateName: row.candidate_name,
    jobTitle: row.job_title,
    score: row.score,
    summary: row.summary,
    source: row.source,
    createdAt: toIso(row.created_at),
  }));
}

export async function getAnalysis(id: number): Promise<Analysis | null> {
  const [rows] = await pool.execute<RowDataPacket[]>("SELECT * FROM analyses WHERE id = ?", [id]);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    candidateName: row.candidate_name,
    jobTitle: row.job_title,
    resumeText: row.resume_text,
    jobDescription: row.job_description,
    score: row.score,
    summary: row.summary,
    strengths: row.strengths,
    gaps: row.gaps,
    suggestions: row.suggestions,
    source: row.source,
    createdAt: toIso(row.created_at),
  };
}
