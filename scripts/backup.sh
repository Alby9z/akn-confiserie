#!/usr/bin/env bash
# Sauvegarde quotidienne de la base (Linux / serveur). À planifier avec cron, ex. :
#   15 3 * * * /srv/akn/scripts/backup.sh >> /var/log/akn-backup.log 2>&1
# Variables : DATABASE_URL (obligatoire), BACKUP_DIR (défaut /var/backups/akn), RETENTION_DAYS (défaut 30),
#             ALERT_EMAIL (facultatif, nécessite la commande « mail »).
set -euo pipefail
BACKUP_DIR="${BACKUP_DIR:-/var/backups/akn}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/akn-$STAMP.dump"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

fail() {
  echo "[$(date -Is)] ÉCHEC de la sauvegarde : $1" >&2
  if [ -n "${ALERT_EMAIL:-}" ] && command -v mail >/dev/null; then
    echo "La sauvegarde AKN du $STAMP a échoué : $1" | mail -s "ALERTE sauvegarde AKN" "$ALERT_EMAIL"
  fi
  exit 1
}

pg_dump --format=custom --no-owner --file="$FILE" "$DATABASE_URL" || fail "pg_dump"
# Vérifie que l'archive est lisible
pg_restore --list "$FILE" > /dev/null || fail "archive illisible"
# Photos produits et pièces jointes
if [ -d "${STORAGE_DIR:-./storage}" ]; then
  tar -czf "$BACKUP_DIR/akn-fichiers-$STAMP.tar.gz" -C "$(dirname "${STORAGE_DIR:-./storage}")" "$(basename "${STORAGE_DIR:-./storage}")" || fail "archive des fichiers"
fi
find "$BACKUP_DIR" -name 'akn-*' -mtime +"$RETENTION_DAYS" -delete
echo "[$(date -Is)] Sauvegarde OK : $FILE ($(du -h "$FILE" | cut -f1))"
