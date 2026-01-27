import { test } from "node:test";
import assert from "node:assert/strict";
import { promptForAction, renderActionList } from "../../src/human-interface/prompt.js";

function createMockIO(inputs) {
  const outputs = [];
  let index = 0;
  return {
    outputs,
    io: {
      async readLine() {
        const value = inputs[index];
        index += 1;
        return value;
      },
      writeLine(line) {
        outputs.push(line);
      },
    },
  };
}

test("prompt renders action list in order and returns the selected action", async () => {
  const legalActions = [{ id: "attack" }, { id: "defend" }, { id: "pass" }];
  const { io, outputs } = createMockIO(["2"]);

  const result = await promptForAction({ legalActions, io });

  assert.equal(result.index, 1);
  assert.equal(result.action.id, "defend");

  const listLines = outputs[0].split("\n");
  assert.equal(listLines[0], "Actions:");
  assert.equal(listLines[1], "  1) attack");
  assert.equal(listLines[2], "  2) defend");
  assert.equal(listLines[3], "  3) pass");
  assert.equal(outputs[1], "Choose action (1-3):");
});

test("prompt re-prompts on invalid input and keeps action mapping stable", async () => {
  const legalActions = [{ id: "alpha" }, { id: "beta" }];
  const { io, outputs } = createMockIO(["nope", "3", "1"]);

  const result = await promptForAction({ legalActions, io });

  assert.equal(result.index, 0);
  assert.equal(result.action.id, "alpha");

  const errorLines = outputs.filter((line) =>
    line.startsWith("Invalid choice."),
  );
  assert.equal(errorLines.length, 2);

  assert.equal(renderActionList(legalActions), "Actions:\n  1) alpha\n  2) beta");
});
