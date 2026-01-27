# Unit Tests

Unit tests cover isolated behavior of modules without external services or long-running workflows.

## Scope
- Pure functions, helpers, and small modules.
- Deterministic behavior with seeded RNG and in-memory fixtures.
- No filesystem writes outside temp directories.

## Running
- `npm run test:unit`
- `node --test test/unit/path/to/file.test.mjs`

## Structure
- Group tests by domain (for example: `dsl`, `simulation-engine`).
- Keep shared fixtures in `test/unit/fixtures` or per-domain fixtures files.
