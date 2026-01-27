# DSL-001: Define core DSL TypeScript types

## Goal
Create the canonical TypeScript AST types for the DSL, reflecting specs/dsl.md, and export them from a single module.

## File list (expected to touch)
- src/dsl/types.ts
- src/dsl/index.ts
- tsconfig.json
- test/dsl/types.test.ts

## Out of scope
- JSON Schema generation or validation
- Semantic validation (cross-reference checks, invariants)
- Serialization or parsing logic
- Any runtime execution/kernel integration

## Assumptions & scope update
- The repo is currently documentation-only; there is no existing `src/` or `test/` tree or JS/TS toolchain config.
- TypeScript is available via the global `tsc` binary (no npm install required).
- Tests will be compile-time type checks (no runtime DSL execution), so the test command is `tsc -p tsconfig.json`.

## Acceptance criteria
### Specific tests that must pass
- `tsc -p tsconfig.json`

### Invariants that must remain true
- Types must mirror the JSON structure in specs/dsl.md (no additional fields beyond spec unless explicitly marked as optional future extension).
- `GameDefinition.version` remains a string and is required.
- All IDs (`id` fields) are strings and required where present in the spec.

## Notes
- Prefer discriminated unions for `Expr`, `Ref`, `Effect` kinds.
- Use `export type` and `export interface` (ESM-compatible TypeScript).
- Include minimal doc comments only where it reduces ambiguity (e.g., `scope`, `kind`).

## Status
- Completed (2026-01-27)

## Outcome
- Added `src/dsl/types.ts` and `src/dsl/index.ts` plus `tsconfig.json` and type-level tests in `test/dsl/types.test.ts`.
- Updated the test command to `tsc -p tsconfig.json` to reflect the repo's compile-time-only checks.
