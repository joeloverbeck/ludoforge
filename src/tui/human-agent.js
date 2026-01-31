/**
 * Human agent adapter for TUI interaction.
 *
 * Returns an agent conforming to the simulation-engine agent interface,
 * whose `selectAction` delegates to an `onActionNeeded` callback that
 * returns a Promise (resolved when the user picks an action in the UI).
 *
 * @module tui/human-agent
 */

/**
 * @param {{ playerId: string|number, onActionNeeded: (args: object) => Promise<object|string> }} opts
 * @returns {{ id: string|number, selectAction: (args: object) => Promise<object|string> }}
 */
export function createHumanAgent({ playerId, onActionNeeded }) {
  if (typeof onActionNeeded !== "function") {
    throw new Error("onActionNeeded must be a function");
  }
  return {
    id: playerId,
    selectAction(args) {
      return onActionNeeded(args);
    },
  };
}
