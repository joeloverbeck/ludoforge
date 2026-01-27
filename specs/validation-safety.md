# Formal Invariants and Safety Constraints Spec

## Purpose
Guarantee that generated games are finite, well-formed, and meaningful. Enforced by DSL validation and runtime checks.

## Invariants
- Finite termination: at least one end condition and max turns fallback.
- Bounded state: integers clamped; token counts capped; zone capacity enforced.
- Action legality: preconditions must be satisfiable and reference valid state.
- Non-triviality: at least one meaningful choice per turn in typical states.
- No dead rules: declared variables/tokens must be referenced by rules.

## Validation Phases
1. Static validation (AST/type checks).
2. Structural validation (required sections present).
3. Constraint validation (bounds and caps).
4. Dynamic validation (simulation-based degeneracy checks).

## Runtime Safety
- Detect repeated state loops; break with draw/loss flag.
- Trigger recursion protection (depth or re-entry guard).
- Max step limit per turn to prevent infinite auto-effects.

## Interfaces
- Input: DSL AST + optional simulation traces.
- Output: validation errors/warnings, degeneracy flags.

## Open Questions
- Default max token cap and max action branching.
- Policies for auto-fixing vs rejecting invalid games.
