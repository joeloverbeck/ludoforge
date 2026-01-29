import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createInitialState } from "../../src/game-kernel/index.js";
import { renderState } from "../../src/human-interface/renderer.js";
import { expectOutput } from "./helpers/expect-output.js";

async function loadFixture(name) {
  const fileUrl = new URL(`./fixtures/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw);
}

function seedVisibilityState(state) {
  state.zones.table.tokens = ["t1", "t2", "t3", "t4", "t5", "t6", "t7"];
  state.zones.hand.tokensByPlayer[1] = ["h1", "h2"];
  state.zones.hand.tokensByPlayer[2] = ["h3", "h4"];
}

describe("rendering", () => {
  describe("visibility", () => {
    it("hides private zones from non-active viewers", async () => {
      const definition = await loadFixture("visibility-game.json");
      const state = createInitialState(definition);
      seedVisibilityState(state);

      const output = renderState({
        state,
        viewerPlayerId: 2,
      });

      assert.ok(output.includes("table (global/public/unordered):"));
      assert.ok(!output.includes("hand (per_player/private/unordered):"));
    });

    it("shows private zones for active viewer and collapses large zones", async () => {
      const definition = await loadFixture("visibility-game.json");
      const state = createInitialState(definition);
      seedVisibilityState(state);

      const output = renderState({
        state,
        viewerPlayerId: 1,
      });

      expectOutput(output, [
        "table (global/public/unordered):",
        /t1, t2, t3, t4, t5 \(\+2 more\)/,
        "hand (per_player/private/unordered):",
        "Player 1: h1, h2",
      ]);
    });
  });
});
