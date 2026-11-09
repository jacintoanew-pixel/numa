#!/usr/bin/env bash
set -e

echo "=== Initializing PostgreSQL for Numa ==="
DB_PASS=$(openssl rand -hex 16)

sudo -u postgres psql << PSQL_EOF
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'numa_user') THEN
    CREATE USER numa_user WITH PASSWORD '$DB_PASS';
  ELSE
    ALTER USER numa_user WITH PASSWORD '$DB_PASS';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE numa_db OWNER numa_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'numa_db')\gexec

GRANT ALL PRIVILEGES ON DATABASE numa_db TO numa_user;
PSQL_EOF

# Grant schema permissions in database
sudo -u postgres psql -d numa_db << PSQL_GRANT
GRANT ALL ON SCHEMA public TO numa_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO numa_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO numa_user;
PSQL_GRANT

mkdir -p /var/www/numa
mkdir -p /var/backups/numa

cat << ENV_EOF > /var/www/numa/.env.production
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://numa_user:$DB_PASS@127.0.0.1:5432/numa_db
GEMINI_MODEL=gemini-3.8-flash
DEFAULT_CURRENCY=USD
DEFAULT_TIMEZONE=America/Panama
ENV_EOF

chmod 600 /var/www/numa/.env.production
echo "PostgreSQL database 'numa_db' and user 'numa_user' ready."
