import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mutateAndRepairGenome, mutateGenome } from "../../../src/evolutionary-engine/mutation/orchestrator.js";

describe("mutation orchestrator", () => {
  it("throws when called without a selector", () => {
    const genome = { definition: { id: "base" } };
    const operators = [{ mutate: (value) => ({ ...value, mutated: true }) }];
    const repairOperators = [{ repair: () => null }];

    assert.throws(
      () => mutateAndRepairGenome(genome, { operators, repairOperators }),
      /requires a selector/,
    );
  });

  it("returns null genome and preserves operatorName on repair failure", () => {
    const genome = { definition: { id: "base" } };
    const operators = [{ name: "mutator", mutate: (value) => ({ ...value, mutated: true }) }];
    const repairOperators = [{ repair: () => null }];
    const selector = { pick: () => "mutator" };

    const repaired = mutateAndRepairGenome(genome, { operators, repairOperators, selector });

    assert.equal(repaired.genome, null);
    assert.equal(repaired.operatorName, "mutator");
    assert.equal(repaired.outcome, "repairFailed");
  });

  it("preserves operatorName when repair succeeds", () => {
    const genome = { definition: { id: "base" } };
    const operators = [{ name: "mutator", mutate: (value) => ({ ...value, mutated: true }) }];
    const repairOperators = [{ repair: (value) => ({ ...value, repaired: true }) }];
    const selector = { pick: () => "mutator" };

    const repaired = mutateAndRepairGenome(genome, { operators, repairOperators, selector });

    assert.equal(repaired.operatorName, "mutator");
    assert.equal(repaired.outcome, "ok");
    assert.equal(repaired.genome.mutated, true);
    assert.equal(repaired.genome.repaired, true);
  });
});
