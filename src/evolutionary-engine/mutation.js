import { repairGenome } from "./repair.js";

function getRandomIndex(length, rng) {
  if (length <= 0) {
    return -1;
  }
  if (rng) {
    return rng.nextInt(length);
  }
  return Math.floor(Math.random() * length);
}

function collectVariableTargets(definition) {
  const targets = [];
  const variables = Array.isArray(definition?.state?.variables)
    ? definition.state.variables
    : [];
  variables.forEach((variable, index) => {
    targets.push({ container: variables, index, variable });
  });

  const tokenTypes = Array.isArray(definition?.state?.tokenTypes)
    ? definition.state.tokenTypes
    : [];
  tokenTypes.forEach((tokenType) => {
    const attributes = Array.isArray(tokenType?.attributes) ? tokenType.attributes : [];
    attributes.forEach((attribute, index) => {
      targets.push({ container: attributes, index, variable: attribute });
    });
  });

  return targets;
}

function collectActionTargets(definition) {
  if (!Array.isArray(definition?.actions)) {
    return [];
  }
  return definition.actions.map((action, index) => ({
    container: definition.actions,
    index,
    action,
  }));
}

function collectActionEffectTargets(definition) {
  const actions = Array.isArray(definition?.actions) ? definition.actions : [];
  const targets = [];

  actions.forEach((action, actionIndex) => {
    const costs = Array.isArray(action?.costs) ? action.costs : [];
    costs.forEach((effect, effectIndex) => {
      targets.push({ actionIndex, list: "costs", effectIndex, effect });
    });

    const effects = Array.isArray(action?.effects) ? action.effects : [];
    effects.forEach((effect, effectIndex) => {
      targets.push({ actionIndex, list: "effects", effectIndex, effect });
    });
  });

  return targets;
}

function collectZoneTargets(definition) {
  return Array.isArray(definition?.state?.zones) ? definition.state.zones : [];
}

function collectTokenTypeTargets(definition) {
  return Array.isArray(definition?.state?.tokenTypes) ? definition.state.tokenTypes : [];
}

function tweakIntValue(value, min, max, rng) {
  if (typeof value !== "number" || typeof min !== "number" || typeof max !== "number") {
    return value;
  }
  if (min > max) {
    return value;
  }
  if (min === max) {
    return min;
  }

  let direction = rng ? (rng.nextInt(2) === 0 ? -1 : 1) : Math.random() < 0.5 ? -1 : 1;
  if (value <= min) {
    direction = 1;
  } else if (value >= max) {
    direction = -1;
  }

  const nextValue = value + direction;
  if (nextValue < min) {
    return min;
  }
  if (nextValue > max) {
    return max;
  }
  return nextValue;
}

function tweakNonNegative(value, rng) {
  let nextValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  let direction = rng ? (rng.nextInt(2) === 0 ? -1 : 1) : Math.random() < 0.5 ? -1 : 1;
  if (nextValue <= 0) {
    direction = 1;
  }
  nextValue += direction;
  if (nextValue < 0) {
    return 0;
  }
  return nextValue;
}

function pickDifferentValue(values, current, rng) {
  const candidates = values.filter((value) => value !== current);
  if (candidates.length === 0) {
    return current;
  }
  const index = getRandomIndex(candidates.length, rng);
  return candidates[Math.max(0, index)];
}

function createUniqueId(existing, baseId) {
  const safeBase = typeof baseId === "string" && baseId.length > 0 ? baseId : "action";
  let candidate = `${safeBase}-variant`;
  let counter = 2;
  while (existing.has(candidate)) {
    candidate = `${safeBase}-variant-${counter}`;
    counter += 1;
  }
  return candidate;
}

function updateRefTokenType(ref, removedId, replacementId, replacementAttributes) {
  if (!ref || typeof ref !== "object") {
    return;
  }
  if (ref.kind !== "token") {
    return;
  }
  if (ref.id !== removedId) {
    return;
  }
  ref.id = replacementId;
  if (typeof ref.attribute === "string" && !replacementAttributes.has(ref.attribute)) {
    delete ref.attribute;
  }
}

function updateRefZone(ref, removedId, replacementId) {
  if (!ref || typeof ref !== "object") {
    return;
  }
  if (ref.kind !== "zone") {
    return;
  }
  if (ref.id !== removedId) {
    return;
  }
  ref.id = replacementId;
}

