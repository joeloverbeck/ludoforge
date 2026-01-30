import {
  applyTokenSpawn,
  applyTokenMove,
  applyTokenDestroy,
  applyTokenReveal,
  applyTokenHide,
} from "./token-effects.js";
import { applyVariableDispatch } from "./variable-effects.js";
import { applyMoveSpatial } from "./spatial-effects.js";
import { applyShuffle, applyQueuePush, applyQueuePop } from "./zone-effects.js";
import { applySetFlag } from "./entity-effects.js";
import { applySetTurnOrder } from "./turn-order-effects.js";
import {
  applyRepeat,
  applyConditional,
  applyChoose,
} from "./control-flow-effects.js";

export function applyEffect(state, effect, context, options) {
  if (!effect || typeof effect !== "object") {
    return { ok: true };
  }

  if (effect.kind === "repeat") {
    return applyRepeat(state, effect, context, options, applyEffect);
  }

  if (effect.kind === "conditional") {
    return applyConditional(state, effect, context, options, applyEffect);
  }

  if (effect.kind === "move_spatial") {
    return applyMoveSpatial(state, effect, context);
  }

  if (effect.kind === "set_flag") {
    return applySetFlag(state, effect, context);
  }

  if (effect.kind === "set_turn_order") {
    return applySetTurnOrder(state, effect, context);
  }

  if (effect.kind === "choose") {
    return applyChoose(state, effect, context, options, applyEffect);
  }

  if (effect.kind === "shuffle") {
    return applyShuffle(state, effect, context);
  }

  if (effect.kind === "queue_push") {
    return applyQueuePush(state, effect, context);
  }

  if (effect.kind === "queue_pop") {
    return applyQueuePop(state, effect, context);
  }

  if (!effect.target) {
    return { ok: true };
  }

  if (effect.target.kind === "token") {
    switch (effect.kind) {
      case "spawn":
        return applyTokenSpawn(state, effect, context, options);
      case "move":
        return applyTokenMove(state, effect, context);
      case "destroy":
        return applyTokenDestroy(state, effect, context);
      case "reveal":
        return applyTokenReveal(state, effect, context);
      case "hide":
        return applyTokenHide(state, effect, context);
      default:
        return { ok: true };
    }
  }

  if (effect.target.kind !== "var") {
    return { ok: true };
  }

  return applyVariableDispatch(state, effect, context, options);
}
