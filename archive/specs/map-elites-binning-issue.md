# MAP-Elites Binning Issue

We fed our architectural docs to ChatGPT so that it could find possible improvements. It said: "Improve MAP-Elites binning so it doesn’t collapse diversity at the edges Current binning clamps values into [min,max] then bins. evolutionary-engine That means “unknown” / NaN / out-of-range values pile into edge bins and distort niches."

## Are the claims correct?
✅ “Current binning clamps values into [min,max] then bins.”

Yes — that’s exactly what your docs specify for src/evolutionary-engine/map-elites.js: clamp → normalize → floor() → clamp to [0, bins-1]. 

evolutionary-engine

⚠️ “Unknown / NaN values pile into edge bins.”

This is directionally right, but the details are slightly off in your current architecture:

- Your built-in evaluator extracts descriptors from the feature vector. 

metrics-and-fitness

- Feature vectors normalize non-finite metric values to 0 (“non-finite values become 0”). 

metrics-and-fitness


So a NaN typically does not reach MAP-Elites as NaN — it becomes 0, which then bins like any other value.

- That still creates a real problem: “unknown” is silently conflated with a real numeric value (0), and depending on descriptor ranges (e.g. [0.2, 1]), that 0 will indeed slam into the min edge bin and distort niches.

✅ “Out-of-range values pile into edge bins.”

Yes. Clamping guarantees it. 

evolutionary-engine

“Adaptive quantile bin ranges”

This is not automatically “more beneficial” for MAP-Elites. Standard MAP-Elites assumes a fixed niche grid; quantile ranges that change over time cause niche identity drift, undermining “elite per niche” meaning and complicating determinism/resume semantics (you explicitly care about deterministic runs). Your runner’s resume rules already treat the “MAP-Elites descriptor set” as compatibility-critical, which quantile drift would constantly violate unless ranges are frozen. 

evolution-runner

Verdict:

- Explicit “unknown/under/over” binning is strongly beneficial (robustness + better diversity signal + avoids silent distortion).

- Quantile/adaptive ranges should be optional and “freeze-per-run” if you do them at all.

## 1) What needs to change

### 1.1 Descriptor value integrity must be preserved (stop losing “unknown” to 0)

Problem: non-finite descriptor sources become 0 during feature vector normalization, so MAP-Elites can’t distinguish “unknown” from a real 0. 

Change: modify the evaluation pipeline so descriptor extraction can mark unknown explicitly.

New required behavior:

- assembleFeatureVector(...) returns:

-- featureVector (still normalized; non-finite → 0, unchanged for fitness stability)

-- featureVectorMeta.nonFiniteKeys: string[] (metric ids whose raw values were non-finite)

- Descriptor extraction (“pick descriptorKeys from feature vector”) becomes:

-- If descriptorKey ∈ nonFiniteKeys → descriptor value is null (meaning “unknown”)

-- Else → descriptor value is the numeric value from featureVector

This keeps fitness robust while enabling MAP-Elites to treat unknown distinctly. (Your docs already define descriptor extraction as step 12; you’re extending it to be semantically correct.)

### 1.2 MAP-Elites binning must support special bins (unknown/underflow/overflow)

Problem: clamping collapses “under/over/unknown-ish” cases into edge bins. 

evolutionary-engine

Change: replace “always clamp then bin” with a 3-way pre-check:

For each descriptor (id, min, max, bins):

1. If value is null / undefined / not finite → bin token = "unknown"

2. Else if value < min → bin token = "under"

3. Else if value > max → bin token = "over"

4. Else → in-range bin index in [0, bins-1] using:

- t = (value - min) / (max - min)

- idx = min(bins - 1, floor(t * bins))

No clamping of the value itself; only binning logic decides special bins vs in-range.

### 1.3 Niche-id serialization must allow non-integer bin tokens

Right now: descriptorId:bin with bin assumed numeric. 

Change: define bin as a token, either:

- integer string ("0".."bins-1") for in-range

- "unknown" | "under" | "over" for special

New niche id grammar (canonical):

- segment := <descriptorId> ":" <binToken>

- nicheId := segment ("|" segment)*

- binToken := integer | "unknown" | "under" | "over"

