# Motifs in Evolution

We provided docs/architecture/ to ChatGPT so that it could determine what improvements we should make. It said:

"Clear improvements that will materially improve evolution quality
1) Stop treating “mechanics” as atoms; treat them as motifs in a state–action graph

Your instinct is right: don’t mutate “worker placement” as a chunk. You want primitives so that new mechanics can emerge.

A good way to formalize that:

Primitives = typed state transforms

transfer(resource, from, to, amount)

convert(resourceA -> resourceB)

place(token, zone)

move(token, zoneA -> zoneB)

reveal(info) / hide(info)

bind(slot, occupiedBy) (exclusivity)

bid(amount) / commit() / resolve()

draft(choiceSet) / pass()

etc.

Mechanic = recurring composition pattern of these transforms + turn structure + info structure.

Then you can do mechanic discovery by mining frequent subgraphs/patterns from successful genomes’ traces:

log each game as a labeled transition system (LTS)

run frequent pattern mining / grammar induction to discover common motifs

promote motifs into macro-primitives automatically (optional), letting evolution invent “new mechanics” as recombinations and later as compressed macros

This is the cleanest route to “new mechanics can come up during evolution” without hand-authoring “mechanic templates.”

(Your current architecture already supports this direction because you have deterministic simulation, trajectory summaries, action logs, and feature vectors. )"

## Assessment of ChatGPT’s claims vs what you have now

The “treat mechanics as motifs in a state–action graph” idea is directionally correct and likely beneficial — but it’s also a bit overstated, because you already have most of the foundation.

What you already have that matches the recommendation:

- Your DSL already models actions as compositions of typed state transforms (set/inc/dec/move/spawn/destroy/reveal/hide/...). That’s basically “primitive transforms,” just named Effect. 

game-definition.v1

- Your simulation output already captures deterministic step sequences (trajectory.steps) and termination metadata.

- Your analytics already uses action-frequency/entropy proxies and trajectory summaries. 

metrics-and-fitness

- Your evolution loop is deterministic, schema-driven, and already persists artifacts/tests for this shape of pipeline.

What you don’t have (and what the recommendation actually adds):

1. Evolution still operates at too-high a granularity (duplicate/remove whole actions; tweak magnitudes; etc.). That tends to “jitter” existing action sets instead of discovering new compositions. 

evolutionary-engine

2. Your logs are not yet a clean labeled transition system (LTS). You have actionId + full state, but you don’t record resolved targets/bindings and which primitives actually executed (including trigger effects). That makes motif mining and “mechanic discovery” noisy and expensive (it forces you into state-diff reconstruction).

Verdict: adopting the missing parts of the recommendation is very likely to improve evolution quality (searchability + emergence + interpretability). But the right move isn’t “replace everything with primitives” (you already did). The right move is:

- make the executed primitive trace first-class, and

- shift operators to op-level + optional motif→macro compression.

Given your “no backwards compatibility, no aliasing” preference, I’d go all-in cleanly.

Given your constraints, the clean move is:

edit the existing schema files in-place

intentionally break old fixtures/configs

offer exactly one representation per concept (no parallel fields)

Below are the corrected, spec-like specs.

## 1) What needs to change
### A) Game definition schema: make “primitive transforms” truly primitive (in-place)

File: game-definition.v1.json

Change A1 — tighten Effect to atomic transforms only

- In $defs.Effect.oneOf, remove the kind: "random" and kind: "foreach" variants.

-- Rationale: those are control-flow constructs, not atomic state transforms, and they pollute both search (mutation) and motif mining (pattern discovery).

Change A2 — keep action composition as “many small Effects,” not “mechanics as chunks”

- No new “mechanic templates.”

- No new “macro” surface in the DSL (yet) — you can do “macro promotion” internally as motif injection, without adding a second representation into the DSL.

(So: actions remain costs?: Effect[] + effects: Effect[], but now each Effect is genuinely atomic.)

### B) Simulation result schema: log executed primitives as first-class data (in-place)

File: simulation-result.schema.json

Right now, a step has actionId and state, but not the resolved targets nor the exact primitive transforms executed. That blocks real motif mining and forces expensive/fragile state-diff inference.

#### Change B1 — add required execution trace fields to TrajectoryStep
In $defs.TrajectoryStep:

Add properties:

- stateHash: string

-- canonical hash of state using your existing hasher

- bindings: object

-- resolved target bindings for this step (by target id)

- appliedEffects: AppliedEffect[]

-- fully ordered list of atomic effects actually executed in this step

-- includes trigger-origin effects

Make them required for every step.

#### Change B2 — define new trace types in $defs
Add:

- ResolvedRef (like Ref, but resolved to concrete ids)

- BindingValue (string | number | array of same)

- AppliedEffect (same shape family as Effect, but with):

-- source: "cost" | "effect" | "trigger" (required)

-- target: ResolvedRef (resolved; no selectors/target-ids at this point)

#### Change B3 — normative rules

