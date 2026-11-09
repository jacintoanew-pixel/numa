#!/usr/bin/env bash
# ==============================================================================
# Automated Native PostgreSQL Backup Script for Personal Finance Platform
# ==============================================================================
set -euo pipefail

BACKUP_DIR="/var/backups/numa"
DB_NAME="numa_db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=14

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

echo "[$(date -Is)] Starting automated database backup for: ${DB_NAME}..."

# Execute native pg_dump as postgres system user and compress
sudo -u postgres pg_dump --clean --if-exists --no-owner --no-privileges "${DB_NAME}" | gzip -9 > "${BACKUP_FILE}"
chmod 600 "${BACKUP_FILE}"

# Verify backup integrity (test decompression without writing to disk)
if gzip -t "${BACKUP_FILE}"; then
  FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo "[$(date -Is)] SUCCESS: Backup verified (${FILE_SIZE}): ${BACKUP_FILE}"
else
  echo "[$(date -Is)] ERROR: Backup file failed gzip integrity check!" >&2
  exit 1
fi

# Rotate backups older than RETENTION_DAYS
echo "[$(date -Is)] Purging backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

echo "[$(date -Is)] Backup and retention cycle completed."