function updateExpr(expr, { onTokenRef, onZoneRef }) {
  if (!expr || typeof expr !== "object") {
    return;
  }
  switch (expr.kind) {
    case "and":
    case "or":
    case "cmp":
      updateExpr(expr.left, { onTokenRef, onZoneRef });
      updateExpr(expr.right, { onTokenRef, onZoneRef });
      break;
    case "not":
      updateExpr(expr.value, { onTokenRef, onZoneRef });
      break;
    case "ref":
      if (expr.ref) {
        if (onTokenRef) {
          onTokenRef(expr.ref);
        }
        if (onZoneRef) {
          onZoneRef(expr.ref);
        }
      }
      break;
    default:
      break;
  }
}

function updateSelector(selector, { onTokenType, onZone, onTokenRef, onZoneRef }) {
  if (!selector || typeof selector !== "object") {
    return;
  }
  if (typeof selector.tokenType === "string") {
    onTokenType?.(selector);
  }
  if (typeof selector.zone === "string") {
    onZone?.(selector);
  }
  if (selector.where) {
    updateExpr(selector.where, { onTokenRef, onZoneRef });
  }
}

function updateEffect(effect, { onTokenRef, onZoneRef, onZoneTo }) {
  if (!effect || typeof effect !== "object") {
    return;
  }
  if (effect.target) {
    if (onTokenRef) {
      onTokenRef(effect.target);
    }
    if (onZoneRef) {
      onZoneRef(effect.target);
    }
  }
  if (typeof effect.toZone === "string" && onZoneTo) {
    onZoneTo(effect);
  }
}

function updateAction(action, handlers) {
  if (!action || typeof action !== "object") {
    return;
  }
  if (action.preconditions) {
    updateExpr(action.preconditions, handlers);
  }
  if (Array.isArray(action.costs)) {
    action.costs.forEach((effect) => updateEffect(effect, handlers));
  }
  if (Array.isArray(action.effects)) {
    action.effects.forEach((effect) => updateEffect(effect, handlers));
  }
  if (Array.isArray(action.targets)) {
    action.targets.forEach((target) => {
      updateSelector(target?.selector, handlers);
    });
  }
}

function updateTriggers(list, handlers) {
  if (!Array.isArray(list)) {
    return;
  }
  list.forEach((trigger) => {
    if (trigger?.condition) {
      updateExpr(trigger.condition, handlers);
    }
    if (Array.isArray(trigger?.effects)) {
      trigger.effects.forEach((effect) => updateEffect(effect, handlers));
    }
  });
}

