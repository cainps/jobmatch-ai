import { Router } from "express";
import { z } from "zod";
import { requestAnalysis } from "./aiClient.js";
import { asyncHandler, HttpError } from "./errors.js";
import { getAnalysis, insertAnalysis, listAnalyses } from "./repository.js";

const createSchema = z.object({
  candidateName: z.string().trim().max(120).optional(),
  jobTitle: z.string().trim().min(2, "Informe o título da vaga.").max(160),
  resumeText: z.string().trim().min(30, "Cole um currículo com pelo menos 30 caracteres.").max(20000),
  jobDescription: z.string().trim().min(30, "Cole uma descrição de vaga com pelo menos 30 caracteres.").max(20000),
});

export const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.post(
  "/analyses",
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Dados inválidos.");
    }
    const input = parsed.data;
    const ai = await requestAnalysis(input.resumeText, input.jobDescription);
    const id = await insertAnalysis(input, ai);
    const saved = await getAnalysis(id);
    res.status(201).json(saved);
  }),
);

router.get(
  "/analyses",
  asyncHandler(async (_req, res) => {
    res.json(await listAnalyses());
  }),
);

router.get(
  "/analyses/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new HttpError(400, "Identificador inválido.");
    const analysis = await getAnalysis(id);
    if (!analysis) throw new HttpError(404, "Análise não encontrada.");
    res.json(analysis);
  }),
);
