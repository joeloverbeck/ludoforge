import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRunnerConfig } from "../../../src/evolution-runner/config.js";

const baseConfig = {
  version: "v1",
  runner: { generations: 3 },
  mapElites: {
    descriptors: [{ id: "balance", min: 0, max: 1, bins: 5 }],
  },
};

function cloneConfig(config) {
  return structuredClone(config);
}

function compareErrors(left, right) {
  if (left.path !== right.path) {
    return left.path < right.path ? -1 : 1;
  }
  if (left.keyword !== right.keyword) {
    return left.keyword < right.keyword ? -1 : 1;
  }
  if (left.schemaPath !== right.schemaPath) {
    return left.schemaPath < right.schemaPath ? -1 : 1;
  }
  if (left.message !== right.message) {
    return left.message < right.message ? -1 : 1;
  }
  const leftParams = JSON.stringify(left.params);
  const rightParams = JSON.stringify(right.params);
  if (leftParams !== rightParams) {
    return leftParams < rightParams ? -1 : 1;
  }
  return 0;
}

test("validateRunnerConfig returns valid true for a minimal config", () => {
  const result = validateRunnerConfig(cloneConfig(baseConfig));
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateRunnerConfig returns sorted, structured errors", () => {
  const candidate = cloneConfig(baseConfig);
  delete candidate.version;
  candidate.runner.generations = 0;

  const result = validateRunnerConfig(candidate);

  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 2);
  assert.ok(result.errors.some((error) => error.path === "/version"));

  const sorted = [...result.errors].sort(compareErrors);
  assert.deepEqual(result.errors, sorted);
});

test("validateRunnerConfig reports descriptor range violations", () => {
  const candidate = cloneConfig(baseConfig);
  candidate.mapElites.descriptors[0].min = 5;
  candidate.mapElites.descriptors[0].max = 1;

  const result = validateRunnerConfig(candidate);

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) =>
        error.path === "/mapElites/descriptors/0" &&
        /max must be greater than min/i.test(error.message),
    ),
  );
});

test("validateRunnerConfig reports duplicate descriptor ids", () => {
  const candidate = cloneConfig(baseConfig);
  candidate.mapElites.descriptors.push({ id: "balance", min: 0, max: 10, bins: 4 });

  const result = validateRunnerConfig(candidate);

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) =>
        error.path === "/mapElites/descriptors/1/id" &&
        /duplicated/i.test(error.message),
    ),
  );
});

test("validateRunnerConfig reports schema violations for descriptors", () => {
  const candidate = cloneConfig(baseConfig);
  candidate.mapElites.descriptors[0].bins = 0;

  const result = validateRunnerConfig(candidate);

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) =>
        error.path === "/mapElites/descriptors/0/bins" &&
        /must be >= 1/i.test(error.message),
    ),
  );
});
