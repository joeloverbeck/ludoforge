import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateSemanticId } from "../../../src/evolutionary-engine/mutation/semantic-naming.js";

describe("generateSemanticId", () => {
  // ── Action naming ──────────────────────────────────────────────────

  describe("action naming", () => {
    it("names a single inc-effect action as boost", () => {
      const action = { actor: "player", effects: [{ kind: "inc" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "boost");
    });

    it("names a single dec-effect action as drain", () => {
      const action = { actor: "player", effects: [{ kind: "dec" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "drain");
    });

    it("names a single move-effect action as shift", () => {
      const action = { actor: "player", effects: [{ kind: "move" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "shift");
    });

    it("names a single spawn-effect action as summon", () => {
      const action = { actor: "player", effects: [{ kind: "spawn" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "summon");
    });

    it("names a single destroy-effect action as banish", () => {
      const action = { actor: "player", effects: [{ kind: "destroy" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "banish");
    });

    it("names a single reveal-effect action as unveil", () => {
      const action = { actor: "player", effects: [{ kind: "reveal" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "unveil");
    });

    it("names a single hide-effect action as cloak", () => {
      const action = { actor: "player", effects: [{ kind: "hide" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "cloak");
    });

    it("names a single set-effect action as set", () => {
      const action = { actor: "player", effects: [{ kind: "set" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "set");
    });

    it("names a single move_spatial-effect action as traverse", () => {
      const action = { actor: "player", effects: [{ kind: "move_spatial" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "traverse");
    });

    it("names a single repeat-effect action as volley", () => {
      const action = { actor: "player", effects: [{ kind: "repeat" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "volley");
    });

    it("names a single set_flag-effect action as mark", () => {
      const action = { actor: "player", effects: [{ kind: "set_flag" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "mark");
    });

    it("names move+dec as retreat", () => {
      const action = { actor: "player", effects: [{ kind: "move" }, { kind: "dec" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "retreat");
    });

    it("names inc+move as charge", () => {
      const action = { actor: "player", effects: [{ kind: "inc" }, { kind: "move" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "charge");
    });

    it("names destroy+spawn as transform", () => {
      const action = { actor: "player", effects: [{ kind: "destroy" }, { kind: "spawn" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "transform");
    });

    it("prepends auto for system actor", () => {
      const action = { actor: "system", effects: [{ kind: "inc" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "auto-boost");
    });

    it("prepends swift for reaction actor", () => {
      const action = { actor: "reaction", effects: [{ kind: "destroy" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "swift-banish");
    });

    it("falls back to act for an action with no effects", () => {
      const action = { actor: "player", effects: [] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "act");
    });

    it("falls back to act for null effects", () => {
      const action = { actor: "player" };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "act");
    });

    it("handles unknown effect kinds gracefully", () => {
      const action = { actor: "player", effects: [{ kind: "teleport" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "act");
    });

    it("handles three effects by falling back through multi-effect lookup", () => {
      const action = {
        actor: "player",
        effects: [{ kind: "inc" }, { kind: "move" }, { kind: "destroy" }],
      };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(typeof id, "string");
      assert.ok(id.length > 0);
    });
  });

  // ── Zone naming ────────────────────────────────────────────────────

  describe("zone naming", () => {
    it("names global+ordered+public as lane", () => {
      const zone = { scope: "global", order: "ordered", visibility: "public" };
      const id = generateSemanticId("zone", zone, new Set());
      assert.equal(id, "lane");
    });

    it("names global+unordered+public as field", () => {
      const zone = { scope: "global", order: "unordered", visibility: "public" };
      const id = generateSemanticId("zone", zone, new Set());
      assert.equal(id, "field");
    });

    it("names global+ordered+private as vault", () => {
      const zone = { scope: "global", order: "ordered", visibility: "private" };
      const id = generateSemanticId("zone", zone, new Set());
      assert.equal(id, "vault");
    });

    it("names per_player+unordered+private as hand", () => {
      const zone = { scope: "per_player", order: "unordered", visibility: "private" };
      const id = generateSemanticId("zone", zone, new Set());
      assert.equal(id, "hand");
    });

    it("names per_player+ordered+public as row", () => {
      const zone = { scope: "per_player", order: "ordered", visibility: "public" };
      const id = generateSemanticId("zone", zone, new Set());
      assert.equal(id, "row");
    });

    it("names spatial global+unordered+public as arena", () => {
      const zone = {
        scope: "global",
        order: "unordered",
        visibility: "public",
        spatial: { nodes: ["a", "b"] },
      };
      const id = generateSemanticId("zone", zone, new Set());
      assert.equal(id, "arena");
    });

    it("names spatial global+ordered+public as path", () => {
      const zone = {
        scope: "global",
        order: "ordered",
        visibility: "public",
        spatial: { nodes: ["a"] },
      };
      const id = generateSemanticId("zone", zone, new Set());
      assert.equal(id, "path");
    });

    it("defaults missing properties to global+unordered+public (field)", () => {
      const zone = {};
      const id = generateSemanticId("zone", zone, new Set());
      assert.equal(id, "field");
    });
  });

  // ── Token naming ───────────────────────────────────────────────────

  describe("token naming", () => {
    it("names a token with 0 attributes as marker", () => {
      const token = { attributes: [] };
      const id = generateSemanticId("token", token, new Set());
      assert.equal(id, "marker");
    });

    it("names a token with 1 attribute as counter", () => {
      const token = { attributes: [{ id: "value", type: { kind: "int" } }] };
      const id = generateSemanticId("token", token, new Set());
      assert.equal(id, "counter");
    });

    it("names a token with 2 attributes as piece", () => {
      const token = {
        attributes: [
          { id: "value", type: { kind: "int" } },
          { id: "color", type: { kind: "enum" } },
        ],
      };
      const id = generateSemanticId("token", token, new Set());
      assert.equal(id, "piece");
    });

    it("names a token with 3+ attributes as hero", () => {
      const token = {
        attributes: [
          { id: "hp" }, { id: "attack" }, { id: "defense" },
        ],
      };
      const id = generateSemanticId("token", token, new Set());
      assert.equal(id, "hero");
    });

    it("handles missing attributes as marker", () => {
      const token = {};
      const id = generateSemanticId("token", token, new Set());
      assert.equal(id, "marker");
    });
  });

  // ── Target naming ──────────────────────────────────────────────────

  describe("target naming", () => {
    it("names a token target as pick", () => {
      const target = { kind: "token", selector: {} };
      const id = generateSemanticId("target", target, new Set());
      assert.equal(id, "pick");
    });

    it("names a player target as chooser", () => {
      const target = { kind: "player" };
      const id = generateSemanticId("target", target, new Set());
      assert.equal(id, "chooser");
    });

    it("names a zone target as area", () => {
      const target = { kind: "zone" };
      const id = generateSemanticId("target", target, new Set());
      assert.equal(id, "area");
    });

    it("falls back to target for unknown kind", () => {
      const target = { kind: "unknown" };
      const id = generateSemanticId("target", target, new Set());
      assert.equal(id, "target");
    });
  });

  // ── Phase naming ───────────────────────────────────────────────────

  describe("phase naming", () => {
    it("returns dawn for the first phase", () => {
      const id = generateSemanticId("phase", null, new Set());
      assert.equal(id, "dawn");
    });

    it("returns morning when dawn is taken", () => {
      const id = generateSemanticId("phase", null, new Set(["dawn"]));
      assert.equal(id, "morning");
    });

    it("returns midday when dawn and morning are taken", () => {
      const id = generateSemanticId("phase", null, new Set(["dawn", "morning"]));
      assert.equal(id, "midday");
    });

    it("falls back to phase when all ordinals are taken", () => {
      const allOrdinals = new Set([
        "dawn", "morning", "midday", "afternoon", "dusk",
        "evening", "twilight", "night", "midnight", "witching",
        "wee-hours", "predawn",
      ]);
      const id = generateSemanticId("phase", null, allOrdinals);
      assert.equal(id, "phase");
    });
  });

  // ── Collision resolution ───────────────────────────────────────────

  describe("collision resolution", () => {
    it("returns base name when no collision", () => {
      const action = { actor: "player", effects: [{ kind: "inc" }] };
      const id = generateSemanticId("action", action, new Set());
      assert.equal(id, "boost");
    });

    it("appends -2 on first collision", () => {
      const action = { actor: "player", effects: [{ kind: "inc" }] };
      const id = generateSemanticId("action", action, new Set(["boost"]));
      assert.equal(id, "boost-2");
    });

    it("appends -3 when -2 is also taken", () => {
      const action = { actor: "player", effects: [{ kind: "inc" }] };
      const id = generateSemanticId("action", action, new Set(["boost", "boost-2"]));
      assert.equal(id, "boost-3");
    });

    it("never returns a name already in existingIds", () => {
      const existing = new Set(["boost", "boost-2", "boost-3", "boost-4"]);
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
      assert.equal(id, "act");
    });

    it("handles undefined existingIds", () => {
      const action = { actor: "player", effects: [{ kind: "inc" }] };
      const id = generateSemanticId("action", action, undefined);
      assert.equal(id, "boost");
    });

    it("handles unknown elementType gracefully", () => {
      const id = generateSemanticId("widget", {}, new Set());
      assert.equal(id, "widget");
    });

    it("is deterministic — same input produces same output", () => {
      const action = { actor: "player", effects: [{ kind: "move" }, { kind: "dec" }] };
      const existing = new Set(["retreat"]);
      const id1 = generateSemanticId("action", action, existing);
      const id2 = generateSemanticId("action", action, existing);
      assert.equal(id1, id2);
    });
  });
});
