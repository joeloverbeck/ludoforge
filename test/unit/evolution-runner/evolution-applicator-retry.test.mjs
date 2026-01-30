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

describe("evolution-applicator retry loop", () => {
  beforeEach(() => {
    mutateAndRepairGenomeMock.mock.resetCalls();
  });

  it("retries on noOp and succeeds on second attempt", () => {
    let callCount = 0;
    mutateAndRepairGenomeMock.mock.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        return {
          genome: { id: "g1", definition: { name: "test-game", phases: [{ name: "main" }] } },
          operatorName: "test-op",
          outcome: "noOp",
        };
      }
      return {
        genome: { id: "g1", definition: { name: "mutated-game", phases: [{ name: "alpha" }] } },
        operatorName: "test-op",
        outcome: "ok",
      };
    });

    const result = applyEvolution([makeGenome()], makeOptions());

    assert.equal(result.population.length, 1);
    assert.equal(result.population[0].definition.name, "mutated-game");
    assert.equal(result.outcomes[0], "ok");
    assert.equal(callCount, 2);
  });

  it("retries on repairFailed and succeeds on second attempt", () => {
    let callCount = 0;
    mutateAndRepairGenomeMock.mock.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        return {
          genome: null,
          operatorName: "test-op",
          outcome: "repairFailed",
        };
      }
      return {
        genome: { id: "g1", definition: { name: "repaired-game", phases: [] } },
        operatorName: "test-op",
        outcome: "ok",
      };
    });

    const result = applyEvolution([makeGenome()], makeOptions());

    assert.equal(result.population[0].definition.name, "repaired-game");
    assert.equal(result.outcomes[0], "ok");
    assert.equal(callCount, 2);
  });

  it("keeps parent genome when all retries exhaust with noOp", () => {
    mutateAndRepairGenomeMock.mock.mockImplementation(() => ({
      genome: { id: "g1", definition: { name: "test-game", phases: [{ name: "main" }] } },
      operatorName: "test-op",
      outcome: "noOp",
    }));

    const result = applyEvolution([makeGenome()], makeOptions({ maxMutationRetries: 2 }));

    assert.equal(result.population.length, 1);
    assert.equal(result.population[0].definition.name, "test-game");
    assert.equal(result.outcomes[0], "noOp");
    // 1 initial + 2 retries = 3 calls
    assert.equal(mutateAndRepairGenomeMock.mock.callCount(), 3);
  });

  it("keeps parent genome when all retries exhaust with repairFailed", () => {
    mutateAndRepairGenomeMock.mock.mockImplementation(() => ({
      genome: null,
      operatorName: "test-op",
      outcome: "repairFailed",
    }));

    const result = applyEvolution([makeGenome()], makeOptions({ maxMutationRetries: 2 }));

    assert.equal(result.population.length, 1);
    assert.equal(result.population[0].definition.name, "test-game");
    assert.equal(result.outcomes[0], "repairFailed");
    assert.equal(mutateAndRepairGenomeMock.mock.callCount(), 3);
  });

  it("respects maxMutationRetries config", () => {
    mutateAndRepairGenomeMock.mock.mockImplementation(() => ({
      genome: null,
      operatorName: "test-op",
      outcome: "repairFailed",
    }));

    applyEvolution([makeGenome()], makeOptions({ maxMutationRetries: 5 }));

    // 1 initial + 5 retries = 6 calls
    assert.equal(mutateAndRepairGenomeMock.mock.callCount(), 6);
  });

  it("defaults to 3 retries when maxMutationRetries is not set", () => {
    mutateAndRepairGenomeMock.mock.mockImplementation(() => ({
      genome: null,
      operatorName: "test-op",
      outcome: "repairFailed",
    }));

    const opts = makeOptions();
    delete opts.maxMutationRetries;
    applyEvolution([makeGenome()], opts);

    // 1 initial + 3 retries = 4 calls
    assert.equal(mutateAndRepairGenomeMock.mock.callCount(), 4);
  });

  it("records telemetry for every retry attempt", () => {
    let callCount = 0;
    mutateAndRepairGenomeMock.mock.mockImplementation(() => {
      callCount += 1;
      if (callCount <= 2) {
        return {
          genome: null,
          operatorName: "test-op",
          outcome: "repairFailed",
        };
      }
      return {
        genome: { id: "g1", definition: { name: "ok-game", phases: [] } },
        operatorName: "test-op",
        outcome: "ok",
      };
    });

    const opts = makeOptions();
    applyEvolution([makeGenome()], opts);

    assert.equal(opts.telemetry.operators["test-op"].attempts, 3);
    assert.equal(opts.telemetry.operators["test-op"].repairFailed, 2);
  });

  it("total offspring count equals population length", () => {
    let callIndex = 0;
    mutateAndRepairGenomeMock.mock.mockImplementation(() => {
      callIndex += 1;
      // First genome: noOp then ok; second: ok immediately
      if (callIndex === 1) {
        return { genome: null, operatorName: "test-op", outcome: "noOp" };
      }
      return {
        genome: { id: "gx", definition: { name: "m", phases: [] } },
        operatorName: "test-op",
        outcome: "ok",
      };
    });

    const population = [makeGenome("g1"), makeGenome("g2"), makeGenome("g3")];
    const result = applyEvolution(population, makeOptions());

    assert.equal(result.population.length, 3);
    assert.equal(result.outcomes.length, 3);
    assert.equal(result.operatorNames.length, 3);
  });

  it("returns outcomes array in result", () => {
    mutateAndRepairGenomeMock.mock.mockImplementation(() => ({
      genome: { id: "g1", definition: { name: "m", phases: [] } },
      operatorName: "test-op",
      outcome: "ok",
    }));

    const result = applyEvolution([makeGenome()], makeOptions());

    assert.ok(Array.isArray(result.outcomes));
    assert.equal(result.outcomes[0], "ok");
  });

  it("outcome is null when mutation rate does not fire", () => {
    const result = applyEvolution([makeGenome()], makeOptions({ mutationRate: 0 }));

    assert.equal(result.outcomes[0], null);
  });

  it("retry loop is deterministic with same RNG sequence", () => {
    function makeCallSequence() {
      let callCount = 0;
      mutateAndRepairGenomeMock.mock.resetCalls();
      mutateAndRepairGenomeMock.mock.mockImplementation(() => {
        callCount += 1;
        if (callCount <= 2) {
          return { genome: null, operatorName: "test-op", outcome: "repairFailed" };
        }
        return {
          genome: { id: "g1", definition: { name: "deterministic", phases: [] } },
          operatorName: "test-op",
          outcome: "ok",
        };
      });

      const rng = { nextInt: () => 0, nextFloat: () => 0 };
      return applyEvolution([makeGenome()], makeOptions({ rng }));
    }

    const result1 = makeCallSequence();
    const result2 = makeCallSequence();

    assert.deepStrictEqual(result1.outcomes, result2.outcomes);
    assert.deepStrictEqual(result1.population[0].definition, result2.population[0].definition);
  });
});
