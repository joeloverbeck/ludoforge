import { loadConfigFile } from "../config/loader.js";

const DEFAULT_RATING_LABEL = "Rate the game";
const DEFAULT_COMPARISON_LABEL = "Choose between A or B";
const DEFAULT_TAGS_LABEL = "Tags (comma-separated, optional)";
const DEFAULT_RATIONALE_LABEL = "Reason (optional)";
const DEFAULT_RATING_RANGE = { min: 1, max: 5 };
const DEFAULT_COMPARISON_CHOICES = ["A", "B", "Tie"];

function formatValidationErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return "Unknown validation error";
  }
  return errors
    .map((error) => {
      const path = error.path || "<root>";
      const message = error.message || "Invalid value";
      return `${path}: ${message}`;
    })
    .join("\n");
}

async function loadDefaultHumanFeedbackConfig() {
  const result = await loadConfigFile({ name: "human-feedback" });
  if (!result.valid) {
    throw new Error(
      `Human feedback config validation failed:\n${formatValidationErrors(result.errors)}`
    );
  }
  return result.config ?? {};
}

const DEFAULT_HUMAN_FEEDBACK_CONFIG = await loadDefaultHumanFeedbackConfig();

function assertHumanIO(io) {
  if (!io || typeof io.readLine !== "function" || typeof io.writeLine !== "function") {
    throw new Error("HumanIO must implement readLine() and writeLine().");
  }
}

function resolveRatingRange(config) {
  const min = Number.isInteger(config?.min) ? config.min : DEFAULT_RATING_RANGE.min;
  const max = Number.isInteger(config?.max) ? config.max : DEFAULT_RATING_RANGE.max;
  if (min > max) {
    return DEFAULT_RATING_RANGE;
  }
  return { min, max };
}

function resolveComparisonOptions(configChoices) {
  const rawChoices =
    Array.isArray(configChoices) && configChoices.length > 0
      ? configChoices
      : DEFAULT_COMPARISON_CHOICES;
  const labels = new Map();
  for (const choice of rawChoices) {
    if (typeof choice !== "string") {
      continue;
    }
    const normalized = choice.trim().toLowerCase();
    if (normalized === "a") {
      labels.set("a", choice.trim());
    } else if (normalized === "b") {
      labels.set("b", choice.trim());
    } else if (normalized === "tie") {
      labels.set("tie", choice.trim());
    }
  }
  if (labels.size === 0) {
    labels.set("a", "A");
    labels.set("b", "B");
    labels.set("tie", "Tie");
  }
  const tokens = Array.from(labels.keys());
  const display = tokens.map((token) => labels.get(token));
  return { tokens, display };
}

function parseRating(input, range) {
  const trimmed = (input ?? "").trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const value = Number.parseInt(trimmed, 10);
  if (
    !Number.isInteger(value) ||
    value < range.min ||
    value > range.max
  ) {
    return null;
  }
  return value;
}

function parsePreferred(input, allowed) {
  const trimmed = (input ?? "").trim().toLowerCase();
  if (trimmed === "a" && allowed.includes("a")) {
    return "a";
  }
  if (trimmed === "b" && allowed.includes("b")) {
    return "b";
  }
  if ((trimmed === "tie" || trimmed === "t") && allowed.includes("tie")) {
    return "tie";
  }
  return null;
}

function parseTags(input) {
  const trimmed = (input ?? "").trim();
  if (!trimmed) {
    return undefined;
  }
  const tags = trimmed
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  return tags.length > 0 ? tags : undefined;
}

function parseRationale(input) {
  const trimmed = (input ?? "").trim();
  return trimmed ? trimmed : undefined;
}

function formatComparisonNotes(tags, rationale) {
  const parts = [];
  if (Array.isArray(tags) && tags.length > 0) {
    parts.push(`tags: ${tags.join(", ")}`);
  }
  if (rationale) {
    parts.push(`rationale: ${rationale}`);
  }
  return parts.length > 0 ? parts.join(" | ") : undefined;
}

async function promptForOptionalTags(io, label) {
  io.writeLine(`${label}:`);
  const input = await io.readLine();
  return parseTags(input);
}

