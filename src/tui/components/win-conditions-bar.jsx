import React from "react";
import { Box, Text } from "ink";
import { formatTerminationConditions } from "../utils/format-termination.js";

/**
 * Displays win/lose/draw conditions from the game definition.
 *
 * @param {{ definition: object | null }} props
 */
export function WinConditionsBar({ definition }) {
  if (!definition) return null;

  const lines = formatTerminationConditions(definition.termination);
  if (lines.length === 0) return null;

  return (
    <Box borderStyle="single" width="100%" paddingX={1}>
      <Text bold>WIN: </Text>
      <Text>{lines.join(" | ")}</Text>
    </Box>
  );
}
