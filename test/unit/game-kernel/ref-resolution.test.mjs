import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildVariableIndex,
  resolveVarValue,
  resolveRefValue,
} from "../../../src/game-kernel/ref-resolution.js";

const variables = [
  { id: "hp", scope: "per_player", type: { kind: "int" }, initial: 10 },
  { id: "round", scope: "global", type: { kind: "int" }, initial: 0 },
];

function makeState(overrides = {}) {
  return {
    variables: {
      global: { round: overrides.round ?? 0 },
      perPlayer: {
        1: { hp: overrides.hp1 ?? 10 },
        2: { hp: overrides.hp2 ?? 10 },
      },
    },
    tokens: overrides.tokens ?? {},
    zones: overrides.zones ?? {},
    agents: overrides.agents ?? [
      { id: 1, flags: {} },
      { id: 2, flags: {} },
    ],
  };
}

describe("ref-resolution", () => {
  describe("buildVariableIndex", () => {
    it("builds a map from variable id to variable definition", () => {
      const index = buildVariableIndex({ state: { variables } });
      assert.equal(index.size, 2);
      assert.equal(index.get("hp").scope, "per_player");
      assert.equal(index.get("round").scope, "global");
    });

    it("returns empty map for no variables", () => {
      const index = buildVariableIndex({ state: { variables: [] } });
      assert.equal(index.size, 0);
    });
  });

  describe("resolveVarValue", () => {
    it("resolves global variable", () => {
      const state = makeState({ round: 5 });
      const variable = { id: "round", scope: "global" };
      assert.equal(resolveVarValue(state, variable, 1), 5);
    });

    it("resolves per-player variable", () => {
      const state = makeState({ hp1: 7 });
      const variable = { id: "hp", scope: "per_player" };
      assert.equal(resolveVarValue(state, variable, 1), 7);
    });

    it("returns undefined for per-player variable with null playerId", () => {
      const state = makeState();
      const variable = { id: "hp", scope: "per_player" };
      assert.equal(resolveVarValue(state, variable, null), undefined);
    });
  });

  describe("resolveRefValue", () => {
    it("returns undefined for null ref", () => {
      assert.equal(resolveRefValue(null, {}), undefined);
    });

    it("returns undefined for non-object ref", () => {
      assert.equal(resolveRefValue(42, {}), undefined);
    });

    describe("var kind", () => {
      it("resolves global variable ref", () => {
        const state = makeState({ round: 3 });
        const variableIndex = buildVariableIndex({ state: { variables } });
        const result = resolveRefValue(
          { kind: "var", id: "round" },
          { state, variableIndex, playerId: 1 },
        );
        assert.equal(result, 3);
      });

      it("resolves per-player variable ref", () => {
        const state = makeState({ hp2: 4 });
        const variableIndex = buildVariableIndex({ state: { variables } });
        const result = resolveRefValue(
          { kind: "var", id: "hp" },
          { state, variableIndex, playerId: 2 },
        );
        assert.equal(result, 4);
      });

      it("returns undefined for unknown variable id", () => {
        const state = makeState();
        const variableIndex = buildVariableIndex({ state: { variables } });
        const result = resolveRefValue(
          { kind: "var", id: "missing" },
          { state, variableIndex, playerId: 1 },
        );
        assert.equal(result, undefined);
      });
    });

    describe("token kind", () => {
      it("returns true when token exists without attribute", () => {
        const state = makeState({ tokens: { t1: { node: "A", attributes: {} } } });
        const result = resolveRefValue(
          { kind: "token", id: "t1" },
          { state },
        );
        assert.equal(result, true);
      });

      it("resolves token node attribute", () => {
        const state = makeState({ tokens: { t1: { node: "B", attributes: {} } } });
        const result = resolveRefValue(
          { kind: "token", id: "t1", attribute: "node" },
          { state },
        );
        assert.equal(result, "B");
      });

      it("resolves custom token attribute", () => {
        const state = makeState({
          tokens: { t1: { node: "A", attributes: { color: "red" } } },
        });
        const result = resolveRefValue(
          { kind: "token", id: "t1", attribute: "color" },
          { state },
        );
        assert.equal(result, "red");
      });

      it("returns undefined for missing token", () => {
        const state = makeState();
        const result = resolveRefValue(
          { kind: "token", id: "missing" },
          { state },
        );
        assert.equal(result, undefined);
      });
    });

    describe("zone_query kind", () => {
      it("returns count for global zone", () => {
        const state = makeState({
          zones: {
            deck: { id: "deck", scope: "global", tokens: ["t1", "t2"] },
          },
          tokens: { t1: { type: "card" }, t2: { type: "card" } },
        });
        const result = resolveRefValue(
          { kind: "zone_query", id: "deck", query: "count" },
          { state },
        );
        assert.equal(result, 2);
      });

      it("returns has_token for non-empty zone", () => {
        const state = makeState({
          zones: {
            deck: { id: "deck", scope: "global", tokens: ["t1"] },
          },
        });
        const result = resolveRefValue(
          { kind: "zone_query", id: "deck", query: "has_token" },
          { state },
        );
        assert.equal(result, true);
      });

      it("returns undefined for missing zone", () => {
        const state = makeState();
        const result = resolveRefValue(
          { kind: "zone_query", id: "missing", query: "count" },
          { state },
        );
        assert.equal(result, undefined);
      });
    });

    describe("flag_query kind", () => {
      it("returns true when flag exists on token", () => {
        const state = makeState({
          tokens: { t1: { flags: { revealed: true } } },
        });
        const result = resolveRefValue(
          { kind: "flag_query", id: "t1", flag: "revealed" },
          { state },
        );
        assert.equal(result, true);
      });

      it("returns false when flag does not exist", () => {
        const state = makeState({
          tokens: { t1: { flags: {} } },
        });
        const result = resolveRefValue(
          { kind: "flag_query", id: "t1", flag: "revealed" },
          { state },
        );
        assert.equal(result, false);
      });
    });

    describe("meta kind", () => {
      it("resolves legalActionCount", () => {
        const result = resolveRefValue(
          { kind: "meta", id: "legalActionCount" },
          { meta: { legalActionCount: 5 } },
        );
        assert.equal(result, 5);
      });

      it("resolves hasLegalActions from boolean", () => {
        const result = resolveRefValue(
          { kind: "meta", id: "hasLegalActions" },
          { meta: { hasLegalActions: true } },
        );
        assert.equal(result, true);
      });

      it("derives hasLegalActions from legalActionCount > 0", () => {
        const result = resolveRefValue(
          { kind: "meta", id: "hasLegalActions" },
          { meta: { legalActionCount: 3 } },
        );
        assert.equal(result, true);
      });

      it("derives hasLegalActions false from legalActionCount == 0", () => {
        const result = resolveRefValue(
          { kind: "meta", id: "hasLegalActions" },
          { meta: { legalActionCount: 0 } },
        );
        assert.equal(result, false);
      });

      it("returns undefined when meta is absent", () => {
        const result = resolveRefValue(
          { kind: "meta", id: "legalActionCount" },
          {},
        );
        assert.equal(result, undefined);
      });
    });

    describe("unknown kind", () => {
      it("returns undefined for unrecognized ref kind", () => {
        const result = resolveRefValue(
          { kind: "unknown_kind" },
          { state: makeState(), variableIndex: new Map() },
        );
        assert.equal(result, undefined);
      });
    });
  });
});
