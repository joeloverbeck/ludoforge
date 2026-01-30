# AGEENS-04: AgentSuite data type and JSON Schema

**Status**: DONE

**Goal**: Define `AgentSuite` as a first-class concept with validation.

**Description**: Created `AgentSuite` type: `{ id: string, agents: AgentDescriptor[], seedPolicy: "derive"|"fixed", seed?: number, notes?: string }`. Created JSON Schema for an array of suites. Created default config with two suites: `"random-only"` (all random) and `"random-greedy"` (mixed). Added validation function. Registered config entry in loader.

**Files touched**:
- `src/evaluation-analytics/agent-suite.js` (new)
- `schemas/config/agent-suites.schema.json` (new)
- `configs/agent-suites.json` (new)
- `src/config/loader.js` (modified — added agent-suites config entry)
- `docs/architecture/README.md` (modified — added agent-suites to config ownership table)
- `test/unit/evaluation-analytics/agent-suite.test.mjs` (new)

**Out of scope**:
- No evaluator integration
- No metric changes
- No runner changes
- No CLI changes

**Acceptance criteria**:
- [x] Tests: `node --test test/unit/evaluation-analytics/agent-suite.test.mjs` passes
- [x] Valid suites pass validation; invalid suites (missing id, empty agents) rejected
- [x] Schema validates against `configs/agent-suites.json`
- [x] Invariant: all existing tests unaffected

**Dependencies**: None
