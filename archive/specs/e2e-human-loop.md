# E2E Human Loop Test Suite Spec

## Purpose
Define an end-to-end test suite that validates the full human play loop: game definition generation, rendering and prompt flow, mocked human input, and verified state transitions.

## Related Archived Specs
- `archive/specs/human-interface.md`
- `archive/specs/game-kernel.md`
- `archive/specs/simulation-engine.md`
- `archive/specs/validation-safety.md`
- `archive/specs/dsl.md`
- `archive/specs/evaluation-analytics.md` (for terminology around trajectories/metrics)

## Goals
- Prove a game definition can be assembled from fixtures and validated end to end.
- Prove the execution loop and human-facing "look" (rendered state + action list) works with a real definition.
- Prove the human-in-the-loop path (mocked IO) selects actions and drives execution.
- Prove game state changes correctly based on the human-selected action.

## Non-Goals
- Performance profiling, batching, or worker-thread execution.
- Full UI coverage beyond CLI-style render/prompt text.
- Exhaustive semantic validation coverage (handled by unit tests).

## Scope and Assumptions
- Tests live under `test/e2e/` and run via `npm run test:e2e`.
- Use Node's test runner (`node --test`).
- No filesystem writes outside test fixtures or temp dirs.
- Deterministic RNG and fixed prompts to keep tests reproducible.
- "Look" is interpreted as the human interface output (rendered state, action list, prompts). "Loop" is the turn execution sequence.

## Proposed Test Suite Structure
- `test/e2e/fixtures/`
  - `minimal-game.json` (minimal valid definition)
  - `choice-game.json` (two actions with distinct state changes)
  - `visibility-game.json` (public + private zones for render coverage)
  - `multi-phase-game.json` (multiple phases to exercise scheduler labels)
  - `zone-capacity-game.json` (zone capacity and token movement boundaries)
  - `per-player-vars-game.json` (per-player variables and scoring)
- `test/e2e/helpers/`
  - `mock-human-io.js` (scripted `readLine`, captured `writeLine`)
  - `run-human-loop.js` (test-only loop: render, prompt, apply action, advance turn)
  - `expect-output.js` (assertions for prompt/render output)
- Test files:
  - `test/e2e/game-definition.e2e.test.mjs`
  - `test/e2e/human-loop.e2e.test.mjs`
  - `test/e2e/state-transition.e2e.test.mjs`
  - `test/e2e/rendering.e2e.test.mjs`

## Game Definition Generation
### Test Intent
Prove that a game definition can be produced from fixtures, validated, and serialized as a coherent artifact.

### End-to-End Flow
1. Build or load a definition from fixtures only.
2. Validate with `validateGameDefinition` and `validateSemanticDefinition`.
3. Serialize with `serializeGameDefinition` and ensure deterministic output.
4. Optionally compute a `createGenomeId` for stable identity.

### Coverage
- Valid definition passes both schema and semantic validation.
- Serialized output is stable across runs (no non-deterministic fields).
- Fails fast when required fields are missing (one negative case).

## Execution Loop + "Look" (Render/Prompt)
### Test Intent
Confirm that the human-facing output is produced from real state and actions and that the loop executes without error.

### End-to-End Flow
1. Initialize state via `createInitialState`.
2. Render state via `renderState`.
3. List legal actions via `listLegalActions` and `renderActionList`.
4. Prompt for action via `promptForAction` using mocked IO.
5. Apply selected action and advance phase/turn.

### Coverage
- Output includes turn/phase, variables, zones, and actions list.
- Private zones only render for the active player.
- Large zones are collapsed per the renderer limit.
- Prompt labels resolve correctly (default and named player).

## Human-in-the-Loop (Mocked)
### Test Intent
Prove the human path through `routeTurn` and `runHumanTurn` works with mocked IO and legal action validation.

### End-to-End Flow
1. Configure participants with a human player using mocked IO.
2. Call `routeTurn` or `runHumanTurn` to select an action.
3. Assert selection index and action id match the scripted input.
4. Confirm illegal human input is re-prompted until valid.

### Coverage
- Handles invalid inputs (non-number, out-of-range) with retry.
- Throws on missing IO or zero legal actions.
- Ensures action selection is limited to current legal actions.
- Combined human + AI participant case routes each turn to the correct participant.

## State Transition Validation
### Test Intent
Prove that the chosen action drives deterministic, correct state changes.

### End-to-End Flow
1. Use `choice-game.json` with two actions affecting a variable or zone contents.
2. Run the loop once with a scripted human input selecting action A.
3. Assert resulting state matches expected changes (variable increment, token movement).
4. Repeat with action B and verify distinct state.

### Coverage
- Correct variable updates (global + per-player).
- Zone token movement applies and shows in rendered deltas.
- Turn/phase advancement occurs and is consistent with scheduler rules.
- Termination condition triggers when expected (short test game).

## Edge Cases and Failure Modes
- No legal actions available returns a clear error.
- Actions with failing preconditions are not offered to the human.
- Invalid action choice from a mocked AI provider is rejected (if mixed participants are used).
- Loop safeguards (max turns or trigger depth) stop execution with a consistent outcome.

## Determinism Requirements
- Seed RNG where used (simulation engine or any stochastic actions).
- Avoid time-based or random output in fixtures.
- Keep output assertions resilient (match key lines, not full output blobs).

## Acceptance Criteria
- E2E suite runs under `npm run test:e2e` and exercises a full human turn.
- A valid game definition is generated/loaded, validated, and serialized.
- Rendered output includes expected state and actions before a human choice.
- Mocked human input drives the chosen action and yields the correct state transition.

## Open Questions
- Should the combined human + AI participant case live in its own test file or be folded into `human-loop.e2e.test.mjs`?
