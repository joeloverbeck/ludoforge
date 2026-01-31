# VALSEEISS-10: Seed generation special-only policy

## Summary

Replace the hard rejection of "special-bin" seeds in `generateSeedPopulation()` with a configurable three-mode policy (`"allow"`, `"cap"`, `"reject"`). This decouples descriptor bin behavior from seed validity, allowing weird-but-valid edge-case genomes to enter the initial population.

## Dependencies

- None (independent entry point)

## Blocked by

- Nothing

## Blocks

- Nothing (terminal ticket)

## File list

### Modified

| File | Change |
|------|--------|
| `src/seed-generation/generate-seed-population.js` | Replace hard special-bin rejection with policy logic |
| `src/evolution-runner/seed-resolver.js` | Pass new config fields to `generateSeedPopulation()` |
| `schemas/config/evolution-runner.schema.json` | Add `specialOnly` config under `seeding.generate.coverage` (check actual schema location) |
| `configs/evolution-runner.json` | Add default `specialOnly` config |
| `test/unit/seed-generation/generate-seed-population.test.mjs` | Tests for all three policies |

### Possibly modified

| File | Change |
|------|--------|
| `src/seed-generation/coverage-policy.js` | May need changes if special-only accounting affects coverage logic |

## Detailed changes

### Config structure

Add under `seeding.generate.coverage` (or wherever the seeding generate config lives):

```json
"specialOnly": {
  "policy": "cap",
  "maxFraction": 0.10,
  "maxCount": Infinity,
  "countTowardCoverage": false
}
```

### `src/seed-generation/generate-seed-population.js`

Currently (lines 143-149):
```js
if (hasSpecialBin(nicheId)) {
  rejectedByReason["special-bin"] = ...;
  specialBinCounts.set(nicheId, ...);
  continue;
}
```

Replace with policy-based logic:

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

### New parameters

Add to `generateSeedPopulation()` options:

```js
specialOnly = {
  policy: "cap",
  maxFraction: 0.10,
  maxCount: Infinity,
  countTowardCoverage: false,
}
```

### Report additions

Extend the returned `report` object:

```js
report: {
  ...existing,
  rejectedByReason,  // now may include "special-only-bin" and/or "special-only-cap"
  acceptedSpecialOnly,
  specialOnlyCapHit,
}
```

Note: rename existing rejection reason from `"special-bin"` to `"special-only-bin"` for clarity.

### `src/evolution-runner/seed-resolver.js`

In `resolveGenerate()`, pass the new config fields:

```js
const result = await generateSeedPopulation({
  ...existing,
  specialOnly: generateConfig.coverage.specialOnly,
});
```

### Schema

Add `specialOnly` to the seeding generate coverage schema:

```json
"specialOnly": {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "policy": { "type": "string", "enum": ["allow", "cap", "reject"], "default": "cap" },
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

1. **policy="allow" accepts all special-only seeds**
   - Arrange: generator produces seeds that all bin to special bins, policy="allow"
   - Assert: all accepted, `acceptedSpecialOnly === genomes.length`

2. **policy="reject" rejects all special-only seeds**
   - Arrange: same as above, policy="reject"
   - Assert: none accepted from special bins, `rejectedByReason["special-only-bin"] > 0`

3. **policy="cap" enforces maxFraction**
   - Arrange: populationSize=100, maxFraction=0.10, many special-only candidates
   - Assert: `acceptedSpecialOnly <= 10`

4. **policy="cap" enforces maxCount**
   - Arrange: populationSize=100, maxFraction=1.0, maxCount=5
   - Assert: `acceptedSpecialOnly <= 5`

5. **cap uses min(maxFraction*size, maxCount)**
   - Arrange: populationSize=100, maxFraction=0.10, maxCount=5
   - Assert: effective cap is min(10, 5) = 5

6. **countTowardCoverage=false: special-only seeds don't fill bins**
   - Arrange: policy="allow", countTowardCoverage=false
   - Assert: binCounts does NOT include special-bin niches

7. **countTowardCoverage=true: special-only seeds fill bins**
   - Arrange: policy="allow", countTowardCoverage=true
   - Assert: binCounts DOES include special-bin niches

8. **coverage candidates prioritized over special-only**
   - Arrange: mix of normal and special-only candidates, cap policy
   - Assert: normal candidates that satisfy coverage are accepted first

9. **specialOnlyCapHit reported when cap reached**
   - Arrange: more special-only candidates than cap allows
   - Assert: `report.specialOnlyCapHit === true`

10. **determinism: same rngSeed produces same special-only admission order**
    - Arrange: run twice with same seed
    - Assert: identical genomes and report

11. **backward compat: default config matches previous behavior (effectively reject)**
    - Arrange: default config with policy="cap", maxFraction=0.10
    - Assert: at most 10% special-only seeds (previously 0%)

### Invariants

- Seed validity is defined ONLY by schema + semantic validation — descriptor bins never reject
- With `policy="cap"`: `acceptedSpecialOnly <= floor(populationSize * maxFraction)` AND `<= maxCount`
- Coverage filling prioritizes non-special candidates
- Special-only seeds with `countTowardCoverage=false` do not interfere with coverage targets
- `report.rejectedByReason` no longer has `"special-bin"` key — replaced by `"special-only-bin"` and `"special-only-cap"`
- Deterministic with same RNG seed
