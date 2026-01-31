import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { resolveRunId } from "../../src/cli/resolve-run-id.js";
import { CLIError } from "../../src/cli/cli-error.js";
import { assertValidRunId } from "../../src/evolution-runner/run-layout.js";

const VALID_UUID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_UUID = "123e4567-e89b-42d3-a456-426614174aaa";

function makeDeps(overrides = {}) {
  return {
    assertValidRunId,
    listRuns: async () => [],
    createRunId: () => VALID_UUID,
    ...overrides,
  };
}

describe("resolveRunId (integration)", () => {
  it("throws CLIError with showUsage when --resume without --run-id", async () => {
    await assert.rejects(
      () => resolveRunId({
        parsed: { resume: true },
        baseDir: "/tmp",
        deps: makeDeps(),
      }),
      (error) => {
        assert.ok(error instanceof CLIError);
        assert.ok(error.message.includes("--resume requires --run-id"));
        assert.equal(error.showUsage, true);
        return true;
      },
    );
  });

  it("throws CLIError for invalid UUID format on resume", async () => {
    await assert.rejects(
      () => resolveRunId({
        parsed: { resume: true, runId: "not-a-uuid" },
        baseDir: "/tmp",
        deps: makeDeps(),
      }),
      (error) => {
        assert.ok(error instanceof CLIError);
        assert.ok(error.message.includes("Invalid run ID format"));
        assert.ok(error.hint.includes("UUID"));
        return true;
      },
    );
  });

  it("throws CLIError listing available runs when resume ID not found", async () => {
    await assert.rejects(
      () => resolveRunId({
        parsed: { resume: true, runId: VALID_UUID },
        baseDir: "/tmp",
        deps: makeDeps({ listRuns: async () => [OTHER_UUID] }),
      }),
      (error) => {
        assert.ok(error instanceof CLIError);
        assert.ok(error.message.includes("does not exist"));
        assert.ok(error.hint.includes(OTHER_UUID));
        return true;
      },
    );
  });

  it("says 'No runs found' when resume ID not found and no runs exist", async () => {
    await assert.rejects(
      () => resolveRunId({
        parsed: { resume: true, runId: VALID_UUID },
        baseDir: "/tmp",
        deps: makeDeps(),
      }),
      (error) => {
        assert.ok(error instanceof CLIError);
        assert.ok(error.hint.includes("No runs found"));
        return true;
      },
    );
  });

  it("throws CLIError with resume hint when duplicate ID on new run", async () => {
    await assert.rejects(
      () => resolveRunId({
        parsed: { runId: VALID_UUID },
        baseDir: "/tmp",
        deps: makeDeps({ listRuns: async () => [VALID_UUID] }),
      }),
      (error) => {
        assert.ok(error instanceof CLIError);
        assert.ok(error.message.includes("already exists"));
        assert.ok(error.hint.includes("--resume"));
        return true;
      },
    );
  });

  it("passes through a valid explicit ID on new run", async () => {
    const { runId } = await resolveRunId({
      parsed: { runId: VALID_UUID },
      baseDir: "/tmp",
      deps: makeDeps(),
    });
    assert.equal(runId, VALID_UUID);
  });

  it("auto-generates ID when none provided", async () => {
    const generated = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const { runId } = await resolveRunId({
      parsed: {},
      baseDir: "/tmp",
      deps: makeDeps({ createRunId: () => generated }),
    });
    assert.equal(runId, generated);
  });

  it("throws CLIError for invalid UUID format on new run", async () => {
    await assert.rejects(
      () => resolveRunId({
        parsed: { runId: "bad-format" },
        baseDir: "/tmp",
        deps: makeDeps(),
      }),
      (error) => {
        assert.ok(error instanceof CLIError);
        assert.ok(error.message.includes("Invalid run ID format"));
        return true;
      },
    );
  });

  it("returns existingRuns alongside runId on resume", async () => {
    const { runId, existingRuns } = await resolveRunId({
      parsed: { resume: true, runId: VALID_UUID },
      baseDir: "/tmp",
      deps: makeDeps({ listRuns: async () => [VALID_UUID] }),
    });
    assert.equal(runId, VALID_UUID);
    assert.deepEqual(existingRuns, [VALID_UUID]);
  });
});
