import React from "react";
import { Box, Text } from "ink";
import { ZoneDisplay } from "./zone-display.jsx";
import { buildTokenColorMap } from "../utils/color-scheme.js";

/**
 * Board panel: renders all zones with their tokens.
 *
 * @param {{
 *   definition: object | null,
 *   gameState: object | null,
 *   playerAssignments?: Array<{ playerId: number, type: string }>,
 *   currentPlayerId?: number | null,
 *   isSpectator?: boolean,
 * }} props
 */
export function BoardPanel({
  definition,
  gameState,
  playerAssignments,
  currentPlayerId,
  isSpectator,
}) {
  if (!definition || !gameState) {
    return (
      <Box flexGrow={1} borderStyle="single" paddingX={1}>
        <Text dimColor>Board (waiting for game state)</Text>
      </Box>
    );
  }

  const tokenTypes = definition.state?.tokenTypes ?? [];
  const colorMap = buildTokenColorMap(tokenTypes);
  const zones = definition.state?.zones ?? [];
  const zoneStates = gameState.zones ?? {};
  const tokens = gameState.tokens ?? {};

  return (
    <Box
      flexGrow={1}
      flexDirection="column"
      borderStyle="single"
      paddingX={1}
    >
      <Text bold underline>BOARD</Text>
      {zones.map((zone) => (
        <ZoneDisplay
          key={zone.id}
          zone={zone}
          zoneState={zoneStates[zone.id]}
          tokens={tokens}
          colorMap={colorMap}
          playerAssignments={playerAssignments}
          currentPlayerId={currentPlayerId}
          isSpectator={isSpectator}
        />
      ))}
    </Box>
  );
}
