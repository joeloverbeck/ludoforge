# MUTOPEISS-04: Enrich MAP-Elites placement with contribution kind

**Status**: Completed
**Priority**: High
**Depends on**: None
**Blocks**: MUTOPEISS-06

## Summary

`placePopulationInMapElites` currently sets `isElite: boolean` on placements. Extend each placement to include `contributionKind: "filledEmpty" | "improvedElite" | "none"` so telemetry can distinguish niche-filling from elite-improving.

## Files to Touch

- `src/evolutionary-engine/map-elites.js` — add `contributionKind` field to each placement entry
- `src/evolutionary-engine/types.ts` — update `MapElitesPlacement` type
- `src/evolutionary-engine/map-elites.d.ts` — ensure exported types include `contributionKind`

## Out of Scope

- Telemetry integration
- Selection logic
- Config changes
- Runner changes

## Acceptance Criteria

- Updated test: `test/unit/evolutionary-engine/map-elites.test.mjs`
  - First member placed in empty niche → `contributionKind: "filledEmpty"`
  - Higher-fitness member replaces elite → `contributionKind: "improvedElite"`
  - Lower-fitness member doesn't replace → `contributionKind: "none"`
  - Skipped members (missing descriptors) → no `contributionKind` (still in `skipped`)
- Existing E2E tests remain green
- **Invariant**: `isElite` behavior unchanged — only additive field

## Outcome

- Added `contributionKind` to MAP-Elites placements with `filledEmpty`, `improvedElite`, or `none`.
- Updated placement types and unit tests to cover contribution cases and skipped entries.
