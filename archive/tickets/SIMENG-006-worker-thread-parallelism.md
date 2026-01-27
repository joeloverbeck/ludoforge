# SIMENG-006: Worker-thread batch parallelism

## Summary
Add optional worker-thread execution to run batches in parallel while keeping deterministic seeds per simulation.

## Reality check (pre-work)
- The simulation engine currently runs batches synchronously in `src/simulation-engine/batch.js` with no worker support.
- There is no `worker-pool.js`, `worker-entry.js`, or `test/simulation-engine/parallel.test.mjs` yet.
- `SimulationConfig` includes functions (agent controllers, RNGs, step hooks, state hashers) that are not serializable for worker threads.

## Updated scope and assumptions
- Parallel worker execution is **opt-in** via a new `concurrency` option on `runBatchSimulations`.
- Worker execution is only used when **all** batch inputs are serializable and worker-safe:
  - Agents must be declarative descriptors (built-in kinds only), not function controllers.
  - Custom `rng`, `stepControl.onStep`, and `loopDetection.stateHasher` are not supported in worker mode.
  - Greedy policies must use the default scoring (no custom `scoreAction`).
- When worker mode is active, step hooks are replayed in-order after each simulation completes so batch ordering and metrics remain deterministic.

## File list
- src/simulation-engine/worker-pool.js (new)
- src/simulation-engine/worker-entry.js (new)
- src/simulation-engine/agent-serialization.js (new)
- src/simulation-engine/batch.js
- src/simulation-engine/loop.js
- src/simulation-engine/index.d.ts
- src/simulation-engine/types.d.ts
- test/simulation-engine/parallel.test.mjs (new)

## Work plan
1. Add a worker entry module that runs a single simulation from a serialized config.
2. Add a lightweight worker pool to fan out batch jobs and collect results in order.
3. Extend `runBatchSimulations` with `concurrency` and worker-safe gating.
4. Add tests comparing deterministic results between sequential and parallel runs.

## Out of scope
- Complex job queues or cancellation APIs.
- Shared RNG streams between workers.
- Persisting worker logs to disk.
- Parallel support for custom agent functions, custom RNG objects, or custom state hashers.

## Acceptance criteria
### Specific tests that must pass
- `node --test test/simulation-engine/parallel.test.mjs`
- `node --test test/simulation-engine/batch.test.mjs`
- `tsc -p tsconfig.json`

### Invariants that must remain true
- Parallel batch results match single-threaded results for the same seeds.
- Worker usage is opt-in and never the default.
- Worker pool shuts down cleanly after completion (no dangling threads).

## Status
- [ ] In progress
- [x] Completed

## Outcome
- Added worker-thread batching gated by worker-safe inputs with deterministic ordering and hook replay.
