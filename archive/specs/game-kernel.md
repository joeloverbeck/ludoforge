# Game Definition Kernel (DSL Interpreter) Spec

## Purpose
Execute any game defined in the DSL by enforcing turn structure, legal action selection, state transitions, and termination outcomes. Acts as the universal tabletop "VM".

## Responsibilities
- Load a parsed DSL game definition (AST) and validate required sections.
- Maintain game state, including global variables, per-agent variables, zones, and tokens.
- Compute legal actions at a given state for a given agent/phase.
- Apply action costs and effects deterministically (or via injected RNG).
- Advance turn/phase scheduler and handle automatic step effects.
- Detect termination conditions and compute outcomes/payoffs.
- Enforce hard bounds (max turns, max tokens, variable ranges, zone sizes).

## Core Data Model
- State variables: typed values (int, bool, enum) with bounds.
- Tokens: typed entities with attributes; unique IDs.
- Zones: containers for tokens; ordered/unordered; private/public; spatial (graph-based slots).
- Agents: indexed 1..N; optional roles/teams.
- Turn state: current agent, phase, turn count.

## Execution Flow
1. Initialize state from DSL defaults.
2. Loop until termination or max turns reached:
   - Determine active agent/phase per scheduler.
   - Apply phase start triggers.
   - Compute legal actions for active agent.
   - Receive action choice (AI or human) and validate.
   - Apply costs, then effects, then triggers.
   - Apply phase end triggers; advance turn.
3. On termination, evaluate outcome/score per agent.

## Validation and Safety
- Required sections: game must declare at least one termination condition (win/loss/draw) or explicit max turn limit.
- Type checks: all references must resolve to declared entities.
- Bounds checks: integers clamped or action rejected (configurable); zone capacity enforced.
- Action legality: precondition must be true at time of execution.
- Global loop detection: prevent infinite gameplay cycles (not just trigger loops); enforce max-turn failsafe.
- Trigger loop detection: prevent infinite auto-execution.
  - Detect re-triggering without state change and break with an error or draw.

## Interfaces
- Input: DSL AST (validated), RNG seed, agent controllers.
- Output: step-wise state updates, action logs, terminal outcome.
- Hooks: event stream for simulation/evaluation logging.

## Non-Goals (v1)
- Real-time or simultaneous actions beyond turn/phase model.
- Rich UI rendering (handled by interface layer).

## Open Questions
- Default scheduler/phase model and extensibility for later phases.
- How to represent spatial zones (grid vs graph).
