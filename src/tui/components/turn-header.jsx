import React from "react";
import { Box, Text } from "ink";
import { playerColor } from "../utils/color-scheme.js";
import { extractTurnInfo } from "../utils/extract-turn-info.js";

/**
 * Displays turn, round, phase, and active player info.
 *
 * @param {{ gameState: object | null, definition: object | null, playerAssignments: Array<{ playerId: number, type: string }> }} props
 */
export function TurnHeader({ gameState, definition, playerAssignments }) {
  if (!gameState || !definition) {
    return (
      <Box borderStyle="single" width="100%" paddingX={1}>
        <Text>Waiting for game to start...</Text>
      </Box>
    );
  }

  const { turn, round, phase, activePlayerId: activeId } = extractTurnInfo(gameState);

  const assignment = activeId !== null
    ? playerAssignments.find((a) => a.playerId === activeId)
    : null;
  const typeLabel = assignment ? ` (${capitalize(assignment.type)})` : "";
  const colorName = activeId !== null ? playerColor(activeId - 1) : "white";

  return (
    <Box borderStyle="single" width="100%" paddingX={1} justifyContent="space-between">
      <Text>
        TURN {turn} / ROUND {round} / PHASE: {phase}
      </Text>
      {activeId !== null && (
        <Text color={colorName}>
          Player {activeId}{typeLabel}
        </Text>
      )}
    </Box>
  );
}

/** @param {string} s */
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
