# Diversity Term Issues

We fed the architectural docs to ChatGPT so that it could find bugs. Its said: "Actual bugs / clearly wrong aspects Diversity term is currently a no-op As per the fitness blend, the diversity contribution uses defaults like "diversityPressure * diversityWeight" added to the base, but it's essentially a no-op right now. Addressing issues with current system behavior Currently, the diversity term doesn't actually influence rankings between genomes, and as a result, it fails to encourage real diversity. A possible fix would be to compute a diversity bonus for each genome, focusing on aspects like novelty or filling empty niches."

ChatGPT’s core observation is correct: as documented, your “diversity contribution” is a constant, not a diversity signal, because it’s defined as diversityPressure * diversityWeight (no dependence on the genome, its niche, or the archive). 

That means:

- For any two genomes with the same degeneracy penalty multiplier, it is literally a no-op for ranking (adding the same constant to both). 

- Even when penalties differ, the constant still doesn’t encode diversity; it can only create a global offset that interacts with (1 - penalty) in a slightly weird way, but it still won’t “encourage diversity” because it contains zero information about novelty/niches. 

Also: your system already has real diversity mechanisms elsewhere:

- MAP-Elites maintains diversity by keeping elites per descriptor niche. 

- You explicitly inject structural_complexity to provide a diversity axis independent of behavior. 

- Shortlisting already diversifies by maximizing coordinate distance across elites. 

- Active learning reserves slots for underrepresented niches via diversityQuota.

So I don’t think the proposed “novelty / empty niche bonus inside fitness” is automatically better than what you have. With MAP-Elites, pushing novelty into fitness often muddies the meaning of fitness (quality) vs diversity (coverage). The best fix is to stop pretending the constant is a diversity term—either remove/disable it, or implement a real diversity bonus in the places where selection needs it (shortlist selection / active learning / seeding), not in the core fitness blend.

# Spec: Diversity term is currently non-functional (constant offset)

## 1) What needs to change

### A. Fix the misleading “diversity contribution” in fitness
**Current (documented) behavior**
- `diversity = diversityPressure * diversityWeight`
- `finalFitness = (base + diversity + preference) * (1 - clamp(penalty, 0, 1))`

This “diversity” is constant and does not encode novelty, niche rarity, or archive distance.

**Required change (recommended minimal + correct)**
1. In `src/evaluation-analytics/fitness.js` (`computePreferenceAwareFitness`):
   - Set `diversityContribution = 0` by default.
   - Treat `diversityPressure` / `diversityWeight` as deprecated OR as a “baselineBias” (renamed conceptually).
2. In `docs/architecture/metrics-and-fitness.md`:
   - Replace the “Diversity contribution … `diversityPressure * diversityWeight`” wording with either:
     - “baselineBias (constant offset)” **or**
     - remove the term from the formula entirely and state: “Diversity is achieved via MAP-Elites descriptors + shortlist diversification + active-learning diversity quota.”
3. In `pipeline-overview.md` Stage “Fitness computation”:
   - Remove “diversity pressure blend into fitness” phrasing unless a real diversity computation exists.

### B. Optional (only if you truly want a diversity *signal*): add diversity where it belongs
If you want novelty/niche-filling pressure, implement it *outside* the base fitness blend:

Option B1 (preferred): **Shortlist-only novelty boost**
- Add an optional `noveltyScore` when producing the shortlist:
  - `novelty = mean_kNN_distance(candidate.coords, selectedOrArchive.coords)`
  - Use it ONLY for shortlist candidate ordering/tie-breaks, not for archive elite replacement.

Option B2: **Active-learning candidate selection diversity**
- Strengthen the existing `diversityQuota` behavior by making underrepresented `nicheId` more likely to appear in pairs.

(Do NOT do “empty niche bonus in fitness” unless you can show it improves archive coverage without degrading quality; MAP-Elites already fills niches.)

## 2) What invariants should pass

### Fitness correctness & determinism
- Determinism: given identical `(featureVector, preferenceModelState, degeneracyReport, config)`, `computePreferenceAwareFitness` returns identical fitness.
- Monotonicity wrt base score: holding preference + penalty constant, higher base must not yield lower fitness.
- Penalty dominance preserved: multiplicative penalty remains the only degeneracy pressure mechanism (i.e., degenerate genomes cannot “buy back” penalties via additive terms).

### Semantics clarity
- The docs must not claim a diversity mechanism exists in fitness unless it depends on genome-/archive-specific data.
- Diversity mechanisms remain:
  - MAP-Elites niche coverage (per-niche elite retention),
  - structural complexity descriptor axis,
  - shortlist coordinate-distance diversification,
  - active-learning diversity quota.

## 3) What tests should pass

### Unit tests (add or update)
1. `fitness: diversity term is not used by default`
   - With `diversityPressure/diversityWeight` set in config, confirm `diversityContribution === 0` (or confirm it is treated as baselineBias but explicitly labeled).
2. `fitness: constant offsets do not change ranking when penalties equal`
   - Two genomes A/B with same penalty and different base: ranking depends only on `(base + preference)`; adding a constant cannot flip ordering.
3. `fitness: penalty multiplier still dominates`
   - Genome with penalty 1.0 results in fitness 0 regardless of base/preference.
4. `shortlist: diversification still works (if shortlistSize > 0)`
   - Given a set of elite coords, shortlist selection maximizes min coordinate distance as documented.
5. (If Optional B1 implemented) `shortlist novelty tie-break is deterministic`
   - For equal fitness, novelty ordering is deterministic and stable under fixed RNG seed.

### Integration / E2E (no behavior regressions)
- Existing end-to-end evolution runner tests (seed → evaluate → map-elites → shortlist) must pass unchanged.
- Archive occupancy and elite replacement rules remain driven by MAP-Elites placement + per-niche fitness comparison, not by any global novelty term.