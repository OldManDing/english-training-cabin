#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="${APP_ROOT:-/opt/english-training-cabin}"
CURRENT_DIR="${CURRENT_DIR:-${APP_ROOT}/current}"
BACKUP_ROOT="${BACKUP_ROOT:-${APP_ROOT}/backups/scheduled}"
APP_DATA_VOLUME="${APP_DATA_VOLUME:-english-training-cabin_app-data}"
STATUS_FILE_NAME="${STATUS_FILE_NAME:-data-protection-status.json}"
BACKUP_ID="scheduled-$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="${BACKUP_ROOT}/${BACKUP_ID}"
VERIFY_DB="english_training_restore_${RANDOM}_$(date -u +%H%M%S)"
STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
RELEASE="$(basename "$(readlink -f "${CURRENT_DIR}")")"
VERIFY_DB_CREATED=false

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"
cd "${CURRENT_DIR}"

COMPOSE=(docker compose --env-file .env.production -f docker-compose.production.yml -p english-training-cabin)
DATABASE_DUMP="${BACKUP_DIR}/postgres.sql.gz"
APP_DATA_ARCHIVE="${BACKUP_DIR}/app-data.tgz"
SOURCE_COUNTS="${BACKUP_DIR}/source-counts.txt"
RESTORED_COUNTS="${BACKUP_DIR}/restored-counts.txt"
STATUS_FILE="${BACKUP_DIR}/${STATUS_FILE_NAME}"

publish_status() {
  docker run --rm \
    -v "${APP_DATA_VOLUME}:/data" \
    -v "${BACKUP_DIR}:/backup:ro" \
    alpine:3.20 \
    sh -lc "cp '/backup/${STATUS_FILE_NAME}' '/data/${STATUS_FILE_NAME}.tmp' && mv '/data/${STATUS_FILE_NAME}.tmp' '/data/${STATUS_FILE_NAME}'"
}

drop_verify_database() {
  if [[ "${VERIFY_DB_CREATED}" == "true" ]]; then
    "${COMPOSE[@]}" exec -T -e VERIFY_DB="${VERIFY_DB}" postgres \
      sh -lc 'dropdb -U "$POSTGRES_USER" --if-exists "$VERIFY_DB"' >/dev/null 2>&1 || true
    VERIFY_DB_CREATED=false
  fi
}

write_failed_status() {
  local exit_code="$1"
  local completed_at
  completed_at="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
  cat > "${STATUS_FILE}" <<JSON
{"schemaVersion":1,"backupId":"${BACKUP_ID}","release":"${RELEASE}","startedAt":"${STARTED_AT}","completedAt":"${completed_at}","status":"failed","failureCode":${exit_code},"restoreDrill":{"status":"failed","countsMatched":false}}
JSON
  publish_status || true
}

on_error() {
  local exit_code=$?
  drop_verify_database
  write_failed_status "${exit_code}"
  exit "${exit_code}"
}

trap on_error ERR
trap drop_verify_database EXIT

"${COMPOSE[@]}" exec -T postgres sh -lc \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges' \
  | gzip -9 > "${DATABASE_DUMP}"
gzip -t "${DATABASE_DUMP}"
test -s "${DATABASE_DUMP}"

docker run --rm \
  -v "${APP_DATA_VOLUME}:/data:ro" \
  -v "${BACKUP_DIR}:/backup" \
  alpine:3.20 \
  tar -czf /backup/app-data.tgz -C /data .
test -s "${APP_DATA_ARCHIVE}"

read_counts() {
  local database_name="$1"
  "${COMPOSE[@]}" exec -T -e TARGET_DATABASE="${database_name}" postgres sh -lc '
    psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$TARGET_DATABASE" -At <<SQL
select '"'"'organizations='"'"' || count(*) from organizations;
select '"'"'users='"'"' || count(*) from users;
select '"'"'learning_snapshots='"'"' || count(*) from learning_snapshots;
select '"'"'learning_snapshot_versions='"'"' || count(*) from learning_snapshot_versions;
select '"'"'learning_entities='"'"' || count(*) from learning_entities;
select '"'"'learning_entities_practiceDraft='"'"' || count(*) from learning_entities where entity_type = '"'"'practiceDraft'"'"';
select '"'"'sessions='"'"' || count(*) from sessions;
SQL
  '
}

SOURCE_DATABASE="$("${COMPOSE[@]}" exec -T postgres sh -lc 'printf %s "$POSTGRES_DB"')"
read_counts "${SOURCE_DATABASE}" > "${SOURCE_COUNTS}"

"${COMPOSE[@]}" exec -T -e VERIFY_DB="${VERIFY_DB}" postgres \
  sh -lc 'createdb -U "$POSTGRES_USER" -T template0 "$VERIFY_DB"'
VERIFY_DB_CREATED=true
gzip -dc "${DATABASE_DUMP}" \
  | "${COMPOSE[@]}" exec -T -e VERIFY_DB="${VERIFY_DB}" postgres \
      sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$VERIFY_DB"' >/dev/null
read_counts "${VERIFY_DB}" > "${RESTORED_COUNTS}"
diff -u "${SOURCE_COUNTS}" "${RESTORED_COUNTS}"
drop_verify_database

(
  cd "${BACKUP_DIR}"
  sha256sum postgres.sql.gz app-data.tgz source-counts.txt restored-counts.txt > SHA256SUMS
  sha256sum -c SHA256SUMS
)

COMPLETED_AT="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
DATABASE_BYTES="$(stat -c %s "${DATABASE_DUMP}")"
APP_DATA_BYTES="$(stat -c %s "${APP_DATA_ARCHIVE}")"
cat > "${STATUS_FILE}" <<JSON
{"schemaVersion":1,"backupId":"${BACKUP_ID}","release":"${RELEASE}","startedAt":"${STARTED_AT}","completedAt":"${COMPLETED_AT}","status":"passed","databaseBytes":${DATABASE_BYTES},"appDataBytes":${APP_DATA_BYTES},"restoreDrill":{"status":"passed","countsMatched":true}}
JSON
publish_status
touch "${BACKUP_DIR}/.verified-backup"

printf 'BACKUP_ID=%s\nBACKUP_DIR=%s\nRELEASE=%s\n' "${BACKUP_ID}" "${BACKUP_DIR}" "${RELEASE}"
cat "${SOURCE_COUNTS}"
