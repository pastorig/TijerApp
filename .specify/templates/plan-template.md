# Implementation Plan: [FEATURE NAME]

**Branch**: `[branch-name]`
**Spec**: [Link to spec.md]
**Created**: [YYYY-MM-DD]
**Status**: Draft

## Architecture Overview

[High-level approach in 2-3 paragraphs. What is the strategy? What are the key technical decisions?]

## Stack Decisions

| Concern | Decision | Rationale |
|---|---|---|
| [Concern, e.g. State management] | [Chosen approach] | [Why this fits] |
| [Concern, e.g. Data storage] | [Chosen approach] | [Why this fits] |
| [Concern, e.g. Error handling] | [Chosen approach] | [Why this fits] |

## File-Level Changes

### New Files

- `src/path/to/NewFile.tsx` — [purpose]
- `src/path/to/NewFile.ts` — [purpose]
- `supabase/migrations/[timestamp]_[name].sql` — [purpose, if migration needed]

### Modified Files

- `src/path/to/Existing.tsx` — [what changes and why]
- `src/path/to/Existing.ts` — [what changes and why]

### Deleted Files

[Only if applicable]

- `src/path/to/Old.tsx` — [reason for deletion]

## Data Model Changes

[Only if feature involves DB schema]

### New Tables / Columns

```sql
-- Example
alter table public.barbershops
  add column if not exists new_field boolean not null default false;
```

### RLS Policies

- [New policy name]: [purpose and conditions]

### Indexes

- [Index purpose and definition]

## API Surface

[Only if new endpoints or contract changes]

### New Endpoints

- `POST /api/[path]` — [purpose, payload shape, response]
- `GET /api/[path]` — [purpose, response shape]

### Modified Endpoints

- `PATCH /api/[path]` — [what changes]

## UI / UX

### Component Hierarchy

```
ParentComponent
├── NewComponent (this feature)
│   ├── ChildA
│   └── ChildB
└── ExistingComponent (modified)
```

### Key Interactions

- [Interaction 1]: [user action → system response]
- [Interaction 2]: [user action → system response]

## Testing Strategy

- **Build verification**: lint + build clean
- **Manual smoke tests**: [list 3-5 critical paths to verify]
- **Edge cases to verify**: [from spec edge cases]

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| [Risk 1] | [How to address] |
| [Risk 2] | [How to address] |

## Rollback Plan

[If feature breaks production, how to revert quickly]

- Revert commit `[hash placeholder]` on main
- Migration rollback: [SQL or "down" migration if needed]
- Feature flag (if applicable): [flag name and default]

## Next Steps

- Run **speckit-tasks** to decompose this plan into a dependency-ordered task list
