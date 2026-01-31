import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createEvaluator } from "../../../src/evaluation-analytics/create-evaluator.js";

const choiceGame = JSON.parse(
  readFileSync(
    new URL("../../e2e/fixtures/choice-game.json", import.meta.url),
    "utf-8"
  )
);

function makeGenome(definition = choiceGame) {
  return { id: "test-genome", definition: structuredClone(definition) };
}

describe("createEvaluator", () => {
  it("returns an object with evaluator as a function", () => {
    const result = createEvaluator();
    assert.equal(typeof result.evaluator, "function");
  });

  it("evaluator returns { fitness, descriptors, diagnostics }", async () => {
    const { evaluator } = createEvaluator({ simulationRuns: 2 });
    const result = await evaluator(makeGenome());
    assert.ok("fitness" in result);
    assert.ok("descriptors" in result);
    assert.ok("diagnostics" in result);
  });

  it("fitness is a finite number", async () => {
    const { evaluator } = createEvaluator({ simulationRuns: 2 });
    const result = await evaluator(makeGenome());
    assert.equal(typeof result.fitness, "number");
    assert.ok(Number.isFinite(result.fitness), `fitness should be finite, got ${result.fitness}`);
  });

  it("default descriptorKeys yields agency and variety", async () => {
    const { evaluator } = createEvaluator({ simulationRuns: 2 });
    const result = await evaluator(makeGenome());
    assert.ok("agency" in result.descriptors);
    assert.ok("variety" in result.descriptors);
    assert.equal(Object.keys(result.descriptors).length, 2);
  });

  it("custom descriptorKeys controls descriptor extraction", async () => {
    const { evaluator } = createEvaluator({
      simulationRuns: 2,
      descriptorKeys: ["agency", "strategic_depth", "pacing_tension"],
    });
    const result = await evaluator(makeGenome());
    assert.deepStrictEqual(
      Object.keys(result.descriptors).sort(),
      ["agency", "pacing_tension", "strategic_depth"]
    );
  });

  it("simulationRuns controls batch count", async () => {
    const { evaluator } = createEvaluator({ simulationRuns: 3 });
    const result = await evaluator(makeGenome());
    assert.equal(result.diagnostics.simulationCount, 3);
  });

  it("diagnostics.coreMetrics is a non-empty array", async () => {
    const { evaluator } = createEvaluator({ simulationRuns: 2 });
    const result = await evaluator(makeGenome());
    assert.ok(Array.isArray(result.diagnostics.coreMetrics));
    assert.ok(result.diagnostics.coreMetrics.length > 0);
  });

  it("diagnostics.extendedMetrics is null by default", async () => {
    const { evaluator } = createEvaluator({ simulationRuns: 2 });
    const result = await evaluator(makeGenome());
    assert.equal(result.diagnostics.extendedMetrics, null);
  });

  it("includeExtendedMetrics: true populates extendedMetrics array", async () => {
    const { evaluator } = createEvaluator({
      simulationRuns: 2,
      includeExtendedMetrics: true,
    });
    const result = await evaluator(makeGenome());
    assert.ok(Array.isArray(result.diagnostics.extendedMetrics));
    assert.ok(result.diagnostics.extendedMetrics.length > 0);
  });

  it("diagnostics.degeneracy has flags array", async () => {
    const { evaluator } = createEvaluator({ simulationRuns: 2 });
    const result = await evaluator(makeGenome());
    assert.ok(Array.isArray(result.diagnostics.degeneracy.flags));
  });

  it("diagnostics.featureVector is an object", async () => {
    const { evaluator } = createEvaluator({ simulationRuns: 2 });
    const result = await evaluator(makeGenome());
    assert.equal(typeof result.diagnostics.featureVector, "object");
    assert.ok(result.diagnostics.featureVector !== null);
  });

  it("diagnostics.fitnessResult has score", async () => {
    const { evaluator } = createEvaluator({ simulationRuns: 2 });
    const result = await evaluator(makeGenome());
    assert.equal(typeof result.diagnostics.fitnessResult.score, "number");
  });

  it("genome is not mutated", async () => {
    const genome = makeGenome();
    const snapshot = JSON.stringify(genome);
    const { evaluator } = createEvaluator({ simulationRuns: 2 });
    await evaluator(genome);
    assert.equal(JSON.stringify(genome), snapshot);
  });

  it("same seed produces deterministic results", async () => {
    const { evaluator } = createEvaluator({ simulationRuns: 3, seed: 42 });
    const result1 = await evaluator(makeGenome());
    const result2 = await evaluator(makeGenome());
    assert.equal(result1.fitness, result2.fitness);
    assert.deepStrictEqual(result1.descriptors, result2.descriptors);
  });

  it("custom agentFactory is called", async () => {
    let factoryCalled = false;
    const { evaluator } = createEvaluator({
      simulationRuns: 2,
      agentFactory(definition) {
        factoryCalled = true;
        return Array.from({ length: definition.players.count }, () => ({
          kind: "random",
        }));
      },
    });
    await evaluator(makeGenome());
    assert.ok(factoryCalled);
  });

  it("returns degraded result when engine creation fails (agentFactory returns [])", async () => {
    const { evaluator } = createEvaluator({
      simulationRuns: 1,
      agentFactory() {
        return [];
      },
    });
    const result = await evaluator(makeGenome());
    assert.equal(result.fitness, null);
    assert.equal(result.descriptors, null);
    assert.equal(result.diagnostics.simulationError, true);
    assert.equal(typeof result.diagnostics.error, "string");
  });

  it("returns degraded result when simulation throws", async () => {
    // Create a game definition that will cause the simulation to throw.
    // A game with no actions and noLegalActions policy "error" triggers immediately.
    const noActionsGame = {
      version: "1.0",
      players: { count: 2 },
      state: { variables: [] },
      actions: [],
      turn: {
        scheduler: "round_robin",
        noLegalActions: { policy: "error", reason: "no-legal-actions" },
      },
      termination: { conditions: [], maxTurns: 50 },
    };
    const { evaluator } = createEvaluator({ simulationRuns: 1 });
    const result = await evaluator({ id: "no-actions", definition: noActionsGame });
    assert.equal(result.fitness, null);
    assert.equal(result.descriptors, null);
    assert.equal(result.diagnostics.simulationError, true);
    assert.equal(typeof result.diagnostics.error, "string");
  });

  it("missing descriptor keys default to 0", async () => {
    const { evaluator } = createEvaluator({
      simulationRuns: 2,
      descriptorKeys: ["nonexistent_key_xyz"],
    });
    const result = await evaluator(makeGenome());
    assert.equal(result.descriptors.nonexistent_key_xyz, 0);
  });

  it("default behavior (no suites) has no suiteResults in diagnostics", async () => {
    const { evaluator } = createEvaluator({ simulationRuns: 2 });
    const result = await evaluator(makeGenome());
    assert.equal(result.diagnostics.suiteResults, undefined);
  });

  it("portfolioMetrics.enabled without suites has no suiteResults", async () => {
    const { evaluator } = createEvaluator({
      simulationRuns: 2,
      portfolioMetrics: { enabled: true },
    });
    const result = await evaluator(makeGenome());
    assert.equal(result.diagnostics.suiteResults, undefined);
  });

  it("portfolioMetrics.enabled with suites populates diagnostics.suiteResults", async () => {
    const suites = [
      { id: "random-only", agents: [{ kind: "random" }, { kind: "random" }], seedPolicy: "derive" },
      { id: "random-greedy", agents: [{ kind: "random" }, { kind: "greedy" }], seedPolicy: "derive" },
    ];
    const { evaluator } = createEvaluator({
      simulationRuns: 2,
      seed: 42,
      agentSuites: suites,
      agentSuiteRuns: { "random-only": 2, "random-greedy": 2 },
      portfolioMetrics: { enabled: true },
    });
    const result = await evaluator(makeGenome());
    assert.ok(result.diagnostics.suiteResults != null);
    assert.ok("random-only" in result.diagnostics.suiteResults);
    assert.ok("random-greedy" in result.diagnostics.suiteResults);
    assert.ok(Array.isArray(result.diagnostics.suiteResults["random-only"].results));
    assert.equal(result.diagnostics.suiteResults["random-only"].results.length, 2);
  });

  it("suite results are deterministic with same seed", async () => {
    const suites = [
      { id: "s1", agents: [{ kind: "random" }, { kind: "random" }], seedPolicy: "derive" },
    ];
    const opts = {
      simulationRuns: 2,
      seed: 77,
      agentSuites: suites,
      agentSuiteRuns: { s1: 3 },
      portfolioMetrics: { enabled: true },
    };
    const { evaluator: ev1 } = createEvaluator(opts);
    const { evaluator: ev2 } = createEvaluator(opts);
    const r1 = await ev1(makeGenome());
    const r2 = await ev2(makeGenome());
    assert.deepStrictEqual(r1.diagnostics.suiteResults, r2.diagnostics.suiteResults);
  });

  it("portfolioMetrics not enabled does not run suites even if provided", async () => {
    const suites = [
      { id: "s1", agents: [{ kind: "random" }, { kind: "random" }], seedPolicy: "derive" },
    ];
    const { evaluator } = createEvaluator({
      simulationRuns: 2,
      seed: 42,
      agentSuites: suites,
      agentSuiteRuns: { s1: 2 },
      // portfolioMetrics not set or enabled: false
    });
    const result = await evaluator(makeGenome());
    assert.equal(result.diagnostics.suiteResults, undefined);
  });

});
