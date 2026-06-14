#!/bin/bash
# Deploy the MasterWriter panel (admin/) to the cPanel host via FTP.
# Usage: ./deploy-panel.sh <ftp-host> <ftp-username> [remote-dir]
# remote-dir defaults to "authorspanel" — the subdomain's document root.
# Prompts for the FTP password interactively (not stored anywhere).
# The on-host data/ folder (SQLite user DB) and config.php (GitHub token,
# gitignored, set up once on the host) are never touched.

set -e

HOST="$1"
USER="$2"
REMOTE="${3:-authorspanel}"

if [ -z "$HOST" ] || [ -z "$USER" ]; then
  echo "Usage: ./deploy-panel.sh <ftp-host> <ftp-username> [remote-dir]"
  exit 1
fi

read -s -p "FTP password for $USER@$HOST: " PASS
echo

lftp -u "$USER,$PASS" "$HOST" <<EOF
set net:timeout 15
set net:max-retries 2
cd $REMOTE

mirror -R --verbose \
  --exclude-glob .DS_Store \
  --exclude-glob data/ \
  --exclude-glob README.md \
  --exclude-glob config.php \
  admin .

bye
EOF

echo "Done."
