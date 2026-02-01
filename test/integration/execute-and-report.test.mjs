import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { executeAndReport } from "../../src/cli/execute-and-report.js";

function makeConfig(overrides = {}) {
  return {
    preferenceLearning: { enabled: false },
    ...overrides,
  };
}

function makeDeps(overrides = {}) {
  return {
    writeRunMetadata: async () => "ok",
    runEvolutionRunner: async () => ({ runId: "test", generations: [{}], haltedReason: null }),
    ...overrides,
  };
}

function makeReporter() {
  const calls = [];
  return {
    reporter: { onRunComplete: (info) => calls.push(info) },
    calls,
  };
}

const BASE_ARGS = {
  baseDir: "/tmp/test",
  runId: "123e4567-e89b-42d3-a456-426614174000",
  descriptorKeys: ["agency"],
  logger: { info: () => {}, debug: () => {}, error: () => {} },
};

describe("executeAndReport (integration)", () => {
  it("creates evaluator and passes it to runner", async () => {
    let capturedOptions = null;
    const { reporter } = makeReporter();

    await executeAndReport({
      ...BASE_ARGS,
      config: makeConfig(),
      reporter,
      deps: makeDeps({
        runEvolutionRunner: async (opts) => {
          capturedOptions = opts;
          return { generations: [{}] };
        },
      }),
      writeMetadata: false,
      resumed: false,
    });

    assert.ok(capturedOptions.evaluation, "evaluation should be passed to runner");
    assert.equal(typeof capturedOptions.evaluation.evaluator, "function");
  });

  it("writes metadata when writeMetadata is true", async () => {
    let metadataWritten = false;
    const { reporter } = makeReporter();

    await executeAndReport({
      ...BASE_ARGS,
      config: makeConfig(),
      reporter,
      deps: makeDeps({
        writeRunMetadata: async () => { metadataWritten = true; },
      }),
      writeMetadata: true,
      resumed: false,
    });

    assert.ok(metadataWritten);
  });

  it("skips metadata when writeMetadata is false", async () => {
    const { reporter } = makeReporter();

    await executeAndReport({
      ...BASE_ARGS,
      config: makeConfig(),
      reporter,
      deps: makeDeps({
        writeRunMetadata: async () => { throw new Error("should not write metadata"); },
      }),
      writeMetadata: false,
      resumed: false,
    });
  });

  it("calls reporter.onRunComplete with correct shape", async () => {
    const { reporter, calls } = makeReporter();

    await executeAndReport({
      ...BASE_ARGS,
      config: makeConfig(),
      reporter,
      deps: makeDeps({
        runEvolutionRunner: async () => ({ generations: [{}, {}], haltedReason: "timeout" }),
      }),
      writeMetadata: false,
      resumed: true,
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].runId, BASE_ARGS.runId);
    assert.equal(calls[0].generationsCompleted, 2);
    assert.equal(calls[0].halted, true);
  });

  it("returns standard result shape", async () => {
    const { reporter } = makeReporter();

    const result = await executeAndReport({
      ...BASE_ARGS,
      config: makeConfig(),
      reporter,
      deps: makeDeps(),
      writeMetadata: false,
      resumed: true,
    });

    assert.equal(result.runId, BASE_ARGS.runId);
    assert.equal(result.baseDir, BASE_ARGS.baseDir);
    assert.equal(result.dryRun, false);
    assert.equal(result.resumed, true);
    assert.ok(result.result);
  });

  it("passes population and startGeneration to runner when provided", async () => {
    let capturedOptions = null;
    const { reporter } = makeReporter();
    const population = [{ id: "g1" }];

    await executeAndReport({
      ...BASE_ARGS,
      config: makeConfig(),
      reporter,
      deps: makeDeps({
        runEvolutionRunner: async (opts) => {
          capturedOptions = opts;
          return { generations: [{}] };
        },
      }),
      population,
      startGeneration: 3,
      preferenceModelSnapshots: [{ model: "snap" }],
      writeMetadata: false,
      resumed: true,
    });

    assert.deepEqual(capturedOptions.population, population);
    assert.equal(capturedOptions.startGeneration, 3);
    assert.deepEqual(capturedOptions.preferenceModelSnapshots, [{ model: "snap" }]);
  });
});
