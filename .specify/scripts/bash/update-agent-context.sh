#!/usr/bin/env bash
# update-agent-context.sh — placeholder no-op para compatibility con speckit-plan.
# En el flujo oficial, este script actualiza CLAUDE.md / GEMINI.md / etc. con
# context de la feature en progreso. Como en TijerApp ya tenemos AGENTS.md
# (referenciado por CLAUDE.md), no necesitamos un update automático.

set -euo pipefail
AGENT="${1:-claude}"
echo "[update-agent-context] noop for agent='${AGENT}' (AGENTS.md gestionado manualmente)"
exit 0
