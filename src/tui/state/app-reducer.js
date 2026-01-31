/**
 * Pure state management for the TUI game player.
 *
 * @import { GameDefinition } from '../../dsl/types.ts'
 */

/** @type {AppState} */
export const initialAppState = Object.freeze({
  screen: "setup",
  definition: null,
  gameState: null,
  playerAssignments: [],
  legalActions: [],
  selectedActionIndex: 0,
  targetOptions: null,
  selectedTargetIndex: 0,
  effectLog: [],
  outcome: null,
  watchSpeed: 500,
  isPaused: false,
});

const MIN_WATCH_SPEED = 100;
const MAX_WATCH_SPEED = 2000;
const WATCH_SPEED_STEP = 100;

/**
 * @typedef {{
 *   screen: 'setup' | 'playing' | 'gameover',
 *   definition: GameDefinition | null,
 *   gameState: object | null,
 *   playerAssignments: Array<{ playerId: number, type: 'human' | 'random' | 'greedy' }>,
 *   legalActions: Array<object>,
 *   selectedActionIndex: number,
 *   targetOptions: { action: object, candidates: Array<object> } | null,
 *   selectedTargetIndex: number,
 *   effectLog: Array<{ turn: number, playerId: number | string, message: string }>,
 *   outcome: object | null,
 *   watchSpeed: number,
 *   isPaused: boolean,
 * }} AppState
 */

/**
 * @param {AppState} state
 * @param {{ type: string, [key: string]: unknown }} action
 * @returns {AppState}
 */
export function appReducer(state, action) {
  switch (action.type) {
    case "SET_DEFINITION":
      return { ...state, definition: action.definition };

    case "ASSIGN_PLAYER":
      return {
        ...state,
        playerAssignments: state.playerAssignments.map((a) =>
          a.playerId === action.playerId
            ? { ...a, type: action.playerType }
            : a,
        ),
      };

    case "START_GAME":
      return { ...state, screen: "playing" };

    case "UPDATE_GAME_STATE":
      return { ...state, gameState: action.gameState };

    case "SET_LEGAL_ACTIONS":
      return {
        ...state,
        legalActions: action.legalActions,
        selectedActionIndex: 0,
        targetOptions: null,
        selectedTargetIndex: 0,
      };

    case "MOVE_CURSOR": {
      if (state.targetOptions !== null) {
        const count = state.targetOptions.candidates.length;
        if (count === 0) return state;
        const next =
          (state.selectedTargetIndex + action.delta + count) % count;
        return { ...state, selectedTargetIndex: next };
      }
      const count = state.legalActions.length;
      if (count === 0) return state;
      const next =
        (state.selectedActionIndex + action.delta + count) % count;
      return { ...state, selectedActionIndex: next };
    }

    case "CONFIRM_ACTION":
      return {
        ...state,
        targetOptions: action.targetOptions ?? null,
        selectedTargetIndex: 0,
      };

    case "CONFIRM_TARGET":
      return {
        ...state,
        targetOptions: null,
        selectedTargetIndex: 0,
        legalActions: [],
        selectedActionIndex: 0,
      };

    case "CANCEL_TARGET":
      return {
        ...state,
        targetOptions: null,
        selectedTargetIndex: 0,
      };

    case "APPEND_LOG":
      return {
        ...state,
        effectLog: [
          ...state.effectLog,
          { turn: action.turn, playerId: action.playerId, message: action.message },
        ],
      };

    case "SET_OUTCOME":
      return { ...state, screen: "gameover", outcome: action.outcome };

    case "TOGGLE_PAUSE":
      return { ...state, isPaused: !state.isPaused };

    case "ADJUST_SPEED": {
      const raw = state.watchSpeed + action.delta * WATCH_SPEED_STEP;
      const clamped = Math.max(MIN_WATCH_SPEED, Math.min(MAX_WATCH_SPEED, raw));
      return { ...state, watchSpeed: clamped };
    }

    default:
      return state;
  }
}
