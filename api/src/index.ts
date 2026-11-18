import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { config } from "./config.js";
import { waitForDb } from "./db.js";
import { HttpError } from "./errors.js";
import { router } from "./routes.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/api", router);
if (config.webDir) app.use(express.static(config.webDir));

app.use((_req, _res, next) => next(new HttpError(404, "Rota não encontrada.")));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  console.error("Erro inesperado:", error);
  res.status(500).json({ error: "Erro interno do servidor." });
});

async function main(): Promise<void> {
  await waitForDb();
  app.listen(config.port, () => {
    console.log(`API do JobMatch AI ouvindo na porta ${config.port}`);
  });
}

main().catch((error) => {
  console.error("Não foi possível iniciar a API:", error);
  process.exit(1);
});
