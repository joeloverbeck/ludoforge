import React, { useReducer, useEffect } from "react";
import { Box, Text, useApp } from "ink";
import { appReducer, initialAppState } from "./state/app-reducer.js";
import { GameSetupScreen } from "./components/game-setup-screen.jsx";
import { GameScreen } from "./components/game-screen.jsx";

/**
 * Root application component with screen switching (setup / playing / gameover).
 *
 * @param {{
 *   definition: object,
 *   cliPlayers: Array<{ slot: number, type: string }>,
 *   watch: boolean,
 * }} props
 */
export function App({ definition, cliPlayers, watch }) {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const { exit } = useApp();

  // Initialize definition and player assignments on mount.
  useEffect(() => {
    dispatch({ type: "SET_DEFINITION", definition });
    dispatch({ type: "INIT_PLAYER_ASSIGNMENTS", count: definition.players.count });
  }, [definition]);

  // Apply CLI --player pre-assignments once assignments are initialized.
  useEffect(() => {
    if (state.playerAssignments.length === 0) return;

    for (const p of cliPlayers) {
      dispatch({ type: "ASSIGN_PLAYER", playerId: p.slot, playerType: p.type });
    }

    // --watch: assign all AI Random and skip to playing immediately.
    if (watch) {
      dispatch({ type: "START_GAME" });
    }
  }, [state.playerAssignments.length > 0]); // eslint-disable-line

  function handleAssign(playerId, type) {
    dispatch({ type: "ASSIGN_PLAYER", playerId, playerType: type });
  }

  function handleStart() {
    dispatch({ type: "START_GAME" });
  }

  if (state.screen === "setup") {
    if (!state.definition || state.playerAssignments.length === 0) {
      return <Text>Loading...</Text>;
    }
    return (
      <GameSetupScreen
        definition={state.definition}
        playerAssignments={state.playerAssignments}
        onAssign={handleAssign}
        onStart={handleStart}
      />
    );
  }

  if (state.screen === "playing") {
    return (
      <GameScreen
        gameState={state.gameState}
        definition={state.definition}
        playerAssignments={state.playerAssignments}
        effectLog={state.effectLog}
      />
    );
  }

  if (state.screen === "gameover") {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Box borderStyle="double" flexDirection="column" paddingX={2} paddingY={1}>
          <Text bold>GAME OVER</Text>
          {state.outcome && (
            <Text>Outcome: {JSON.stringify(state.outcome)}</Text>
          )}
          <Text> </Text>
          <Text dimColor>[q] quit</Text>
        </Box>
      </Box>
    );
  }

  return <Text>Unknown screen: {state.screen}</Text>;
}
