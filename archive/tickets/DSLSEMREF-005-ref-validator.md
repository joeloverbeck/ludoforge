# DSLSEMREF-005: Extract reference validation and usage tracking

## Summary
Move reference validation (var/token/zone/meta/player) and usage tracking into `src/dsl/semantic/ref-validator.js` with explicit, injected indexes and settings. The helper should also cover non-ref string references used by selectors/effects (zone, tokenType, toZone) so usage tracking for zones/token types stays centralized.

## File list (expected to touch)
- src/dsl/semantic/ref-validator.js
- src/dsl/semantic.js

## Out of scope
- No changes to ID/index construction.
- No changes to domain inference or expression evaluation.
- No changes to action analysis or traversal order.

## Acceptance criteria
### Specific tests that must pass
- `npm run test:unit`
- `node --test test/integration/dsl-semantic.test.mjs`

### Invariants that must remain true
- `ref-unknown`, `token-type-unknown`, `zone-unknown`, `token-attribute-unknown`, and `meta-ref-unknown` are emitted exactly as before.
- Unused tracking (`unused-variable`, `unused-token-type`, `unused-zone`) is identical to pre-refactor behavior.
- Meta refs remain allowed only when explicitly enabled.

## Notes
- The helper should own and expose usage sets (`usedVariableIds`, `usedTokenTypeIds`, `usedZoneIds`) or a wrapper API to query them.
- Current reference checks are split between `validateRef` and selector/effect validation; the extraction should unify those checks without changing issue codes or paths.

## Status
Completed — 2026-01-28

## Outcome
- Added `src/dsl/semantic/ref-validator.js` with centralized ref validation and usage tracking.
- Wired selector/effect reference checks in `src/dsl/semantic.js` to the new helper without changing issue codes.
