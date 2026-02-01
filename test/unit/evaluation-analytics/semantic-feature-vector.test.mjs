import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { createEvaluator } from "../../../src/evaluation-analytics/create-evaluator.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

function makeGenome(definition) {
  return { id: "test-genome", definition: structuredClone(definition) };
}

describe("create-evaluator – semantic feature vector injection", () => {
  it("injects semantic_warning_count from context into feature vector", async () => {
    const { evaluator } = createEvaluator({ simulationRuns: 1 });
    const genome = makeGenome(baseDefinition);
    const result = await evaluator(genome, { semanticWarningCount: 2, semanticInfoCount: 1 });

    assert.ok(result.diagnostics.featureVector);
    assert.equal(result.diagnostics.featureVector.semantic_warning_count, 2);
    assert.equal(result.diagnostics.featureVector.semantic_info_count, 1);
  });

  it("defaults to zero when context has no counts", async () => {
    const { evaluator } = createEvaluator({ simulationRuns: 1 });
    const genome = makeGenome(baseDefinition);
    const result = await evaluator(genome, {});

    assert.ok(result.diagnostics.featureVector);
    assert.equal(result.diagnostics.featureVector.semantic_warning_count, 0);
    assert.equal(result.diagnostics.featureVector.semantic_info_count, 0);
  });

  it("defaults to zero when context is undefined", async () => {
    const { evaluator } = createEvaluator({ simulationRuns: 1 });
    const genome = makeGenome(baseDefinition);
    const result = await evaluator(genome);

    assert.ok(result.diagnostics.featureVector);
    assert.equal(result.diagnostics.featureVector.semantic_warning_count, 0);
    assert.equal(result.diagnostics.featureVector.semantic_info_count, 0);
  });
});
