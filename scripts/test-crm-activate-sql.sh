#!/usr/bin/env bash
# Prueba la RPC crm_activate_barbershop en un Postgres descartable. No toca Supabase.
#
# Con TEST_DATABASE_URL usa esa base, que tiene que ser descartable y vacía
# (por ejemplo, una rama temporal de Neon). Si no, usa Docker si responde, o un
# cluster temporal con el Postgres instalado (initdb/pg_ctl en el PATH); en esos
# dos casos se borra al terminar.
set -euo pipefail
cd "$(dirname "$0")/.."

ARCHIVOS=(
  scripts/sql/crm-activate-stub.sql
  supabase/migrations/20260707120000_barber_billing.sql
  supabase/migrations/20260915120000_crm_activate.sql
  scripts/sql/test-crm-activate.sql
)

if [ -n "${TEST_DATABASE_URL:-}" ]; then
  cat "${ARCHIVOS[@]}" | psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -q
elif timeout 10 docker info >/dev/null 2>&1; then
  NAME=tijerapp-crm-activate-sql
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test postgres:16 >/dev/null
  trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT
  until docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
  cat "${ARCHIVOS[@]}" | docker exec -i "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q
elif command -v initdb >/dev/null 2>&1; then
  DATOS="$(mktemp -d)"
  PUERTO=5499
  trap 'pg_ctl -D "$DATOS" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATOS"' EXIT
  initdb -U postgres -A trust -E UTF8 -D "$DATOS" >/dev/null
  pg_ctl -D "$DATOS" -o "-p $PUERTO -c listen_addresses=127.0.0.1" -l "$DATOS/server.log" -w start >/dev/null
  cat "${ARCHIVOS[@]}" | psql -h 127.0.0.1 -p "$PUERTO" -U postgres -v ON_ERROR_STOP=1 -q
else
  echo "Hace falta Docker o un Postgres instalado (initdb en el PATH)." >&2
  exit 2
fi
