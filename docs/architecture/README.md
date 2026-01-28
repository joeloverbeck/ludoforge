# Architecture Docs

This folder collects technical documentation for the seeded-population simulation and evolution loop.
Each document focuses on a single layer so external LLM reviews can pinpoint calculations, data flow,
and edge cases.

## Documents

- `pipeline-overview.md`: End-to-end loop stages and data artifacts.
- `simulation-engine.md`: Simulation loop mechanics and termination logic.
- `metrics-and-fitness.md`: Metric calculations, feature vector assembly, and fitness blending.
- `human-feedback.md`: Human scoring capture and preference model updates.
- `evolutionary-engine.md`: Evaluation adapter, MAP-Elites placement, and genetic operators.
- `evolution-runner.md`: Runner responsibilities, run isolation, artifact layout, and CLI entrypoint.
- `e2e-coverage.md`: Proven behaviors from `test/e2e/` and gaps.
