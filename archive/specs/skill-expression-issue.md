# Skill Expression Issue

“Skill expression” metric is mislabeled and currently measuring the wrong thing You explicitly note: “Skill expression (proxy) = max(winRate) - min(winRate) across players” … “currently measures seat/role imbalance.” metrics-and-fitness That’s not a proxy; it’s a different concept. Leaving it named “skill_expression” will poison your preference model because humans will “like” or “dislike” games for reasons your features misrepresent.

## Is this a real issue?

Yes — the “bug” here is semantic, not arithmetic.

Your docs define “Skill expression (proxy) = max(winRate) − min(winRate) across players” and immediately admit it “currently measures seat/role imbalance, not agent-skill separation.” 

metrics-and-fitness

So:

The metric is not “skill expression” in the standard sense (does stronger play win more?).

It is a useful metric: it’s basically seat/role win-rate spread.

Keeping the feature id/name as skill_expression is asking for confusion and mis-weighting later, especially since you also say “balance skew is not tracked separately; the core skill-expression proxy already captures per-player win-rate spread.” 

metrics-and-fitness

Feature vector default ordering also hardcodes skill_expression, so the misleading name leaks into every downstream consumer. 

metrics-and-fitness

So: rename it, keep it, and (optionally) add a real skill-expression metric separately.

## Spec 1) What needs to change
### A. Rename the current metric to what it actually is

Current behavior (keep):

- Compute per-player win rates across the evaluation batch.

- Return max(winRate) - min(winRate).

Change (rename):

- Rename the metric id/key from skill_expression → seat_imbalance (or role_advantage_spread; pick one canonical id).

- Update docs to call it “Seat/role imbalance (win-rate spread)” and remove wording that implies it’s a “proxy for skill expression.” 

Where this must apply:

- src/evaluation-analytics/metrics/core.js (metric id/export) 

- src/evaluation-analytics/feature-vector.js default ordering: replace skill_expression with seat_imbalance. 

- Any place that mentions “balance skew is not tracked separately…” should reference seat_imbalance instead. 

### B. Backward compatibility / migration (non-negotiable)

We don't need backward compatibility: we've barely started programming this app, and we haven't run any evolution.

### C. Add a real “skill expression” metric (optional-by-default, compute-expensive)

Add a new metric id/key, e.g. skill_expression (reclaimed name) or agent_skill_separation (clearer).

Config-gated (like meaningfulChoice/comebackPotential):

- metrics.skillExpression.enabled: boolean (default false)

- metrics.skillExpression.agentTiers: [...] ordered weak→strong (e.g., ["random","greedy","rollout"])

- metrics.skillExpression.matchesPerSeat: int (default 16)

- metrics.skillExpression.maxSteps/maxTurns/seed passthrough or reuse existing sim config

Normative definition (seat-bias-canceling):
For each tier t above baseline t0:

1. For each seat/player index s:

- Run N matches where seat s uses tier t, all other seats use baseline t0.

- Run N matches where seat s uses baseline t0, all other seats use tier t.

2. Let p_win( strong_in_s ) be win rate for seat s in the first set, and p_win( baseline_in_s ) in the second set.

3. Define per-seat advantage: adv(s,t) = p_win(strong_in_s) - p_win(baseline_in_s).

4. Aggregate: A = mean_{s,t}( adv(s,t) ).

5. Normalize to [0,1]: skill_expression = clamp(0, 1, 0.5 + 0.5*A / A_max) where A_max is the theoretical maximum advantage (use 1.0 if outcomes are win/lose only; if draws possible, still safe to use 1.0 and clamp).

Output:

- If insufficient runs / tiers, return 0.

- Metric range: [0, 1].

- Interpretation: 0 = no measurable skill separation; 1 = strong policy dominates independent of seat.

This aligns with your engine’s ability to select agents by player/role and run deterministic sims.

## Spec 2) What invariants should pass
### Seat imbalance metric (seat_imbalance)

Value preservation: For identical simulation batches, seat_imbalance(new) must equal skill_expression(old) within float tolerance.

Range: 0 ≤ seat_imbalance ≤ 1.

Symmetry: Permuting player indices in the summaries permutes winRates but does not change max-min.

New artifacts should not require legacy keys.

### True skill expression metric (skill_expression / agent_skill_separation)

Config-gated: Must not run unless enabled (to keep eval cheap by default).

Range: 0 ≤ metric ≤ 1.

Seat invariance: If you swap seat labels and re-run the same tier scheduling, the metric stays the same (because the procedure balances per-seat comparisons).

Degenerate cases: If all tiers behave identically (or only one tier configured), metric returns 0.

## Spec 3) What tests should pass
### Unit tests — core metrics

Rename correctness

Given a fixed set of per-player winRates, core metrics returns seat_imbalance and does not return skill_expression (unless you temporarily emit both during a migration window).

Value equivalence

Golden test: seat_imbalance === previous_skill_expression_value.

### Unit tests — feature vector assembly

Default ordering updated

Default ordering includes seat_imbalance where skill_expression used to be. 

metrics-and-fitness

Alias handling

Input features containing only skill_expression produce output with canonical seat_imbalance populated (and stable ordering/serialization).

### Unit tests — MAP-Elites descriptor alias

Descriptor id migration

With a descriptor config id = skill_expression, the system bins using the seat_imbalance value (not missing/undefined). 

runner-config.v1

### Unit tests — real skill expression metric (if implemented)

Detects separation

Stub simulations where “strong” always wins vs baseline (with seat swaps) → metric is high (e.g. ≥ 0.9).

Detects no separation

Stub simulations where outcomes ignore tier → metric ≈ 0.

Seat-bias cancellation

Stub where seat 0 always wins regardless of tier, but tier has no effect → metric ≈ 0 (because the per-seat swap cancels it).