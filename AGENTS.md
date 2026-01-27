# Repository Guidelines

## Project Structure & Module Organization
- `README.md` provides the project overview and scope.
- `archive/` stores completed tickets and archived specs.
- `brainstorming/` contains exploratory ideas and early drafts (e.g., `ludo-forge-system.md`).
- `specs/` holds formal design documents and architecture notes (e.g., `simulation-engine.md`, `dsl.md`).
- `tickets/` tracks discrete work items and scoped proposals (e.g., `DSL-001-types.md`).
- `LICENSE` contains licensing information.

## Build, Test, and Development Commands
Type-check the DSL types with:
- `tsc -p tsconfig.json`

Run the JSON Schema tests with:
- `node --test test/dsl/schema.test.mjs`

Run the runtime validator tests with:
- `node --test test/dsl/validate.test.mjs`

Run the semantic validator tests with:
- `node --test test/dsl/semantic.test.mjs`

## Coding Style & Naming Conventions
- Markdown files should use clear headings, short paragraphs, and bullet lists where helpful.
- Keep filenames lowercase with hyphens or existing prefixes (e.g., `dsl.md`, `DSL-004-semantic-validation.md`).
- Prefer concise, descriptive section titles and avoid long multi-sentence headings.

## Testing Guidelines
Type-level tests live under `test/` and run via `tsc -p tsconfig.json`.
Runtime schema checks run via `node --test test/dsl/schema.test.mjs`.
Runtime validator checks run via `node --test test/dsl/validate.test.mjs`.
Runtime semantic checks run via `node --test test/dsl/semantic.test.mjs`.

## Commit & Pull Request Guidelines
- Commit messages in this repo use short, imperative sentences (e.g., “Revise README title and project description”). Follow that pattern.
- PRs should include:
  - A brief summary of changes and rationale.
  - Links to related specs or tickets (e.g., `specs/dsl.md`, `tickets/DSL-002-json-schema.md`).
  - Updates to documentation when behavior or scope changes.

## Security & Configuration Tips
There are no runtime secrets or configuration files in this repo. If you add them, document required environment variables and keep secrets out of version control.

## Agent-Specific Instructions
If you use AI agents, ensure outputs are reflected in `specs/` or `tickets/` and keep changes consistent with existing document structure.

# Stack and Constraints

## Baseline Language Choice
- Preferred: TypeScript for core systems.
- Rationale:
  - Strong typing across DSL AST, state, and actions reduces runtime errors.
  - Easier refactors as the DSL and kernel evolve.
  - Better editor tooling for a codebase with many cross-cutting types.
- Fallback: Plain JavaScript only if TS friction outweighs benefits.

## Runtime and Tooling
- Runtime: Node.js LTS (ESM).
- Package manager: npm (unless you prefer pnpm/yarn).
- Lint/format: minimal and non-blocking in MVP.

## Validation
- DSL schema validation: Ajv.
- Schema format: JSON Schema (versioned).

## Persistence
- MVP: JSONL files on disk.
- Next: SQLite via Node driver if queryability is needed.

## Concurrency
- Use worker threads for batch simulations and evaluations.
- Deterministic RNG seeding per worker.

## UI
- MVP: CLI (Node).
- Optional: simple web UI later if needed for preferences.

## Non-Goals (MVP)
- Python dependencies unless no viable JS/TS alternative exists.
- Complex UI frameworks before core systems are stable.
