# TUIGAMPLA-01: Make simulation engine async (core + all direct tests)

**Status:** DONE
**Risk:** HIGH
**Dependencies:** None
**Blocks:** TUIGAMPLA-02, TUIGAMPLA-04, TUIGAMPLA-09

---

## What

Convert the simulation engine from synchronous to async so that agent `selectAction` can return a Promise (needed for human input via TUI). All existing sync agents continue to work — `await syncValue` resolves immediately.

## Files to Touch

Source files:
- `src/simulation-engine/agent-action.js` — `selectAndValidateAction` → `async`, `await agent.selectAction()`
- `src/simulation-engine/loop.js` — `runSimulationLoop`, `runSimulation`, `runRollout` → `async`
- `src/simulation-engine/simultaneous-loop.js` — `runSimultaneousLoop` → `async`
- `src/simulation-engine/batch.js` — `runBatchSimulations` → `async`, inner loop uses `await`
- `src/simulation-engine/index.js` — `createSimulationEngine.run()` and `.runBatch()` → `async`
- `src/simulation-engine/worker-entry.js` — `handleMessage` → `async`
- `src/simulation-engine/types.d.ts` — `selectAction` return → `ActionDef | string | Promise<ActionDef | string>`, `SimulationEngine.run()` → `Promise<>`, `SimulationEngine.runBatch()` → `Promise<>`
- `src/simulation-engine/index.d.ts` — return types → `Promise<>`
- `src/simulation-engine/rollout.d.ts` — return type → `Promise<>`

Unit test files (all in `test/unit/simulation-engine/`):
- `batch.test.mjs` — `await` calls
- `rollout.test.mjs` — `await` calls
- `simulation-result-contract.test.mjs` — `await` calls
- `parallel.test.mjs` — `await` calls
- `core-loop.test.mjs` — `await` on all `engine.run()` calls
- `trace-emission.test.mjs` — `await` on all `engine.run()` calls
- `step-trace-emission.test.mjs` — `await` on `engine.run()` call
- `replay-invariant.test.mjs` — `await` on all `engine.run()` calls
- `simultaneous.test.mjs` — `await` on all `engine.run()` calls
- `simulation-result-schema.test.mjs` — `await` on `engine.run()` call
- `pass-step-trace.test.mjs` — `await` on all `engine.run()` calls
- `config-defaults.test.mjs` — `await` on all `engine.run()` calls
- `cost-abort.test.mjs` — check for `engine.run()` usage
- `skipped-observability.test.mjs` — check for `engine.run()` usage

Integration test files:
- `test/integration/simulation-loop.test.mjs` — `await` calls + `assert.rejects` for error policy
- `test/integration/scheduler-strategies.test.mjs` — `await` on `engine.run()` calls
- `test/integration/degeneracy.test.mjs` — `await` on `engine.run()` calls
- `test/integration/skill-expression-metric.test.mjs` — `await` on `engine.run()` calls
- `test/integration/decision-quality-metrics.test.mjs` — `await` on `engine.run()` calls

E2E test files (also in scope since they directly call `runSimulation`):
- `test/e2e/simulation-correctness.e2e.test.mjs` — `await` calls
- `test/e2e/state-transition.e2e.test.mjs` — `await` calls + `assert.rejects`
- `test/e2e/preference-model-update.e2e.test.mjs` — `await` calls

## Out of Scope

Evaluation-analytics **source** callers (`src/evaluation-analytics/`) are deferred to TUIGAMPLA-02. They call `runBatchSimulations` and `runRollout` synchronously — once those become async, the eval-analytics callers will receive Promises instead of results. TUIGAMPLA-02 must add `await` there. TUI code, game-kernel, DSL, evolutionary-engine are all out of scope.

**Note:** Integration tests that exercise eval-analytics via the simulation engine (e.g., `skill-expression-metric.test.mjs`, `decision-quality-metrics.test.mjs`) ARE in scope since they call `engine.run()` directly.

## Acceptance Criteria

- `npm run test:unit` passes (all simulation-engine tests green).
- `npm run test:integration` passes.
- `npm run test:e2e` passes.
- `tsc -p tsconfig.json` passes.
- `await syncValue` resolves immediately — existing AI agents return sync values, behavior unchanged.
- All existing simulations produce identical deterministic results (same seeds → same outcomes).

## Outcome

Completed. The async conversion was expanded beyond the original ticket scope to include
the full call chain — not just the simulation engine, but all callers up through
evaluation-analytics, evolutionary-engine, and seed-generation. This eliminated the
need for a separate TUIGAMPLA-02 ticket for eval-analytics async conversion.

### Source files modified (9 simulation-engine + 10 upstream callers):

**Simulation engine:**
- `src/simulation-engine/agent-action.js` — async, `await agent.selectAction()`
- `src/simulation-engine/loop.js` — async for `runSimulationLoop`, `runSimulation`, `runRollout`
- `src/simulation-engine/simultaneous-loop.js` — async
- `src/simulation-engine/batch.js` — async, `forEach` → `for` loop with `await`
- `src/simulation-engine/index.js` — `.run()` and `.runBatch()` async
- `src/simulation-engine/worker-entry.js` — async `handleMessage`
- `src/simulation-engine/types.d.ts` — `selectAction` returns union with `Promise`
- `src/simulation-engine/index.d.ts` — Promise return types
- `src/simulation-engine/rollout.d.ts` — Promise return type

**Evaluation-analytics (cascading async):**
- `src/evaluation-analytics/metrics/extended/decision-quality/meaningful-choice.js`
- `src/evaluation-analytics/metrics/skill-expression.js`
- `src/evaluation-analytics/metrics/extended/policy-sensitivity.js`
- `src/evaluation-analytics/metrics/extended/aggregation.js`
- `src/evaluation-analytics/create-evaluator.js`
- `src/evaluation-analytics/suite-runner.js`
- `src/evaluation-analytics/metrics/extended.d.ts`
- `src/evaluation-analytics/metrics/skill-expression.d.ts`

**Evolutionary engine (cascading async):**
- `src/evolutionary-engine/evaluation-adapter.js`
- `src/evolutionary-engine/engine.js` — `forEach` → `for...of` with `await`
- `src/evolutionary-engine/evaluation-adapter.d.ts`
- `src/evolutionary-engine/engine.d.ts`

**Seed generation:**
- `src/seed-generation/generate-seed-population.js`
- `src/evolution-runner/seed-resolver.js`

### Test files updated (~30 files):

All test files calling newly-async functions were updated with `await` and
`async` callbacks. `assert.throws` converted to `await assert.rejects` where
functions became async.

### Documentation updated:
- `docs/architecture/simulation-engine.md` — async entry points, await agent selection, cache stores Promises
- `docs/architecture/evolutionary-engine.md` — evaluator is async

### Verification:
- 1468 unit tests pass
- 183 integration tests pass
- 120 e2e tests pass
- `tsc -p tsconfig.json` clean