async function promptForOptionalRationale(io, label) {
  io.writeLine(`${label}:`);
  const input = await io.readLine();
  return parseRationale(input);
}

export async function promptForRating({ io, promptLabel, tagsLabel, rationaleLabel } = {}) {
  assertHumanIO(io);
  const promptText = DEFAULT_HUMAN_FEEDBACK_CONFIG?.promptText ?? {};
  const label = promptLabel ?? promptText.rating ?? DEFAULT_RATING_LABEL;
  const tagLabel = tagsLabel ?? promptText.tags ?? DEFAULT_TAGS_LABEL;
  const reasonLabel = rationaleLabel ?? promptText.rationale ?? DEFAULT_RATIONALE_LABEL;
  const range = resolveRatingRange(DEFAULT_HUMAN_FEEDBACK_CONFIG?.rating);
  const rangeSuffix =
    range.min === 1 && range.max === 5
      ? "1-5, 3 = neutral"
      : `${range.min}-${range.max}`;

  while (true) {
    io.writeLine(`${label} (${rangeSuffix}):`);
    const input = await io.readLine();
    const rating = parseRating(input, range);
    if (rating !== null) {
      const tags = await promptForOptionalTags(io, tagLabel);
      const rationale = await promptForOptionalRationale(io, reasonLabel);
      const record = { type: "rating", rating };
      if (tags) {
        record.tags = tags;
      }
      if (rationale) {
        record.rationale = rationale;
      }
      return record;
    }
    io.writeLine(`Invalid rating. Enter an integer from ${range.min} to ${range.max}.`);
  }
}

export async function promptForPairwiseComparison({
  io,
  promptLabel,
  tagsLabel,
  rationaleLabel,
} = {}) {
  assertHumanIO(io);
  const promptText = DEFAULT_HUMAN_FEEDBACK_CONFIG?.promptText ?? {};
  const label = promptLabel ?? promptText.comparison ?? DEFAULT_COMPARISON_LABEL;
  const tagLabel = tagsLabel ?? promptText.tags ?? DEFAULT_TAGS_LABEL;
  const reasonLabel = rationaleLabel ?? promptText.rationale ?? DEFAULT_RATIONALE_LABEL;
  const comparisonOptions = resolveComparisonOptions(
    DEFAULT_HUMAN_FEEDBACK_CONFIG?.comparison?.choices
  );
  const choiceHint = comparisonOptions.display.join("/");

  while (true) {
    io.writeLine(`${label} (${choiceHint}):`);
    const input = await io.readLine();
    const preferred = parsePreferred(input, comparisonOptions.tokens);
    if (preferred !== null) {
      const tags = await promptForOptionalTags(io, tagLabel);
      const rationale = await promptForOptionalRationale(io, reasonLabel);
      const record = { type: "comparison", preferred };
      if (tags) {
        record.tags = tags;
      }
      if (rationale) {
        record.rationale = rationale;
      }
      return record;
    }
    io.writeLine(`Invalid choice. Enter ${comparisonOptions.display.join(", ")}.`);
  }
}

export function assemblePreferenceFeedbackComparison({
  candidateA,
  candidateB,
  prompt,
} = {}) {
  if (!candidateA || !candidateB || !prompt) {
    throw new Error("Preference feedback adapter requires candidates and a prompt result.");
  }

  const comparison = {
    type: "comparison",
    preferred: prompt.preferred,
    featureA: candidateA.featureVector,
    featureB: candidateB.featureVector,
  };

  if (candidateA.id) {
    comparison.gameAId = candidateA.id;
  }
  if (candidateB.id) {
    comparison.gameBId = candidateB.id;
  }
  if (prompt.preferred === "a" && candidateA.id) {
    comparison.winnerId = candidateA.id;
  } else if (prompt.preferred === "b" && candidateB.id) {
    comparison.winnerId = candidateB.id;
  }

  const notes = formatComparisonNotes(prompt.tags, prompt.rationale);
  if (notes) {
    comparison.notes = notes;
  }

  return comparison;
}
