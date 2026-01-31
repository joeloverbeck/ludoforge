import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Must mock BEFORE importing the module under test
const { LOG_ADAPTER_VERSION } = await import(
  "../../../src/evaluation-analytics/log-adapter.js"
);

mock.module("../../../src/evaluation-analytics/log-adapter.js", {
  namedExports: {
    LOG_ADAPTER_VERSION,
    LogAdapterError: Error,
    adaptSimulationLog() {
      return { ok: false, error: new Error("forced adapter failure") };
    },
  },
});

const { createEvaluator } = await import(
  "../../../src/evaluation-analytics/create-evaluator.js"
);

const choiceGame = JSON.parse(
  readFileSync(
    new URL("../../e2e/fixtures/choice-game.json", import.meta.url),
    "utf-8"
  )
);

function makeGenome(definition = choiceGame) {
  return { id: "test-genome", definition: structuredClone(definition) };
}

describe("createEvaluator — log adapter failure path", () => {
  it("returns fitness null with logAdapterOk false when adapter fails", async () => {
    const { evaluator } = createEvaluator({ simulationRuns: 1 });
    const result = await evaluator(makeGenome());

    assert.equal(result.fitness, null);
    assert.equal(result.descriptors, null);
    assert.equal(result.diagnostics.logAdapterOk, false);
    assert.ok(result.diagnostics.error);
    assert.equal(result.diagnostics.error.message, "forced adapter failure");
  });
});
