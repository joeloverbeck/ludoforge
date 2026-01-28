# DSL Semantic Refactor

## Overview
Refactor `src/dsl/semantic.js` to reduce side-effects and enforce single-responsibility boundaries while preserving the current behavior and public API.

## Goals
- Keep `collectSemanticIssues` and `validateSemanticDefinition` behavior unchanged.
- Separate concerns into smaller, testable modules with explicit inputs/outputs.
- Make stateful bookkeeping (e.g., used ID tracking) explicit and isolated.
- Improve readability and maintainability without altering runtime semantics.

## Non-Goals
- Changing validation rules, messages, or issue paths.
- Reformatting unrelated files.
- Introducing new DSL capabilities.

## Current Responsibilities (to split)
`src/dsl/semantic.js` currently includes all of the following in one module:
- Issue accumulation and path formatting helpers.
- Collection of IDs and token attribute metadata.
- Int bounds validation for variables and token attributes.
- Reference validation (var/token/zone/meta) and usage tracking.
- Domain inference for types and refs.
- Expression evaluation for satisfiability and tautologies.
- Selector/effect validation.
- Action analysis (free-lunch, dominant, no-meaningful).
- Trigger/step/termination validation.

## Proposed Refactor (Module Boundaries)
Introduce a small set of focused helpers under `src/dsl/semantic/` (or similar) and keep `src/dsl/semantic.js` as the orchestrator:

- `issue-collector.js`
  - `createIssueCollector()` or equivalent helper to push issues with consistent path/message/rule structure.
  - `joinPath` and `normalizeArray` utilities.

- `id-index.js`
  - Build maps/sets for variable IDs, token type IDs, zones, and token attributes.
  - Provide helpers for attribute lookup (`tokenAttributeIds`, `tokenAttributeDefs`).

- `bounds-validator.js`
  - Pure validation for int bounds and initial values.
  - Accepts `{ variable, path, initialPath }` and returns issue objects.

- `ref-validator.js`
  - Validate refs (var/token/zone/meta/player) against indexes.
  - Own usage tracking (`usedVariableIds`, `usedTokenTypeIds`, `usedZoneIds`).
  - Allow meta refs only when explicitly enabled.

- `domain.js`
  - `domainForType` and `domainForRef` extracted to compute value domains.

- `expr-evaluator.js`
  - `evaluateExpr` and `evaluateCmp` to analyze satisfiability/tautologies.
  - Pure functions with no direct side-effects; all context injected.

- `semantic-validators.js`
  - `validateSelector`, `validateEffect`, and `validateExpr` wiring together ref validation.

- `action-analysis.js`
  - Analyze actions for free-lunch, dominant, and no-meaningful cases.
  - Keeps calculation logic separated from traversal.

`src/dsl/semantic.js` will:
- Build indexes once.
- Wire validators together with shared state (issues + usage tracking).
- Perform traversal in a clear order.

## Public API Stability
- `collectSemanticIssues(definition)` still returns a list of issues with identical `path`, `message`, and `rule` values.
- `validateSemanticDefinition(definition)` still returns `{ valid, issues }`.
- `src/dsl/semantic.d.ts` remains accurate; update only if file layout changes require it.

## Testing Requirements
Every refactored component must be covered by existing integration tests in `test/integration/` or new ones. No refactor changes should be made until integration coverage exists.

### Existing Coverage
- Unit tests: `test/unit/dsl/semantic.test.mjs` cover many rules.
- E2E tests: `test/e2e/game-definition.e2e.test.mjs` and `test/e2e/fixtures.e2e.test.mjs` validate semantic checks in full flows.

### New Integration Tests (to add)
Create `test/integration/dsl-semantic.test.mjs` (or similar) that exercises the exported API with multiple fixtures to cover the refactored responsibilities end-to-end:

1. **Bounds + initial values**
   - Trigger `int-bounds` and `int-initial-bounds` in a single fixture.

2. **Reference validation + usage tracking**
   - Unknown var/token/zone/attribute references (`ref-unknown`, `token-type-unknown`, `zone-unknown`, `token-attribute-unknown`).
   - Unused variable/token type/zone (`unused-variable`, `unused-token-type`, `unused-zone`).

3. **Meta refs**
   - Allow known meta IDs in expressions and reject unknown ones (`meta-ref-unknown`).

4. **Expression satisfiability**
   - Unsatisfiable precondition (`action-precondition-unsatisfiable`).

5. **Action analysis**
   - Free-lunch (`free-lunch`), dominant action (`dominant-action`), and no-meaningful actions (`no-meaningful-actions`).

6. **Turn policy guardrails**
   - `no-legal-actions-default-outcome` validation for terminate vs pass/error.

Each integration test should assert the presence/absence of rule codes and verify `valid` is consistent with issues length.

## Validation Steps
- Run `npm run test:unit` before and after refactor.
- Run `node --test test/integration/dsl-semantic.test.mjs` before and after refactor once added.

## Open Questions
- Preferred directory structure for new helpers (`src/dsl/semantic/*` vs `src/dsl/semantic-helpers/*`).
- Whether to keep helpers as internal (non-exported) modules or re-export them for reuse.
