# Agent Ensembles

We've fed the architectural docs to ChatGPT so that it could find possible improvements. It said:

"Removing the human-in-the-loop: do it by “agent ensembles”, not by pretending metrics = fun Your docs already admit metrics are proxies. The right bridge is: simulate each game with a portfolio of agents (random, greedy, heuristic, rollout) derive features that correlate with human fun better than raw branching factor: advantage reversals frequency outcome sensitivity to small policy improvements (learning curve) regret signals / counterfactual value spread (you already have “meaningful choice” rollouts) then train your preference model on those richer features, so it becomes a real surrogate That’s how you “remove the human” without building a fake fun equation."

## Assessment of ChatGPT’s claims (validity + what’s already true in your system)
1) “Don’t pretend metrics = fun” — correct, but it’s not new

Your docs already say exactly this: core metrics are “cheap descriptors and filters” and should be treated as proxies, not direct fun predictors unless paired with human preference data. 

metrics-and-fitness


So the warning is valid, but it’s not a gap in your architecture.

2) “Use a portfolio of agents” — directionally correct, and you already have the hooks

Your evaluator pipeline literally starts by creating agents via agentFactory(definition) (defaulting to random-policy agents) before running batch simulations. 

metrics-and-fitness


And you already run multi-agent-tier extra simulations via skill_expression (random/greedy or explicit agent objects), plus rollout-based metrics for meaningful choice (choice_value_spread).
So “agent ensembles” is not a big architectural shift for you; it’s an incremental extension.

3) The proposed “richer features” — partly redundant, partly missing

“Regret / counterfactual spread”: you already have this as choice_value_spread (per-action rollouts, max–min value spread). 

metrics-and-fitness

“Outcome sensitivity to policy improvements / learning curve”: you already approximate this with skill_expression (win-rate advantage of stronger tiers, seat-bias canceled).

“Advantage reversals frequency”: you have related signal in comeback_potential (leader advantage vs final outcome correlation), but not explicit reversal-count / reversal-rate.

4) “Remove the human-in-the-loop” — overstated / not actually justified

You already do the right thing: learn a preference model from human feedback with an ensemble + BALD active learning, then blend preference into fitness with uncertainty damping.
What you can do is reduce human labeling per unit progress by improving features and pair selection—not credibly “remove” humans without drifting into proxy-gaming (Goodhart).

5) Biggest real gap: you’re not proving extended-metric correctness end-to-end yet

Your own E2E coverage doc calls out a gap: extended metrics aggregation (meaningful choice / comeback rollouts) is not yet proven in E2E. 

e2e-coverage


So before you add more expensive agent-portfolio metrics, you should lock down correctness + determinism for the ones you already have.

## 1) What needs to change
### A. Promote “Agent Portfolio” to a first-class evaluation concept

Goal: make “portfolio of agents” explicit and reusable across extended metrics, instead of each metric ad-hoc spawning extra simulations.

Add a new concept: AgentSuite

- An AgentSuite defines:

-- id (string, stable)

-- agents (by role/seat mapping rules)

-- seedPolicy (how run seeds are derived; must be deterministic)

-- optional notes (pure metadata)

Evaluator integration

- Extend evaluator options (the same options table that already includes agentFactory, includeExtendedMetrics, extendedMetricsOptions). 

- Add:

-- agentSuites: AgentSuite[]

-- agentSuiteRuns: { [suiteId]: number } (how many simulations per suite)

-- portfolioMetrics.enabled: boolean

Execution model

- Core metrics continue to use the “primary” suite (default: current behavior).

- Extended/portfolio metrics can request runs from one or more suites via a shared simulation harness.

### B. Add new portfolio-derived metrics (stable IDs)

Add metrics that are agent-comparative and plausibly more “fun-correlated” than raw branching factor.

1) advantage_reversal_rate (new)

Intent: count how often the “leader” changes during a match (momentum swings).
Computation sketch:

- Requires a per-step score function. Use the same scoring-expression machinery already used by comeback_potential (it computes an early leader advantage from termination scoring). 

- For each simulation:

-- compute leader at sampled steps (full steps or a stride)

-- count leader changes

-- normalize to [0,1] (e.g., changes / maxPossibleChanges)

- Aggregate across runs (mean).

Fallback behavior: if score cannot be computed, metric returns 0 and sets nonFiniteKeys/unknown handling consistently (your feature vector already tracks non-finites).

2) policy_sensitivity (new)

Intent: measure how much outcomes improve with slightly better policies (a “learning curve” proxy).
Computation sketch:

- Use multiple tiers already supported by skill_expression (random/greedy/custom) 

- Run a small ladder:

-- baseline tier vs +1 tier, +1 vs +2, etc.

-- compute marginal win-rate deltas (seat bias canceled like skill_expression)

- Define policy_sensitivity as normalized mean marginal improvement (clamped [0,1]).

