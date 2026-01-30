# DIVTERISS-03: Update docs to remove false diversity-in-fitness claims

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
