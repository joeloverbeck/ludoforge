# MAPELIBINISS-05 — Schema descriptions and architecture docs ✅ COMPLETED

**Goal**: Update documentation and schema descriptions to reflect new binning semantics. No runtime code changes.

**Dependencies**: MAPELIBINISS-01 through MAPELIBINISS-04 (docs describe final state).

## Files to touch

- `schemas/config/map-elites.schema.json` — Add `"description"` fields to `DescriptorConfig` and its properties, noting that out-of-range values produce special bin tokens (`"unknown"`, `"under"`, `"over"`) rather than clamping. No structural schema changes (special bins are always-on, not configurable).
- `docs/architecture/evolutionary-engine.md` — The "Descriptor Binning" section (lines 39-48) already describes the 3-way pre-check correctly (updated in tickets 01-03). Remaining work: expand the "Niche Id" section (line 52) to document the full grammar `binToken := integer | "unknown" | "under" | "over"`. Add note about `nonFiniteKeys` metadata in the evaluation pipeline (Step 12 descriptor extraction).
- `docs/architecture/metrics-and-fitness.md` — Update any references to `assembleFeatureVector` to note the new `{ vector, nonFiniteKeys }` return shape.

## Out of scope

- Runtime code changes.
- Test changes.
- Config value changes (`configs/map-elites.json` unchanged — special bins are always-on).

## Acceptance criteria

- Architecture docs accurately describe the new binning algorithm (3-way pre-check, no clamping).
- Niche ID grammar is documented: `segment := <descriptorId> ":" <binToken>`, `nicheId := segment ("|" segment)*`, `binToken := integer | "unknown" | "under" | "over"`.
- `nonFiniteKeys` metadata flow documented (feature vector -> descriptor extraction -> null -> binning -> "unknown").
- No stale references to old "clamp then bin" behavior remain.
- Schema validates existing config files without error (`npm run test:unit` includes schema validation tests).

## Assumptions reassessed

- **Ticket said** "Rewrite Descriptor Binning section (lines 26-31)" — **Actual**: The Descriptor Binning section (lines 39-48) was already updated in tickets 01-03 and correctly describes the 3-way pre-check. No rewrite needed.
- **Remaining work** was limited to: expanding the Niche Id section with formal grammar, adding nonFiniteKeys metadata documentation, updating assembleFeatureVector return shape docs, and adding schema descriptions.

## Outcome

**What was actually changed vs originally planned:**

- `schemas/config/map-elites.schema.json`: Added `description` fields to `descriptors` array, `DescriptorConfig` object, and all 4 properties (`id`, `min`, `max`, `bins`). No structural schema changes.
- `docs/architecture/evolutionary-engine.md`: Expanded Niche Id section with formal grammar (`segment`, `nicheId`, `binToken` rules) and examples. Added new "nonFiniteKeys Metadata" subsection documenting the evaluation pipeline flow.
- `docs/architecture/metrics-and-fitness.md`: Updated Feature Vector Assembly section to document `{ vector, nonFiniteKeys }` return shape. Updated Steps 10-12 in the Built-in Evaluator pipeline description.
- The Descriptor Binning section did NOT need rewriting (already correct from tickets 01-03), contrary to what the ticket originally assumed.
- No stale "clamp then bin" references remain in docs (the word "clamped" in the binning section correctly refers to `Math.min(bins-1, ...)` for in-range values).
