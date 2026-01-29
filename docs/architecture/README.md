# Architecture Docs

This folder collects technical documentation for the seeded-population simulation and evolution loop.
Each document focuses on a single layer so external LLM reviews can pinpoint calculations, data flow,
and edge cases.

## Documents

- `pipeline-overview.md`: End-to-end loop stages and data artifacts.
- `simulation-engine.md`: Simulation loop mechanics, termination logic, and trace field emission.
- `metrics-and-fitness.md`: Metric calculations, feature vector assembly, and fitness blending.
- `human-feedback.md`: Human scoring capture and preference model updates.
- `evolutionary-engine.md`: Evaluation adapter, MAP-Elites placement, and genetic operators.
- `evolution-runner.md`: Runner responsibilities, run isolation, artifact layout, and CLI entrypoint.
- `e2e-coverage.md`: Proven behaviors from `test/e2e/` and gaps.

## Config File Ownership

All runtime configuration lives under `configs/` as JSON files grouped by subsystem.
Each file includes `version` (integer schema version) and `updatedAt` (ISO-8601 timestamp).

| Config File | Owning Subsystem | Architecture Doc |
|---|---|---|
| `configs/simulation.json` | Simulation engine | `simulation-engine.md` |
| `configs/metrics-core.json` | Metrics compute | `metrics-and-fitness.md` |
| `configs/metrics-extended.json` | Extended metrics (meaningful choice, comeback, skill expression) | `metrics-and-fitness.md` |
| `configs/degeneracy.json` | Degeneracy detector | `metrics-and-fitness.md` |
| `configs/fitness.json` | Fitness scorer | `metrics-and-fitness.md` |
| `configs/preference-model.json` | Preference model | `human-feedback.md` |
| `configs/active-learning.json` | Active learning | `human-feedback.md` |
| `configs/map-elites.json` | MAP-Elites | `evolutionary-engine.md` |
| `configs/evolution-operators.json` | Mutation, crossover, repair | `evolutionary-engine.md` |
| `configs/evolution-runner.json` | Runner (persistence, resume) | `evolution-runner.md` |
| `configs/human-feedback.json` | Human feedback interface | `human-feedback.md` |

Default values are defined in the config files themselves, not embedded in documentation prose.
Subsystem docs reference config keys; see each doc for the specific keys consumed.
