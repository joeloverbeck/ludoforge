# AGEENS-02: Deterministic seed derivation utility

**Status**: DONE

**Goal**: Provide a pure, deterministic `deriveSeed(baseSeed, ...components)` function for per-suite and per-metric seed derivation.

**Description**: Create a utility that hashes a base seed with arbitrary string/number components into a deterministic uint32. Uses FNV-1a hash. Will replace ad-hoc seed construction patterns.

**Files touched**:
- `src/simulation-engine/seed-derivation.js` (new)
- `test/unit/simulation-engine/seed-derivation.test.mjs` (new)

**Out of scope**:
- No refactoring of existing `buildSeed()` callers in `sampling-utils.js`
- No suite integration
- No evaluator changes

**Acceptance criteria**:
- [x] Tests: `node --test test/unit/simulation-engine/seed-derivation.test.mjs` passes
- [x] `deriveSeed(42, "suite", "random-only", 0)` returns consistent uint32 across calls
- [x] Different component tuples produce different seeds (collision test on 1000 samples)
- [x] Output is always a non-negative 32-bit integer
- [x] Invariant: all existing tests unaffected

**Dependencies**: None
