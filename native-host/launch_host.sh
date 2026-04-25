#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PY="${SCRIPT_DIR}/.venv/bin/python3"
HOST_SCRIPT="${SCRIPT_DIR}/htb_discord_host.py"

if [[ ! -x "${VENV_PY}" ]]; then
  echo "Python virtualenv not found. Run install_native_host.sh first." >&2
  exit 1
fi

exec "${VENV_PY}" "${HOST_SCRIPT}"
