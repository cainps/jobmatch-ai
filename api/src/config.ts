import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 3000),
  aiServiceUrl: process.env.AI_SERVICE_URL ?? "http://localhost:8000",
  /** Opcional: pasta do frontend para servir pela própria API (desenvolvimento sem Docker). */
  webDir: process.env.WEB_DIR,
  db: {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "jobmatch",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "jobmatch",
  },
};
