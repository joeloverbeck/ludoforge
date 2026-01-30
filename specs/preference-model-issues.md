# Preference Model Issues

We fed the architectural docs to ChatGPT so that it would find bugs or possible improvements to be made. it said:

"Preference model: keep it, but make it Bayesian or at least uncertainty-aware You already do active learning by picking pairs near predicted 0.5. human-feedback But your current model stores point weights and uses a simple sigmoid confidence. Upgrade path (worth it): Bayesian logistic regression (or an ensemble of models) → real uncertainty then active learning chooses pairs that maximize expected information gain and preserves niche diversity This is the shortest road toward reducing human input without fooling yourself."

## Are ChatGPT’s claims valid?

Yes — the critique is accurate, and the proposed direction is genuinely better if your goal is “less human input without fooling yourself.”

### What you have today (per your docs):

- A single point-estimate preference model: weights + bias, updated online from comparisons/ratings via a logistic / Bradley–Terry-style error. 

human-feedback

- Preference scoring is sigmoid(dot(w, x) + b).

“Confidence” is literally abs(score - 0.5) * 2 — i.e., distance from 0.5, not statistical uncertainty. 

metrics-and-fitness

- Active learning selects pairs whose predicted preference is closest to 0.5, plus a diversityQuota for underrepresented MAP-Elites niches. 

human-feedback

So ChatGPT’s statement “you already do active learning near 0.5” is correct. 

human-feedback


And “your model stores point weights and uses a simple sigmoid confidence” is also correct.

### What’s missing (and why it matters):

- “Near 0.5” conflates two very different situations:

-- Epistemic uncertainty: the model doesn’t know yet (you should ask humans).

-- Aleatoric ambiguity: the user is genuinely indifferent/noisy around that region (asking more yields diminishing returns).

- A point-estimate logistic model cannot tell these apart; your “confidence” is not uncertainty, it’s just a margin heuristic. 

metrics-and-fitness

That means your active learning can waste comparisons in perpetually fuzzy regions and still get overconfident elsewhere (especially early, with few samples).

## Should you implement the improvement now?

If your roadmap includes reducing human feedback (which your docs explicitly aim toward via active learning), then yes — this is worth doing now, while:

feature dimensionality is still small-ish,

your schemas/artifacts are still fluid,

and you’ve explicitly said you’re fine with breaking changes and no backward compatibility.

Below is a clean upgrade path that avoids “fake confidence” and gives you real uncertainty without turning the project into a Bayesian inference research project.

I recommend an uncertainty-aware ensemble (deterministic, simple, effective). It’s the practical version of “Bayesian or at least uncertainty-aware.”

## 1) What needs to change
### 1.1 Preference model becomes an ensemble (not a single point model)

Replace the single (weights, bias) state with K independent models trained online.

#### New PreferenceModelState (breaking change)

- models: Array<ModelSnapshot> where each ModelSnapshot contains:

-- weights: { [featureId]: number }

-- bias: number

-- sampleCount: number

- ensemble: { size: number, method: "online-bagging" }

- version: number (increments per update batch, as today) 

human-feedback

- Keep your existing per-feature id mapping approach (it’s good and robust to reordering). 

human-feedback

#### Training method: online bagging (deterministic bootstrap)

- For each incoming feedback sample:

-- For each model m in the ensemble:

-- draw k ~ Poisson(1) using your seeded RNG

apply the existing update rule k times (comparison or rating update), unchanged in form.

### 1.2 Preference scoring returns mean + uncertainty (replace “confidence”)

Replace confidence = abs(score - 0.5) * 2 

with ensemble-derived uncertainty, computed from per-model probabilities:

Given a candidate (single game) or a comparison (A vs B):

- For each model: p_i = sigmoid(w_i·x + b_i)

- Aggregate:

-- pMean = mean(p_i)

-- pVar = variance(p_i) (model disagreement)

Expose (at least internally):

- pMean

- uncertainty = clamp01(2 * sqrt(pVar)) (or similar scaling)

- Optional (recommended): bald = H(pMean) - mean(H(p_i)) (information gain proxy)

### 1.3 Active learning switches from “closest to 0.5” to “max information”

Right now active learning explicitly ranks by predicted preference closest to 0.5. 

#### Change selection objective:

- Primary acquisition score: BALD (preferred) or pVar

- Secondary: keep your diversityQuota behavior exactly (it’s already the correct guardrail against collapsing to one niche). 

Also update the meaning of uncertaintyThreshold:

- From “confidence cutoff” to “minimum acquisition” (e.g., minBald or minVariance).

- You can keep the name if you want, but the semantics must be real uncertainty, not margin-from-0.5.

### 1.4 Fitness blending should stop trusting uncertain preference early

Today preference contributes as a centered/capped term. 

metrics-and-fitness

With uncertainty available, modify preference contribution:

- preferenceContribution = centered(pMean) * preferenceWeight * (1 - uncertainty)

- Keep existing caps/bootstrapping logic (still useful). 

This prevents the ensemble mean from “bullying” evolution when the ensemble itself disagrees.

## 2) What invariants must pass

These are non-negotiable invariants implied by your architecture and test posture:

### Determinism invariants

Given identical seeds + identical feedback sequence, the ensemble state must be bitwise identical.
(Your system already emphasizes determinism across runs.)

Active learning selection must be deterministic given the same shortlist + model state + seed.

### Behavioral invariants

Tie handling remains supported (preferred = Tie → target 0.5) as today. 

Feature id keyed weights remain the lookup mechanism (no positional coupling). 

Missing features default to 0, unknown weights don’t contribute (keep your current semantics). 

Diversity protection remains: diversityQuota still reserves slots for underrepresented nicheIds. 

### Safety invariant for evolution

Preference contribution to fitness must remain bounded and must not override degeneracy/safety gating behavior (your gating tests rely on this).

## 3) What tests must pass

You already have the right E2E surface area; these tests should be updated (breaking changes expected) and must pass:

### Existing E2E tests that must still pass (with updated assertions)

#### Active learning pair selection
Update test/e2e/active-learning.e2e.test.mjs to assert:

It prioritizes pairs with max ensemble uncertainty / information gain, not merely closest-to-0.5.

It still enforces diversityQuota.

#### Preference model updates from real feature vectors
Update test/e2e/preference-model-update.e2e.test.mjs to assert:

Ensemble updates are deterministic.

Mean prediction moves in the correct direction after consistent comparisons.

Uncertainty decreases as repeated similar samples accumulate.

#### Mock fitness behavior and gating
Update test/e2e/mock-fitness.e2e.test.mjs to assert:

Preference contribution is damped when uncertainty is high.

Degeneracy/safety gating behavior is unchanged.

### New unit tests you should add (small, high value)

#### preference-scoring.uncertainty.unit

Construct two ensembles:

one where all models identical → uncertainty == 0

one with deliberately split weights → uncertainty > 0

Verify pMean matches expected mean.

#### active-learning.acquisition.unit

Feed a fixed candidate pair set with known ensemble predictions.

Assert ranking is by BALD/variance (and deterministic).

## Bottom line

ChatGPT’s recommendation is directionally correct and practically important for your stated goals. Your current “confidence” is not uncertainty, and your active learning is therefore optimizing a proxy that will waste labels in exactly the regimes you care about. 

If you implement an ensemble + information-gain selection + uncertainty-damped fitness, you’ll get the real benefits of “Bayesian-ish active learning” with a fraction of the implementation risk—and you’ll keep your determinism guarantees.

## Update architectural docs

All existing architectural docs at docs/architecture/ should be reviewed in case they need to be updated to keep up-to-date.