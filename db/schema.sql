-- JobMatch AI - esquema do banco (MySQL 8)
-- Executado automaticamente na primeira subida do container (docker-entrypoint-initdb.d).

CREATE TABLE IF NOT EXISTS analyses (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  candidate_name  VARCHAR(120) NULL,
  job_title       VARCHAR(160) NOT NULL,
  resume_text     MEDIUMTEXT   NOT NULL,
  job_description MEDIUMTEXT   NOT NULL,
  score           TINYINT UNSIGNED NOT NULL,
  summary         TEXT         NOT NULL,
  strengths       JSON         NOT NULL,
  gaps            JSON         NOT NULL,
  suggestions     JSON         NOT NULL,
  source          VARCHAR(20)  NOT NULL DEFAULT 'claude',
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_analyses_created (created_at),
  KEY idx_analyses_job (job_title),
  CONSTRAINT chk_score CHECK (score BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Resumo por vaga: usado pelo painel PHP.
CREATE OR REPLACE VIEW vw_resumo_por_vaga AS
SELECT
  job_title,
  COUNT(*)            AS total_analises,
  ROUND(AVG(score),1) AS nota_media,
  MAX(score)          AS melhor_nota,
  MAX(created_at)     AS ultima_analise
FROM analyses
GROUP BY job_title;
