#!/usr/bin/env bash
# setup-plan.sh — inicializa el plan.md de la feature actual (basado en el branch).
# Devuelve JSON con paths que speckit-plan necesita.

set -euo pipefail

JSON_OUTPUT=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --json) JSON_OUTPUT=true; shift ;;
    *) shift ;;
  esac
done

# Branch actual debe ser <NNN>-<short-name> (creado por create-new-feature.sh)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ ! "$BRANCH" =~ ^[0-9]+- ]]; then
  echo "ERROR: branch actual '$BRANCH' no parece ser una feature branch (esperado: NNN-short-name)"
  echo "Hint: corré speckit-specify primero o cambiá a la feature branch correspondiente."
  exit 1
fi

FEATURE_DIR="specs/${BRANCH}"
FEATURE_SPEC="${FEATURE_DIR}/spec.md"
IMPL_PLAN="${FEATURE_DIR}/plan.md"

if [[ ! -f "$FEATURE_SPEC" ]]; then
  echo "ERROR: no encontré $FEATURE_SPEC"
  echo "Hint: corré speckit-specify primero para crear la spec."
  exit 1
fi

# Si plan.md ya no existe, copiar el template e inicializar placeholders
if [[ ! -f "$IMPL_PLAN" ]]; then
  cp .specify/templates/plan-template.md "$IMPL_PLAN"
  TODAY=$(date +%Y-%m-%d)
  sed -i.bak \
    -e "s|\[branch-name\]|${BRANCH}|g" \
    -e "s|\[YYYY-MM-DD\]|${TODAY}|g" \
    -e "s|\[Link to spec.md\]|spec.md|g" \
    "$IMPL_PLAN"
  rm -f "${IMPL_PLAN}.bak"
fi

if [[ "$JSON_OUTPUT" == true ]]; then
  cat <<EOF
{
  "BRANCH": "${BRANCH}",
  "FEATURE_SPEC": "${FEATURE_SPEC}",
  "IMPL_PLAN": "${IMPL_PLAN}",
  "SPECS_DIR": "${FEATURE_DIR}"
}
EOF
else
  echo "BRANCH:        ${BRANCH}"
  echo "FEATURE_SPEC:  ${FEATURE_SPEC}"
  echo "IMPL_PLAN:     ${IMPL_PLAN}"
  echo "SPECS_DIR:     ${FEATURE_DIR}"
fi
