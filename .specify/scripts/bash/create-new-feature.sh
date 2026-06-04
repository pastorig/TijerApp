#!/usr/bin/env bash
# create-new-feature.sh — crea branch + dir de spec para una feature nueva
# Equivalente manual del script oficial de spec-kit, alineado con las skills
# speckit-* que esperan este formato.
#
# Uso:
#   .specify/scripts/bash/create-new-feature.sh --json --number 1 --short-name "pwa-installable" "PWA instalable para TijerApp..."
#
# Output JSON con:
#   - BRANCH_NAME: <number>-<short-name>
#   - SPEC_FILE:   specs/<number>-<short-name>/spec.md
#   - FEATURE_DIR: specs/<number>-<short-name>

set -euo pipefail

JSON_OUTPUT=false
NUMBER=""
SHORT_NAME=""
DESCRIPTION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json) JSON_OUTPUT=true; shift ;;
    --number) NUMBER="$2"; shift 2 ;;
    --short-name) SHORT_NAME="$2"; shift 2 ;;
    *) DESCRIPTION="$1"; shift ;;
  esac
done

if [[ -z "$NUMBER" || -z "$SHORT_NAME" || -z "$DESCRIPTION" ]]; then
  echo "Usage: $0 --json --number N --short-name 'kebab-name' 'description'"
  exit 1
fi

# Pad number a 3 dígitos (001, 002, ...)
PADDED_NUMBER=$(printf "%03d" "$NUMBER")
BRANCH_NAME="${PADDED_NUMBER}-${SHORT_NAME}"
FEATURE_DIR="specs/${BRANCH_NAME}"
SPEC_FILE="${FEATURE_DIR}/spec.md"

# Crear branch (si no estamos ya en una)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "$BRANCH_NAME" ]]; then
  if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
    git checkout "$BRANCH_NAME" >&2
  else
    git checkout -b "$BRANCH_NAME" >&2
  fi
fi

# Crear directorio de la feature + checklists subdir
mkdir -p "${FEATURE_DIR}/checklists"

# Copiar el template de spec si no existe spec.md ya
if [[ ! -f "$SPEC_FILE" ]]; then
  cp .specify/templates/spec-template.md "$SPEC_FILE"
  # Reemplazar placeholders básicos
  TODAY=$(date +%Y-%m-%d)
  # Usamos sed -i con backup empty para compat macOS/Linux
  sed -i.bak \
    -e "s|\[branch-name\]|${BRANCH_NAME}|g" \
    -e "s|\[YYYY-MM-DD\]|${TODAY}|g" \
    -e "s|\[Original user description\]|${DESCRIPTION}|g" \
    "$SPEC_FILE"
  rm -f "${SPEC_FILE}.bak"
fi

# Output
if [[ "$JSON_OUTPUT" == true ]]; then
  cat <<EOF
{
  "BRANCH_NAME": "${BRANCH_NAME}",
  "SPEC_FILE": "${SPEC_FILE}",
  "FEATURE_DIR": "${FEATURE_DIR}"
}
EOF
else
  echo "Branch:    ${BRANCH_NAME}"
  echo "Spec file: ${SPEC_FILE}"
  echo "Feature:   ${FEATURE_DIR}"
fi
