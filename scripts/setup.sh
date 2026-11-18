#!/usr/bin/env bash
# Prepara um servidor Linux (Ubuntu/Debian ou Amazon Linux 2023) e sobe o JobMatch AI.
#
# Uso:
#   sudo ANTHROPIC_API_KEY=sk-ant-... bash scripts/setup.sh
#
# Variáveis opcionais: ANTHROPIC_API_KEY, ADMIN_USER, ADMIN_PASSWORD,
# DB_ROOT_PASSWORD, DB_PASSWORD (as senhas não informadas são geradas ao acaso).
set -euo pipefail

log() { printf '\n==> %s\n' "$*"; }
rand() { head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n'; }

if [[ $EUID -ne 0 ]]; then
  echo "Execute como root: sudo bash $0" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

install_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    log "Docker e Docker Compose já instalados."
    return
  fi

  if command -v apt-get >/dev/null 2>&1; then
    log "Instalando Docker (Ubuntu/Debian)..."
    apt-get update -y
    apt-get install -y ca-certificates curl
    curl -fsSL https://get.docker.com | sh
  elif command -v dnf >/dev/null 2>&1; then
    log "Instalando Docker (Amazon Linux / Fedora)..."
    dnf install -y docker
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" \
      -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
  else
    echo "Distribuição não suportada: instale o Docker manualmente." >&2
    exit 1
  fi
  systemctl enable --now docker
}

write_env() {
  local env_file="$APP_DIR/.env"
  if [[ -f "$env_file" ]]; then
    log ".env já existe; mantendo os valores atuais."
    return
  fi

  log "Criando .env com senhas aleatórias..."
  (
    umask 077
    cat > "$env_file" <<EOF
DB_ROOT_PASSWORD=${DB_ROOT_PASSWORD:-$(rand)}
DB_PASSWORD=${DB_PASSWORD:-$(rand)}
ADMIN_USER=${ADMIN_USER:-admin}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-$(rand)}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
EOF
  )
  echo "Credenciais salvas em $env_file (somente root consegue ler)."
}

install_docker
write_env

log "Subindo os containers..."
cd "$APP_DIR"
docker compose up -d --build
docker compose ps

log "Pronto! Site na porta 80 e painel admin na porta 8080."
