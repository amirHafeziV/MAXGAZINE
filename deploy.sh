#!/bin/bash
# Deploy static site to cPanel host via FTP.
# Usage: ./deploy.sh <ftp-host> <ftp-username> [remote-dir]
# Prompts for the FTP password interactively (not stored anywhere).

set -e

HOST="$1"
USER="$2"
REMOTE="${3:-public_html}"

if [ -z "$HOST" ] || [ -z "$USER" ]; then
  echo "Usage: ./deploy.sh <ftp-host> <ftp-username> [remote-dir]"
  exit 1
fi

read -s -p "FTP password for $USER@$HOST: " PASS
echo

lftp -u "$USER,$PASS" "$HOST" <<EOF
set net:timeout 15
set net:max-retries 2
cd $REMOTE

mkdir -p assets
mkdir -p en
mkdir -p fa
mkdir -p ar
mkdir -p tr
mkdir -p content

mirror -R --verbose --exclude-glob .DS_Store assets assets
mirror -R --verbose en en
mirror -R --verbose fa fa
mirror -R --verbose ar ar
mirror -R --verbose tr tr
mirror -R --verbose --exclude-glob .DS_Store content content

put -O . index.html about.html brokers.html chart.html contact.html exchanges.html future.html prices.html stories.html sitemap.xml

bye
EOF

echo "Done."
