# DIVTERISS-03: Update docs to remove false diversity-in-fitness claims

**Status: COMPLETED**

## What

Architecture docs claim diversity pressure blends into fitness. Remove those claims, update the formula, and document where diversity actually lives.

## Files to touch

- `docs/architecture/metrics-and-fitness.md` — rewrite "Fitness Blend" section (lines 268-294): remove `diversityPressure * diversityWeight` paragraph, update formula to `(base + preference) * (1 - penalty)`, state that diversity is maintained by MAP-Elites niche placement, shortlist L1-distance diversification, structural_complexity descriptor, and active-learning diversityQuota
- `docs/architecture/pipeline-overview.md` — line 74: change to "Composite score + preference score blend into fitness." Line 76: change to "Config: `configs/fitness.json` (weights, preference blending)."

## Out of scope

All source code, all tests, `configs/`, `schemas/`, any historical/archived docs

## Acceptance criteria

- `metrics-and-fitness.md` does NOT contain "diversityPressure", "diversityWeight", or "diversity contribution"
- `pipeline-overview.md` does NOT mention "diversity pressure" in fitness context
- Fitness formula in docs reads: `(base + preference) * (1 - penalty)`
- Docs list MAP-Elites, shortlist selection, structural_complexity descriptor, and active-learning diversityQuota as actual diversity mechanisms

## Dependencies

DIVTERISS-01, DIVTERISS-02

## Outcome

**Changed vs originally planned:** Exactly as planned — docs-only changes.

1. **`docs/architecture/metrics-and-fitness.md`**: Removed the "Diversity contribution uses defaults from `configs/fitness.json`: `diversityPressure * diversityWeight`" bullet. Updated the fitness formula from `(base + diversity + preference) * (1 - clamp(penalty, 0, 1))` to `(base + preference) * (1 - clamp(penalty, 0, 1))`. Added a paragraph listing the four actual diversity mechanisms (MAP-Elites niche placement, shortlist L1-distance diversification, `structural_complexity` descriptor, active-learning `diversityQuota`). Also fixed the config description line to say "preference blending defaults" instead of "preference/diversity blending defaults".

2. **`docs/architecture/pipeline-overview.md`**: Changed fitness computation description from "Composite score + preference score + diversity pressure blend into fitness" to "Composite score + preference score blend into fitness". Changed config note from "(weights, diversity pressure, preference blending)" to "(weights, preference blending)".

No code changes, no test changes. All 991 unit tests pass.
