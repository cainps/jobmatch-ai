#!/usr/bin/env bash
# Backup do MySQL (mysqldump compactado). Opcionalmente envia a cópia para um bucket S3.
#
# Exemplo de cron (todo dia às 03:00):
#   0 3 * * * /opt/jobmatch-ai/scripts/backup.sh >> /var/log/jobmatch-backup.log 2>&1
#
# Variáveis opcionais:
#   BACKUP_DIR     pasta dos backups (padrão: <projeto>/backups)
#   KEEP           quantos backups locais manter (padrão: 7)
#   BACKUP_BUCKET  nome do bucket S3 (exige AWS CLI e permissão da instância)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
KEEP="${KEEP:-7}"

mkdir -p "$BACKUP_DIR"
file="$BACKUP_DIR/jobmatch-$(date +%Y%m%d-%H%M%S).sql.gz"
trap 'rm -f "$file"' ERR   # não deixa arquivo parcial se algo falhar

cd "$APP_DIR"
docker compose exec -T db sh -c \
  'exec mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines "$MYSQL_DATABASE"' \
  | gzip > "$file"
echo "Backup criado: $file ($(du -h "$file" | cut -f1))"

if [[ -n "${BACKUP_BUCKET:-}" ]]; then
  aws s3 cp "$file" "s3://${BACKUP_BUCKET}/jobmatch/"
  echo "Cópia enviada para s3://${BACKUP_BUCKET}/jobmatch/"
fi

# Retenção: remove os backups locais mais antigos.
ls -1t "$BACKUP_DIR"/jobmatch-*.sql.gz | tail -n +"$((KEEP + 1))" | xargs -r rm --
