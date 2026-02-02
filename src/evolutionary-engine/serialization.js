import { createHash } from "node:crypto";

import { serializeGameDefinition } from "../dsl/serialize.js";
import { validateGameDefinition } from "../dsl/validate.js";
import { validateSemanticDefinition } from "../dsl/semantic.js";

function hashGenome(serialized) {
  return `genome-${createHash("sha256").update(serialized).digest("hex")}`;
}

export function serializeGenome(definition) {
  return serializeGameDefinition(definition);
}

export function validateGenomeDefinition(definition) {
  process.stderr.write("[validate] schema start\n");
  const schemaResult = validateGameDefinition(definition);
  process.stderr.write(`[validate] schema done valid=${schemaResult.valid}\n`);
  if (!schemaResult.valid) {
    return {
      valid: false,
      errors: schemaResult.errors,
      issues: [],
    };
  }

  process.stderr.write("[validate] semantic start\n");
  const semanticResult = validateSemanticDefinition(definition);
  process.stderr.write(`[validate] semantic done valid=${semanticResult.valid}\n`);
  return {
    valid: semanticResult.valid,
    errors: [],
    issues: semanticResult.issues,
  };
}

export function createGenomeId(definition) {
  const validation = validateGenomeDefinition(definition);
  if (!validation.valid) {
    const error = new Error("Invalid genome definition");
    error.details = validation;
    throw error;
  }
  return hashGenome(serializeGenome(definition));
}
