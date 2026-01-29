# MOTINEVO-15: Update architecture docs

## Status: COMPLETED

## Description
Review and update all architecture documentation to reflect the changes from MOTINEVO-01 through MOTINEVO-14. Ensure docs accurately describe the current system state: trace fields, new operators, motif mining pipeline, and removal of deprecated effect kinds.

## Files to Touch
- `docs/architecture/simulation-engine.md` — document new trace fields (stateHash, bindings, appliedEffects), AppliedEffect type, pass-step rules, replay invariant
- `docs/architecture/evolutionary-engine.md` — document new effect-level operators, removal of random/foreach, motif-inject operator
- `docs/architecture/evolution-runner.md` — document motifMining config, new artifact (motifs.jsonl)
- `docs/architecture/metrics-and-fitness.md` — document LTS builder and motif mining pipeline
- `docs/architecture/pipeline-overview.md` — update pipeline diagram to include motif mining step and trace emission
- `docs/architecture/README.md` — update index if new sections added

## Out of Scope
- Code changes (all done in prior tickets)
- Schema changes (all done in prior tickets)
- Test changes (all done in prior tickets)

## Acceptance Criteria

### Tests That Must Pass
- No code tests — this is a documentation-only ticket

### Invariants That Must Remain True
- Each doc accurately describes the current system after all prior tickets are implemented
- No doc references removed concepts (`random`/`foreach` effects, untyped mutation config)
- Pipeline diagram reflects the complete flow including motif mining
- New modules (LTS builder, motif miner, motif store, replay utility) are documented
- New operators are listed with descriptions
- TrajectoryStep trace fields are fully documented with types and semantics

## Dependencies
- Depends on: MOTINEVO-01 through MOTINEVO-14
- Blocks: none

## Outcome

All 6 architecture docs updated:
1. **simulation-engine.md**: Added "Trace Fields" section documenting stateHash, bindings, appliedEffects; AppliedEffect type definition; pass-step rules; replay invariant (verifyTraceConsistency, replayEffectsOnState). Updated Canonical SimulationResult optional fields.
2. **evolutionary-engine.md**: Fixed stale `random`/`foreach` reference in action-effect-magnitude. Added 7 new operators (effect-insert, effect-delete, effect-param-tweak, effect-kind-swap, effect-reorder, action-add-small, motif-inject). Added "Effect Helpers" subsection.
3. **evolution-runner.md**: Added "Motif Mining" section with config table, pipeline flow, and artifact description. Added motifs.jsonl to directory layout.
4. **metrics-and-fitness.md**: Added "LTS Builder and Motif Mining" section covering buildLts, canonicalLabel, mineMotifs, and motif-store persistence.
5. **pipeline-overview.md**: Added trace emission note to stage 3. Inserted new stage 9 (motif mining). Renumbered old stage 9 to 10. Updated stage 8 operator count to 21.
6. **README.md**: Updated simulation-engine doc description to mention trace field emission.
