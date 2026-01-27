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
  const schemaResult = validateGameDefinition(definition);
  if (!schemaResult.valid) {
    return {
      valid: false,
      errors: schemaResult.errors,
      issues: [],
    };
  }

  const semanticResult = validateSemanticDefinition(definition);
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
