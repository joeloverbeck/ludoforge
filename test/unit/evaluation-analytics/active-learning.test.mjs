import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import { selectActiveLearningPairs } from "../../../src/evaluation-analytics/active-learning.js";

const baseModelState = {
  models: [
    { weights: { x: 1 }, bias: 0, sampleCount: 0 },
    { weights: { x: 1 }, bias: 0, sampleCount: 0 },
  ],
};

describe("active-learning", () => {
  describe("selectActiveLearningPairs", () => {
    it("selection is deterministic and does not mutate inputs", () => {
      const candidates = [
        { id: "a", featureVector: { x: 0 }, nicheId: "n1" },
        { id: "b", featureVector: { x: 1 }, nicheId: "n1" },
        { id: "c", featureVector: { x: 2 }, nicheId: "n2" },
      ];
      const snapshot = JSON.parse(JSON.stringify(candidates));

      const first = selectActiveLearningPairs(candidates, baseModelState, {
        maxPairs: 2,
        uncertaintyThreshold: 0,
        diversityQuota: 0,
      });
      const second = selectActiveLearningPairs(candidates, baseModelState, {
        maxPairs: 2,
        uncertaintyThreshold: 0,
        diversityQuota: 0,
      });

      assert.deepStrictEqual(first, second);
      assert.deepStrictEqual(candidates, snapshot);
    });

    it("acquisition ranking favors max BALD/pVar", () => {
      const ensembleState = {
        models: [
          { weights: { x: 1 }, bias: 0, sampleCount: 0 },
          { weights: { x: -1 }, bias: 0, sampleCount: 0 },
        ],
      };
      const candidates = [
        { id: "a", featureVector: { x: 0 } },
        { id: "b", featureVector: { x: 1 } },
        { id: "c", featureVector: { x: 2 } },
      ];

      const [pair] = selectActiveLearningPairs(candidates, ensembleState, {
        maxPairs: 1,
        uncertaintyThreshold: 0,
        diversityQuota: 0,
      });

      assert.equal(pair.candidateA.id, "a");
      assert.equal(pair.candidateB.id, "c");
    });

    it("diversity quota includes underrepresented niches", () => {
      const candidates = [
        { id: "rare", featureVector: { x: 5 }, nicheId: "rare" },
        { id: "b", featureVector: { x: 0 }, nicheId: "common" },
        { id: "c", featureVector: { x: 0.1 }, nicheId: "common" },
      ];

      const [pair] = selectActiveLearningPairs(candidates, baseModelState, {
        maxPairs: 1,
        uncertaintyThreshold: 0,
        diversityQuota: 1,
      });

      assert.ok(
        pair.candidateA.nicheId === "rare" || pair.candidateB.nicheId === "rare"
      );
    });
  });

  describe("config defaults", () => {
    it("active learning defaults reflect config file", async () => {
      const configUrl = new URL("../../../configs/active-learning.json", import.meta.url);
      const config = JSON.parse(await readFile(configUrl, "utf8"));

      const candidates = [
        { id: "a", featureVector: { x: 0 } },
        { id: "b", featureVector: { x: 0 } },
        { id: "c", featureVector: { x: 0 } },
        { id: "d", featureVector: { x: 0 } },
        { id: "e", featureVector: { x: 0 } },
      ];

      const neutralModel = {
        models: [{ weights: {}, bias: 0, sampleCount: 0 }],
      };

      const selection = selectActiveLearningPairs(candidates, neutralModel, {});

      assert.equal(selection.length, config.maxPairs);
    });
  });
});