- If actionId === null (pass step):

-- bindings must be {}

-- appliedEffects must be []

- appliedEffects must reflect post-resolution, post-trigger-expansion, actual execution order.

- Replay property (strong requirement):

-- applying appliedEffects to prior state must produce a stateHash equal to the next step’s stateHash.

### C) Engine: build an LTS and mine motifs from elite traces (no DSL templates)

Code/doc changes (not schema-only):

#### Change C1 — compile a labeled transition system (LTS) from trajectories

- Nodes: stateHash

- Edges: labels derived from appliedEffects (exact sequence or n-grams)

#### Change C2 — add motif mining

- Input: trajectories from elites (e.g., top-N per niche)

- Output: motifs.jsonl artifact containing:

-- canonical motif signature (sequence/subgraph encoding)

-- support counts

-- correlation with fitness / preference

-- example occurrences

#### Change C3 — “macro promotion” without new DSL representation

- Implement as evolution-time bias/operators, not a new DSL surface:

-- motif-inject: insert a mined motif’s Effect-sequence into a random action (or into a newly created small action)

-- motif-guided-edit: replace an existing short subsequence with a higher-performing motif variant

This gives you the benefit of “macro primitives” without introducing a second way to express rules in the game definition.

### D) Evolution config schema: stop “action chunk” mutation by default (in-place)

File: runner-config.v1.json

Right now evolution.mutation is an untyped blob. That’s not “clean/robust architecture.”

#### Change D1 — make mutation config explicit and strict
Replace evolution.mutation: object with a typed config such as:

- operators: [{ kind, weight, params... }] (required)

- Allowed operator kinds (initial set):

-- effect-insert

-- effect-delete

-- effect-param-tweak

-- effect-kind-swap

-- effect-reorder

-- action-add-small (creates an action with 1–2 effects max)

-- action-delete

-- motif-inject (enabled only if motif mining enabled)

#### Change D2 — add motif mining config
Add evolution.motifMining (or evaluation.motifMining, your choice) with:

- enabled: boolean

- eliteSelection: { perNicheTopK, globalTopK }

- minSupport, maxMotifLength, ngramSizes, seed

Strict schema, no extra properties.

## 2) What invariants should pass
### No compatibility / no aliasing invariants (hard)

- Old inputs that used Effect.kind in {"random","foreach"} must fail schema validation.

- Old configs with free-form evolution.mutation must fail schema validation.

- There must be exactly one authoritative place to read:

-- executed primitive sequence (TrajectoryStep.appliedEffects)

-- resolved targets (TrajectoryStep.bindings)

### Determinism invariants (hard)

Given identical seeds + inputs:

simulation stateHash, bindings, and appliedEffects are byte-identical

motif mining outputs are byte-identical (stable ordering rules required)

evolution outputs (ids / niche placement) remain deterministic

### Trace correctness invariants (hard)

- Every non-pass step has:

-- appliedEffects.length >= 1

-- every applied effect has source and resolved target

- Replay invariant holds (trace is sufficient to reproduce the step)

## 3) What tests should pass
### Existing E2E tests that must remain green (after fixture/assertion updates)

test/e2e/evolution-pipeline.e2e.test.mjs

test/e2e/state-transition.e2e.test.mjs

test/e2e/human-loop.e2e.test.mjs

test/e2e/game-definition.e2e.test.mjs

test/e2e/mock-simulation.e2e.test.mjs

test/e2e/preference-model-update.e2e.test.mjs

test/e2e/evolution-mutation-repair.e2e.test.mjs

test/e2e/fixtures.e2e.test.mjs

### New tests you should add (these are the “proof this change is real” tests)

#### T1 — Trace emission correctness

One action with targets + costs + trigger:

asserts bindings contains resolved ids

asserts appliedEffects includes trigger-origin effects with correct source

asserts ordering is deterministic

#### T2 — Pass-step trace rules

With noLegalActions.policy = "pass":

actionId === null

bindings === {}

appliedEffects === []

#### T3 — Replay invariant

For a recorded trajectory:

apply appliedEffects step-by-step to reconstruct stateHash

must match recorded stateHash sequence

#### T4 — Motif mining determinism

Fixed elite traces + seed → identical motifs.jsonl

#### T5 — Operator-level evolution sanity

With action-chunk operators disabled (or near-zero weight):

evolution still generates valid children at scale

validity failures occur pre-evaluator, as before

## Outcome

All spec items implemented across MOTINEVO-01 through MOTINEVO-15:
- DSL schema: removed `random`/`foreach` effect kinds (Change A1).
- Simulation result: trace fields (`stateHash`, `bindings`, `appliedEffects`) emitted per step (Change B1-B3).
- LTS builder and motif miner implemented (Change C1-C2).
- Motif-inject operator and effect-level mutation operators implemented (Change C3, D1).
- Runner config schema includes typed `motifMining` config (Change D2).
- Architecture docs updated to reflect all changes (MOTINEVO-15).