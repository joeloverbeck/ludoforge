import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writePreferenceModelSnapshotJsonl } from "../../../src/data-persistence/preference-model-store.js";
import {
  createRunId,
  resolveRunDir,
  resolveRunPath,
  writeRunMetadata,
} from "../../../src/evolution-runner/run-layout.js";
import { loadResumeState } from "../../../src/evolution-runner/resume-loader.js";

function createRunnerConfig(version = "v1") {
  return {
    version,
    runner: { generations: 3 },
    mapElites: {
      descriptors: [
        { id: "novelty", min: 0, max: 1, bins: 4 },
        { id: "score", min: 0, max: 100, bins: 5 },
      ],
    },
  };
}

async function createRunFixture({ baseDir, runId, config }) {
  const runDir = resolveRunDir(baseDir, runId);
  await mkdir(runDir, { recursive: true });
  await writeRunMetadata(baseDir, runId, { config });

  const generation0 = resolveRunPath(runDir, "generation-0");
  const generation2 = resolveRunPath(runDir, "generation-2");
  await mkdir(generation0, { recursive: true });
  await mkdir(generation2, { recursive: true });

  const populationPath = resolveRunPath(runDir, "generation-2", "population.jsonl");
  const populationLines = [
    { id: "genome-a", definition: { title: "alpha" } },
    { id: "genome-b", definition: { title: "beta" } },
  ].map((entry) => JSON.stringify(entry));
  await writeFile(populationPath, `${populationLines.join("\n")}\n`, "utf8");

  const modelPath = resolveRunPath(runDir, "generation-2", "preference-model.jsonl");
  const snapshots = [
    {
      id: "snapshot-1",
      version: "v1",
      createdAt: new Date().toISOString(),
      trainingWindow: { size: 1 },
      hyperparams: { lr: 0.1 },
      metrics: { loss: 0.5 },
      weights: { novelty: 0.2 },
    },
    {
      id: "snapshot-2",
      version: "v1",
      createdAt: new Date().toISOString(),
      trainingWindow: { size: 2 },
      hyperparams: { lr: 0.2 },
      metrics: { loss: 0.4 },
      weights: { novelty: 0.3 },
    },
  ];

  await writePreferenceModelSnapshotJsonl(modelPath, snapshots);

  return { runDir };
}

describe("resume-loader", () => {
  describe("loadResumeState", () => {
    it("loads latest generation population and preference model", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-resume-"));
      const runId = createRunId();
      const config = createRunnerConfig("v1");

      await createRunFixture({ baseDir, runId, config });

      const resumeState = await loadResumeState({ baseDir, runId, config });

      assert.equal(resumeState.runId, runId);
      assert.equal(resumeState.generation, 2);
      assert.deepEqual(
        resumeState.population.map((entry) => entry.id),
        ["genome-a", "genome-b"],
      );
      assert.equal(resumeState.preferenceModel.id, "snapshot-2");
    });

    it("rejects config version mismatches", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-resume-"));
      const runId = createRunId();
      const config = createRunnerConfig("v1");

      await createRunFixture({ baseDir, runId, config });

      await assert.rejects(
        () => loadResumeState({ baseDir, runId, config: createRunnerConfig("v2") }),
        /config version/i,
      );
    });

    it("rejects missing preference-model snapshot", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-resume-"));
      const runId = createRunId();
      const config = createRunnerConfig("v1");
      const runDir = resolveRunDir(baseDir, runId);

      await mkdir(runDir, { recursive: true });
      await writeRunMetadata(baseDir, runId, { config });

      const generationDir = resolveRunPath(runDir, "generation-1");
      await mkdir(generationDir, { recursive: true });

      const populationPath = resolveRunPath(runDir, "generation-1", "population.jsonl");
      await writeFile(
        populationPath,
        `${JSON.stringify({ id: "genome-x", definition: { title: "x" } })}\n`,
        "utf8",
      );

      await assert.rejects(
        () => loadResumeState({ baseDir, runId, config }),
        /preference-model\.jsonl/i,
      );
    });
  });
});
