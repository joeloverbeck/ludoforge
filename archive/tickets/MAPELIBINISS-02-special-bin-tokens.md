# MAPELIBINISS-02 — Support special bin tokens in MAP-Elites binning

**Goal**: Replace clamping with a 3-way pre-check: null/undefined/non-finite -> "unknown", value < min -> "under", value > max -> "over", in-range -> normal bin index.

**Dependencies**: MAPELIBINISS-01 (descriptors can now contain `null` values).

## Files to touch

- `src/evolutionary-engine/map-elites.js`:
  - `binDescriptorValue(value, config)` — Instead of throwing on non-finite, return `"unknown"`. Instead of clamping, check: if `value === null || value === undefined || !Number.isFinite(value)` -> `"unknown"`. If `value < min` -> `"under"`. If `value > max` -> `"over"`. Else compute `t = (value - min) / (max - min)`, return `Math.min(bins - 1, Math.floor(t * bins))`. Return type becomes `number | string`.
  - `getDescriptorCoordinates(descriptors, config)` — Instead of throwing when descriptor value is `undefined`, treat missing/undefined/null values by passing them to `binDescriptorValue` (which will return `"unknown"`).
  - `getNicheId(config, coordinates)` — No code change needed; template literal `${coordinate}` handles integers and strings.
  - `placePopulationInMapElites` — `getDescriptorCoordinates` no longer throws, so members with null descriptor values will now be placed in "unknown" niches instead of crashing. Review: currently members without a `descriptors` property are skipped (line 116-118); this remains.
- `src/evolutionary-engine/map-elites.d.ts` — Update `binDescriptorValue` signature: `value: number | null | undefined` -> returns `number | "unknown" | "under" | "over"`. Update `getDescriptorCoordinates` return type to `ReadonlyArray<number | string>`. Update `getNicheId` coordinates param to `ReadonlyArray<number | string>`.
- `src/evolutionary-engine/types.ts` — Update `MapElitesPlacement.coordinates` from `ReadonlyArray<number>` to `ReadonlyArray<number | string>`. Update `Niche` coordinates generic default similarly.
- `test/unit/evolutionary-engine/map-elites.test.mjs` — Add comprehensive binning tests (see acceptance criteria).

## Out of scope

- `feature-vector.js`, `create-evaluator.js` — already handled in MAPELIBINISS-01.
- `coverage-policy.js`, `generate-seed-population.js` — seed generation changes.
- Schema files, architecture docs.
- Fitness computation, preference model.

## Acceptance criteria

### Tests

- `null` -> `"unknown"`
- `undefined` -> `"unknown"`
- `NaN` -> `"unknown"`
- `Infinity` -> `"unknown"`
- `-Infinity` -> `"unknown"`
- `value < min` -> `"under"`
- `value > max` -> `"over"`
- `value === min` -> `0`
- `value === max` -> `bins - 1`
- midpoint -> expected bin index
- Niche ID serialization: `"x:unknown"`, `"x:under"`, `"x:over"`, `"x:3"`
- `getDescriptorCoordinates` with missing key -> `["unknown"]` (no throw)
- `getDescriptorCoordinates` with `null` value -> `["unknown"]`
- `placePopulationInMapElites` with null descriptor value -> member placed in "unknown" niche (not skipped, not crashed)
- Update existing tests: `binDescriptorValue(-5, descriptor)` now returns `"under"` not `0`. `binDescriptorValue(99, descriptor)` now returns `"over"` not `4`.

### Invariants

- Same inputs -> same nicheId (determinism).
- `placePopulationInMapElites` never throws due to descriptor values (totality/no-crash guarantee).
- Non-finite descriptors are NOT binned as 0 — they produce distinct "unknown" niche coordinate.
- `value === min` -> bin 0. `value === max` -> bin `bins - 1` (edge correctness).
- Config validation still throws on invalid config (`bins <= 0`, `max <= min`, non-finite config values).
- `tsc -p tsconfig.json` passes.
- `npm run test:unit` passes.

## Status: COMPLETED

## Outcome

### What changed vs originally planned

All planned changes were implemented as specified. No discrepancies were found between the ticket assumptions and the actual codebase.

**Code changes (4 files):**
- `src/evolutionary-engine/map-elites.js` — Replaced `binDescriptorValue`'s throw-on-non-finite + clamp behavior with 3-way pre-check returning `"unknown"`, `"under"`, `"over"`, or numeric bin index. Removed unused `clamp()` helper. Changed `getDescriptorCoordinates` from throwing on missing/null descriptor values to returning `"unknown"` coordinates.
- `src/evolutionary-engine/types.ts` — Added `BinToken` type alias (`number | "unknown" | "under" | "over"`). Updated `Niche` generic default and `MapElitesPlacement.coordinates` to use `ReadonlyArray<BinToken>`.
- `src/evolutionary-engine/map-elites.d.ts` — Updated all function signatures to accept/return `BinToken` types.

**Test changes (1 file):**
- `test/unit/evolutionary-engine/map-elites.test.mjs` — Expanded from 5 tests to 27 tests. Replaced old clamp-based assertions. Added full acceptance criteria coverage: all special token cases, niche ID serialization, null/undefined/missing descriptor handling, and totality guarantee for `placePopulationInMapElites`.

**Verification:** `tsc` passes. `npm run test:unit` passes (703/703 tests, 0 failures).
