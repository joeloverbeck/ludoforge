import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

import {
  safeNumber,
  safeInteger,
  formatValidationErrors,
  DEFAULT_LEARNING_RATE,
  DEFAULT_MAX_HISTORY,
  DEFAULT_COMPARISON_WEIGHT,
  DEFAULT_RATING_WEIGHT,
  DEFAULT_WEIGHT_DECAY,
  DEFAULT_MAX_WEIGHT_ABS,
  DEFAULT_MAX_BIAS_ABS,
  DEFAULT_ENSEMBLE_SIZE,
  FALLBACK_LEARNING_RATE,
  FALLBACK_ENSEMBLE_SIZE,
} from "../../../../src/evaluation-analytics/preference-model/config.js";

describe("preference-model config", () => {
  describe("safeNumber", () => {
    it("returns value when finite", () => {
      assert.equal(safeNumber(3.14, 0), 3.14);
    });

    it("returns fallback for NaN", () => {
      assert.equal(safeNumber(NaN, 42), 42);
    });

    it("returns fallback for Infinity", () => {
      assert.equal(safeNumber(Infinity, 7), 7);
    });

    it("returns fallback for undefined", () => {
      assert.equal(safeNumber(undefined, 1), 1);
    });
  });

  describe("safeInteger", () => {
    it("returns value when integer", () => {
      assert.equal(safeInteger(5, 0), 5);
    });

    it("returns fallback for float", () => {
      assert.equal(safeInteger(3.5, 10), 10);
    });

    it("returns fallback for NaN", () => {
      assert.equal(safeInteger(NaN, 10), 10);
    });

    it("returns fallback for null", () => {
      assert.equal(safeInteger(null, 10), 10);
    });
  });

  describe("formatValidationErrors", () => {
    it("formats array of errors", () => {
      const result = formatValidationErrors([
        { path: "/a", message: "bad" },
        { path: "/b", message: "worse" },
      ]);
      assert.equal(result, "/a: bad\n/b: worse");
    });

    it("uses defaults for missing path/message", () => {
      const result = formatValidationErrors([{}]);
      assert.equal(result, "<root>: Invalid value");
    });

    it("returns unknown for empty array", () => {
      assert.equal(formatValidationErrors([]), "Unknown validation error");
    });

    it("returns unknown for non-array", () => {
      assert.equal(formatValidationErrors(null), "Unknown validation error");
    });
  });

  describe("DEFAULT_* constants match config file", () => {
    it("all defaults reflect configs/preference-model.json", async () => {
      const configUrl = new URL("../../../../configs/preference-model.json", import.meta.url);
      const config = JSON.parse(await readFile(configUrl, "utf8"));

      assert.equal(DEFAULT_LEARNING_RATE, config.learningRate);
      assert.equal(DEFAULT_MAX_HISTORY, config.maxHistory);
      assert.equal(DEFAULT_COMPARISON_WEIGHT, config.comparisonWeight);
      assert.equal(DEFAULT_RATING_WEIGHT, config.ratingWeight);
      assert.equal(DEFAULT_WEIGHT_DECAY, config.weightDecay);
      assert.equal(DEFAULT_MAX_WEIGHT_ABS, config.maxWeightAbs);
      assert.equal(DEFAULT_MAX_BIAS_ABS, config.maxBiasAbs);
      assert.equal(DEFAULT_ENSEMBLE_SIZE, config.ensembleSize);
    });
  });

  describe("FALLBACK_* constants", () => {
    it("has expected fallback values", () => {
      assert.equal(FALLBACK_LEARNING_RATE, 0.05);
      assert.equal(FALLBACK_ENSEMBLE_SIZE, 5);
    });
  });
});
