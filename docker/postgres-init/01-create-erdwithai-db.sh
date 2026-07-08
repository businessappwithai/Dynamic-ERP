#!/usr/bin/env bash
# Creates the erdwithai (Studio) database + role alongside erpclaw's own
# database on the same Postgres instance. Runs once, on first container init
# (postgres only executes docker-entrypoint-initdb.d/ on an empty data dir).
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'erdwithai') THEN
        CREATE ROLE erdwithai LOGIN PASSWORD 'erdwithai_dev_password';
      END IF;
    END
    \$\$;

    SELECT 'CREATE DATABASE erdwithai OWNER erdwithai'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'erdwithai')\gexec
EOSQL
