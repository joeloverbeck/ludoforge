# VALSEEISS-10: Seed generation special-only policy

**Status: COMPLETED**

## Summary

Replace the hard rejection of "special-bin" seeds in `generateSeedPopulation()` with a configurable three-mode policy (`"allow"`, `"cap"`, `"reject"`). This decouples descriptor bin behavior from seed validity, allowing weird-but-valid edge-case genomes to enter the initial population.

## Dependencies

- None (independent entry point)

## Blocked by

- Nothing

## Blocks

- Nothing (terminal ticket)

## Assumptions reassessed

The following ticket assumptions were corrected against the actual codebase before implementation:

1. **Schema location**: The ticket assumed `schemas/config/evolution-runner.schema.json`. The actual schema is at `schemas/evolution-runner/runner-config.schema.json`, under `$defs/SeedingCoverageConfig`.
2. **Config file**: The ticket assumed `configs/evolution-runner.json` needs a `specialOnly` default. In reality, `configs/evolution-runner.json` contains only runner/artifact metadata — seeding config is part of the runner config passed at runtime. No default config file change needed; the schema `default` values suffice.
3. **`hasSpecialBin` semantics**: The ticket and spec describe "special-only" as seeds where ALL descriptor bins are special. The actual `hasSpecialBin()` function triggers when ANY segment contains a special bin token. This is the existing gate, and the policy replaces it. The function name and behavior are preserved — the policy now governs what happens when `hasSpecialBin` returns true.
4. **Line numbers**: The ticket cites lines 143-149 for the special-bin block. Actual location is lines 143-149 — confirmed correct.
5. **`coverage-policy.js`**: No changes needed — special-only accounting is self-contained in `generate-seed-population.js`.
6. **Default policy**: The ticket proposes `"cap"` as default. For backward compatibility, `"reject"` is the more faithful default (matching current hard-rejection behavior). Implemented as `"reject"` default so existing behavior is unchanged unless explicitly configured.

## File list

### Modified

| File | Change |
|------|--------|
| `src/seed-generation/generate-seed-population.js` | Replace hard special-bin rejection with policy logic |
| `src/evolution-runner/seed-resolver.js` | Pass new config fields to `generateSeedPopulation()` |
| `schemas/evolution-runner/runner-config.schema.json` | Add `specialOnly` to `SeedingCoverageConfig` |
| `test/unit/seed-generation/generate-seed-population.test.mjs` | Update existing tests, add tests for all three policies |

### Not modified (corrected from original ticket)

| File | Reason |
|------|--------|
| `configs/evolution-runner.json` | Seeding config is not stored here; schema defaults suffice |
| `src/seed-generation/coverage-policy.js` | No changes needed; special-only accounting is self-contained |

## Detailed changes

### `src/seed-generation/generate-seed-population.js`

New `specialOnly` parameter with defaults:

```js
specialOnly = {
  policy: "reject",        // backward-compatible default
  maxFraction: 0.10,
  maxCount: Infinity,
  countTowardCoverage: false,
}
```

Replace hard rejection block (lines 143-149) with policy-based logic:

```js
if (hasSpecialBin(nicheId)) {
  specialBinCounts.set(nicheId, (specialBinCounts.get(nicheId) ?? 0) + 1);

  if (specialOnlyPolicy === "reject") {
    rejectedByReason["special-only-bin"] = (rejectedByReason["special-only-bin"] ?? 0) + 1;
    continue;
  }

  if (specialOnlyPolicy === "cap") {
    const maxByFraction = Math.floor(populationSize * specialOnlyMaxFraction);
    const effectiveMax = Math.min(maxByFraction, specialOnlyMaxCount);
    if (acceptedSpecialOnly >= effectiveMax) {
      rejectedByReason["special-only-cap"] = (rejectedByReason["special-only-cap"] ?? 0) + 1;
      specialOnlyCapHit = true;
      continue;
    }
  }

  // policy === "allow" or "cap" with room remaining
  seenIds.add(id);
  genomes.push(genome);
  acceptedSpecialOnly += 1;

  if (specialOnlyCountTowardCoverage) {
    binCounts.set(nicheId, (binCounts.get(nicheId) ?? 0) + 1);
  }
  continue;
}
```

