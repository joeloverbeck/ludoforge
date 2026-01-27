# DSL-005: Deterministic serialization of DSL

## Goal
Implement canonical JSON serialization for DSL objects to support caching and comparison.

## Current state (reassessed)
- There is no existing serializer in `src/dsl/`.
- Runtime modules live in `.js` with accompanying `.d.ts` typings (e.g., `validate.js` + `validate.d.ts`).
- Tests executed via `node --test` are `.mjs` files; TypeScript tests are only type-level via `tsc`.

## File list (expected to touch)
- src/dsl/serialize.js
- src/dsl/serialize.d.ts
- src/dsl/index.ts
- test/dsl/serialize.test.mjs

## Out of scope
- Schema or semantic validation changes
- Parsing a textual DSL
- Any persistence layer

## Acceptance criteria
### Specific tests that must pass
- `node --test test/dsl/serialize.test.mjs`

### Invariants that must remain true
- Serialization is deterministic for equivalent objects (stable key order, no whitespace variance).
- Output is valid JSON and round-trippable via `JSON.parse`.
- Arrays preserve their original order (no sorting of user-provided arrays).

## Notes
- Use a stable key ordering function for objects only.
- Avoid external dependencies unless needed.

## Status
Completed on 2026-01-27.

## Outcome
- Added a stable JSON serializer in `src/dsl/serialize.js` with typings in `src/dsl/serialize.d.ts`.
- Exported the serializer from `src/dsl/index.ts`.
- Added deterministic serialization tests in `test/dsl/serialize.test.mjs`.
- Updated ticket assumptions to match the repo's `.js` runtime + `.d.ts` typings and `.mjs` test pattern.