Note: This is not identical to skill_expression. Keep both:

- skill_expression = “is there any room for skill to matter?”

- policy_sensitivity = “does small improvement matter a lot?”

3) (Optional) agent_robustness (new)

Intent: penalize games whose “quality signals” collapse when you swap agent type (too brittle / exploit-y).
Computation sketch:

- For a fixed suite set (e.g., random vs greedy vs rollout), compute variance of a small bundle:

-- agency, interaction_rate, variety

- Normalize variance into [0,1] and invert so higher = more robust.

### C. Hardening work you should do before scaling the portfolio

Because extended metrics E2E is currently a known gap. 

Implement:

- Deterministic seed derivation rules for:

-- per-suite runs

-- per-metric extra runs

- Shared run-caching keyed by (genomeId, suiteId, seed) so extended metrics don’t accidentally double-simulate.

### D. Preference model / human-loop behavior (don’t delete it; reduce it)

You already:

- select pairs using BALD on an ensemble 

- blend preference into fitness with uncertainty damping 

Change:

- Add a runner-level policy: adaptive sampling budget

-- if ensemble uncertainty is low across the shortlist, reduce maxSamplesPerGen

-- if uncertainty spikes or you introduce new metric IDs, temporarily increase sampling

(Yes, that’s “less human”, without the self-deception of “no human”.)

## 2) Invariants that should pass
### Determinism invariants

- Same inputs (genomes, config, seeds, feedback history) ⇒ identical:

-- simulation outputs

-- metric vectors (including new portfolio metrics)

-- MAP-Elites placements

-- preference model updates
This is consistent with your current deterministic pipeline intent.

### Feature-vector invariants

- Feature vector remains keyed by metric id, not positional. (Required for safe metric growth.)

- Non-finite/unknown handling remains explicit via nonFiniteKeys, and descriptor extraction treats non-finites as "unknown" bins.

### Safety / cost invariants

Extended/portfolio metrics must obey strict caps (runs, rollouts, max steps) like your existing meaningful-choice guardrails. 

A metric that cannot compute (missing scoring, etc.) must degrade gracefully (no evaluator crash; stable default output). Your evaluator already aims for this style. 


### Human-loop integrity invariants

Active learning still prioritizes uncertainty and preserves niche diversity.

Preference contribution to fitness remains uncertainty-damped (high disagreement ⇒ low influence).

## 3) Tests that should pass (and new tests you should add)
Existing tests that must continue to pass

All current E2E determinism and preference-model update tests remain valid.

### New tests (required)
A) E2E: Extended metrics aggregation is deterministic and wired correctly

Add: test/e2e/extended-metrics.e2e.test.mjs

Enables includeExtendedMetrics

Uses a fixed seed + fixed genome fixture

Asserts:

identical runs produce identical extended metrics (including choice_value_spread, comeback_potential, skill_expression) 

metrics-and-fitness

evaluator diagnostics include extendedMetrics and stable featureVector fields 

metrics-and-fitness

This directly closes your stated E2E gap. 

e2e-coverage

B) E2E: AgentSuite portfolio metrics are deterministic and cached

Add: test/e2e/agent-portfolio-metrics.e2e.test.mjs

Configure multiple suites (random, greedy, rollout-like)

Assert:

advantage_reversal_rate is identical across identical seeds

policy_sensitivity ≥ 0 for all, within [0,1]

simulation call counts do not exceed expected (proves caching / no accidental double runs)

C) Unit: advantage_reversal_rate correctness on a toy game

Add unit tests with a minimal game where:

leader never changes ⇒ metric = 0

leader alternates predictably ⇒ metric matches expected normalized value
(Use controlled scoring expression like in the comeback metric’s prerequisites.) 

metrics-and-fitness

D) Unit/E2E: policy_sensitivity monotonic sanity

Use a game fixture where greedy obviously beats random:

assert policy_sensitivity is meaningfully > 0

assert it’s stable under seat swaps (seat-bias cancellation principle from skill_expression). 

metrics-and-fitness

E) E2E: Human sampling budget adapts but never starves exploration

Add: test/e2e/adaptive-human-budget.e2e.test.mjs

Start with empty preference model ⇒ expect higher sampling

After enough samples and low uncertainty ⇒ expect lower sampling

Still enforce diversity quota behavior for niche coverage.

## Bottom line

ChatGPT’s “agent ensembles + richer signals” idea is valid but mostly incremental for you (you already have the evaluator hooks and several of the named metrics).

The “remove the human” framing is the weak part. Your current ensemble + BALD + uncertainty-damped fitness is already the correct foundation; build on it to reduce human load, not pretend you can delete it.

The highest-leverage next step is hardening extended metrics in E2E first, because your own coverage doc says you haven’t proven that path yet.

## Update architectural docs

Review the architectural docs at docs/architecture/ and update them as necessary, to keep them up to date after these extensive changes.