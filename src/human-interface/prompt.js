const DEFAULT_PROMPT_LABEL = "Choose action";

function parseChoice(input, max) {
  const trimmed = (input ?? "").trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const value = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(value) || value < 1 || value > max) {
    return null;
  }
  return value - 1;
}

export function renderActionList(legalActions) {
  const lines = ["Actions:"];
  if (!Array.isArray(legalActions) || legalActions.length === 0) {
    lines.push("  (none)");
    return lines.join("\n");
  }
  for (let index = 0; index < legalActions.length; index += 1) {
    const action = legalActions[index];
    lines.push(`  ${index + 1}) ${action.id}`);
  }
  return lines.join("\n");
}

export async function promptForAction({ legalActions, io, promptLabel } = {}) {
  if (!Array.isArray(legalActions) || legalActions.length === 0) {
    throw new Error("No legal actions available.");
  }
  if (!io || typeof io.readLine !== "function" || typeof io.writeLine !== "function") {
    throw new Error("HumanIO must implement readLine() and writeLine().");
  }

  io.writeLine(renderActionList(legalActions));
  const label = promptLabel ?? DEFAULT_PROMPT_LABEL;

  while (true) {
    io.writeLine(`${label} (1-${legalActions.length}):`);
    const input = await io.readLine();
    const index = parseChoice(input, legalActions.length);
    if (index !== null) {
      return { action: legalActions[index], index };
    }
    io.writeLine(`Invalid choice. Enter a number from 1 to ${legalActions.length}.`);
  }
}
