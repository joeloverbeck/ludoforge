import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  serializeMapElites,
  defaultPreferenceModelSnapshot,
  resolveSnapshotProvider,
  resolveFeedbackProvider,
} from "../../src/evolution-runner/serialization-utils.js";

describe("serialization-utils integration", () => {
  describe("serializeMapElites", () => {
    it("converts Map elites to array format", () => {
      const elites = new Map();
      elites.set("niche-0", { genome: { id: "g1" }, fitness: 1.0 });
      elites.set("niche-1", { genome: { id: "g2" }, fitness: 0.9 });

      const mapElites = { elites, dimensions: 2 };
      const result = serializeMapElites(mapElites);

      assert.ok(Array.isArray(result.elites));
      assert.equal(result.elites.length, 2);
      assert.deepStrictEqual(result.elites[0], {
        nicheId: "niche-0",
        member: { genome: { id: "g1" }, fitness: 1.0 },
      });
      assert.equal(result.dimensions, 2);
    });

    it("passes through non-Map elites unchanged", () => {
      const arrayElites = [{ nicheId: "n1", member: { fitness: 1.0 } }];
      const mapElites = { elites: arrayElites };
      const result = serializeMapElites(mapElites);
      assert.deepStrictEqual(result.elites, arrayElites);
    });

    it("returns null/undefined input as-is", () => {
      assert.equal(serializeMapElites(null), null);
      assert.equal(serializeMapElites(undefined), undefined);
    });
  });

  describe("defaultPreferenceModelSnapshot", () => {
    it("produces valid structure with runId and generation", () => {
      const snapshot = defaultPreferenceModelSnapshot({
        runId: "test-run",
        generation: 5,
        seed: 42,
      });

      assert.equal(snapshot.id, "test-run-pref-5");
      assert.equal(snapshot.version, "v1");
      assert.ok(typeof snapshot.createdAt === "string");
      assert.equal(snapshot.seed, 42);
      assert.deepStrictEqual(snapshot.trainingWindow, { size: 0 });
      assert.deepStrictEqual(snapshot.hyperparams, {});
      assert.deepStrictEqual(snapshot.metrics, {});
      assert.equal(snapshot.models.length, 1);
      assert.equal(snapshot.models[0].sampleCount, 0);
      assert.deepStrictEqual(snapshot.ensemble, {
        size: 1,
        method: "online-bagging",
      });
    });

    it("omits seed when not finite", () => {
      const snapshot = defaultPreferenceModelSnapshot({
        runId: "r",
        generation: 0,
        seed: undefined,
      });
      assert.equal(snapshot.seed, undefined);
    });
  });

  describe("resolveSnapshotProvider", () => {
    it("passes through a function", () => {
      const fn = () => [1];
      assert.equal(resolveSnapshotProvider(fn), fn);
    });

    it("wraps an array in a function", () => {
      const arr = [{ id: "snap" }];
      const provider = resolveSnapshotProvider(arr);
      assert.equal(typeof provider, "function");
      assert.deepStrictEqual(provider(), arr);
    });

    it("returns null for non-function/non-array", () => {
      assert.equal(resolveSnapshotProvider("string"), null);
      assert.equal(resolveSnapshotProvider(42), null);
      assert.equal(resolveSnapshotProvider(null), null);
    });
  });

  describe("resolveFeedbackProvider", () => {
    it("passes through a function", () => {
      const fn = () => [1];
      assert.equal(resolveFeedbackProvider(fn), fn);
    });

    it("wraps an array in a function", () => {
      const arr = [{ feedback: true }];
      const provider = resolveFeedbackProvider(arr);
      assert.equal(typeof provider, "function");
      assert.deepStrictEqual(provider(), arr);
    });

    it("returns null for non-function/non-array", () => {
      assert.equal(resolveFeedbackProvider(null), null);
    });
  });
});
