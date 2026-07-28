#!/usr/bin/env bash
set -Eeuo pipefail

APP_DATA_VOLUME="${APP_DATA_VOLUME:-english-training-cabin_app-data}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-english-training-cabin-postgres-1}"

remaining_restore_databases="$(docker exec "${POSTGRES_CONTAINER}" sh -lc '
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At <<SQL
select datname from pg_database where datname like '"'"'english_training_restore_%'"'"';
SQL
')"

if [[ -n "${remaining_restore_databases}" ]]; then
  printf 'temporary restore databases were not removed:\n%s\n' "${remaining_restore_databases}" >&2
  exit 1
fi

docker run --rm -v "${APP_DATA_VOLUME}:/data:ro" alpine:3.20 \
  sh -lc 'test -s /data/data-protection-status.json && cat /data/data-protection-status.json'

latest_backup="$(find /opt/english-training-cabin/backups/scheduled -mindepth 1 -maxdepth 1 -type d -name 'scheduled-*' -printf '%f\n' | sort | tail -1)"
if [[ -z "${latest_backup}" ]]; then
  printf 'no scheduled backup directory found\n' >&2
  exit 1
fi

printf '\nlatest_backup=%s\n' "${latest_backup}"
