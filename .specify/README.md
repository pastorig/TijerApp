# `.specify/` — Spec-Driven Development

Infraestructura para usar el [GitHub Spec Kit](https://github.com/github/spec-kit)
flow en TijerApp. Habilita las skills `speckit-*` instaladas en Claude Code.

## Estructura

```
.specify/
├── README.md                              ← este archivo
├── templates/
│   ├── spec-template.md                   ← scaffold para spec.md por feature
│   ├── plan-template.md                   ← scaffold para plan.md por feature
│   ├── tasks-template.md                  ← scaffold para tasks.md por feature
│   └── checklist-template.md              ← scaffold para checklists
└── scripts/
    └── bash/
        └── create-new-feature.sh          ← crea branch + spec dir
```

Las specs viven en `specs/<NNN>-<short-name>/` en la raíz del repo
(no dentro de `.specify/`).

## Flujo por feature

1. `/speckit-specify "descripción de la feature"`
2. `/speckit-clarify` (si quedaron areas ambiguas, hasta 5 preguntas)
3. `/speckit-plan` (genera plan.md con design artifacts)
4. `/speckit-tasks` (desglosa plan en tasks.md ordenadas)
5. `/speckit-implement` (ejecuta tasks una por una)

## Setup manual (esta instalación)

Esta infraestructura fue creada manualmente (no via `uvx specify-cli init`)
por incompatibilidad de assets del release oficial al momento del setup.
La estructura sigue el formato estándar de spec-kit y es compatible con
las skills `speckit-*` instaladas en `~/.claude/skills/`.

Si en el futuro querés migrar al CLI oficial, podés correr
`uvx --from specify-cli specify init --here` y mergear lo que traiga
(si los assets ya están disponibles para tu combinación de AI + script type).
