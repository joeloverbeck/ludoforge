# SEEGEN-06: CLI update — make --seeds optional

**Status: COMPLETED**

## Summary

Update `src/cli/ludoforge-evolve.js` so `--seeds` is no longer required when the runner config has a `seeding` block. When `--seeds` is provided, it overrides config-based seeding (legacy behavior). Update help text.

## Files to touch

- `src/cli/ludoforge-evolve.js` — make `--seeds` conditional
- `test/unit/cli/ludoforge-evolve.test.mjs` — add/update tests

## Out of scope

- Doc updates (SEEGEN-07)
- New CLI flags
- Changes to resume flow

## Acceptance criteria

### Tests that must pass
- Config with `seeding` block + no `--seeds` → CLI proceeds (uses config-based seeding) ✅
- `--seeds <path>` provided → takes precedence, loads from path as before ✅
- Config without `seeding` block + no `--seeds` → clear error message ✅
- Help text says `--seeds` is optional ✅
- Dry-run reports `populationSize` from seeding config when `--seeds` not used ✅
- `npm run test:unit` passes (606/606) ✅
- `tsc -p tsconfig.json` passes ✅

### Invariants
- Existing `--seeds` behavior unchanged when flag is provided ✅
- Resume flow unchanged ✅

## Outcome

### What changed vs originally planned

The ticket assumptions were accurate — no corrections needed. The implementation matched the plan exactly:

**`src/cli/ludoforge-evolve.js`** — Two changes:
1. **Help text**: Moved `--seeds` from "Required" to "Options", updated usage line to show `[--seeds <path>]`, added "(overrides config seeding)" hint.
2. **New-run logic**: Restructured the `--seeds` / seeding-block flow. When `--seeds` is provided, it takes precedence (loads from file, passes `population` to runner). When absent, checks for `config.seeding` — if present, delegates to runner (which calls `resolveSeedPopulation`); if absent, throws a clear error naming both options. Dry-run in the config-seeding path reads `populationSize` from `config.seeding.populationSize`.

**`test/unit/cli/ludoforge-evolve.test.mjs`** — Added 5 new tests (10 → 15 total in file):
1. `proceeds without --seeds when config has seeding block`
2. `--seeds takes precedence over config seeding`
3. `errors when no --seeds and config has no seeding block`
4. `dry-run reports populationSize from config seeding when --seeds not used`
5. `help text shows --seeds as optional`

No other files were modified. No public API changes. Resume flow untouched.