export const numericTweakMutation = {
  name: "numeric-tweak",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectVariableTargets(definition).filter(
      (target) => target.variable?.type?.kind === "int"
    );

    if (targets.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(targets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const target = targets[targetIndex];
    const variable = target.variable;
    const min = variable?.type?.min;
    const max = variable?.type?.max;
    const nextValue = tweakIntValue(variable?.initial, min, max, rng);

    target.container[target.index] = {
      ...variable,
      initial: nextValue,
    };

    return { ...genome, definition };
  },
};

export const booleanToggleMutation = {
  name: "boolean-toggle",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectVariableTargets(definition).filter(
      (target) => target.variable?.type?.kind === "bool"
    );

    if (targets.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(targets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const target = targets[targetIndex];
    const variable = target.variable;
    const initial = variable?.initial;
    if (typeof initial !== "boolean") {
      return { ...genome, definition };
    }

    target.container[target.index] = {
      ...variable,
      initial: !initial,
    };

    return { ...genome, definition };
  },
};

export const enumCycleMutation = {
  name: "enum-cycle",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectVariableTargets(definition).filter((target) => {
      const values = target.variable?.type?.values;
      return target.variable?.type?.kind === "enum" && Array.isArray(values) && values.length > 1;
    });

    if (targets.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(targets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const target = targets[targetIndex];
    const variable = target.variable;
    const values = Array.isArray(variable?.type?.values) ? variable.type.values : [];
    const nextValue = pickDifferentValue(values, variable?.initial, rng);

    target.container[target.index] = {
      ...variable,
      initial: nextValue,
    };

    return { ...genome, definition };
  },
};

export const actionDuplicateMutation = {
  name: "action-duplicate",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectActionTargets(definition);
    if (targets.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(targets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const existingIds = new Set(
      targets.map((target) => (typeof target.action?.id === "string" ? target.action.id : null)).filter(Boolean)
    );
    const target = targets[targetIndex];
    const cloned = structuredClone(target.action);
    const nextId = createUniqueId(existingIds, cloned?.id);

    definition.actions.splice(target.index + 1, 0, {
      ...cloned,
      id: nextId,
    });

    return { ...genome, definition };
  },
};

export const actionRemoveMutation = {
  name: "action-remove",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectActionTargets(definition);
    if (targets.length <= 1) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(targets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    definition.actions.splice(targetIndex, 1);
    return { ...genome, definition };
  },
};

export const actionEffectMagnitudeMutation = {
  name: "action-effect-magnitude",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectActionEffectTargets(definition).filter((target) => {
      const kind = target.effect?.kind;
      return kind === "inc" || kind === "dec" || kind === "random" || kind === "foreach";
    });

    if (targets.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(targets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const target = targets[targetIndex];
    const effects = definition.actions[target.actionIndex]?.[target.list];
    if (!Array.isArray(effects)) {
      return { ...genome, definition };
    }

    const current = target.effect?.amount;
    const nextAmount = tweakNonNegative(current, rng);
    effects[target.effectIndex] = {
      ...target.effect,
      amount: nextAmount,
    };

    return { ...genome, definition };
  },
};

export const preconditionNegationMutation = {
  name: "precondition-negation",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const targets = collectActionTargets(definition).filter((target) => target.action?.preconditions);
    if (targets.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(targets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const target = targets[targetIndex];
    const action = target.action;
    definition.actions[target.index] = {
      ...action,
      preconditions: { kind: "not", value: action.preconditions },
    };

    return { ...genome, definition };
  },
};

export const terminationThresholdMutation = {
  name: "termination-threshold",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const variables = Array.isArray(definition?.state?.variables) ? definition.state.variables : [];
    const conditions = Array.isArray(definition?.termination?.conditions)
      ? definition.termination.conditions
      : [];

    const targets = conditions
      .map((condition, index) => ({ condition, index }))
      .filter(({ condition }) => {
        const expr = condition?.condition;
        if (!expr || expr.kind !== "cmp") {
          return false;
        }
        const left = expr.left;
        const right = expr.right;
        if (!left || left.kind !== "ref" || left.ref?.kind !== "var") {
          return false;
        }
        if (!right || right.kind !== "value" || typeof right.value !== "number") {
          return false;
        }
        const variable = variables.find((item) => item?.id === left.ref.id);
        return variable?.type?.kind === "int";
      });

    if (targets.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(targets.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const target = targets[targetIndex];
    const expr = target.condition.condition;
    const variable = variables.find((item) => item?.id === expr.left.ref.id);
    const min = variable?.type?.min;
    const max = variable?.type?.max;
    const current = expr.right.value;
    const nextValue = tweakIntValue(current, min, max, rng);

    const updatedCondition = structuredClone(target.condition);
    updatedCondition.condition = {
      ...updatedCondition.condition,
      right: {
        ...updatedCondition.condition.right,
        value: nextValue,
      },
    };

    definition.termination.conditions[target.index] = updatedCondition;
    return { ...genome, definition };
  },
};

export const terminationOutcomeMutation = {
  name: "termination-outcome",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const conditions = Array.isArray(definition?.termination?.conditions)
      ? definition.termination.conditions
      : [];
    if (conditions.length === 0) {
      return { ...genome, definition };
    }

    const targetIndex = getRandomIndex(conditions.length, rng);
    if (targetIndex < 0) {
      return { ...genome, definition };
    }

    const condition = conditions[targetIndex];
    const outcome = condition?.outcome;
    if (!outcome || typeof outcome !== "object") {
      return { ...genome, definition };
    }

    const nextType = pickDifferentValue(["win", "lose", "draw"], outcome.type, rng);
    definition.termination.conditions[targetIndex] = {
      ...condition,
      outcome: {
        ...outcome,
        type: nextType,
      },
    };

    return { ...genome, definition };
  },
};

export const phaseAddMutation = {
  name: "phase-add",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const turn = definition.turn ?? {};
    const phases = Array.isArray(turn.phases) ? [...turn.phases] : [];
    const existing = new Set(phases.filter((phase) => typeof phase === "string"));
    const nextPhase = createUniqueId(existing, "phase");
    phases.push(nextPhase);

    definition.turn = {
      ...turn,
      phases,
    };

    return { ...genome, definition };
  },
};

export const phaseRemoveMutation = {
  name: "phase-remove",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const turn = definition.turn ?? {};
    const phases = Array.isArray(turn.phases) ? [...turn.phases] : [];
    if (phases.length <= 1) {
      return { ...genome, definition };
    }

    const removeIndex = getRandomIndex(phases.length, rng);
    if (removeIndex < 0) {
      return { ...genome, definition };
    }

    phases.splice(removeIndex, 1);
    definition.turn = {
      ...turn,
      phases,
    };

    return { ...genome, definition };
  },
};

export const tokenTypeZoneTargetAddMutation = {
  name: "token-zone-target-add",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const tokenTypes = collectTokenTypeTargets(definition);
    const zones = collectZoneTargets(definition);
    const actions = Array.isArray(definition?.actions) ? definition.actions : [];

    if (tokenTypes.length === 0 || zones.length === 0 || actions.length === 0) {
      return { ...genome, definition };
    }

    const tokenTypeIndex = getRandomIndex(tokenTypes.length, rng);
    const zoneIndex = getRandomIndex(zones.length, rng);
    const actionIndex = getRandomIndex(actions.length, rng);
    if (tokenTypeIndex < 0 || zoneIndex < 0 || actionIndex < 0) {
      return { ...genome, definition };
    }

    const existingTokenTypeIds = new Set(
      tokenTypes.map((tokenType) => (typeof tokenType?.id === "string" ? tokenType.id : null)).filter(Boolean)
    );
    const existingZoneIds = new Set(
      zones.map((zone) => (typeof zone?.id === "string" ? zone.id : null)).filter(Boolean)
    );
    const existingTargetIds = new Set(
      actions
        .flatMap((action) => (Array.isArray(action?.targets) ? action.targets : []))
        .map((target) => (typeof target?.id === "string" ? target.id : null))
        .filter(Boolean)
    );

    const clonedTokenType = structuredClone(tokenTypes[tokenTypeIndex]);
    const clonedZone = structuredClone(zones[zoneIndex]);
    const nextTokenTypeId = createUniqueId(existingTokenTypeIds, clonedTokenType?.id ?? "token");
    const nextZoneId = createUniqueId(existingZoneIds, clonedZone?.id ?? "zone");
    const nextTargetId = createUniqueId(existingTargetIds, "target");

    definition.state = {
      ...definition.state,
      tokenTypes: [...tokenTypes, { ...clonedTokenType, id: nextTokenTypeId }],
      zones: [
        ...zones,
        {
          ...clonedZone,
          id: nextZoneId,
          tokenType: nextTokenTypeId,
        },
      ],
    };

    const action = actions[actionIndex];
    const targets = Array.isArray(action?.targets) ? [...action.targets] : [];
    targets.push({
      id: nextTargetId,
      kind: "token",
      selector: {
        zone: nextZoneId,
        tokenType: nextTokenTypeId,
        count: 1,
      },
    });
    definition.actions[actionIndex] = {
      ...action,
      targets,
    };

    return { ...genome, definition };
  },
};

export const tokenTypeRemoveMutation = {
  name: "token-type-remove",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const tokenTypes = collectTokenTypeTargets(definition);
    if (tokenTypes.length <= 1) {
      return { ...genome, definition };
    }

    const removeIndex = getRandomIndex(tokenTypes.length, rng);
    if (removeIndex < 0) {
      return { ...genome, definition };
    }

    const removed = tokenTypes[removeIndex];
    const remaining = tokenTypes.filter((_, index) => index !== removeIndex);
    const replacementIndex = getRandomIndex(remaining.length, rng);
    if (replacementIndex < 0) {
      return { ...genome, definition };
    }

    const replacement = remaining[replacementIndex];
    const removedId = removed?.id;
    const replacementId = replacement?.id;
    if (typeof removedId !== "string" || typeof replacementId !== "string") {
      return { ...genome, definition };
    }

    const replacementAttributes = new Set(
      Array.isArray(replacement?.attributes)
        ? replacement.attributes.map((attribute) => attribute?.id).filter((id) => typeof id === "string")
        : []
    );

    if (Array.isArray(definition.state?.zones)) {
      definition.state.zones = definition.state.zones.map((zone) => {
        if (zone?.tokenType === removedId) {
          return { ...zone, tokenType: replacementId };
        }
        return zone;
      });
    }

    if (Array.isArray(definition.actions)) {
      definition.actions.forEach((action) =>
        updateAction(action, {
          onTokenRef: (ref) => updateRefTokenType(ref, removedId, replacementId, replacementAttributes),
          onTokenType: (selector) => {
            if (selector.tokenType === removedId) {
              selector.tokenType = replacementId;
            }
          },
        })
      );
    }

    updateTriggers(definition.triggers, {
      onTokenRef: (ref) => updateRefTokenType(ref, removedId, replacementId, replacementAttributes),
    });
    updateTriggers(definition.turn?.stepEffects, {
      onTokenRef: (ref) => updateRefTokenType(ref, removedId, replacementId, replacementAttributes),
    });

    if (Array.isArray(definition.termination?.conditions)) {
      definition.termination.conditions.forEach((condition) => {
        if (condition?.condition) {
          updateExpr(condition.condition, {
            onTokenRef: (ref) => updateRefTokenType(ref, removedId, replacementId, replacementAttributes),
          });
        }
      });
    }

    if (definition.termination?.scoring?.perPlayer) {
      updateExpr(definition.termination.scoring.perPlayer, {
        onTokenRef: (ref) => updateRefTokenType(ref, removedId, replacementId, replacementAttributes),
      });
    }

    definition.state = {
      ...definition.state,
      tokenTypes: remaining,
    };

    return { ...genome, definition };
  },
};

export const zoneRemoveMutation = {
  name: "zone-remove",
  mutate(genome, rng) {
    const definition = structuredClone(genome.definition);
    const zones = collectZoneTargets(definition);
    if (zones.length <= 1) {
      return { ...genome, definition };
    }

    const removeIndex = getRandomIndex(zones.length, rng);
    if (removeIndex < 0) {
      return { ...genome, definition };
    }

    const removed = zones[removeIndex];
    const remaining = zones.filter((_, index) => index !== removeIndex);
    const replacementIndex = getRandomIndex(remaining.length, rng);
    if (replacementIndex < 0) {
      return { ...genome, definition };
    }

    const replacement = remaining[replacementIndex];
    const removedId = removed?.id;
    const replacementId = replacement?.id;
    if (typeof removedId !== "string" || typeof replacementId !== "string") {
      return { ...genome, definition };
    }

    if (Array.isArray(definition.actions)) {
      definition.actions.forEach((action) =>
        updateAction(action, {
          onZoneRef: (ref) => updateRefZone(ref, removedId, replacementId),
          onZone: (selector) => {
            if (selector.zone === removedId) {
              selector.zone = replacementId;
            }
          },
          onZoneTo: (effect) => {
            if (effect.toZone === removedId) {
              effect.toZone = replacementId;
            }
          },
        })
      );
    }

    updateTriggers(definition.triggers, {
      onZoneRef: (ref) => updateRefZone(ref, removedId, replacementId),
      onZoneTo: (effect) => {
        if (effect.toZone === removedId) {
          effect.toZone = replacementId;
        }
      },
    });
    updateTriggers(definition.turn?.stepEffects, {
      onZoneRef: (ref) => updateRefZone(ref, removedId, replacementId),
      onZoneTo: (effect) => {
        if (effect.toZone === removedId) {
          effect.toZone = replacementId;
        }
      },
    });

    if (Array.isArray(definition.termination?.conditions)) {
      definition.termination.conditions.forEach((condition) => {
        if (condition?.condition) {
          updateExpr(condition.condition, {
            onZoneRef: (ref) => updateRefZone(ref, removedId, replacementId),
          });
        }
      });
    }

    if (definition.termination?.scoring?.perPlayer) {
      updateExpr(definition.termination.scoring.perPlayer, {
        onZoneRef: (ref) => updateRefZone(ref, removedId, replacementId),
      });
    }

    definition.state = {
      ...definition.state,
      zones: remaining,
    };

    return { ...genome, definition };
  },
};

export const defaultMutationOperators = [
  numericTweakMutation,
  booleanToggleMutation,
  enumCycleMutation,
  actionDuplicateMutation,
  actionRemoveMutation,
  actionEffectMagnitudeMutation,
  preconditionNegationMutation,
  terminationThresholdMutation,
  terminationOutcomeMutation,
  phaseAddMutation,
  phaseRemoveMutation,
  tokenTypeZoneTargetAddMutation,
  tokenTypeRemoveMutation,
  zoneRemoveMutation,
];

export function mutateGenome(genome, options = {}) {
  const { operators = defaultMutationOperators, rng } = options;
  if (!Array.isArray(operators) || operators.length === 0) {
    return structuredClone(genome);
  }
  const operatorIndex = getRandomIndex(operators.length, rng);
  const operator = operators[Math.max(0, operatorIndex)];
  if (!operator) {
    return structuredClone(genome);
  }
  return operator.mutate(genome, rng);
}

export function mutateAndRepairGenome(genome, options = {}) {
  const { operators = defaultMutationOperators, rng, repairOperators } = options;
  const mutated = mutateGenome(genome, { operators, rng });
  return repairGenome(mutated, { operators: repairOperators, rng });
}
