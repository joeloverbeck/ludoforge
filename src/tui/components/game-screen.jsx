import React from "react";
import { Box, Text } from "ink";
import { TurnHeader } from "./turn-header.jsx";
import { StatePanel } from "./state-panel.jsx";

/**
 * Game screen shell: TurnHeader row + middle row (board placeholder | state panel).
 * Board panel, action panel, and effect log are out of scope (TUIGAMPLA-06).
 *
 * @param {{ gameState: object | null, definition: object | null, playerAssignments: Array<{ playerId: number, type: string }> }} props
 */
export function GameScreen({ gameState, definition, playerAssignments }) {
  return (
    <Box flexDirection="column" width="100%" flexGrow={1}>
      <TurnHeader
        gameState={gameState}
        definition={definition}
        playerAssignments={playerAssignments}
      />

      <Box flexDirection="row" flexGrow={1}>
        {/* Board panel placeholder — TUIGAMPLA-07+ */}
        <Box flexGrow={1} borderStyle="single" paddingX={1}>
          <Text dimColor>Board (not yet implemented)</Text>
        </Box>

        <StatePanel
          gameState={gameState}
          definition={definition}
          playerAssignments={playerAssignments}
        />
      </Box>

      <Box flexDirection="row" height={8}>
        {/* Action panel placeholder — TUIGAMPLA-07+ */}
        <Box flexGrow={1} borderStyle="single" paddingX={1}>
          <Text dimColor>Actions (not yet implemented)</Text>
        </Box>

        {/* Effect log placeholder — TUIGAMPLA-07+ */}
        <Box flexGrow={1} borderStyle="single" paddingX={1}>
          <Text dimColor>Effect Log (not yet implemented)</Text>
        </Box>
      </Box>
    </Box>
  );
}
