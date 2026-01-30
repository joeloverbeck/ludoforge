# AGEENS-03: Simulation run cache

**Status**: DONE

**Goal**: In-memory cache keyed by `(genomeId, suiteId, seed)` to prevent duplicate simulations.

**Description**: Create a `createRunCache()` factory returning `{ getOrRun(key, runFn) }`. Key is a string composite. Cache is scoped per evaluator invocation (not cross-genome). The `runFn` is only called once per unique key.

**Files touched**:
- `src/simulation-engine/run-cache.js` (new)
- `test/unit/simulation-engine/run-cache.test.mjs` (new)

**Out of scope**:
- No integration with evaluator
- No persistence / disk caching
- No cross-genome caching

**Acceptance criteria**:
- [x] Tests: `node --test test/unit/simulation-engine/run-cache.test.mjs` passes
- [x] Cache returns identical object reference on second call with same key
- [x] `runFn` called exactly once per unique key (verified by counter)
- [x] Different keys invoke `runFn` independently
- [x] Invariant: all existing tests unaffected

**Dependencies**: None
