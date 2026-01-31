import { getRandomIndex } from "../random.js";
import {
  collectIntVariableTargets,
  collectActionTargets,
  collectTokenTypeTargets,
  collectZoneTargets,
} from "../targets.js";

function buildDecCost(intTargets, rng) {
  const idx = getRandomIndex(intTargets.length, rng);
  const target = intTargets[Math.max(0, idx)];
  const amount = (rng ? rng.nextInt(3) : Math.floor(Math.random() * 3)) + 1;
  return { kind: "dec", target: { kind: "var", id: target.variable.id }, amount };
}

function buildDestroyCost(tokenTypes, rng) {
  const idx = getRandomIndex(tokenTypes.length, rng);
  const tt = tokenTypes[Math.max(0, idx)];
  return { kind: "destroy", target: { kind: "token", id: tt.id } };
}

function buildMoveCost(tokenTypes, zones, rng) {
  const eligible = tokenTypes.filter((tt) => {
    const matching = zones.filter((z) => z.tokenType === tt.id);
    return matching.length >= 2;
  });
  if (eligible.length === 0) {
    return null;
  }
  const ttIdx = getRandomIndex(eligible.length, rng);
  const tt = eligible[Math.max(0, ttIdx)];
  const matchingZones = zones.filter((z) => z.tokenType === tt.id);
  const zIdx = getRandomIndex(matchingZones.length, rng);
  const zone = matchingZones[Math.max(0, zIdx)];
  return { kind: "move", target: { kind: "token", id: tt.id }, toZone: zone.id };
}

export const actionCostAddMutation = {
  name: "action-cost-add",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const actionTargets = collectActionTargets(definition);
    if (actionTargets.length === 0) {
      return { ...genome, definition };
    }

    const intTargets = collectIntVariableTargets(definition);
    const tokenTypes = collectTokenTypeTargets(definition);
    const zones = collectZoneTargets(definition);

    const pools = [];
    if (intTargets.length > 0) {
      pools.push({ type: "dec", weight: 3 });
    }
    if (tokenTypes.length > 0 && zones.length > 0) {
      pools.push({ type: "destroy", weight: 1 });
    }
    const hasMovable = tokenTypes.some(
      (tt) => zones.filter((z) => z.tokenType === tt.id).length >= 2,
    );
    if (hasMovable) {
      pools.push({ type: "move", weight: 1 });
    }

    if (pools.length === 0) {
      return { ...genome, definition };
    }

    const actionIdx = getRandomIndex(actionTargets.length, rng);
    const action = definition.actions[Math.max(0, actionIdx)];

    const totalWeight = pools.reduce((s, p) => s + p.weight, 0);
    let roll = (rng ? rng.next() : Math.random()) * totalWeight;
    let chosen = pools[pools.length - 1].type;
    for (const pool of pools) {
      roll -= pool.weight;
      if (roll < 0) {
        chosen = pool.type;
        break;
      }
    }

    let cost;
    switch (chosen) {
      case "dec":
        cost = buildDecCost(intTargets, rng);
        break;
      case "destroy":
        cost = buildDestroyCost(tokenTypes, rng);
        break;
      case "move":
        cost = buildMoveCost(tokenTypes, zones, rng);
        if (!cost) {
          cost = buildDecCost(intTargets, rng);
          if (!intTargets.length) {
            return { ...genome, definition };
          }
        }
        break;
      default:
        return { ...genome, definition };
    }

    const existingCosts = Array.isArray(action.costs) ? action.costs : [];
    action.costs = [...existingCosts, cost];

    return { ...genome, definition };
  },
};
