#!/usr/bin/env bash
# ==============================================================================
# Native PostgreSQL Database Restoration Script
# ==============================================================================
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Uso: $0 <archivo_backup.sql.gz>"
  echo "Ejemplo: $0 /var/backups/numa/numa_db_20261015_120000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"
DB_NAME="numa_db"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: El archivo de respaldo '${BACKUP_FILE}' no existe." >&2
  exit 1
fi

echo "[$(date -Is)] Verificando integridad de: ${BACKUP_FILE}..."
gzip -t "${BACKUP_FILE}"

echo "[$(date -Is)] ADVERTENCIA: Se restaurará la base de datos '${DB_NAME}'."
echo "Restaurando..."

# Terminate active connections before dropping/restoring
sudo -u postgres psql -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();"

# Restore database
gunzip -c "${BACKUP_FILE}" | sudo -u postgres psql -d "${DB_NAME}"

echo "[$(date -Is)] Restauración completada con éxito."
