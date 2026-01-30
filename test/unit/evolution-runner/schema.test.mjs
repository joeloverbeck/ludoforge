import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv from "ajv/dist/2020.js";

const schemaJson = JSON.parse(
  await readFile(
    new URL("../../../schemas/evolution-runner/runner-config.schema.json", import.meta.url),
  ),
);

const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
const validate = ajv.compile(schemaJson);

const baseConfig = {
  runner: { generations: 2 },
  mapElites: {
    descriptors: [{ id: "agency", min: 0, max: 1, bins: 4 }],
  },
  seeding: {
    mode: "generate",
    populationSize: 10,
    generate: {
      coverage: {
        strategy: "uniform-bins",
        maxAttempts: 100,
      },
      grammar: {},
    },
  },
};

function cloneConfig(config) {
  return structuredClone(config);
}

function assertValid(config) {
  const ok = validate(config);
  assert.equal(ok, true, JSON.stringify(validate.errors, null, 2));
}

function assertInvalid(config) {
  const ok = validate(config);
  assert.equal(ok, false, "Expected schema validation to fail");
}

describe("schema", () => {
  describe("runner-config schema validation", () => {
    it("accepts a minimal runner config", () => {
      assertValid(cloneConfig(baseConfig));
    });

    it("rejects missing required sections", () => {
      const candidate = cloneConfig(baseConfig);
      delete candidate.mapElites;
      assertInvalid(candidate);
    });
  });

  describe("evaluation.degeneracy", () => {
    it("accepts valid policyByFlag and penalties", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.evaluation = {
        degeneracy: {
          policyByFlag: {
            loop: "reject",
            "forced-move": "penalize",
            stalemate: "ignore",
          },
          penalties: {
            "forced-move": { weight: 0.3, freeRatio: 0.2 },
          },
        },
      };
      assertValid(candidate);
    });

    it("rejects missing policyByFlag", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.evaluation = {
        degeneracy: {
          penalties: { "forced-move": { weight: 0.3 } },
        },
      };
      assertInvalid(candidate);
    });

    it("rejects invalid policy value", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.evaluation = {
        degeneracy: {
          policyByFlag: { loop: "foo" },
          penalties: {},
        },
      };
      assertInvalid(candidate);
    });

    it("rejects missing penalties", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.evaluation = {
        degeneracy: {
          policyByFlag: { loop: "reject" },
        },
      };
      assertInvalid(candidate);
    });

    it("rejects unknown properties", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.evaluation = {
        degeneracy: {
          policyByFlag: { loop: "reject" },
          penalties: {},
          unknownKey: true,
        },
      };
      assertInvalid(candidate);
    });
  });

  describe("backward compatibility", () => {
    it("accepts runner config without evaluation.degeneracy", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.evaluation = {
        simulation: { maxTurns: 100 },
      };
      assertValid(candidate);
    });
  });

  describe("runner.maxRetainedGenerations", () => {
    it("accepts maxRetainedGenerations as a positive integer", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.runner.maxRetainedGenerations = 30;
      assertValid(candidate);
    });

    it("rejects maxRetainedGenerations of 0", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.runner.maxRetainedGenerations = 0;
      assertInvalid(candidate);
    });

    it("accepts config without maxRetainedGenerations (backward compat)", () => {
      const candidate = cloneConfig(baseConfig);
      assert.equal(candidate.runner.maxRetainedGenerations, undefined);
      assertValid(candidate);
    });

    it("rejects non-integer maxRetainedGenerations", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.runner.maxRetainedGenerations = 2.5;
      assertInvalid(candidate);
    });

    it("rejects negative maxRetainedGenerations", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.runner.maxRetainedGenerations = -1;
      assertInvalid(candidate);
    });
  });

  describe("evolution.motifMining", () => {
    const validMotifMining = {
      enabled: true,
      eliteSelection: { perNicheTopK: 3, globalTopK: 10 },
      minSupport: 2,
      maxMotifLength: 5,
      ngramSizes: [2, 3],
    };

    it("accepts valid motifMining config under evolution", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.evolution = { motifMining: structuredClone(validMotifMining) };
      assertValid(candidate);
    });

    it("accepts motifMining with optional seed", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.evolution = {
        motifMining: { ...structuredClone(validMotifMining), seed: 42 },
      };
      assertValid(candidate);
    });

    it("accepts evolution without motifMining", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.evolution = { mutation: {} };
      assertValid(candidate);
    });

    it("accepts config without evolution block entirely", () => {
      assertValid(cloneConfig(baseConfig));
    });

    it("rejects unknown properties inside motifMining", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.evolution = {
        motifMining: { ...structuredClone(validMotifMining), extraField: true },
      };
      assertInvalid(candidate);
    });

    it("rejects unknown properties inside eliteSelection", () => {
      const candidate = cloneConfig(baseConfig);
      const mm = structuredClone(validMotifMining);
      mm.eliteSelection.unknownKey = 5;
      candidate.evolution = { motifMining: mm };
      assertInvalid(candidate);
    });

    it("rejects motifMining missing required fields", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.evolution = { motifMining: { enabled: true } };
      assertInvalid(candidate);
    });

    it("rejects minSupport less than 1", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.evolution = {
        motifMining: { ...structuredClone(validMotifMining), minSupport: 0 },
      };
      assertInvalid(candidate);
    });

    it("rejects maxMotifLength less than 2", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.evolution = {
        motifMining: { ...structuredClone(validMotifMining), maxMotifLength: 1 },
      };
      assertInvalid(candidate);
    });

    it("rejects empty ngramSizes array", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.evolution = {
        motifMining: { ...structuredClone(validMotifMining), ngramSizes: [] },
      };
      assertInvalid(candidate);
    });

    it("rejects non-integer ngramSizes values", () => {
      const candidate = cloneConfig(baseConfig);
      candidate.evolution = {
        motifMining: { ...structuredClone(validMotifMining), ngramSizes: [1.5] },
      };
      assertInvalid(candidate);
    });

    it("rejects perNicheTopK less than 1", () => {
      const candidate = cloneConfig(baseConfig);
      const mm = structuredClone(validMotifMining);
      mm.eliteSelection.perNicheTopK = 0;
      candidate.evolution = { motifMining: mm };
      assertInvalid(candidate);
    });

    it("rejects globalTopK less than 1", () => {
      const candidate = cloneConfig(baseConfig);
      const mm = structuredClone(validMotifMining);
      mm.eliteSelection.globalTopK = 0;
      candidate.evolution = { motifMining: mm };
      assertInvalid(candidate);
    });
  });
});
