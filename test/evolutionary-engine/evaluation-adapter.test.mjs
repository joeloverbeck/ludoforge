import { test } from "node:test";
import assert from "node:assert/strict";

import { evaluateGenome } from "../../src/evolutionary-engine/evaluation-adapter.js";
import { baseDefinition, missingTerminationDefinition } from "../dsl/fixtures.mjs";

test("adapter short-circuits invalid genomes before evaluation", () => {
  let called = false;
  const result = evaluateGenome(
    { definition: missingTerminationDefinition },
    {
      evaluator: () => {
        called = true;
        return { fitness: 1, descriptors: { length: 1 } };
      },
    }
  );

  assert.equal(called, false);
  assert.equal(result.fitness, null);
  assert.equal(result.descriptors, null);
  assert.equal(result.diagnostics.validation.valid, false);
  assert.deepEqual(result.diagnostics.safety, []);
});

test("adapter reports safety gate failures without calling evaluator", () => {
  let called = false;
  const result = evaluateGenome(
    { definition: baseDefinition },
    {
      gates: [{ name: "no-op", check: () => ({ ok: false, reason: "blocked" }) }],
      evaluator: () => {
        called = true;
        return { fitness: 1, descriptors: { length: 1 } };
      },
    }
  );

  assert.equal(called, false);
  assert.equal(result.fitness, null);
  assert.equal(result.descriptors, null);
  assert.equal(result.diagnostics.safety.length, 1);
  assert.equal(result.diagnostics.safety[0].reason, "blocked");
});

test("adapter forwards evaluator output on success", () => {
  const result = evaluateGenome(
    { definition: baseDefinition },
    {
      evaluator: () => ({
        fitness: 0.7,
        descriptors: { length: 4, randomness: 0.2 },
        diagnostics: { metrics: { agency: 0.7 } },
      }),
    }
  );

  assert.equal(result.fitness, 0.7);
  assert.deepEqual(result.descriptors, { length: 4, randomness: 0.2 });
  assert.equal(result.diagnostics.validation.valid, true);
  assert.deepEqual(result.diagnostics.safety, []);
  assert.deepEqual(result.diagnostics.evaluation, { metrics: { agency: 0.7 } });
});
