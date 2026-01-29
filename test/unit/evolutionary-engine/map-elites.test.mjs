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
    const descriptor = { id: "length", min: 0, max: 10, bins: 5 };

    it("is deterministic", () => {
      const first = binDescriptorValue(10, descriptor);
      const second = binDescriptorValue(10, descriptor);
      assert.equal(first, second);
    });

    it("value === min returns 0", () => {
      assert.equal(binDescriptorValue(0, descriptor), 0);
    });

    it("value === max returns bins - 1", () => {
      assert.equal(binDescriptorValue(10, descriptor), 4);
    });

    it("midpoint returns expected bin index", () => {
      // midpoint 5: t = 0.5, floor(0.5 * 5) = 2
      assert.equal(binDescriptorValue(5, descriptor), 2);
    });

    it("value < min returns 'under'", () => {
      assert.equal(binDescriptorValue(-5, descriptor), "under");
    });

    it("value > max returns 'over'", () => {
      assert.equal(binDescriptorValue(99, descriptor), "over");
    });

    it("null returns 'unknown'", () => {
      assert.equal(binDescriptorValue(null, descriptor), "unknown");
    });

    it("undefined returns 'unknown'", () => {
      assert.equal(binDescriptorValue(undefined, descriptor), "unknown");
    });

    it("NaN returns 'unknown'", () => {
      assert.equal(binDescriptorValue(NaN, descriptor), "unknown");
    });

    it("Infinity returns 'unknown'", () => {
      assert.equal(binDescriptorValue(Infinity, descriptor), "unknown");
    });

    it("-Infinity returns 'unknown'", () => {
      assert.equal(binDescriptorValue(-Infinity, descriptor), "unknown");
    });

    it("throws on invalid config (bins <= 0)", () => {
      assert.throws(
        () => binDescriptorValue(5, { id: "x", min: 0, max: 10, bins: 0 }),
        /positive integer/,
      );
    });

    it("throws on invalid config (max <= min)", () => {
      assert.throws(
        () => binDescriptorValue(5, { id: "x", min: 10, max: 5, bins: 5 }),
        /max must be greater than min/,
      );
    });

    it("throws on non-finite config values", () => {
      assert.throws(
        () => binDescriptorValue(5, { id: "x", min: NaN, max: 10, bins: 5 }),
        /finite numbers/,
      );
    });
  });

  describe("getNicheId serialization", () => {
    it("serializes numeric bin tokens", () => {
      const id = getNicheId(config, [3, 2]);
      assert.equal(id, "length:3|randomness:2");
    });

    it("serializes 'unknown' token", () => {
      const id = getNicheId(config, ["unknown", 2]);
      assert.equal(id, "length:unknown|randomness:2");
    });

    it("serializes 'under' token", () => {
      const id = getNicheId(config, ["under", 0]);
      assert.equal(id, "length:under|randomness:0");
    });

    it("serializes 'over' token", () => {
      const id = getNicheId(config, [4, "over"]);
      assert.equal(id, "length:4|randomness:over");
    });
  });

  describe("getDescriptorCoordinates", () => {
    it("returns 'unknown' for missing descriptor key", () => {
      const singleConfig = {
        descriptors: [{ id: "complexity", min: 0, max: 1, bins: 5 }],
      };
      const coords = getDescriptorCoordinates({ agency: 0.5 }, singleConfig);
      assert.deepEqual(coords, ["unknown"]);
    });

    it("returns 'unknown' for null value", () => {
      const singleConfig = {
        descriptors: [{ id: "agency", min: 0, max: 1, bins: 5 }],
      };
      const coords = getDescriptorCoordinates({ agency: null }, singleConfig);
      assert.deepEqual(coords, ["unknown"]);
    });

    it("returns all 'unknown' when descriptors object is null", () => {
      const coords = getDescriptorCoordinates(null, config);
      assert.deepEqual(coords, ["unknown", "unknown"]);
    });

    it("returns all 'unknown' when descriptors object is undefined", () => {
      const coords = getDescriptorCoordinates(undefined, config);
      assert.deepEqual(coords, ["unknown", "unknown"]);
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

    it("places member with null descriptor value in 'unknown' niche (not skipped)", () => {
      const members = [
        makeMember("g-null", 1.0, { length: null, randomness: 0.5 }),
      ];

      const result = placePopulationInMapElites(members, config);

      assert.equal(result.skipped.length, 0);
      assert.equal(result.placements.length, 1);
      assert.ok(result.placements[0].nicheId.includes("unknown"));
      assert.equal(result.placements[0].isElite, true);
    });

    it("never throws due to descriptor values (totality guarantee)", () => {
      const members = [
        makeMember("g-nan", 1.0, { length: NaN, randomness: Infinity }),
        makeMember("g-null", 2.0, { length: null, randomness: null }),
        makeMember("g-under", 3.0, { length: -50, randomness: -1 }),
        makeMember("g-over", 4.0, { length: 999, randomness: 999 }),
        makeMember("g-ok", 5.0, { length: 50, randomness: 0.5 }),
      ];

      const result = placePopulationInMapElites(members, config);

      assert.equal(result.skipped.length, 0);
      assert.equal(result.placements.length, 5);
    });
  });
});
