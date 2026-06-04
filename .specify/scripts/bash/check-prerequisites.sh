#!/usr/bin/env bash
# check-prerequisites.sh — verifica que la feature actual tenga los artifacts
# necesarios para correr speckit-tasks/implement/analyze. Devuelve JSON con
# FEATURE_DIR + lista de docs disponibles.

set -euo pipefail

JSON_OUTPUT=false
REQUIRE_TASKS=false
INCLUDE_TASKS=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --json) JSON_OUTPUT=true; shift ;;
    --require-tasks) REQUIRE_TASKS=true; shift ;;
    --include-tasks) INCLUDE_TASKS=true; shift ;;
    *) shift ;;
  esac
done

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ ! "$BRANCH" =~ ^[0-9]+- ]]; then
  echo "ERROR: branch actual '$BRANCH' no parece ser feature branch (NNN-short-name)" >&2
  exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
FEATURE_DIR="${REPO_ROOT}/specs/${BRANCH}"

if [[ ! -d "$FEATURE_DIR" ]]; then
  echo "ERROR: $FEATURE_DIR no existe" >&2
  exit 1
fi

# Detectar docs disponibles
AVAILABLE_DOCS=()
[[ -f "${FEATURE_DIR}/spec.md" ]]       && AVAILABLE_DOCS+=("spec.md")
[[ -f "${FEATURE_DIR}/plan.md" ]]       && AVAILABLE_DOCS+=("plan.md")
[[ -f "${FEATURE_DIR}/research.md" ]]   && AVAILABLE_DOCS+=("research.md")
[[ -f "${FEATURE_DIR}/data-model.md" ]] && AVAILABLE_DOCS+=("data-model.md")
[[ -f "${FEATURE_DIR}/quickstart.md" ]] && AVAILABLE_DOCS+=("quickstart.md")
[[ -d "${FEATURE_DIR}/contracts" ]]     && AVAILABLE_DOCS+=("contracts/")
[[ -d "${FEATURE_DIR}/checklists" ]]    && AVAILABLE_DOCS+=("checklists/")

# Required docs según fase:
# - tasks: requiere plan.md + spec.md
# - implement: requiere tasks.md
# - analyze: requiere spec + plan + tasks
# La skill que llama decide si lo que devuelvo basta para su caso.

if [[ "$JSON_OUTPUT" == true ]]; then
  DOCS_JSON=$(printf '"%s",' "${AVAILABLE_DOCS[@]}")
  DOCS_JSON="[${DOCS_JSON%,}]"
  cat <<EOF
{
  "BRANCH": "${BRANCH}",
  "FEATURE_DIR": "${FEATURE_DIR}",
  "AVAILABLE_DOCS": ${DOCS_JSON}
}
EOF
else
  echo "BRANCH:          ${BRANCH}"
  echo "FEATURE_DIR:     ${FEATURE_DIR}"
  echo "AVAILABLE_DOCS:  ${AVAILABLE_DOCS[*]}"
fi
