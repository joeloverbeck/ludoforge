import React from "react";
import { Box, Text } from "ink";
import { TurnHeader } from "./turn-header.jsx";
import { StatePanel } from "./state-panel.jsx";
import { BoardPanel } from "./board-panel.jsx";
import { EffectLog } from "./effect-log.jsx";

/**
 * Game screen shell: TurnHeader row + middle row (board | state panel) + bottom row (actions | effect log).
 *
 * @param {{
 *   gameState: object | null,
 *   definition: object | null,
 *   playerAssignments: Array<{ playerId: number, type: string }>,
 *   effectLog?: Array<{ turn: number, playerId: number | string, message: string }>,
 *   currentPlayerId?: number | null,
 *   isSpectator?: boolean,
 * }} props
 */
export function GameScreen({
  gameState,
  definition,
  playerAssignments,
  effectLog = [],
  currentPlayerId,
  isSpectator,
}) {
  return (
    <Box flexDirection="column" width="100%" flexGrow={1}>
      <TurnHeader
        gameState={gameState}
        definition={definition}
        playerAssignments={playerAssignments}
      />

      <Box flexDirection="row" flexGrow={1}>
        <BoardPanel
          definition={definition}
          gameState={gameState}
          playerAssignments={playerAssignments}
          currentPlayerId={currentPlayerId}
          isSpectator={isSpectator}
        />

        <StatePanel
          gameState={gameState}
          definition={definition}
          playerAssignments={playerAssignments}
        />
      </Box>

      <Box flexDirection="row" height={8}>
        {/* Action panel placeholder — future ticket */}
        <Box flexGrow={1} borderStyle="single" paddingX={1}>
          <Text dimColor>Actions (not yet implemented)</Text>
        </Box>

        <EffectLog effectLog={effectLog} />
      </Box>
    </Box>
  );
}
