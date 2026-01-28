# Config Schemas

This directory holds JSON Schemas for files under `configs/`.

## Naming
- One schema per config file.
- File name matches the config file with `.schema.json` suffix (example: `simulation.schema.json`).

## Conventions
- Schemas use JSON Schema draft 2020-12.
- Required fields mirror the config file surface area; optional fields remain optional.
- Enums and numeric bounds reflect current config expectations and constraints.
