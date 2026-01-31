import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHumanAgent } from "../../../src/tui/human-agent.js";

describe("createHumanAgent", () => {
  it("returns an object with the given playerId as id", () => {
    const agent = createHumanAgent({ playerId: "p1", onActionNeeded: async () => "a" });
    assert.equal(agent.id, "p1");
  });

  it("returns an object with a selectAction function", () => {
    const agent = createHumanAgent({ playerId: 1, onActionNeeded: async () => "a" });
    assert.equal(typeof agent.selectAction, "function");
  });

  it("throws if onActionNeeded is not a function", () => {
    assert.throws(
      () => createHumanAgent({ playerId: 1, onActionNeeded: null }),
      { message: "onActionNeeded must be a function" },
    );
  });

  it("selectAction returns a Promise", () => {
    const agent = createHumanAgent({ playerId: 1, onActionNeeded: async () => "act" });
    const result = agent.selectAction({ legalActions: [], context: {}, definition: {}, state: {} });
    assert.ok(result instanceof Promise);
  });

  it("selectAction resolves with the value from onActionNeeded", async () => {
    const expected = { id: "attack" };
    const agent = createHumanAgent({
      playerId: 1,
      onActionNeeded: async () => expected,
    });
    const result = await agent.selectAction({ legalActions: [], context: {}, definition: {}, state: {} });
    assert.equal(result, expected);
  });

  it("forwards all arguments to onActionNeeded", async () => {
    let received;
    const agent = createHumanAgent({
      playerId: 1,
      onActionNeeded: async (args) => {
        received = args;
        return "ok";
      },
    });
    const args = {
      legalActions: [{ id: "a" }],
      context: { turn: 1 },
      definition: { actions: [] },
      state: { turn: {} },
      rng: { nextInt: () => 0 },
    };
    await agent.selectAction(args);
    assert.deepStrictEqual(received, args);
  });

  it("propagates rejection from onActionNeeded", async () => {
    const agent = createHumanAgent({
      playerId: 1,
      onActionNeeded: async () => {
        throw new Error("user cancelled");
      },
    });
    await assert.rejects(
      () => agent.selectAction({ legalActions: [] }),
      { message: "user cancelled" },
    );
  });

  it("works when onActionNeeded returns a non-async (sync) thenable value", async () => {
    const agent = createHumanAgent({
      playerId: 1,
      onActionNeeded: (args) => Promise.resolve(args.legalActions[0]),
    });
    const action = { id: "move" };
    const result = await agent.selectAction({ legalActions: [action] });
    assert.equal(result, action);
  });

  it("supports numeric playerId", () => {
    const agent = createHumanAgent({ playerId: 2, onActionNeeded: async () => "a" });
    assert.equal(agent.id, 2);
  });
});
