import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mutateAndRepairGenome } from "../../../src/evolutionary-engine/mutation/orchestrator.js";

describe("mutation orchestrator", () => {
  it("falls back to original genome when repair fails (non-selector)", () => {
    const genome = { definition: { id: "base" } };
    const operators = [{ mutate: (value) => ({ ...value, mutated: true }) }];
    const repairOperators = [{ repair: () => null }];

    const repaired = mutateAndRepairGenome(genome, { operators, repairOperators });

    assert.deepEqual(repaired, genome);
    assert.notEqual(repaired, genome);
  });

  it("returns original genome and null operator on repair failure (selector)", () => {
    const genome = { definition: { id: "base" } };
    const operators = [{ name: "mutator", mutate: (value) => ({ ...value, mutated: true }) }];
    const repairOperators = [{ repair: () => null }];
    const selector = { pick: () => "mutator" };

    const repaired = mutateAndRepairGenome(genome, { operators, repairOperators, selector });

    assert.deepEqual(repaired.genome, genome);
    assert.notEqual(repaired.genome, genome);
    assert.equal(repaired.operatorName, null);
  });

  it("preserves operatorName when repair succeeds (selector)", () => {
    const genome = { definition: { id: "base" } };
    const operators = [{ name: "mutator", mutate: (value) => ({ ...value, mutated: true }) }];
    const repairOperators = [{ repair: (value) => ({ ...value, repaired: true }) }];
    const selector = { pick: () => "mutator" };

    const repaired = mutateAndRepairGenome(genome, { operators, repairOperators, selector });

    assert.equal(repaired.operatorName, "mutator");
    assert.equal(repaired.genome.mutated, true);
    assert.equal(repaired.genome.repaired, true);
  });
});
