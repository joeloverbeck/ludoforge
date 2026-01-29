import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assemblePreferenceFeedbackComparison,
  promptForPairwiseComparison,
  promptForRating,
} from "../../../src/human-interface/feedback.js";

function createTestIO(inputs) {
  const lines = [];
  let index = 0;
  return {
    io: {
      async readLine() {
        const value = inputs[index] ?? "";
        index += 1;
        return value;
      },
      writeLine(line) {
        lines.push(line);
      },
    },
    lines,
  };
}

describe("feedback", () => {
  describe("promptForRating", () => {
    it("validates input and returns a rating record", async () => {
      const { io, lines } = createTestIO(["0", "six", "3", "", ""]);

      const record = await promptForRating({ io });

      assert.equal(record.type, "rating");
      assert.equal(record.rating, 3);
      assert.equal(record.tags, undefined);
      assert.equal(record.rationale, undefined);
      assert.ok(lines.some((line) => line.includes("Invalid rating")));
    });

    it("captures optional tags and rationale", async () => {
      const { io } = createTestIO(["5", " fast, too random ,", "needs more choices "]);

      const record = await promptForRating({ io });

      assert.deepEqual(record.tags, ["fast", "too random"]);
      assert.equal(record.rationale, "needs more choices");
    });
  });

  describe("promptForPairwiseComparison", () => {
    it("normalizes A/B input", async () => {
      const { io, lines } = createTestIO(["x", "B", "", "felt fair"]);

      const record = await promptForPairwiseComparison({ io });

      assert.equal(record.type, "comparison");
      assert.equal(record.preferred, "b");
      assert.equal(record.tags, undefined);
      assert.equal(record.rationale, "felt fair");
      assert.ok(lines.some((line) => line.includes("Invalid choice")));
    });

    it("accepts tie", async () => {
      const { io } = createTestIO(["tie", "", ""]);

      const record = await promptForPairwiseComparison({ io });

      assert.equal(record.type, "comparison");
      assert.equal(record.preferred, "tie");
    });
  });

  describe("prompt defaults", () => {
    it("match human-feedback config", async () => {
      const configUrl = new URL("../../../configs/human-feedback.json", import.meta.url);
      const config = JSON.parse(await readFile(configUrl, "utf8"));
      const allowedChoices = new Set(["a", "b", "tie"]);
      for (const choice of config.comparison.choices) {
        assert.ok(allowedChoices.has(choice.trim().toLowerCase()));
      }
      const rangeSuffix =
        config.rating.min === 1 && config.rating.max === 5
          ? "1-5, 3 = neutral"
          : `${config.rating.min}-${config.rating.max}`;
      const choiceHint = config.comparison.choices.join("/");

      const { io, lines } = createTestIO(["3", "", "", "A", "", ""]);

      await promptForRating({ io });
      await promptForPairwiseComparison({ io });

      assert.ok(lines[0].includes(config.promptText.rating));
      assert.ok(lines[0].includes(`(${rangeSuffix})`));
      assert.ok(lines.some((line) => line.includes(config.promptText.comparison)));
      assert.ok(lines.some((line) => line.includes(`(${choiceHint})`)));
    });
  });

  describe("assemblePreferenceFeedbackComparison", () => {
    it("maps winner and preserves notes", () => {
      const candidateA = { id: "game-a", featureVector: { speed: 2, depth: 4 } };
      const candidateB = { id: "game-b", featureVector: { speed: 1, depth: 5 } };
      const prompt = {
        type: "comparison",
        preferred: "a",
        tags: ["fast", "elegant"],
        rationale: "felt more strategic",
      };

      const originalCandidateA = JSON.parse(JSON.stringify(candidateA));
      const originalCandidateB = JSON.parse(JSON.stringify(candidateB));
      const originalPrompt = JSON.parse(JSON.stringify(prompt));

      const record = assemblePreferenceFeedbackComparison({ candidateA, candidateB, prompt });

      assert.equal(record.type, "comparison");
      assert.equal(record.preferred, "a");
      assert.equal(record.gameAId, "game-a");
      assert.equal(record.gameBId, "game-b");
      assert.equal(record.winnerId, "game-a");
      assert.deepEqual(record.featureA, candidateA.featureVector);
      assert.deepEqual(record.featureB, candidateB.featureVector);
      assert.equal(record.notes, "tags: fast, elegant | rationale: felt more strategic");

      assert.deepEqual(candidateA, originalCandidateA);
      assert.deepEqual(candidateB, originalCandidateB);
      assert.deepEqual(prompt, originalPrompt);
    });

    it("omits winner on tie preference", () => {
      const candidateA = { id: "game-a", featureVector: { speed: 2 } };
      const candidateB = { id: "game-b", featureVector: { speed: 1 } };
      const prompt = { type: "comparison", preferred: "tie" };

      const record = assemblePreferenceFeedbackComparison({ candidateA, candidateB, prompt });

      assert.equal(record.preferred, "tie");
      assert.ok(!("winnerId" in record));
    });
  });
});
