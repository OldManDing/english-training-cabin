#!/usr/bin/env bash
set -Eeuo pipefail

SERVICE_FILE=/etc/systemd/system/english-training-cabin-backup.service
TIMER_FILE=/etc/systemd/system/english-training-cabin-backup.timer

cat > "${SERVICE_FILE}" <<'UNIT'
[Unit]
Description=English Training Cabin verified backup and restore drill
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/opt/english-training-cabin/current/scripts/production-backup.sh
Nice=10
IOSchedulingClass=best-effort
IOSchedulingPriority=7
UNIT

cat > "${TIMER_FILE}" <<'UNIT'
[Unit]
Description=Run English Training Cabin verified backup daily

[Timer]
OnCalendar=*-*-* 03:30:00 Asia/Shanghai
Persistent=true
RandomizedDelaySec=10m
Unit=english-training-cabin-backup.service

[Install]
WantedBy=timers.target
UNIT

chmod 0644 "${SERVICE_FILE}" "${TIMER_FILE}"
systemctl daemon-reload
systemctl enable --now english-training-cabin-backup.timer
systemctl status english-training-cabin-backup.timer --no-pager
