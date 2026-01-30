import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { assertMutationWeights } from "../../../src/evolutionary-engine/operator-config.js";

async function readJson(relativePath) {
  const fileUrl = new URL(relativePath, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

describe("operator-config validation", () => {
  it("throws when enabled operator is missing a weight", async () => {
    const config = await readJson("../../../configs/evolution-operators.json");
    const candidate = structuredClone(config);
    delete candidate.mutation.weights[candidate.mutation.enabled[0]];

    assert.throws(
      () => assertMutationWeights(candidate),
      /missing weight/i,
    );
  });

  it("throws when weight is 0", async () => {
    const config = await readJson("../../../configs/evolution-operators.json");
    const candidate = structuredClone(config);
    const name = candidate.mutation.enabled[0];
    candidate.mutation.weights[name] = 0;

    assert.throws(
      () => assertMutationWeights(candidate),
      /> 0|greater than 0/i,
    );
  });

  it("throws when weight is NaN", async () => {
    const config = await readJson("../../../configs/evolution-operators.json");
    const candidate = structuredClone(config);
    const name = candidate.mutation.enabled[0];
    candidate.mutation.weights[name] = Number.NaN;

    assert.throws(
      () => assertMutationWeights(candidate),
      /finite/i,
    );
  });

  it("throws when weight is -1", async () => {
    const config = await readJson("../../../configs/evolution-operators.json");
    const candidate = structuredClone(config);
    const name = candidate.mutation.enabled[0];
    candidate.mutation.weights[name] = -1;

    assert.throws(
      () => assertMutationWeights(candidate),
      /> 0|greater than 0/i,
    );
  });

  it("throws when weight is Infinity", async () => {
    const config = await readJson("../../../configs/evolution-operators.json");
    const candidate = structuredClone(config);
    const name = candidate.mutation.enabled[0];
    candidate.mutation.weights[name] = Number.POSITIVE_INFINITY;

    assert.throws(
      () => assertMutationWeights(candidate),
      /finite/i,
    );
  });

  it("passes when all weights are finite and > 0", async () => {
    const config = await readJson("../../../configs/evolution-operators.json");
    assert.doesNotThrow(() => assertMutationWeights(config));
  });
});
