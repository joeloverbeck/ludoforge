import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

const mutateAndRepairGenomeMock = mock.fn();

mock.module("../../../src/evolutionary-engine/mutation.js", {
  namedExports: {
    mutateAndRepairGenome: mutateAndRepairGenomeMock,
  },
});

const { applyEvolution } = await import(
  "../../../src/evolution-runner/evolution-applicator.js"
);
const { createTelemetry } = await import(
  "../../../src/evolution-runner/operator-telemetry.js"
);

function makeGenome(id = "g1") {
  return {
    id,
    definition: { name: "test-game", phases: [{ name: "main" }] },
  };
}

function makeOptions(overrides = {}) {
  return {
    rng: { nextInt: () => 0, nextFloat: () => 0 },
    mutationRate: 1.0,
    crossoverRate: 0,
    mutationOperators: [{ name: "test-op", mutate: (g) => g }],
    crossoverOperators: [],
    repairOperators: [],
    mutationSelector: { pick: () => "test-op" },
    telemetry: createTelemetry(["test-op"]),
    ...overrides,
  };
}

describe("evolution-applicator outcome handling", () => {
  beforeEach(() => {
    mutateAndRepairGenomeMock.mock.resetCalls();
  });

  describe("outcome 'ok'", () => {
    it("uses the mutated genome as child", () => {
      const mutatedDef = { name: "mutated-game", phases: [{ name: "alpha" }] };
      mutateAndRepairGenomeMock.mock.mockImplementation(() => ({
        genome: { id: "g1", definition: mutatedDef },
        operatorName: "test-op",
        outcome: "ok",
      }));

      const population = [makeGenome()];
      const options = makeOptions();
      const result = applyEvolution(population, options);

      assert.equal(result.population.length, 1);
      assert.deepStrictEqual(result.population[0].definition, mutatedDef);
    });

    it("calls recordAttempt for ok outcome", () => {
      mutateAndRepairGenomeMock.mock.mockImplementation(() => ({
        genome: { id: "g1", definition: { name: "m", phases: [] } },
        operatorName: "test-op",
        outcome: "ok",
      }));

      const options = makeOptions();
      applyEvolution([makeGenome()], options);

      assert.equal(options.telemetry.operators["test-op"].attempts, 1);
    });

    it("does not increment noOp or repairFailed for ok outcome", () => {
      mutateAndRepairGenomeMock.mock.mockImplementation(() => ({
        genome: { id: "g1", definition: { name: "m", phases: [] } },
        operatorName: "test-op",
        outcome: "ok",
      }));

      const options = makeOptions();
      applyEvolution([makeGenome()], options);

      assert.equal(options.telemetry.operators["test-op"].noOp, 0);
      assert.equal(options.telemetry.operators["test-op"].repairFailed, 0);
    });
  });

  describe("outcome 'noOp'", () => {
    it("keeps pre-mutation child when outcome is noOp", () => {
      const originalDef = { name: "test-game", phases: [{ name: "main" }] };
      mutateAndRepairGenomeMock.mock.mockImplementation(() => ({
        genome: { id: "g1", definition: originalDef },
        operatorName: "test-op",
        outcome: "noOp",
      }));

      const population = [makeGenome()];
      const options = makeOptions();
      const result = applyEvolution(population, options);

      assert.equal(result.population.length, 1);
      assert.deepStrictEqual(
        result.population[0].definition,
        originalDef,
      );
    });

    it("calls recordAttempt AND recordNoOp", () => {
      mutateAndRepairGenomeMock.mock.mockImplementation(() => ({
        genome: { id: "g1", definition: { name: "test-game", phases: [] } },
        operatorName: "test-op",
        outcome: "noOp",
      }));

      const options = makeOptions({ maxMutationRetries: 0 });
      applyEvolution([makeGenome()], options);

      assert.equal(options.telemetry.operators["test-op"].attempts, 1);
      assert.equal(options.telemetry.operators["test-op"].noOp, 1);
    });

    it("does not increment repairFailed for noOp outcome", () => {
      mutateAndRepairGenomeMock.mock.mockImplementation(() => ({
        genome: { id: "g1", definition: { name: "test-game", phases: [] } },
        operatorName: "test-op",
        outcome: "noOp",
      }));

      const options = makeOptions({ maxMutationRetries: 0 });
      applyEvolution([makeGenome()], options);

      assert.equal(options.telemetry.operators["test-op"].repairFailed, 0);
    });
  });

  describe("outcome 'repairFailed'", () => {
    it("keeps pre-mutation child when outcome is repairFailed", () => {
      const originalDef = { name: "test-game", phases: [{ name: "main" }] };
      mutateAndRepairGenomeMock.mock.mockImplementation(() => ({
        genome: null,
        operatorName: "test-op",
        outcome: "repairFailed",
      }));

      const population = [makeGenome()];
      const options = makeOptions();
      const result = applyEvolution(population, options);

      assert.equal(result.population.length, 1);
      assert.deepStrictEqual(
        result.population[0].definition,
        originalDef,
      );
    });

    it("calls recordAttempt AND recordRepairFailed", () => {
      mutateAndRepairGenomeMock.mock.mockImplementation(() => ({
        genome: null,
        operatorName: "test-op",
        outcome: "repairFailed",
      }));

      const options = makeOptions({ maxMutationRetries: 0 });
      applyEvolution([makeGenome()], options);

      assert.equal(options.telemetry.operators["test-op"].attempts, 1);
      assert.equal(options.telemetry.operators["test-op"].repairFailed, 1);
    });

    it("does not increment noOp for repairFailed outcome", () => {
      mutateAndRepairGenomeMock.mock.mockImplementation(() => ({
        genome: null,
        operatorName: "test-op",
        outcome: "repairFailed",
      }));

      const options = makeOptions({ maxMutationRetries: 0 });
      applyEvolution([makeGenome()], options);

      assert.equal(options.telemetry.operators["test-op"].noOp, 0);
    });
  });

  describe("no null genomes in offspring", () => {
    it("repairFailed does not produce null in population", () => {
      mutateAndRepairGenomeMock.mock.mockImplementation(() => ({
        genome: null,
        operatorName: "test-op",
        outcome: "repairFailed",
      }));

      const population = [makeGenome(), makeGenome("g2")];
      const options = makeOptions({ maxMutationRetries: 0 });
      const result = applyEvolution(population, options);

      result.population.forEach((genome) => {
        assert.notEqual(genome, null);
        assert.notEqual(genome, undefined);
        assert.ok(genome.definition !== null && genome.definition !== undefined);
      });
    });

    it("noOp does not produce null in population", () => {
      mutateAndRepairGenomeMock.mock.mockImplementation(() => ({
        genome: { id: "g1", definition: { name: "test-game", phases: [] } },
        operatorName: "test-op",
        outcome: "noOp",
      }));

      const population = [makeGenome()];
      const options = makeOptions({ maxMutationRetries: 0 });
      const result = applyEvolution(population, options);

      result.population.forEach((genome) => {
        assert.notEqual(genome, null);
        assert.notEqual(genome, undefined);
      });
    });
  });

  describe("telemetry invariant: exactly one attempt per mutation", () => {
    it("records exactly one attempt per genome when mutation fires", () => {
      mutateAndRepairGenomeMock.mock.mockImplementation(() => ({
        genome: { id: "g1", definition: { name: "m", phases: [] } },
        operatorName: "test-op",
        outcome: "ok",
      }));

      const population = [makeGenome(), makeGenome("g2"), makeGenome("g3")];
      const options = makeOptions();
      applyEvolution(population, options);

      assert.equal(options.telemetry.operators["test-op"].attempts, 3);
    });
  });

  describe("outcomes return value", () => {
    it("returns an outcomes array alongside population and operatorNames", () => {
      mutateAndRepairGenomeMock.mock.mockImplementation(() => ({
        genome: { id: "g1", definition: { name: "m", phases: [] } },
        operatorName: "test-op",
        outcome: "ok",
      }));

      const result = applyEvolution([makeGenome()], makeOptions());

      assert.ok(Array.isArray(result.outcomes));
      assert.equal(result.outcomes.length, 1);
      assert.equal(result.outcomes[0], "ok");
    });

    it("outcomes array has null for slots where mutation did not fire", () => {
      const result = applyEvolution([makeGenome()], makeOptions({ mutationRate: 0 }));

      assert.equal(result.outcomes[0], null);
    });
  });
});