(Keep the delimiter the same unless you want to break it; either is fine since you’re OK with breaking changes, but this is minimally invasive.)

### 1.4 Config/schema + docs updates

- Update docs/architecture/evolutionary-engine.md to describe special bins and the new niche id token rules. 

- Update config schema only if you want these to be configurable. If you want clean/robust defaults, I’d make special bins non-optional and avoid config flags entirely.

-- If configurable, extend MapElitesDescriptorConfig in runner-config.schema.json to include:

--- specialBins: { unknown: boolean, under: boolean, over: boolean } (defaults true) Current schema has only id/min/max/bins.

### 1.5 Seed generation must use identical binning semantics

Your seeding system bins against MAP-Elites descriptors for coverage targeting. 

evolution-runner

Change required: seed-generation binning must:

- use the exact same computeBinToken() logic

- exclude special bins from “coverage targets” (you should not try to “fill” unknown/under/over as a goal)

- still report special-bin counts in seed reports as diagnostics

## 2) Invariants that must hold
### Determinism & stability

Same inputs ⇒ same nicheId, always. (Includes handling for null, undefined, NaN, ±Infinity.)

MAP-Elites placement remains deterministic for identical evaluated populations. 

pipeline-overview

### Totality / no-crash guarantee

map-elites.place(...) must never throw due to descriptor values (config validation can still throw; value handling must be total).

Missing descriptor keys, null, or non-finite values must map to "unknown" (never propagate NaN into nicheId construction).

### No silent conflation

A descriptor that is non-finite upstream must not be binned as if it were 0.

"unknown" must be a distinct niche coordinate from any in-range numeric bin.

### Edge correctness

value === min bins into index 0.

value === max bins into index bins-1 (never produces bins before clamping).

### Consistency across the pipeline

Seed-generation binning and MAP-Elites placement binning must be identical functions (same inputs → same bin token), so “coverage targeting” matches real placement. 

evolution-runner

### Fitness pipeline remains robust

Fitness computation continues to operate on a normalized feature vector where non-finite → 0 (no NaNs in preference model / scoring).

## 3) Tests that must pass (and new tests to add)
### Existing E2E tests that must continue to pass

From your E2E coverage doc, at minimum (not exhaustive):

test/e2e/evolution-pipeline.e2e.test.mjs (pipeline phases, deterministic ids, MAP-Elites produces next gen) 

e2e-coverage

test/e2e/active-learning.e2e.test.mjs (diversity quota by nicheId — may need fixture expectation updates if niche ids now include tokens) 

e2e-coverage

test/e2e/preference-model-update.e2e.test.mjs (feature vectors deterministic; your meta additions must not break serialization determinism)

### Add focused unit tests (required)

Create a unit suite for binning, e.g. test/unit/map-elites-binning.test.mjs:

#### Binning cases

in-range:

min → 0

max → bins-1

midpoint values map as expected

under/over:

value < min → "under"

value > max → "over"

unknown:

null / undefined → "unknown"

NaN, Infinity, -Infinity → "unknown"

#### Niche id serialization

tokens appear exactly as specified (stable, no whitespace, same ordering as descriptor config order).

#### Add evaluation/meta propagation tests (required)

Create a unit test around assembleFeatureVector + descriptor extraction:

Given a metric with raw value NaN, featureVector[metricId] === 0 AND featureVectorMeta.nonFiniteKeys includes metricId.

Descriptor extraction for that key produces descriptors[metricId] === null.

#### Seed-generation consistency test (required)

For a generated candidate with known descriptor values, seed-generation computed nicheId must match MAP-Elites placement nicheId exactly.

Special bins are excluded from coverage targeting but included in diagnostics counts.

## Opinionated recommendation on quantile/adaptive ranges

Don’t do adaptive quantile ranges inside MAP-Elites placement unless you also implement a “range calibration” phase that freezes ranges per run and persists them into run metadata (so resume + determinism are preserved). Otherwise you’re not doing MAP-Elites anymore; you’re doing a drifting partitioning scheme that will fight your “elite per niche” logic and your resume compatibility rules.

## Update architectural docs

The docs at docs/architecture/ need to be updated given these changes, to keep up-to-date.