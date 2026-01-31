import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { selectElitesForMining } from "../../../src/evolution-runner/elite-selector.js";

function makePlacement(id, fitness, coordinates, isElite = true) {
  return {
    member: { genome: { id, definition: {} }, fitness, descriptors: {} },
    nicheId: coordinates.join(","),
    coordinates,
    isElite,
    noveltyScore: 0,
    contributionKind: "none",
  };
}

describe("elite-selector", () => {
  describe("selectElitesForMining", () => {
    it("selects per-niche top-K elites", () => {
      const placements = [
        makePlacement("a", 10, [0, 0]),
        makePlacement("b", 5, [0, 0]),
        makePlacement("c", 3, [0, 0]),
        makePlacement("d", 8, [1, 0]),
        makePlacement("e", 2, [1, 0]),
      ];
      const result = selectElitesForMining(
        { placements },
        { perNicheTopK: 2, globalTopK: 0 },
      );
      const ids = result.map((r) => r.genome.id);
      assert.ok(ids.includes("a"));
      assert.ok(ids.includes("b"));
      assert.ok(ids.includes("d"));
    });

    it("selects global top-K elites", () => {
      const placements = [
        makePlacement("a", 10, [0, 0]),
        makePlacement("b", 5, [0, 0]),
        makePlacement("c", 8, [1, 0]),
      ];
      const result = selectElitesForMining(
        { placements },
        { perNicheTopK: 0, globalTopK: 2 },
      );
      const ids = result.map((r) => r.genome.id);
      assert.ok(ids.includes("a"));
      assert.ok(ids.includes("c"));
      assert.equal(result.length, 2);
    });

    it("deduplicates across per-niche and global selections", () => {
      const placements = [
        makePlacement("a", 10, [0, 0]),
        makePlacement("b", 5, [1, 0]),
      ];
      const result = selectElitesForMining(
        { placements },
        { perNicheTopK: 1, globalTopK: 2 },
      );
      const ids = result.map((r) => r.genome.id);
      assert.equal(new Set(ids).size, ids.length, "should have no duplicates");
    });

    it("returns empty array for empty placements", () => {
      const result = selectElitesForMining(
        { placements: [] },
        { perNicheTopK: 3, globalTopK: 5 },
      );
      assert.deepEqual(result, []);
    });

    it("filters out non-elite placements", () => {
      const placements = [
        makePlacement("a", 10, [0, 0], true),
        makePlacement("b", 20, [0, 0], false),
      ];
      const result = selectElitesForMining(
        { placements },
        { perNicheTopK: 5, globalTopK: 5 },
      );
      assert.equal(result.length, 1);
      assert.equal(result[0].genome.id, "a");
    });

    it("handles single niche correctly", () => {
      const placements = [
        makePlacement("a", 10, [0]),
        makePlacement("b", 8, [0]),
        makePlacement("c", 6, [0]),
      ];
      const result = selectElitesForMining(
        { placements },
        { perNicheTopK: 2, globalTopK: 1 },
      );
      const ids = result.map((r) => r.genome.id);
      assert.ok(ids.includes("a"));
      assert.ok(ids.includes("b"));
    });

    it("does not mutate the input", () => {
      const placements = [
        makePlacement("a", 10, [0, 0]),
        makePlacement("b", 5, [0, 0]),
      ];
      const original = structuredClone(placements);
      selectElitesForMining(
        { placements },
        { perNicheTopK: 1, globalTopK: 1 },
      );
      assert.deepEqual(placements, original);
    });

    it("handles missing placements array gracefully", () => {
      const result = selectElitesForMining(
        {},
        { perNicheTopK: 3, globalTopK: 5 },
      );
      assert.deepEqual(result, []);
    });

    it("works with placements shaped exactly as placePopulationInMapElites output", () => {
      const placements = [
        {
          member: { genome: { id: "g1", definition: { phases: [] } }, fitness: 0.9, descriptors: { complexity: 3 }, diagnostics: {} },
          nicheId: "0,1",
          coordinates: [0, 1],
          isElite: true,
          noveltyScore: 0.5,
          contributionKind: "improvement",
        },
        {
          member: { genome: { id: "g2", definition: { phases: [] } }, fitness: 0.7, descriptors: { complexity: 2 }, diagnostics: {} },
          nicheId: "1,0",
          coordinates: [1, 0],
          isElite: true,
          noveltyScore: 0.3,
          contributionKind: "new",
        },
      ];
      const result = selectElitesForMining(
        { placements },
        { perNicheTopK: 1, globalTopK: 2 },
      );
      assert.equal(result.length, 2);
      assert.equal(result[0].genome.id, "g1");
      assert.equal(result[0].fitness, 0.9);
      assert.equal(result[1].genome.id, "g2");
      assert.equal(result[1].fitness, 0.7);
    });

    it("throws a descriptive error when placement lacks member property", () => {
      const badPlacements = [
        { genome: { id: "x" }, fitness: 1, coordinates: [0], isElite: true },
      ];
      assert.throws(
        () => selectElitesForMining({ placements: badPlacements }, { perNicheTopK: 1, globalTopK: 1 }),
        (err) => {
          assert.ok(err.message.includes("missing \"member\""));
          assert.ok(err.message.includes("placePopulationInMapElites"));
          return true;
        },
      );
    });
  });
});
