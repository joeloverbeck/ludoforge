import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateSemanticId } from "../../../src/evolutionary-engine/mutation/semantic-naming.js";

describe("generateSemanticId", () => {
  // ── Action naming ──────────────────────────────────────────────────

  describe("action naming", () => {
    it("names a single inc-effect action as boost-1", () => {
      const action = { actor: "player", effects: [{ kind: "inc" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "boost-1");
    });

    it("names a single dec-effect action as drain-1", () => {
      const action = { actor: "player", effects: [{ kind: "dec" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "drain-1");
    });

    it("names a single move-effect action as shift-1", () => {
      const action = { actor: "player", effects: [{ kind: "move" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "shift-1");
    });

    it("names a single spawn-effect action as summon-1", () => {
      const action = { actor: "player", effects: [{ kind: "spawn" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "summon-1");
    });

    it("names a single destroy-effect action as banish-1", () => {
      const action = { actor: "player", effects: [{ kind: "destroy" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "banish-1");
    });

    it("names a single reveal-effect action as unveil-1", () => {
      const action = { actor: "player", effects: [{ kind: "reveal" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "unveil-1");
    });

    it("names a single hide-effect action as cloak-1", () => {
      const action = { actor: "player", effects: [{ kind: "hide" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "cloak-1");
    });

    it("names a single set-effect action as set-1", () => {
      const action = { actor: "player", effects: [{ kind: "set" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "set-1");
    });

    it("names a single move_spatial-effect action as traverse-1", () => {
      const action = { actor: "player", effects: [{ kind: "move_spatial" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "traverse-1");
    });

    it("names a single repeat-effect action as volley-1", () => {
      const action = { actor: "player", effects: [{ kind: "repeat" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "volley-1");
    });

    it("names a single set_flag-effect action as mark-1", () => {
      const action = { actor: "player", effects: [{ kind: "set_flag" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "mark-1");
    });

    it("names move+dec as retreat-1", () => {
      const action = { actor: "player", effects: [{ kind: "move" }, { kind: "dec" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "retreat-1");
    });

    it("names inc+move as charge-1", () => {
      const action = { actor: "player", effects: [{ kind: "inc" }, { kind: "move" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "charge-1");
    });

    it("names destroy+spawn as transform-1", () => {
      const action = { actor: "player", effects: [{ kind: "destroy" }, { kind: "spawn" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "transform-1");
    });

    it("prepends auto for system actor", () => {
      const action = { actor: "system", effects: [{ kind: "inc" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "auto-boost-1");
    });

    it("prepends swift for reaction actor", () => {
      const action = { actor: "reaction", effects: [{ kind: "destroy" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "swift-banish-1");
    });

    it("falls back to act for an action with no effects", () => {
      const action = { actor: "player", effects: [] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "act-1");
    });

    it("falls back to act for null effects", () => {
      const action = { actor: "player" };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "act-1");
    });

    it("handles unknown effect kinds gracefully", () => {
      const action = { actor: "player", effects: [{ kind: "teleport" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "act-1");
    });

    it("handles three effects by falling back through multi-effect lookup", () => {
      const action = {
        actor: "player",
        effects: [{ kind: "inc" }, { kind: "move" }, { kind: "destroy" }],
      };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(typeof id, "string");
      assert.ok(id.length > 0);
      assert.match(id, /-\d+$/);
    });
  });

  // ── Zone naming ────────────────────────────────────────────────────

  describe("zone naming", () => {
    it("names global+ordered+public as lane-1", () => {
      const zone = { scope: "global", order: "ordered", visibility: "public" };
      const id = generateSemanticId("zone", zone, new Set());
      assert.equal(id, "lane-1");
    });

    it("names global+unordered+public as field-1", () => {
      const zone = { scope: "global", order: "unordered", visibility: "public" };
      const id = generateSemanticId("zone", zone, new Set());
      assert.equal(id, "field-1");
    });

    it("names global+ordered+private as vault-1", () => {
      const zone = { scope: "global", order: "ordered", visibility: "private" };
      const id = generateSemanticId("zone", zone, new Set());
      assert.equal(id, "vault-1");
    });

    it("names per_player+unordered+private as hand-1", () => {
      const zone = { scope: "per_player", order: "unordered", visibility: "private" };
      const id = generateSemanticId("zone", zone, new Set());
      assert.equal(id, "hand-1");
    });

    it("names per_player+ordered+public as row-1", () => {
      const zone = { scope: "per_player", order: "ordered", visibility: "public" };
      const id = generateSemanticId("zone", zone, new Set());
      assert.equal(id, "row-1");
    });

    it("names spatial global+unordered+public as arena-1", () => {
      const zone = {
        scope: "global",
        order: "unordered",
        visibility: "public",
        spatial: { nodes: ["a", "b"] },
      };
      const id = generateSemanticId("zone", zone, new Set());
      assert.equal(id, "arena-1");
    });

    it("names spatial global+ordered+public as path-1", () => {
      const zone = {
        scope: "global",
        order: "ordered",
        visibility: "public",
        spatial: { nodes: ["a"] },
      };
      const id = generateSemanticId("zone", zone, new Set());
      assert.equal(id, "path-1");
    });

    it("defaults missing properties to global+unordered+public (field-1)", () => {
      const zone = {};
      const id = generateSemanticId("zone", zone, new Set());
      assert.equal(id, "field-1");
    });
  });

  // ── Token naming ───────────────────────────────────────────────────

  describe("token naming", () => {
    it("names a token with 0 attributes as marker-1", () => {
      const token = { attributes: [] };
      const id = generateSemanticId("token", token, new Set());
      assert.equal(id, "marker-1");
    });

    it("names a token with 1 attribute as counter-1", () => {
      const token = { attributes: [{ id: "value", type: { kind: "int" } }] };
      const id = generateSemanticId("token", token, new Set());
      assert.equal(id, "counter-1");
    });

    it("names a token with 2 attributes as piece-1", () => {
      const token = {
        attributes: [
          { id: "value", type: { kind: "int" } },
          { id: "color", type: { kind: "enum" } },
        ],
      };
      const id = generateSemanticId("token", token, new Set());
      assert.equal(id, "piece-1");
    });

    it("names a token with 3+ attributes as hero-1", () => {
      const token = {
        attributes: [
          { id: "hp" }, { id: "attack" }, { id: "defense" },
        ],
      };
      const id = generateSemanticId("token", token, new Set());
      assert.equal(id, "hero-1");
    });

    it("handles missing attributes as marker-1", () => {
      const token = {};
      const id = generateSemanticId("token", token, new Set());
      assert.equal(id, "marker-1");
    });
  });

  // ── Target naming ──────────────────────────────────────────────────

  describe("target naming", () => {
    it("names a token target as pick-1", () => {
      const target = { kind: "token", selector: {} };
      const id = generateSemanticId("target", target, new Set());
      assert.equal(id, "pick-1");
    });

    it("names a player target as chooser-1", () => {
      const target = { kind: "player" };
      const id = generateSemanticId("target", target, new Set());
      assert.equal(id, "chooser-1");
    });

    it("names a zone target as area-1", () => {
      const target = { kind: "zone" };
      const id = generateSemanticId("target", target, new Set());
      assert.equal(id, "area-1");
    });

    it("falls back to target-1 for unknown kind", () => {
      const target = { kind: "unknown" };
      const id = generateSemanticId("target", target, new Set());
      assert.equal(id, "target-1");
    });
  });

  // ── Variable naming ────────────────────────────────────────────────

  describe("variable naming", () => {
    it("returns tally-1 for the first variable", () => {
      const id = generateSemanticId("variable", null, new Set());
      assert.equal(id, "tally-1");
    });

    it("returns score-1 when tally-1 is taken", () => {
      const id = generateSemanticId("variable", null, new Set(["tally-1"]));
      assert.equal(id, "score-1");
    });

    it("returns gauge-1 when tally-1 and score-1 are taken", () => {
      const id = generateSemanticId("variable", null, new Set(["tally-1", "score-1"]));
      assert.equal(id, "gauge-1");
    });

    it("falls back to variable-1 when all names are taken", () => {
      const allNames = new Set([
        "tally-1", "score-1", "gauge-1", "meter-1", "count-1",
        "points-1", "level-1", "rank-1", "power-1", "energy-1",
        "health-1", "supply-1",
      ]);
      const id = generateSemanticId("variable", null, allNames);
      assert.equal(id, "variable-1");
    });

    it("assigns unique IDs for multiple variables", () => {
      const ids = new Set();
      for (let i = 0; i < 5; i++) {
        const id = generateSemanticId("variable", null, ids);
        assert.ok(!ids.has(id));
        ids.add(id);
      }
      assert.equal(ids.size, 5);
    });
  });

  // ── Phase naming ───────────────────────────────────────────────────

  describe("phase naming", () => {
    it("returns dawn-1 for the first phase", () => {
      const id = generateSemanticId("phase", null, new Set());
      assert.equal(id, "dawn-1");
    });

    it("returns morning-1 when dawn-1 is taken", () => {
      const id = generateSemanticId("phase", null, new Set(["dawn-1"]));
      assert.equal(id, "morning-1");
    });

    it("returns midday-1 when dawn-1 and morning-1 are taken", () => {
      const id = generateSemanticId("phase", null, new Set(["dawn-1", "morning-1"]));
      assert.equal(id, "midday-1");
    });

    it("falls back to phase-1 when all ordinals are taken", () => {
      const allOrdinals = new Set([
        "dawn-1", "morning-1", "midday-1", "afternoon-1", "dusk-1",
        "evening-1", "twilight-1", "night-1", "midnight-1", "witching-1",
        "wee-hours-1", "predawn-1",
      ]);
      const id = generateSemanticId("phase", null, allOrdinals);
      assert.equal(id, "phase-1");
    });
  });

  // ── Collision resolution ───────────────────────────────────────────

  describe("collision resolution", () => {
    it("returns name-1 when no collision", () => {
      const action = { actor: "player", effects: [{ kind: "inc" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "boost-1");
    });

    it("appends -2 on first collision", () => {
      const action = { actor: "player", effects: [{ kind: "inc" }] };
      const id = generateSemanticId("action", action, new Set(["boost-1"]));
      assert.equal(id, "boost-2");
    });

    it("appends -3 when -2 is also taken", () => {
      const action = { actor: "player", effects: [{ kind: "inc" }] };
      const id = generateSemanticId("action", action, new Set(["boost-1", "boost-2"]));
      assert.equal(id, "boost-3");
    });

    it("never returns a name already in existingIds", () => {
      const existing = new Set(["boost-1", "boost-2", "boost-3", "boost-4"]);
      const action = { actor: "player", effects: [{ kind: "inc" }] };
      const id = generateSemanticId("action", action, existing);
      assert.equal(id, "boost-5");
      assert.ok(!existing.has(id));
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles null elementData for non-phase types", () => {
      const id = generateSemanticId("action", null, new Set());
      assert.equal(id, "act-1");
    });

    it("handles undefined existingIds", () => {
      const action = { actor: "player", effects: [{ kind: "inc" }] };
      const id = generateSemanticId("action", action, undefined);
      assert.equal(id, "boost-1");
    });

    it("handles unknown elementType gracefully", () => {
      const id = generateSemanticId("widget", {}, new Set());
      assert.equal(id, "widget-1");
    });

    it("is deterministic — same input produces same output", () => {
      const action = { actor: "player", effects: [{ kind: "move" }, { kind: "dec" }] };
      const existing = new Set(["retreat-1"]);
      const id1 = generateSemanticId("action", action, existing);
      const id2 = generateSemanticId("action", action, existing);
      assert.equal(id1, id2);
    });

    it("all IDs have numeric suffix", () => {
      const action = { actor: "player", effects: [{ kind: "inc" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.match(id, /-\d+$/);
    });
  });
});
