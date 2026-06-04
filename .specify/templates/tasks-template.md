# Tasks: [FEATURE NAME]

**Branch**: `[branch-name]`
**Spec**: [Link to spec.md]
**Plan**: [Link to plan.md]
**Created**: [YYYY-MM-DD]
**Status**: Ready

## Conventions

- Each task is **atomic** (1 file or 1 logical unit of change).
- Tasks marked **[BLOCKING]** must complete before any dependent task starts.
- Tasks marked **[P]** can run in parallel with peers at the same level.
- Each task has explicit **acceptance criteria** for completion.

## Dependency Graph

```
T001 [BLOCKING] → T002 [P] T003 [P] → T004 [BLOCKING] → T005 [P] T006 [P]
                                                       → T007
```

## Tasks

### Phase 1: Foundation [BLOCKING]

#### T001: [Task name]

- **Files**: `path/to/file.ext`
- **Description**: [What this task does and why it must be first]
- **Acceptance criteria**:
  - [ ] [Criterion 1]
  - [ ] [Criterion 2]
- **Dependencies**: None

### Phase 2: Core Implementation

#### T002 [P]: [Task name]

- **Files**: `path/to/file.ext`
- **Description**: [What this task does]
- **Acceptance criteria**:
  - [ ] [Criterion 1]
  - [ ] [Criterion 2]
- **Dependencies**: T001

#### T003 [P]: [Task name]

- **Files**: `path/to/file.ext`
- **Description**: [What this task does]
- **Acceptance criteria**:
  - [ ] [Criterion 1]
- **Dependencies**: T001

### Phase 3: Integration [BLOCKING]

#### T004 [BLOCKING]: [Task name]

- **Files**: `path/to/file.ext`
- **Description**: [Wiring everything together]
- **Acceptance criteria**:
  - [ ] [Criterion 1]
  - [ ] [Criterion 2]
- **Dependencies**: T002, T003

### Phase 4: Polish & Verification

#### T005 [P]: [Task name]

- **Files**: [varies]
- **Description**: [E.g. styling, edge cases]
- **Acceptance criteria**:
  - [ ] [Criterion 1]
- **Dependencies**: T004

#### T006 [P]: Lint + build verification

- **Description**: Run `npm run lint && npm run build` — both must pass clean
- **Acceptance criteria**:
  - [ ] Lint: 0 errors, 0 warnings
  - [ ] Build: success
- **Dependencies**: T004

#### T007: Smoke test critical paths

- **Description**: Manual verification per the testing strategy in plan.md
- **Acceptance criteria**:
  - [ ] [Critical path 1] works as expected
  - [ ] [Critical path 2] works as expected
- **Dependencies**: T005, T006

## Completion Criteria

- All tasks ✅
- Lint + build clean
- Smoke tests pass
- Spec acceptance scenarios verified

## Next Steps

- Run **speckit-implement** to execute these tasks
