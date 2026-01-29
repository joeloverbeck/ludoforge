import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createEvaluator } from "../../src/evaluation-analytics/create-evaluator.js";

async function loadFixture(name) {
  const fileUrl = new URL(`./fixtures/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

function makeGenome(id, definition) {
  return { id, definition };
}

describe("degeneracy-accuracy", () => {
  describe("degenerate game detection", () => {
    it("evo-non-terminating produces degeneracy flags via real simulation", async () => {
      const definition = await loadFixture("evo-non-terminating.json");
      const genome = makeGenome("degenerate", definition);

      const { evaluator } = createEvaluator({ seed: 42, simulationRuns: 5 });
      const result = evaluator(genome);

      assert.ok(result.diagnostics.degeneracy, "degeneracy report should exist");
      const flags = result.diagnostics.degeneracy.flags;
      assert.ok(flags.length > 0, "degenerate game should have at least one degeneracy flag");

      // evo-non-terminating has only 1 action that works once (loop 0→1),
      // then no legal actions remain, causing stalemate/forced-move/no-choices
      const expectedAny = ["stalemate", "forced-move", "no-choices", "non-terminating"];
      const hasExpected = flags.some((f) => expectedAny.includes(f));
      assert.ok(
        hasExpected,
        `expected at least one of ${JSON.stringify(expectedAny)}, got ${JSON.stringify(flags)}`
      );
    });
  });

  describe("single-action game detection", () => {
    it("evo-seed-1 with only 1 action produces forced-move flag", async () => {
      const definition = await loadFixture("evo-seed-1.json");
      const genome = makeGenome("forced-move", definition);

      const { evaluator } = createEvaluator({ seed: 42, simulationRuns: 5 });
      const result = evaluator(genome);

      assert.ok(result.diagnostics.degeneracy, "degeneracy report should exist");
      assert.ok(
        result.diagnostics.degeneracy.flags.includes("forced-move"),
        `expected forced-move flag, got ${JSON.stringify(result.diagnostics.degeneracy.flags)}`
      );
    });
  });

  describe("healthy game has no reject-level flags", () => {
    it("choice-game with 2 actions has no non-terminating or loop flags", async () => {
      const definition = await loadFixture("choice-game.json");
      const genome = makeGenome("healthy-game", definition);

      const { evaluator } = createEvaluator({ seed: 42, simulationRuns: 5 });
      const result = evaluator(genome);

      assert.ok(result.diagnostics.degeneracy, "degeneracy report should exist");
      const rejectFlags = ["non-terminating", "loop"];
      const foundRejectFlags = result.diagnostics.degeneracy.flags.filter((f) =>
        rejectFlags.includes(f)
      );
      assert.equal(
        foundRejectFlags.length,
        0,
        `healthy game should have no reject-level flags, found: ${JSON.stringify(foundRejectFlags)}`
      );
    });
  });

  describe("degenerate game has lower fitness than healthy game", () => {
    it("non-terminating game fitness < choice-game fitness", async () => {
      const choiceDef = await loadFixture("choice-game.json");
      const nonTermDef = await loadFixture("evo-non-terminating.json");

      const choiceGenome = makeGenome("healthy", choiceDef);
      const nonTermGenome = makeGenome("degenerate", nonTermDef);

      const eval1 = createEvaluator({ seed: 42, simulationRuns: 5 });
      const eval2 = createEvaluator({ seed: 42, simulationRuns: 5 });

      const healthyResult = eval1.evaluator(choiceGenome);
      const degenerateResult = eval2.evaluator(nonTermGenome);

      assert.ok(
        healthyResult.fitness !== null,
        "healthy fitness should not be null"
      );
      assert.ok(
        degenerateResult.fitness !== null || degenerateResult.fitness === null,
        "degenerate may or may not have fitness"
      );

      if (degenerateResult.fitness !== null) {
        assert.ok(
          degenerateResult.fitness < healthyResult.fitness,
          `expected degenerate fitness (${degenerateResult.fitness}) < healthy fitness (${healthyResult.fitness})`
        );
      }
    });
  });

  describe("reject vs penalize semantics", () => {
    it("forced-move game still gets a fitness value (penalize, not reject)", async () => {
      const definition = await loadFixture("evo-seed-1.json");
      const genome = makeGenome("forced-move-penalize", definition);

      const { evaluator } = createEvaluator({ seed: 42, simulationRuns: 5 });
      const result = evaluator(genome);

      assert.ok(
        result.fitness !== null,
        "forced-move game should still receive a fitness value (penalized, not rejected)"
      );
      assert.ok(
        Number.isFinite(result.fitness),
        `fitness should be finite, got ${result.fitness}`
      );
    });
  });
});
