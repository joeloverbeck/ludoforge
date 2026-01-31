/**
 * React hook that orchestrates the full game loop.
 *
 * Creates agents from player assignments, calls `runSimulation()` with
 * `stepControl.onStep`, wires the human agent's `onActionNeeded` to
 * the UI dispatch, and handles watch/mixed mode delay via async agent wrappers.
 *
 * @module tui/hooks/use-game-loop
 */

import { useEffect, useRef, useCallback } from "react";
import { runSimulation } from "../../simulation-engine/loop.js";
import { createRandomPolicy } from "../../simulation-engine/agents/random.js";
import { createGreedyPolicy } from "../../simulation-engine/agents/greedy.js";
import { createHumanAgent } from "../human-agent.js";
import { formatEffect } from "../utils/format-effect.js";

const MIXED_MODE_DELAY_MS = 200;

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build the agents array from player assignments.
 *
 * Human agents are wired to an `onActionNeeded` callback that dispatches
 * `SET_LEGAL_ACTIONS` and returns a Promise resolved when the user confirms.
 *
 * AI agents are wrapped with an async delay so human observers can follow
 * the game progression.
 *
 * @param {{
 *   playerAssignments: Array<{ playerId: number, type: string }>,
 *   dispatch: Function,
 *   actionResolverRef: { current: ((action: object) => void) | null },
 *   legalMovesRef: { current: Array<{ action: object, domains: Record<string, Array> }> },
 *   getDelay: () => number,
 *   getPaused: () => boolean,
 * }} opts
 * @returns {object[]}
 */
export function buildAgents({ playerAssignments, dispatch, actionResolverRef, legalMovesRef, getDelay, getPaused }) {
  return playerAssignments.map((assignment) => {
    if (assignment.type === "human") {
      return createHumanAgent({
        playerId: assignment.playerId,
        onActionNeeded({ legalActions, legalMoves, context, definition, state }) {
          legalMovesRef.current = legalMoves ?? [];
          if (state) {
            dispatch({ type: "UPDATE_GAME_STATE", gameState: structuredClone(state) });
          }
          dispatch({ type: "SET_LEGAL_ACTIONS", legalActions: legalActions ?? [] });
          return new Promise((resolve) => {
            actionResolverRef.current = resolve;
          });
        },
      });
    }

    const policy =
      assignment.type === "greedy"
        ? createGreedyPolicy()
        : createRandomPolicy();

    // Wrap AI agent's selectAction with an async delay.
    const originalSelectAction = policy.selectAction.bind(policy);
    const wrappedAgent = {
      id: assignment.playerId,
      async selectAction(args) {
        const result = originalSelectAction(args);

        // Wait while paused.
        while (getPaused()) {
          await sleep(100);
        }

        const delay = getDelay();
        if (delay > 0) {
          await sleep(delay);
        }

        return result;
      },
    };

    return wrappedAgent;
  });
}

/**
 * Format a step's applied effects into a log message.
 *
 * @param {object} step
 * @returns {string}
 */
function formatStepMessage(step) {
  const actionPart = step.actionId ?? "pass";
  const effects = step.appliedEffects ?? [];
  if (effects.length === 0) {
    return actionPart;
  }
  const formatted = effects.map((e) => formatEffect(e)).join(", ");
  return `${actionPart} → ${formatted}`;
}

/**
 * Build the `onStep` callback for `stepControl`.
 *
 * Dispatches `UPDATE_GAME_STATE` and `APPEND_LOG` after each simulation step.
 *
 * @param {Function} dispatch
 * @returns {(step: object) => void}
 */
export function buildOnStep(dispatch) {
  return (step) => {
    if (step.state) {
      dispatch({ type: "UPDATE_GAME_STATE", gameState: step.state });
    }
    dispatch({
      type: "APPEND_LOG",
      turn: step.turn ?? 0,
      playerId: step.playerId ?? "?",
      message: formatStepMessage(step),
    });
  };
}

/**
 * Hook that orchestrates the game loop.
 *
 * Starts `runSimulation()` when the screen transitions to `"playing"`.
 * On completion, dispatches `SET_OUTCOME`.
 *
 * @param {{
 *   screen: string,
 *   definition: object | null,
 *   playerAssignments: Array<{ playerId: number, type: string }>,
 *   watchSpeed: number,
 *   isPaused: boolean,
 *   dispatch: Function,
 *   seed?: number,
 *   legalMovesRef: { current: Array<{ action: object, domains: Record<string, Array> }> },
 * }} opts
 * @returns {{
 *   resolveAction: (selection: object) => void,
 * }}
 */
export function useGameLoop({ screen, definition, playerAssignments, watchSpeed, isPaused, dispatch, seed, legalMovesRef, gameKey }) {
  const actionResolverRef = useRef(null);
  const watchSpeedRef = useRef(watchSpeed);
  const isPausedRef = useRef(isPaused);
  const hasStartedRef = useRef(false);
  const lastGameKeyRef = useRef(gameKey);

  // Keep refs in sync with latest props.
  watchSpeedRef.current = watchSpeed;
  isPausedRef.current = isPaused;

  // Reset hasStarted when gameKey changes (replay).
  if (gameKey !== lastGameKeyRef.current) {
    lastGameKeyRef.current = gameKey;
    hasStartedRef.current = false;
  }

  const hasHuman = playerAssignments.some((a) => a.type === "human");

  useEffect(() => {
    if (screen !== "playing" || !definition || hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;

    const agents = buildAgents({
      playerAssignments,
      dispatch,
      actionResolverRef,
      legalMovesRef,
      getDelay: () => {
        if (!hasHuman) {
          // Watch mode: use configurable watch speed.
          return watchSpeedRef.current;
        }
        // Mixed mode: brief delay so human can see AI actions.
        return MIXED_MODE_DELAY_MS;
      },
      getPaused: () => isPausedRef.current,
    });

    const onStep = buildOnStep(dispatch);

    runSimulation({
      definition,
      agents,
      seed,
      stepControl: { onStep },
    })
      .then((result) => {
        dispatch({
          type: "SET_OUTCOME",
          outcome: {
            ...(result.outcome ?? {}),
            terminationReason: result.terminationReason,
          },
        });
      })
      .catch((err) => {
        dispatch({
          type: "SET_OUTCOME",
          outcome: { error: err.message ?? String(err) },
        });
      });
  }, [screen, definition, gameKey]);

  const resolveAction = useCallback((selection) => {
    if (actionResolverRef.current) {
      const resolver = actionResolverRef.current;
      actionResolverRef.current = null;
      resolver(selection);
    }
  }, []);

  return { resolveAction };
}