Report additions: `acceptedSpecialOnly`, `specialOnlyCapHit`.

Rejection reason renamed from `"special-bin"` to `"special-only-bin"`.

### `src/evolution-runner/seed-resolver.js`

Pass `specialOnly` from config:

```js
specialOnly: generateConfig.coverage.specialOnly,
```

### Schema (`schemas/evolution-runner/runner-config.schema.json`)

Add `specialOnly` to `SeedingCoverageConfig`:

```json
"specialOnly": {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "policy": { "type": "string", "enum": ["allow", "cap", "reject"], "default": "reject" },
    "maxFraction": { "type": "number", "minimum": 0, "maximum": 1, "default": 0.10 },
    "maxCount": { "type": "integer", "minimum": 0, "default": 2147483647 },
    "countTowardCoverage": { "type": "boolean", "default": false }
  }
}
```

## Out of scope

- MAP-Elites grid changes
- Descriptor computation changes
- Evaluation pipeline changes
- Mixed-mode seeding (folder seeds are not subject to this policy)
- Fallback strategy changes

## Acceptance criteria

### Tests

1. **policy="allow" accepts all special-bin seeds**
2. **policy="reject" rejects all special-bin seeds** (backward-compatible default)
3. **policy="cap" enforces maxFraction**
4. **policy="cap" enforces maxCount**
5. **cap uses min(maxFraction*size, maxCount)**
6. **countTowardCoverage=false: special-bin seeds don't fill binCounts**
7. **countTowardCoverage=true: special-bin seeds fill binCounts**
8. **specialOnlyCapHit reported when cap reached**
9. **determinism: same rngSeed produces same results**
10. **backward compat: no specialOnly param = reject (matches previous behavior)**

### Invariants

- Seed validity is defined ONLY by schema + semantic validation — descriptor bins never reject (unless policy="reject")
- With `policy="cap"`: `acceptedSpecialOnly <= floor(populationSize * maxFraction)` AND `<= maxCount`
- Special-only seeds with `countTowardCoverage=false` do not interfere with coverage targets
- `report.rejectedByReason` no longer has `"special-bin"` key — replaced by `"special-only-bin"` and `"special-only-cap"`
- Deterministic with same RNG seed

## Outcome

### What was actually changed vs originally planned

**Changed as planned:**
- `src/seed-generation/generate-seed-population.js`: Added `specialOnly` parameter with `policy`/`maxFraction`/`maxCount`/`countTowardCoverage`. Replaced hard `"special-bin"` rejection with policy-based logic (reject/cap/allow). Added `acceptedSpecialOnly` and `specialOnlyCapHit` to report.
- `src/evolution-runner/seed-resolver.js`: Passes `specialOnly` config from `generateConfig.coverage.specialOnly` in both `resolveGenerate()` and `resolveMixed()`.
- `schemas/evolution-runner/runner-config.schema.json`: Added `specialOnly` object to `SeedingCoverageConfig`.
- `test/unit/seed-generation/generate-seed-population.test.mjs`: Updated existing tests for renamed rejection reason. Added 13 new tests covering all three policies, cap enforcement, countTowardCoverage, determinism, backward compatibility.

**Deviated from plan:**
- Default policy set to `"reject"` instead of `"cap"` — for strict backward compatibility with the previous hard-rejection behavior.
- Schema location corrected from `schemas/config/evolution-runner.schema.json` to `schemas/evolution-runner/runner-config.schema.json`.
- `configs/evolution-runner.json` was NOT modified — seeding config is not stored there; schema defaults suffice.
- `coverage-policy.js` was NOT modified — special-only accounting is self-contained in the generation function.
