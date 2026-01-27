const DEFAULT_RATING_LABEL = "Rate the game";
const DEFAULT_COMPARISON_LABEL = "Choose between A or B";
const DEFAULT_TAGS_LABEL = "Tags (comma-separated, optional)";
const DEFAULT_RATIONALE_LABEL = "Reason (optional)";

function assertHumanIO(io) {
  if (!io || typeof io.readLine !== "function" || typeof io.writeLine !== "function") {
    throw new Error("HumanIO must implement readLine() and writeLine().");
  }
}

function parseRating(input) {
  const trimmed = (input ?? "").trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const value = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    return null;
  }
  return value;
}

function parsePreferred(input) {
  const trimmed = (input ?? "").trim().toLowerCase();
  if (trimmed === "a") {
    return "a";
  }
  if (trimmed === "b") {
    return "b";
  }
  if (trimmed === "tie" || trimmed === "t") {
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
  const label = promptLabel ?? DEFAULT_RATING_LABEL;
  const tagLabel = tagsLabel ?? DEFAULT_TAGS_LABEL;
  const reasonLabel = rationaleLabel ?? DEFAULT_RATIONALE_LABEL;

  while (true) {
    io.writeLine(`${label} (1-5):`);
    const input = await io.readLine();
    const rating = parseRating(input);
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
    io.writeLine("Invalid rating. Enter an integer from 1 to 5.");
  }
}

export async function promptForPairwiseComparison({
  io,
  promptLabel,
  tagsLabel,
  rationaleLabel,
} = {}) {
  assertHumanIO(io);
  const label = promptLabel ?? DEFAULT_COMPARISON_LABEL;
  const tagLabel = tagsLabel ?? DEFAULT_TAGS_LABEL;
  const reasonLabel = rationaleLabel ?? DEFAULT_RATIONALE_LABEL;

  while (true) {
    io.writeLine(`${label} (A/B/Tie):`);
    const input = await io.readLine();
    const preferred = parsePreferred(input);
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
    io.writeLine("Invalid choice. Enter A, B, or Tie.");
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
