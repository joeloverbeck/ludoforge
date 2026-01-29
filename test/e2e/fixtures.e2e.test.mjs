import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateGameDefinition } from "../../src/dsl/validate.js";
import { validateSemanticDefinition } from "../../src/dsl/semantic.js";

const fixtureNames = [
  "minimal-game.json",
  "choice-game.json",
  "visibility-game.json",
  "multi-phase-game.json",
  "token-movement-game.json",
  "per-player-vars-game.json",
  "no-legal-actions-stalemate.json",
  "no-legal-actions-terminate.json",
  "no-legal-actions-pass.json",
  "no-legal-actions-error.json",
  "evo-seed-1.json",
  "evo-seed-2.json",
  "evo-terminates.json",
  "evo-non-terminating.json",
  "boolean-vars-game.json",
  "enum-vars-game.json",
  "multi-token-game.json",
];

async function loadFixture(name) {
  const fileUrl = new URL(`./fixtures/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

describe("fixtures", () => {
  describe("schema and semantic validation", () => {
    it("e2e fixtures validate against schema and semantic rules", async () => {
      for (const name of fixtureNames) {
        const definition = await loadFixture(name);
        const schemaResult = validateGameDefinition(definition);
        assert.equal(
          schemaResult.valid,
          true,
          `${name} failed schema validation: ${JSON.stringify(schemaResult.errors)}`
        );
        const semanticResult = validateSemanticDefinition(definition);
        assert.equal(
          semanticResult.valid,
          true,
          `${name} failed semantic validation: ${JSON.stringify(semanticResult.issues)}`
        );
      }
    });
  });

  describe("feature coverage", () => {
    it("e2e fixtures include intended feature coverage", async () => {
      const minimal = await loadFixture("minimal-game.json");
      assert.equal(minimal.actions.length, 1);

      const choice = await loadFixture("choice-game.json");
      assert.ok(choice.actions.length >= 2);

      const visibility = await loadFixture("visibility-game.json");
      const visibilities = visibility.state.zones.map((zone) => zone.visibility);
      assert.ok(visibilities.includes("public"));
      assert.ok(visibilities.includes("private"));

      const multiPhase = await loadFixture("multi-phase-game.json");
      assert.ok(Array.isArray(multiPhase.turn.phases));
      assert.ok(multiPhase.turn.phases.length >= 2);

      const tokenMovement = await loadFixture("token-movement-game.json");
      const movementKinds = tokenMovement.actions.flatMap((action) =>
        action.effects.map((effect) => effect.kind)
      );
      assert.ok(movementKinds.includes("spawn"));
      assert.ok(movementKinds.includes("move"));

      const perPlayer = await loadFixture("per-player-vars-game.json");
      const scopes = perPlayer.state.variables.map((variable) => variable.scope);
      assert.ok(scopes.includes("per_player"));

      const noLegalActionsStalemate = await loadFixture("no-legal-actions-stalemate.json");
      assert.ok(!noLegalActionsStalemate.turn.noLegalActions);

      const noLegalActionsTerminate = await loadFixture("no-legal-actions-terminate.json");
      assert.equal(noLegalActionsTerminate.turn.noLegalActions?.policy, "terminate");

      const noLegalActionsPass = await loadFixture("no-legal-actions-pass.json");
      assert.equal(noLegalActionsPass.turn.noLegalActions?.policy, "pass");

      const noLegalActionsError = await loadFixture("no-legal-actions-error.json");
      assert.equal(noLegalActionsError.turn.noLegalActions?.policy, "error");

      const booleanVars = await loadFixture("boolean-vars-game.json");
      const boolVarTypes = booleanVars.state.variables.map((v) => v.type.kind);
      assert.ok(boolVarTypes.includes("bool"));

      const enumVars = await loadFixture("enum-vars-game.json");
      const enumVarTypes = enumVars.state.variables.map((v) => v.type.kind);
      assert.ok(enumVarTypes.includes("enum"));

      const multiToken = await loadFixture("multi-token-game.json");
      assert.ok(multiToken.state.tokenTypes.length >= 2);
    });
  });
});
