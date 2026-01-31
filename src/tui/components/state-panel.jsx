import React from "react";
import { Box, Text } from "ink";
import { playerColor } from "../utils/color-scheme.js";

/**
 * Displays global and per-player variables.
 *
 * @param {{ gameState: object | null, definition: object | null, playerAssignments: Array<{ playerId: number, type: string }> }} props
 */
export function StatePanel({ gameState, definition, playerAssignments }) {
  if (!gameState || !definition) {
    return (
      <Box flexDirection="column" flexGrow={1} borderStyle="single" paddingX={1}>
        <Text dimColor>No state yet</Text>
      </Box>
    );
  }

  const variables = definition.state?.variables ?? [];
  const globalVars = variables.filter((v) => v.scope !== "per_player");
  const perPlayerVars = variables.filter((v) => v.scope === "per_player");

  return (
    <Box flexDirection="column" flexGrow={1} borderStyle="single" paddingX={1}>
      <Text bold underline>STATE</Text>

      {globalVars.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Global:</Text>
          {globalVars.map((v) => (
            <Text key={v.id}>  {v.id} = {formatValue(gameState, v.id, "global")}</Text>
          ))}
        </Box>
      )}

      {perPlayerVars.length > 0 && playerAssignments.map((a) => (
        <Box key={a.playerId} flexDirection="column" marginTop={1}>
          <Text bold color={playerColor(a.playerId - 1)}>
            Player {a.playerId} ({capitalize(a.type)}):
          </Text>
          {perPlayerVars.map((v) => (
            <Text key={v.id}>  {v.id} = {formatValue(gameState, v.id, a.playerId)}</Text>
          ))}
        </Box>
      ))}
    </Box>
  );
}

/**
 * Extract variable value from game state.
 * @param {object} gameState
 * @param {string} varId
 * @param {'global' | number} scope
 * @returns {string}
 */
function formatValue(gameState, varId, scope) {
  if (scope === "global") {
    const val = gameState.variables?.[varId];
    return val !== undefined ? String(val) : "?";
  }
  const val = gameState.playerVariables?.[scope]?.[varId];
  return val !== undefined ? String(val) : "?";
}

/** @param {string} s */
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
