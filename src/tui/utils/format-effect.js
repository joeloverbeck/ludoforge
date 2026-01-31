/**
 * Format an effect object into a human-readable string for the TUI effect log.
 *
 * @import { Effect } from '../../dsl/types.ts'
 */

/**
 * @param {string} ref - stringified ref target
 * @returns {string}
 */
function fmtRef(ref) {
  if (ref && typeof ref === "object") {
    return ref.id ?? JSON.stringify(ref);
  }
  return String(ref ?? "?");
}

/**
 * Format a single effect into a short human-readable string.
 *
 * @param {Effect} effect
 * @returns {string}
 */
export function formatEffect(effect) {
  switch (effect.kind) {
    case "set":
      return `${fmtRef(effect.target)} = ${effect.value}`;
    case "inc":
      return `${fmtRef(effect.target)} +${effect.amount ?? 1}`;
    case "dec":
      return `${fmtRef(effect.target)} -${effect.amount ?? 1}`;
    case "spawn":
      return `spawn ${fmtRef(effect.target)} in ${effect.toZone ?? "?"}`;
    case "move":
      return `move ${fmtRef(effect.target)} to ${effect.toZone ?? effect.toPlayer ?? "?"}`;
    case "destroy":
      return `destroy ${fmtRef(effect.target)}`;
    case "reveal":
      return `reveal ${fmtRef(effect.target)}`;
    case "hide":
      return `hide ${fmtRef(effect.target)}`;
    case "move_spatial":
      return `move_spatial ${fmtRef(effect.target)} in ${effect.zone}${effect.toNode ? " to " + effect.toNode : ""}`;
    case "shuffle":
      return `shuffle ${fmtRef(effect.target)}`;
    case "conditional":
      return `if met: ${effect.then ? effect.then.length : 0} effects`;
    case "repeat":
      return `repeat \u00d7${effect.count}: ${effect.effects ? effect.effects.length : 0} effects`;
    case "rng_choose":
      return `random: ${effect.options ? effect.options.length : 0} options`;
    case "queue_push":
      return `queue_push ${fmtRef(effect.target)} to ${effect.toZone}`;
    case "queue_pop":
      return `queue_pop from ${effect.fromZone}${effect.toZone ? " to " + effect.toZone : ""}`;
    case "set_flag":
      return `set_flag ${effect.flag} on ${fmtRef(effect.target)}${effect.duration ? " (" + effect.duration + ")" : ""}`;
    case "set_turn_order":
      return `set_turn_order by ${effect.variable} ${effect.direction}`;
    default:
      return `unknown effect: ${/** @type {any} */ (effect).kind}`;
  }
}
