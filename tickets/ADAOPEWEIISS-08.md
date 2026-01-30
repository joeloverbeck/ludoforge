# ADAOPEWEIISS-08: Update architecture documentation

## What

Update the architecture documentation to reflect all changes from ADAOPEWEIISS-01 through ADAOPEWEIISS-07. The docs must accurately describe the structured outcome flow, retry loop, corrected health metrics, and the accounting invariant.

Specific updates:

1. **`docs/architecture/evolutionary-engine.md`** — mutation pipeline section:
   - Document structured outcome return from `mutateAndRepairGenome()` (`ok`, `noOp`, `repairFailed`)
   - Document that repair failure returns `null` genome (not fallback to original)
   - Update adaptive weighting section to describe `validEvaluated`-based formula

2. **`docs/architecture/evolution-runner.md`** — runner and health metrics sections:
   - Document the retry loop (`maxMutationRetries`, per-slot retry on noOp/repairFailed)
   - Document updated health metrics (`operatorInefficiencyRate`, truthful `repairFailureRate`, `noOpRate`)
   - Document the accounting invariant: `attempts === noOp + repairFailed + rejectedTotal + validEvaluated`

3. **`CLAUDE.md`** — mutation pipeline summary:
   - Update the "Mutation Pipeline" section to mention structured outcomes and retry loop

## Files to touch

- `docs/architecture/evolutionary-engine.md`
- `docs/architecture/evolution-runner.md`
- `CLAUDE.md`

## Out of scope

- No runtime behavior changes
- No test changes
- No config changes

## Acceptance criteria

- Invariant: Structured outcome flow (`ok`/`noOp`/`repairFailed`) is documented in evolutionary-engine.md
- Invariant: Retry loop behavior and `maxMutationRetries` are documented in evolution-runner.md
- Invariant: Health metrics section lists `operatorInefficiencyRate`, `repairFailureRate`, `noOpRate` with formulas
- Invariant: Accounting invariant (`attempts === noOp + repairFailed + rejectedTotal + validEvaluated`) is documented
- Invariant: CLAUDE.md mutation pipeline summary reflects the new flow
- Invariant: No contradictions between docs and implemented behavior

## Dependencies

- ADAOPEWEIISS-01 through ADAOPEWEIISS-07 (all implementation and tests complete)
