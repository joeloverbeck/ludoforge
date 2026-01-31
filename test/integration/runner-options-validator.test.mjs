import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateRunnerOptions } from "../../src/evolution-runner/runner-options-validator.js";

describe("runner-options-validator integration", () => {
  const validOptions = {
    config: {
      runner: { generations: 5 },
      mapElites: { dimensions: [] },
    },
    evaluation: { evaluator: () => {} },
  };

  it("accepts valid options without throwing", () => {
    assert.doesNotThrow(() => validateRunnerOptions(validOptions));
  });

  it("throws when options is null", () => {
    assert.throws(() => validateRunnerOptions(null), /options are required/);
  });

  it("throws when options is a non-object", () => {
    assert.throws(() => validateRunnerOptions("bad"), /options are required/);
  });

  it("throws when config is missing", () => {
    assert.throws(() => validateRunnerOptions({}), /config is required/);
  });

  it("throws when config is a non-object", () => {
    assert.throws(
      () => validateRunnerOptions({ config: 42 }),
      /config is required/,
    );
  });

  it("throws when runner config is missing", () => {
    assert.throws(
      () => validateRunnerOptions({ config: {}, evaluation: {} }),
      /loop config is required/,
    );
  });

  it("throws when generations is not a positive integer", () => {
    assert.throws(
      () =>
        validateRunnerOptions({
          config: { runner: { generations: 0 }, mapElites: {} },
          evaluation: {},
        }),
      /positive integer/,
    );
    assert.throws(
      () =>
        validateRunnerOptions({
          config: { runner: { generations: -1 }, mapElites: {} },
          evaluation: {},
        }),
      /positive integer/,
    );
    assert.throws(
      () =>
        validateRunnerOptions({
          config: { runner: { generations: 1.5 }, mapElites: {} },
          evaluation: {},
        }),
      /positive integer/,
    );
  });

  it("throws when mapElites config is missing", () => {
    assert.throws(
      () =>
        validateRunnerOptions({
          config: { runner: { generations: 1 } },
          evaluation: {},
        }),
      /MAP-Elites config/,
    );
  });

  it("throws when evaluation is missing", () => {
    assert.throws(
      () =>
        validateRunnerOptions({
          config: { runner: { generations: 1 }, mapElites: {} },
        }),
      /evaluation options/,
    );
  });
});
