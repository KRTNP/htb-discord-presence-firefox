#!/usr/bin/env bash
set -euo pipefail

EXTENSION_ID="${1:-htb-presence@local}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST_DIR="${PROJECT_DIR}/native-host"
VENV_DIR="${HOST_DIR}/.venv"
LAUNCHER="${HOST_DIR}/launch_host.sh"
MANIFEST_NAME="com.htb.discord.presence.json"
TARGET_DIR="${HOME}/.mozilla/native-messaging-hosts"
TARGET_MANIFEST="${TARGET_DIR}/${MANIFEST_NAME}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 not found. Install it first: sudo apt install -y python3 python3-venv" >&2
  exit 1
fi

mkdir -p "${TARGET_DIR}"

python3 -m venv "${VENV_DIR}"
"${VENV_DIR}/bin/pip" install --upgrade pip >/dev/null
"${VENV_DIR}/bin/pip" install -r "${HOST_DIR}/requirements.txt" >/dev/null

chmod +x "${HOST_DIR}/htb_discord_host.py" "${LAUNCHER}"

cat > "${TARGET_MANIFEST}" <<EOF
{
  "name": "com.htb.discord.presence",
  "description": "Hack The Box Discord Presence native host",
  "path": "${LAUNCHER}",
  "type": "stdio",
  "allowed_extensions": [
    "${EXTENSION_ID}"
  ]
}
EOF

echo "Installed native host manifest: ${TARGET_MANIFEST}"
echo "Allowed extension ID: ${EXTENSION_ID}"
