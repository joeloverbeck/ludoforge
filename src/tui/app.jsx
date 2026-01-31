import React, { useReducer, useEffect, useRef, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { appReducer, initialAppState } from "./state/app-reducer.js";
import { GameSetupScreen } from "./components/game-setup-screen.jsx";
import { GameScreen } from "./components/game-screen.jsx";
import { GameOverScreen } from "./components/game-over-screen.jsx";
import { useGameLoop } from "./hooks/use-game-loop.js";

/**
 * Root application component with screen switching (setup / playing / gameover).
 *
 * @param {{
 *   definition: object,
 *   cliPlayers: Array<{ slot: number, type: string }>,
 *   watch: boolean,
 *   seed?: number,
 * }} props
 */
export function App({ definition, cliPlayers, watch, seed }) {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const { exit } = useApp();

  // Incremented on replay to reset the game loop hook.
  const [gameKey, setGameKey] = useState(0);

  // Quit confirmation state for the gameover screen.
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // Track the current legal moves (action + param domains) alongside state.
  const legalMovesRef = useRef([]);

  // Track accumulated param bindings during multi-param target selection.
  const pendingBindingsRef = useRef({});
  const pendingActionRef = useRef(null);
  const pendingParamsRef = useRef([]);
  const pendingParamIndexRef = useRef(0);

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

  const { resolveAction } = useGameLoop({
    screen: state.screen,
    definition: state.definition,
    playerAssignments: state.playerAssignments,
    watchSpeed: state.watchSpeed,
    isPaused: state.isPaused,
    dispatch,
    seed,
    legalMovesRef,
    gameKey,
  });

  function handleAssign(playerId, type) {
    dispatch({ type: "ASSIGN_PLAYER", playerId, playerType: type });
  }

  function handleStart() {
    dispatch({ type: "START_GAME" });
  }

  /**
   * Start target selection for the next param of the pending action,
   * or resolve the action if all params are bound.
   */
  function advanceParamSelection() {
    const params = pendingParamsRef.current;
    const idx = pendingParamIndexRef.current;

    if (idx >= params.length) {
      // All params bound — resolve the action.
      const selection = {
        actionId: pendingActionRef.current.id,
        args: { ...pendingBindingsRef.current },
      };
      dispatch({ type: "CONFIRM_TARGET" });
      pendingActionRef.current = null;
      pendingParamsRef.current = [];
      pendingParamIndexRef.current = 0;
      pendingBindingsRef.current = {};
      resolveAction(selection);
      return;
    }

    // Show the next param's candidates.
    const param = params[idx];
    const move = legalMovesRef.current.find(
      (m) => m.action.id === pendingActionRef.current.id,
    );
    const domain = move?.domains?.[param.id] ?? [];
    const candidates = domain.map((value) => ({
      value,
      label: String(value),
    }));

    dispatch({
      type: "CONFIRM_ACTION",
      targetOptions: { paramId: param.id, candidates },
    });
  }

  function handleConfirmAction(action) {
    const move = legalMovesRef.current.find((m) => m.action.id === action.id);
    const params = action.params ?? [];
    const hasParams = params.length > 0 && move && Object.keys(move.domains ?? {}).length > 0;

    if (!hasParams) {
      // No params — resolve immediately.
      dispatch({ type: "CONFIRM_ACTION" });
      resolveAction({ actionId: action.id, args: {} });
      return;
    }

    // Start multi-param target selection.
    pendingActionRef.current = action;
    pendingParamsRef.current = params;
    pendingParamIndexRef.current = 0;
    pendingBindingsRef.current = {};
    advanceParamSelection();
  }

  function handleConfirmTarget(value) {
    const params = pendingParamsRef.current;
    const idx = pendingParamIndexRef.current;
    const param = params[idx];

    pendingBindingsRef.current[param.id] = value;
    pendingParamIndexRef.current = idx + 1;
    advanceParamSelection();
  }

  function handleCancelTarget() {
    pendingActionRef.current = null;
    pendingParamsRef.current = [];
    pendingParamIndexRef.current = 0;
    pendingBindingsRef.current = {};
    dispatch({ type: "CANCEL_TARGET" });
  }

  function handleMoveCursor(delta) {
    dispatch({ type: "MOVE_CURSOR", delta });
  }

  // Global keyboard handler for quit and gameover controls.
  useInput((input) => {
    if (state.screen === "gameover") {
      if (showQuitConfirm) {
        if (input === "y") {
          exit();
        } else if (input === "n") {
          setShowQuitConfirm(false);
        }
        return;
      }
      if (input === "q") {
        setShowQuitConfirm(true);
        return;
      }
      if (input === "r") {
        setShowQuitConfirm(false);
        dispatch({ type: "RESTART_GAME" });
        setGameKey((k) => k + 1);
        return;
      }
      return;
    }
    if (input === "q") {
      exit();
    }
  });

  // Watch mode controls: space toggles pause, +/- adjusts speed.
  const isWatchMode = state.screen === "playing" && !state.playerAssignments.some((a) => a.type === "human");
  useInput((input) => {
    if (!isWatchMode) return;
    if (input === " ") {
      dispatch({ type: "TOGGLE_PAUSE" });
    } else if (input === "+" || input === "=") {
      dispatch({ type: "ADJUST_SPEED", delta: -1 });
    } else if (input === "-") {
      dispatch({ type: "ADJUST_SPEED", delta: 1 });
    }
  });

  const isHumanTurn =
    state.screen === "playing" &&
    state.legalActions.length > 0;

  const currentPlayerId = state.gameState?.turn?.currentPlayer ?? null;

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
        currentPlayerId={currentPlayerId}
        isSpectator={isWatchMode}
        isHumanTurn={isHumanTurn}
        legalActions={state.legalActions}
        selectedActionIndex={state.selectedActionIndex}
        targetOptions={state.targetOptions}
        selectedTargetIndex={state.selectedTargetIndex}
        onMoveCursor={handleMoveCursor}
        onConfirmAction={handleConfirmAction}
        onConfirmTarget={handleConfirmTarget}
        onCancelTarget={handleCancelTarget}
      />
    );
  }

  if (state.screen === "gameover") {
    return (
      <GameOverScreen
        outcome={state.outcome}
        playerAssignments={state.playerAssignments}
        gameState={state.gameState}
        showQuitConfirm={showQuitConfirm}
      />
    );
  }

  return <Text>Unknown screen: {state.screen}</Text>;
}
