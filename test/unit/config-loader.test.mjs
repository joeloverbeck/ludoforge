import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadConfigFile, loadConfigSet } from "../../src/config/loader.js";
import { createConfigFingerprint } from "../../src/config/fingerprint.js";

describe("config-loader", () => {
  describe("loadConfigSet", () => {
    it("loads default configs and builds a fingerprint", async () => {
      const result = await loadConfigSet();

      assert.equal(result.valid, true);
      assert.ok(result.configVersion);
      assert.ok(result.configVersion.fingerprint.startsWith("sha256:"));
      assert.equal(typeof result.configVersion.versions.simulation, "number");
      assert.ok(result.config.simulation);
    });
  });

  describe("loadConfigFile", () => {
    it("reports schema violations for invalid config", async () => {
      const baseDir = await mkdtemp(join(tmpdir(), "ludoforge-config-"));
      const invalidConfig = {
        version: 1,
        maxTurns: "nope",
        maxSteps: null,
        loopDetection: { enabled: false, maxRepeatedStates: null },
        turn: { noLegalActions: { policy: "invalid", reason: null } },
        rng: { seed: null, algorithm: "lcg32" },
      };

      await writeFile(
        join(baseDir, "simulation.json"),
        `${JSON.stringify(invalidConfig, null, 2)}\n`,
        "utf8",
      );

      const result = await loadConfigFile({ name: "simulation", configDir: baseDir });

      assert.equal(result.valid, false);
      assert.ok(result.errors.some((error) => error.path === "/maxTurns"));
      assert.ok(result.errors.some((error) => error.path === "/turn/noLegalActions/policy"));
    });
  });

  describe("createConfigFingerprint", () => {
    it("is deterministic for equivalent objects", () => {
      const left = {
        b: 2,
        a: { d: 4, c: 3 },
        list: [{ z: 1, y: 2 }],
      };
      const right = {
        list: [{ y: 2, z: 1 }],
        a: { c: 3, d: 4 },
        b: 2,
      };

      assert.equal(createConfigFingerprint(left), createConfigFingerprint(right));
    });
  });
});
