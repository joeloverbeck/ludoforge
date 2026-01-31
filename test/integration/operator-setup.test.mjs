import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createMutationSelector,
  loadOperatorStats,
} from "../../src/evolution-runner/operator-setup.js";
import { defaultMutationOperators } from "../../src/evolutionary-engine/mutation.js";
import { createTelemetry } from "../../src/evolution-runner/operator-telemetry.js";
import { createRunId, resolveRunDir, resolveRunPath } from "../../src/evolution-runner/run-layout.js";
import { WeightedSelector } from "../../src/evolutionary-engine/operator-selector.js";

describe("operator-setup integration", () => {
  describe("createMutationSelector with real operators", () => {
    it("produces a valid WeightedSelector from defaultMutationOperators", () => {
      const selector = createMutationSelector(defaultMutationOperators);
      assert.ok(selector instanceof WeightedSelector);
    });

    it("selector.names includes all default operator names", () => {
      const selector = createMutationSelector(defaultMutationOperators);
      const expectedNames = defaultMutationOperators.map((op) => op.name);
      expectedNames.forEach((name) => {
        assert.ok(selector.names.includes(name), `Missing operator: ${name}`);
      });
    });

    it("throws for empty operators array", () => {
      assert.throws(
        () => createMutationSelector([]),
        /Cannot build mutation selector/,
      );
    });
  });

  describe("loadOperatorStats with filesystem", () => {
    let tempDir;
    let runId;

    it("returns null for generation 0 (no file read)", async () => {
      const operatorNames = ["op1", "op2"];
      const result = await loadOperatorStats({
        baseDir: "/tmp",
        runId: createRunId(),
        startGeneration: 0,
        operatorNames,
      });
      assert.equal(result, null);
    });

    it("returns null for negative startGeneration", async () => {
      const result = await loadOperatorStats({
        baseDir: "/tmp",
        runId: createRunId(),
        startGeneration: -1,
        operatorNames: ["op1"],
      });
      assert.equal(result, null);
    });

    it("returns null for ENOENT (missing file)", async () => {
      tempDir = await mkdtemp(join(tmpdir(), "ludoforge-test-"));
      runId = createRunId();
      const result = await loadOperatorStats({
        baseDir: tempDir,
        runId,
        startGeneration: 1,
        operatorNames: ["op1"],
      });
      assert.equal(result, null);
      await rm(tempDir, { recursive: true, force: true });
    });

    it("reads real operator-stats.json from temp dir", async () => {
      tempDir = await mkdtemp(join(tmpdir(), "ludoforge-test-"));
      runId = createRunId();

      const operatorNames = ["op1", "op2"];
      const telemetry = createTelemetry(operatorNames);

      const runDir = resolveRunDir(tempDir, runId);
      const genDir = resolveRunPath(runDir, "generation-0");
      await mkdir(genDir, { recursive: true });
      const statsPath = resolveRunPath(runDir, "generation-0", "operator-stats.json");
      await writeFile(statsPath, JSON.stringify(telemetry), "utf8");

      const result = await loadOperatorStats({
        baseDir: tempDir,
        runId,
        startGeneration: 1,
        operatorNames,
      });

      assert.ok(result !== null);
      assert.ok(result.operators.op1);
      assert.ok(result.operators.op2);
      assert.equal(result.operators.op1.attempts, 0);

      await rm(tempDir, { recursive: true, force: true });
    });

    it("throws for invalid JSON in operator-stats.json", async () => {
      tempDir = await mkdtemp(join(tmpdir(), "ludoforge-test-"));
      runId = createRunId();

      const runDir = resolveRunDir(tempDir, runId);
      const genDir = resolveRunPath(runDir, "generation-0");
      await mkdir(genDir, { recursive: true });
      const statsPath = resolveRunPath(runDir, "generation-0", "operator-stats.json");
      await writeFile(statsPath, "not-json", "utf8");

      await assert.rejects(
        () =>
          loadOperatorStats({
            baseDir: tempDir,
            runId,
            startGeneration: 1,
            operatorNames: ["op1"],
          }),
        /Invalid operator stats/,
      );

      await rm(tempDir, { recursive: true, force: true });
    });
  });
});
