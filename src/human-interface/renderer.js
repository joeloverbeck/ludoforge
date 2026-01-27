import { diffVariables, diffZoneTokens } from "./state-diff.js";

const DEFAULT_COLLAPSE_LIMIT = 5;

function formatKeyValues(values) {
  if (!values || Object.keys(values).length === 0) {
    return "(none)";
  }
  const entries = Object.keys(values)
    .sort()
    .map((key) => `${key}=${values[key]}`);
  return entries.join(", ");
}

function formatTokenList(tokens, limit) {
  if (!tokens || tokens.length === 0) {
    return "(empty)";
  }
  const display = tokens.slice(0, limit);
  const remaining = tokens.length - display.length;
  if (remaining > 0) {
    return `${display.join(", ")} (+${remaining} more)`;
  }
  return display.join(", ");
}

function shouldIncludeZone(zone, viewerPlayerId, activePlayerId) {
  if (zone.visibility === "public") {
    return true;
  }
  return viewerPlayerId !== undefined && viewerPlayerId === activePlayerId;
}

function getViewerPlayerId(input) {
  if (input.viewerPlayerId !== undefined) {
    return input.viewerPlayerId;
  }
  return input.state.turn.currentPlayer;
}

export function renderState(input) {
  const { state, previousState } = input;
  const viewerPlayerId = getViewerPlayerId(input);
  const collapseLimit = input.options?.collapseLimit ?? DEFAULT_COLLAPSE_LIMIT;
  const lines = [];

  lines.push(
    `Turn ${state.turn.turn} | Active Player: ${state.turn.currentPlayer}${
      state.turn.phase ? ` | Phase: ${state.turn.phase}` : ""
    }`,
  );
  lines.push("");

  lines.push("Variables:");
  lines.push(`  Global: ${formatKeyValues(state.variables.global)}`);
  const viewerVars = state.variables.perPlayer?.[viewerPlayerId];
  if (viewerVars) {
    lines.push(`  Player ${viewerPlayerId}: ${formatKeyValues(viewerVars)}`);
  }
  lines.push("");

  lines.push("Zones:");
  const zoneIds = Object.keys(state.zones ?? {}).sort();
  let zoneCount = 0;
  for (const zoneId of zoneIds) {
    const zone = state.zones[zoneId];
    if (!shouldIncludeZone(zone, viewerPlayerId, state.turn.currentPlayer)) {
      continue;
    }
    zoneCount += 1;
    lines.push(
      `  ${zone.id} (${zone.scope}/${zone.visibility}/${zone.order}):`,
    );
    if (zone.scope === "global") {
      lines.push(
        `    ${formatTokenList(zone.tokens ?? [], collapseLimit)}`,
      );
    } else {
      const playerIds = Object.keys(zone.tokensByPlayer ?? {})
        .map((id) => Number(id))
        .sort((a, b) => a - b);
      const scopedPlayerIds =
        zone.visibility === "private"
          ? [viewerPlayerId]
          : playerIds.length > 0
            ? playerIds
            : [viewerPlayerId];
      for (const playerId of scopedPlayerIds) {
        const tokens = zone.tokensByPlayer?.[playerId] ?? [];
        lines.push(
          `    Player ${playerId}: ${formatTokenList(tokens, collapseLimit)}`,
        );
      }
    }
  }
  if (zoneCount === 0) {
    lines.push("  (none)");
  }

  if (previousState) {
    lines.push("");
    lines.push("Deltas:");
    let deltaCount = 0;

    const globalChanges = diffVariables(
      previousState.variables?.global,
      state.variables?.global,
    );
    if (globalChanges.length > 0) {
      deltaCount += globalChanges.length;
      lines.push("  Global Variables:");
      for (const change of globalChanges.sort((a, b) => a.key.localeCompare(b.key))) {
        lines.push(`    ${change.key}: ${change.from} -> ${change.to}`);
      }
    }

    const prevViewerVars =
      previousState.variables?.perPlayer?.[viewerPlayerId];
    const nextViewerVars = state.variables?.perPlayer?.[viewerPlayerId];
    const viewerChanges = diffVariables(prevViewerVars, nextViewerVars);
    if (viewerChanges.length > 0) {
      deltaCount += viewerChanges.length;
      lines.push(`  Player ${viewerPlayerId} Variables:`);
      for (const change of viewerChanges.sort((a, b) => a.key.localeCompare(b.key))) {
        lines.push(`    ${change.key}: ${change.from} -> ${change.to}`);
      }
    }

    for (const zoneId of zoneIds) {
      const zone = state.zones[zoneId];
      if (!shouldIncludeZone(zone, viewerPlayerId, state.turn.currentPlayer)) {
        continue;
      }
      const prevZone = previousState.zones?.[zoneId];
      if (!prevZone) {
        continue;
      }
      if (zone.scope === "global") {
        const delta = diffZoneTokens(prevZone.tokens, zone.tokens);
        if (delta.added.length > 0 || delta.removed.length > 0) {
          deltaCount += delta.added.length + delta.removed.length;
          lines.push(
            `  ${zone.id}: +${delta.added.join(", ") || "(none)"} -${
              delta.removed.join(", ") || "(none)"
            }`,
          );
        }
      } else {
        const playerIds = Object.keys(zone.tokensByPlayer ?? {})
          .map((id) => Number(id))
          .sort((a, b) => a - b);
        const scopedPlayerIds =
          zone.visibility === "private"
            ? [viewerPlayerId]
            : playerIds.length > 0
              ? playerIds
              : [viewerPlayerId];
        for (const playerId of scopedPlayerIds) {
          const delta = diffZoneTokens(
            prevZone.tokensByPlayer?.[playerId],
            zone.tokensByPlayer?.[playerId],
          );
          if (delta.added.length > 0 || delta.removed.length > 0) {
            deltaCount += delta.added.length + delta.removed.length;
            lines.push(
              `  ${zone.id} (Player ${playerId}): +${
                delta.added.join(", ") || "(none)"
              } -${delta.removed.join(", ") || "(none)"}`,
            );
          }
        }
      }
    }

    if (deltaCount === 0) {
      lines.push("  (none)");
    }
  }

  return lines.join("\n");
}
