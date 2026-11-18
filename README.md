# JobMatch AI

Cole um currículo e a descrição de uma vaga: o sistema devolve uma **nota de aderência (0–100)**, pontos fortes, lacunas e sugestões de ajuste. A análise é feita pela **API do Claude**; sem chave configurada, usa uma análise local por palavras-chave (útil para desenvolver e testar).

## Arquitetura

```
Navegador ──► Nginx (web) ──► API Node.js/TypeScript ──► Serviço de IA (Python/FastAPI) ──► Claude
                                      │
                                      └──► MySQL ◄── Painel admin (PHP)
```

| Pasta | O que é | Tecnologia |
|---|---|---|
| `ai-service/` | Serviço que monta o prompt, chama o Claude e valida o JSON de resposta | Python, FastAPI |
| `api/` | API REST: valida a entrada, chama a IA e grava o histórico | Node.js, TypeScript, Express, Zod |
| `db/` | Tabela, restrições, índices e uma view de resumo | SQL, MySQL |
| `web/` | Interface do usuário (sem framework) | JavaScript, HTML, CSS |
| `admin/` | Painel com estatísticas, login e exportação CSV (abre no Excel) | PHP, PDO |
| `scripts/` | Instalação do servidor e backup com retenção (+ envio opcional ao S3) | Bash, Linux |
| `infra/` | Stack que cria a instância EC2 já com o projeto rodando | AWS CloudFormation |
| `.github/workflows/` | Testes, checagem de tipos, lint de PHP e build dos containers | GitHub Actions, Git/GitHub |

## Como rodar (Docker)

```bash
cp .env.example .env      # troque as senhas; opcionalmente informe ANTHROPIC_API_KEY
docker compose up -d --build
```

- Site: http://localhost (porta `WEB_PORT`)
- Painel admin: http://localhost:8080 (usuário e senha do `.env`)

Sem `ANTHROPIC_API_KEY`, o resultado aparece como "Análise local". Com a chave, como "Análise com IA (Claude)".

## Desenvolvimento sem Docker

```bash
# 1) Banco: tenha um MySQL 8 local e rode db/schema.sql nele

# 2) Serviço de IA
cd ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt pytest
python -m pytest -q
uvicorn main:app --reload --port 8000

# 3) API (serve também o frontend em http://localhost:3000)
cd ../api
npm install
export DB_PASSWORD=... AI_SERVICE_URL=http://localhost:8000 WEB_DIR=../web
npm run dev
```

## Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/analyses` | Cria uma análise. Corpo: `candidateName?`, `jobTitle`, `resumeText`, `jobDescription` |
| GET | `/api/analyses` | Lista as análises mais recentes |
| GET | `/api/analyses/:id` | Detalhes de uma análise |
| GET | `/api/health` | Verificação de saúde |

## Deploy na AWS

Opção 1 — CloudFormation (cria EC2 + security group e já instala tudo):

```bash
aws cloudformation deploy \
  --stack-name jobmatch-ai \
  --template-file infra/cloudformation.yml \
  --parameter-overrides KeyName=minha-chave MyIpCidr=SEU.IP.AQUI/32 \
      RepoUrl=https://github.com/SEU_USUARIO/jobmatch-ai.git \
      AdminPassword='uma-senha-forte-123' AnthropicApiKey='sk-ant-...'
aws cloudformation describe-stacks --stack-name jobmatch-ai --query "Stacks[0].Outputs"
```

Opção 2 — em qualquer servidor Linux: `sudo bash scripts/setup.sh`.

Backup diário às 03:00 (com cópia opcional para o S3):

```bash
(crontab -l 2>/dev/null; echo "0 3 * * * BACKUP_BUCKET=meu-bucket /opt/jobmatch-ai/scripts/backup.sh >> /var/log/jobmatch-backup.log 2>&1") | crontab -
```

## Publicar no GitHub

```bash
git init -b main
git add .
git commit -m "feat: JobMatch AI"
git remote add origin https://github.com/SEU_USUARIO/jobmatch-ai.git
git push -u origin main
```

## Segurança — o que já está feito e o que falta

Já feito: consultas SQL parametrizadas, validação com Zod, texto renderizado sem `innerHTML` (evita XSS), painel PHP com autenticação e proteção contra injeção de fórmula no CSV, containers sem root, IMDSv2 e disco criptografado na EC2, `.env` fora do Git.

Falta para produção: HTTPS (ex.: Application Load Balancer + ACM), segredos no AWS Secrets Manager em vez do UserData, limite de requisições na API (cada análise consome a API do Claude) e banco gerenciado (RDS).

## Ideias de evolução

- Upload de currículo em PDF e extração do texto
- Testes automatizados da API (Vitest + Supertest)
- Login de usuários e histórico por pessoa
- Imagens no ECR e execução no ECS/Fargate
