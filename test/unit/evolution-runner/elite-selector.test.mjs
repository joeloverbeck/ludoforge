import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { selectElitesForMining } from "../../../src/evolution-runner/elite-selector.js";

function makePlacement(id, fitness, coordinates, isElite = true) {
  return {
    genome: { id, definition: {} },
    fitness,
    coordinates,
    isElite,
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
  });
});
