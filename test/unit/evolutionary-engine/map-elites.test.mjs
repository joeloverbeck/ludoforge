import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  binDescriptorValue,
  getDescriptorCoordinates,
  getNicheId,
  placePopulationInMapElites,
} from "../../../src/evolutionary-engine/map-elites.js";
import { baseDefinition } from "../dsl/fixtures.mjs";

const config = {
  descriptors: [
    { id: "length", min: 0, max: 100, bins: 5 },
    { id: "randomness", min: 0, max: 1, bins: 4 },
  ],
};

function makeMember(id, fitness, descriptors) {
  return {
    genome: { id, definition: baseDefinition },
    fitness,
    descriptors,
  };
}

describe("map-elites", () => {
  describe("binDescriptorValue", () => {
    it("is deterministic and clamps to bins", () => {
      const descriptor = { id: "length", min: 0, max: 10, bins: 5 };

      const first = binDescriptorValue(10, descriptor);
      const second = binDescriptorValue(10, descriptor);
      const below = binDescriptorValue(-5, descriptor);
      const above = binDescriptorValue(99, descriptor);

      assert.equal(first, second);
      assert.equal(first, 4);
      assert.equal(below, 0);
      assert.equal(above, 4);
    });
  });

  describe("placePopulationInMapElites", () => {
    it("assigns a single elite per niche", () => {
      const members = [
        makeMember("g-1", 1.2, { length: 10, randomness: 0.2 }),
        makeMember("g-2", 0.9, { length: 10, randomness: 0.2 }),
        makeMember("g-3", 1.1, { length: 90, randomness: 0.8 }),
      ];

      const result = placePopulationInMapElites(members, config);

      const nicheElites = new Map();
      result.placements.forEach((placement) => {
        if (placement.isElite) {
          nicheElites.set(placement.nicheId, placement.member.genome.id);
        }
      });

      assert.equal(nicheElites.size, 2);
      assert.equal(nicheElites.get(result.placements[0].nicheId), "g-1");
      assert.equal(nicheElites.get(result.placements[2].nicheId), "g-3");

      result.placements.forEach((placement) => {
        assert.equal(placement.noveltyScore, 0);
      });
    });

    it("ties keep the first elite by default", () => {
      const members = [
        makeMember("g-1", 1.0, { length: 10, randomness: 0.2 }),
        makeMember("g-2", 1.0, { length: 10, randomness: 0.2 }),
      ];

      const result = placePopulationInMapElites(members, config);
      const elites = result.placements.filter((placement) => placement.isElite);

      assert.equal(elites.length, 1);
      assert.equal(elites[0].member.genome.id, "g-1");
    });
  });

  describe("getDescriptorCoordinates and getNicheId", () => {
    it("are deterministic", () => {
      const descriptors = { length: 10, randomness: 0.2 };
      const firstCoords = getDescriptorCoordinates(descriptors, config);
      const secondCoords = getDescriptorCoordinates(descriptors, config);

      assert.deepEqual(firstCoords, secondCoords);

      const firstId = getNicheId(config, firstCoords);
      const secondId = getNicheId(config, secondCoords);

      assert.equal(firstId, secondId);
    });
  });
});
