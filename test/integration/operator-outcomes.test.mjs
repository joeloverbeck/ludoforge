import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildOperatorOutcomes } from "../../src/evolution-runner/operator-outcomes.js";

describe("operator-outcomes integration", () => {
  function makeGenome(id) {
    return { id, definition: { version: "1.0" } };
  }

  describe("buildOperatorOutcomes with placements", () => {
    it("maps loopResult with placements to correct gridContribution", () => {
      const g1 = makeGenome("g1");
      const g2 = makeGenome("g2");
      const g3 = makeGenome("g3");

      const loopResult = {
        evaluated: [
          { genome: g1, fitness: 1.0 },
          { genome: g2, fitness: 0.8 },
        ],
        rejected: [{ genome: g3, reason: "invalid" }],
        mapElites: {
          placements: [
            { member: { genome: g1 }, contributionKind: "filledEmpty" },
            { member: { genome: g2 }, contributionKind: "improvedElite" },
          ],
        },
      };

      const outcomes = buildOperatorOutcomes(loopResult);

      assert.deepStrictEqual(outcomes.get(g1), {
        valid: true,
        accepted: true,
        gridContribution: "filledEmpty",
      });
      assert.deepStrictEqual(outcomes.get(g2), {
        valid: true,
        accepted: true,
        gridContribution: "improvedElite",
      });
      assert.deepStrictEqual(outcomes.get(g3), {
        valid: false,
        accepted: false,
        gridContribution: "none",
      });
    });

    it("genomes not in placements get gridContribution none", () => {
      const g1 = makeGenome("g1");
      const loopResult = {
        evaluated: [{ genome: g1, fitness: 0.5 }],
        rejected: [],
        mapElites: { placements: [] },
      };

      const outcomes = buildOperatorOutcomes(loopResult);
      assert.equal(outcomes.get(g1).gridContribution, "none");
    });

    it("handles null placement member gracefully", () => {
      const g1 = makeGenome("g1");
      const loopResult = {
        evaluated: [{ genome: g1, fitness: 0.5 }],
        rejected: [],
        mapElites: {
          placements: [{ member: null }],
        },
      };

      const outcomes = buildOperatorOutcomes(loopResult);
      assert.equal(outcomes.get(g1).gridContribution, "none");
    });

    it("handles missing mapElites gracefully", () => {
      const g1 = makeGenome("g1");
      const loopResult = {
        evaluated: [{ genome: g1, fitness: 0.5 }],
        rejected: [],
      };

      const outcomes = buildOperatorOutcomes(loopResult);
      assert.equal(outcomes.get(g1).gridContribution, "none");
    });
  });
});
