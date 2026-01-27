function pushIssue(issues, path, message, rule) {
  issues.push({ path, message, rule });
}

function joinPath(base, segment) {
  if (base === "") {
    return `/${segment}`;
  }
  return `${base}/${segment}`;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function collectIds(list) {
  return new Set(list.map((item) => item?.id).filter((id) => typeof id === "string"));
}

function recordIntBounds(issues, variable, path, initialPath) {
  if (!variable || !variable.type || variable.type.kind !== "int") {
    return;
  }
  const { min, max } = variable.type;
  if (typeof min !== "number" || typeof max !== "number") {
    pushIssue(
      issues,
      path,
      "Int types must declare both min and max bounds",
      "int-bounds"
    );
    return;
  }
  if (min > max) {
    pushIssue(issues, path, "Int bounds must satisfy min <= max", "int-bounds");
    return;
  }
  if (typeof initialPath === "string") {
    const initial = variable.initial;
    if (typeof initial !== "number") {
      pushIssue(
        issues,
        initialPath,
        "Int initial values must be numbers",
        "int-initial-type"
      );
      return;
    }
    if (initial < min || initial > max) {
      pushIssue(
        issues,
        initialPath,
        "Int initial values must be within declared bounds",
        "int-initial-bounds"
      );
    }
  }
}

function collectTokenAttributeIds(tokenTypes) {
  const map = new Map();
  tokenTypes.forEach((tokenType) => {
    const attributes = normalizeArray(tokenType?.attributes);
    map.set(
      tokenType?.id,
      new Set(
        attributes.map((attribute) => attribute?.id).filter((id) => typeof id === "string")
      )
    );
  });
  return map;
}

function collectTokenAttributeDefs(tokenTypes) {
  const map = new Map();
  tokenTypes.forEach((tokenType) => {
    const attributes = normalizeArray(tokenType?.attributes);
    const attributeMap = new Map();
    attributes.forEach((attribute) => {
      if (attribute?.id) {
        attributeMap.set(attribute.id, attribute);
      }
    });
    map.set(tokenType?.id, attributeMap);
  });
  return map;
}

export function collectSemanticIssues(definition) {
  const issues = [];
  if (!definition || typeof definition !== "object") {
    pushIssue(issues, "", "Game definition must be an object", "invalid-definition");
    return issues;
  }

  const variables = normalizeArray(definition.state?.variables);
  const tokenTypes = normalizeArray(definition.state?.tokenTypes);
  const zones = normalizeArray(definition.state?.zones);

  const variableIds = collectIds(variables);
  const tokenTypeIds = collectIds(tokenTypes);
  const zoneIds = collectIds(zones);
  const tokenAttributeIds = collectTokenAttributeIds(tokenTypes);
  const tokenAttributeDefs = collectTokenAttributeDefs(tokenTypes);
  const variableById = new Map(
    variables.filter((variable) => typeof variable?.id === "string").map((variable) => [variable.id, variable])
  );

  const usedVariableIds = new Set();
  const usedTokenTypeIds = new Set();
  const usedZoneIds = new Set();

  variables.forEach((variable, index) => {
    const basePath = `/state/variables/${index}`;
    recordIntBounds(
      issues,
      variable,
      joinPath(basePath, "type"),
      joinPath(basePath, "initial")
    );
  });

  tokenTypes.forEach((tokenType, index) => {
    const attributes = normalizeArray(tokenType?.attributes);
    attributes.forEach((attribute, attributeIndex) => {
      const basePath = `/state/tokenTypes/${index}/attributes/${attributeIndex}`;
      recordIntBounds(
        issues,
        attribute,
        joinPath(basePath, "type"),
        joinPath(basePath, "initial")
      );
    });
  });

  zones.forEach((zone, index) => {
    const tokenType = zone?.tokenType;
    if (typeof tokenType === "string" && !tokenTypeIds.has(tokenType)) {
      pushIssue(
        issues,
        `/state/zones/${index}/tokenType`,
        `Unknown token type: ${tokenType}`,
        "token-type-unknown"
      );
    }
  });

  const terminationConditions = normalizeArray(definition.termination?.conditions);
  const maxTurns = definition.termination?.maxTurns;
  if (terminationConditions.length === 0) {
    pushIssue(
      issues,
      "/termination/conditions",
      "At least one termination condition is required",
      "termination-conditions"
    );
  }
  if (typeof maxTurns !== "number") {
    pushIssue(
      issues,
      "/termination/maxTurns",
      "A maxTurns fallback is required",
      "termination-max-turns"
    );
  }

  function validateRef(ref, path) {
    if (!ref || typeof ref !== "object") {
      return;
    }
    const kind = ref.kind;
    const id = ref.id;
    if (kind === "var") {
      if (typeof id === "string") {
        if (!variableIds.has(id)) {
          pushIssue(issues, path, `Unknown variable: ${id}`, "ref-unknown");
        } else {
          usedVariableIds.add(id);
        }
      }
      return;
    }
    if (kind === "token") {
      if (typeof id === "string") {
        if (!tokenTypeIds.has(id)) {
          pushIssue(issues, path, `Unknown token type: ${id}`, "ref-unknown");
        } else {
          usedTokenTypeIds.add(id);
        }
      }
      if (typeof ref.attribute === "string") {
        const attributes = tokenAttributeIds.get(id);
        if (!attributes || !attributes.has(ref.attribute)) {
          pushIssue(
            issues,
            joinPath(path, "attribute"),
            `Unknown token attribute: ${ref.attribute}`,
            "token-attribute-unknown"
          );
        }
      }
      return;
    }
    if (kind === "zone") {
      if (typeof id === "string") {
        if (!zoneIds.has(id)) {
          pushIssue(issues, path, `Unknown zone: ${id}`, "zone-unknown");
        } else {
          usedZoneIds.add(id);
        }
      }
      return;
    }
    if (kind === "player") {
      return;
    }
  }

  function domainForType(type) {
    if (!type || typeof type !== "object") {
      return null;
    }
    if (type.kind === "int") {
      if (typeof type.min === "number" && typeof type.max === "number") {
        return { kind: "int", min: type.min, max: type.max };
      }
      return null;
    }
    if (type.kind === "bool") {
      return { kind: "bool", values: [true, false] };
    }
    if (type.kind === "enum") {
      if (Array.isArray(type.values) && type.values.every((value) => typeof value === "string")) {
        return { kind: "enum", values: type.values };
      }
      return null;
    }
    return null;
  }

  function domainForRef(ref) {
    if (!ref || typeof ref !== "object") {
      return null;
    }
    if (ref.kind === "var" && typeof ref.id === "string") {
      const variable = variableById.get(ref.id);
      return domainForType(variable?.type);
    }
    if (
      ref.kind === "token" &&
      typeof ref.id === "string" &&
      typeof ref.attribute === "string"
    ) {
      const attribute = tokenAttributeDefs.get(ref.id)?.get(ref.attribute);
      return domainForType(attribute?.type);
    }
    return null;
  }

  function evaluateCmp(domain, op, literal) {
    if (!domain || typeof op !== "string") {
      return { possible: true, alwaysTrue: false };
    }
    if (domain.kind === "int") {
      const min = domain.min;
      const max = domain.max;
      if (typeof literal !== "number") {
        if (op === "==") {
          return { possible: false, alwaysTrue: false };
        }
        if (op === "!=") {
          return { possible: true, alwaysTrue: true };
        }
        return { possible: true, alwaysTrue: false };
      }
      switch (op) {
        case "==": {
          const possible = literal >= min && literal <= max;
          return { possible, alwaysTrue: possible && min === max && min === literal };
        }
        case "!=": {
          const alwaysTrue = literal < min || literal > max;
          const possible = !alwaysTrue && !(min === max && min === literal);
          return { possible, alwaysTrue };
        }
        case "<":
          return { possible: min < literal, alwaysTrue: max < literal };
        case "<=":
          return { possible: min <= literal, alwaysTrue: max <= literal };
        case ">":
          return { possible: max > literal, alwaysTrue: min > literal };
        case ">=":
          return { possible: max >= literal, alwaysTrue: min >= literal };
        default:
          return { possible: true, alwaysTrue: false };
      }
    }
    if (domain.kind === "bool") {
      if (typeof literal !== "boolean") {
        if (op === "==") {
          return { possible: false, alwaysTrue: false };
        }
        if (op === "!=") {
          return { possible: true, alwaysTrue: true };
        }
        return { possible: true, alwaysTrue: false };
      }
      if (op === "==") {
        return { possible: true, alwaysTrue: false };
      }
      if (op === "!=") {
        return { possible: true, alwaysTrue: false };
      }
      return { possible: true, alwaysTrue: false };
    }
    if (domain.kind === "enum") {
      if (typeof literal !== "string") {
        if (op === "==") {
          return { possible: false, alwaysTrue: false };
        }
        if (op === "!=") {
          return { possible: true, alwaysTrue: true };
        }
        return { possible: true, alwaysTrue: false };
      }
      const includes = domain.values.includes(literal);
      if (op === "==") {
        return { possible: includes, alwaysTrue: includes && domain.values.length === 1 };
      }
      if (op === "!=") {
        return {
          possible: domain.values.length > (includes ? 1 : 0),
          alwaysTrue: !includes,
        };
      }
      return { possible: true, alwaysTrue: false };
    }
    return { possible: true, alwaysTrue: false };
  }

  function evaluateExpr(expr) {
    if (!expr || typeof expr !== "object") {
      return { possible: true, alwaysTrue: false };
    }
    switch (expr.kind) {
      case "value":
        if (typeof expr.value === "boolean") {
          return { possible: expr.value, alwaysTrue: expr.value };
        }
        return { possible: true, alwaysTrue: false };
      case "ref": {
        const domain = domainForRef(expr.ref);
        if (domain?.kind === "bool") {
          return { possible: true, alwaysTrue: false };
        }
        return { possible: true, alwaysTrue: false };
      }
      case "not": {
        const inner = evaluateExpr(expr.value);
        return { possible: !inner.alwaysTrue, alwaysTrue: inner.possible === false };
      }
      case "and": {
        const left = evaluateExpr(expr.left);
        const right = evaluateExpr(expr.right);
        return { possible: left.possible && right.possible, alwaysTrue: left.alwaysTrue && right.alwaysTrue };
      }
      case "or": {
        const left = evaluateExpr(expr.left);
        const right = evaluateExpr(expr.right);
        return { possible: left.possible || right.possible, alwaysTrue: left.alwaysTrue || right.alwaysTrue };
      }
      case "cmp": {
        const left = expr.left;
        const right = expr.right;
        const op = expr.op;
        if (!left || !right || typeof op !== "string") {
          return { possible: true, alwaysTrue: false };
        }
        if (left.kind === "value" && right.kind === "value") {
          const leftValue = left.value;
          const rightValue = right.value;
          if (op === "==" || op === "!=") {
            const result = op === "==" ? leftValue === rightValue : leftValue !== rightValue;
            return { possible: result, alwaysTrue: result };
          }
          if (typeof leftValue === "number" && typeof rightValue === "number") {
            switch (op) {
              case "<":
                return { possible: leftValue < rightValue, alwaysTrue: leftValue < rightValue };
              case "<=":
                return { possible: leftValue <= rightValue, alwaysTrue: leftValue <= rightValue };
              case ">":
                return { possible: leftValue > rightValue, alwaysTrue: leftValue > rightValue };
              case ">=":
                return { possible: leftValue >= rightValue, alwaysTrue: leftValue >= rightValue };
              default:
                return { possible: true, alwaysTrue: false };
            }
          }
          return { possible: true, alwaysTrue: false };
        }
        if (left.kind === "ref" && left.ref && right.kind === "value") {
          const domain = domainForRef(left.ref);
          return evaluateCmp(domain, op, right.value);
        }
        if (left.kind === "value" && right.kind === "ref" && right.ref) {
          const inverse = { "<": ">", "<=": ">=", ">": "<", ">=": "<=", "==": "==", "!=": "!=" };
          const invertedOp = inverse[op] ?? op;
          const domain = domainForRef(right.ref);
          return evaluateCmp(domain, invertedOp, left.value);
        }
        return { possible: true, alwaysTrue: false };
      }
      default:
        return { possible: true, alwaysTrue: false };
    }
  }

  function validateSelector(selector, path) {
    if (!selector || typeof selector !== "object") {
      return;
    }
    if (typeof selector.zone === "string" && !zoneIds.has(selector.zone)) {
      pushIssue(
        issues,
        joinPath(path, "zone"),
        `Unknown zone: ${selector.zone}`,
        "zone-unknown"
      );
    } else if (typeof selector.zone === "string") {
      usedZoneIds.add(selector.zone);
    }
    if (typeof selector.tokenType === "string") {
      if (!tokenTypeIds.has(selector.tokenType)) {
        pushIssue(
          issues,
          joinPath(path, "tokenType"),
          `Unknown token type: ${selector.tokenType}`,
          "token-type-unknown"
        );
      } else {
        usedTokenTypeIds.add(selector.tokenType);
      }
    }
    if (selector.where) {
      validateExpr(selector.where, joinPath(path, "where"));
    }
  }

  function validateEffect(effect, path) {
    if (!effect || typeof effect !== "object") {
      return;
    }
    if (effect.target) {
      validateRef(effect.target, joinPath(path, "target"));
    }
    if (typeof effect.toZone === "string" && !zoneIds.has(effect.toZone)) {
      pushIssue(
        issues,
        joinPath(path, "toZone"),
        `Unknown zone: ${effect.toZone}`,
        "zone-unknown"
      );
    } else if (typeof effect.toZone === "string") {
      usedZoneIds.add(effect.toZone);
    }
  }

  function validateExpr(expr, path) {
    if (!expr || typeof expr !== "object") {
      return;
    }
    switch (expr.kind) {
      case "and":
      case "or":
        if (expr.left) {
          validateExpr(expr.left, joinPath(path, "left"));
        }
        if (expr.right) {
          validateExpr(expr.right, joinPath(path, "right"));
        }
        break;
      case "not":
        if (expr.value) {
          validateExpr(expr.value, joinPath(path, "value"));
        }
        break;
      case "cmp":
        if (expr.left) {
          validateExpr(expr.left, joinPath(path, "left"));
        }
        if (expr.right) {
          validateExpr(expr.right, joinPath(path, "right"));
        }
        break;
      case "ref":
        if (expr.ref) {
          validateRef(expr.ref, joinPath(path, "ref"));
        }
        break;
      default:
        break;
    }
  }

  const actions = normalizeArray(definition.actions);
  const actionSummaries = [];
  actions.forEach((action, index) => {
    const costs = normalizeArray(action?.costs);
    const effects = normalizeArray(action?.effects);
    const targets = normalizeArray(action?.targets);
    const preconditionEvaluation = action?.preconditions
      ? evaluateExpr(action.preconditions)
      : { possible: true, alwaysTrue: true };
    if (action?.preconditions) {
      validateExpr(action.preconditions, `/actions/${index}/preconditions`);
      if (preconditionEvaluation.possible === false) {
        pushIssue(
          issues,
          `/actions/${index}/preconditions`,
          "Action preconditions are unsatisfiable given declared bounds",
          "action-precondition-unsatisfiable"
        );
      }
    }
    costs.forEach((effect, effectIndex) => {
      validateEffect(effect, `/actions/${index}/costs/${effectIndex}`);
    });
    effects.forEach((effect, effectIndex) => {
      validateEffect(effect, `/actions/${index}/effects/${effectIndex}`);
    });
    targets.forEach((target, targetIndex) => {
      validateSelector(target?.selector, `/actions/${index}/targets/${targetIndex}/selector`);
    });

    const hasBeneficialEffects = effects.some((effect) => {
      if (!effect || typeof effect !== "object") {
        return false;
      }
      if (effect.kind === "inc") {
        return typeof effect.amount !== "number" || effect.amount > 0;
      }
      if (effect.kind === "spawn") {
        return true;
      }
      return false;
    });
    const hasCosts = costs.length > 0;
    const hasLimits = Boolean(action?.preconditions) || targets.length > 0;

    if (hasBeneficialEffects && !hasCosts && !hasLimits) {
      pushIssue(
        issues,
        `/actions/${index}`,
        "Beneficial action effects must include costs or limits (preconditions/targets)",
        "free-lunch"
      );
    }

    actionSummaries.push({
      index,
      possible: preconditionEvaluation.possible !== false,
      alwaysAvailable: Boolean(!action?.preconditions || preconditionEvaluation.alwaysTrue),
      hasBeneficialEffects,
      hasCosts,
      hasLimits,
    });
  });

  const possibleActions = actionSummaries.filter((action) => action.possible);
  if (actions.length === 0 || possibleActions.length === 0) {
    pushIssue(
      issues,
      "/actions",
      "No meaningful actions are available in typical states given declared bounds",
      "no-meaningful-actions"
    );
  }

  if (actions.length > 1) {
    actionSummaries.forEach((action) => {
      if (
        action.possible &&
        action.alwaysAvailable &&
        action.hasBeneficialEffects &&
        !action.hasCosts &&
        !action.hasLimits
      ) {
        pushIssue(
          issues,
          `/actions/${action.index}`,
          "Action is always available and strictly beneficial without costs or limits; likely dominant",
          "dominant-action"
        );
      }
    });
  }

  const triggers = normalizeArray(definition.triggers);
  triggers.forEach((trigger, index) => {
    if (trigger?.condition) {
      validateExpr(trigger.condition, `/triggers/${index}/condition`);
    }
    normalizeArray(trigger?.effects).forEach((effect, effectIndex) => {
      validateEffect(effect, `/triggers/${index}/effects/${effectIndex}`);
    });
  });

  const stepEffects = normalizeArray(definition.turn?.stepEffects);
  stepEffects.forEach((trigger, index) => {
    if (trigger?.condition) {
      validateExpr(trigger.condition, `/turn/stepEffects/${index}/condition`);
    }
    normalizeArray(trigger?.effects).forEach((effect, effectIndex) => {
      validateEffect(effect, `/turn/stepEffects/${index}/effects/${effectIndex}`);
    });
  });

  terminationConditions.forEach((termination, index) => {
    if (termination?.condition) {
      validateExpr(termination.condition, `/termination/conditions/${index}/condition`);
    }
  });

  if (definition.termination?.scoring?.perPlayer) {
    validateExpr(definition.termination.scoring.perPlayer, "/termination/scoring/perPlayer");
  }

  variableIds.forEach((id) => {
    if (!usedVariableIds.has(id)) {
      pushIssue(issues, "/state/variables", `Variable is never referenced: ${id}`, "unused-variable");
    }
  });

  tokenTypeIds.forEach((id) => {
    if (!usedTokenTypeIds.has(id)) {
      pushIssue(
        issues,
        "/state/tokenTypes",
        `Token type is never referenced: ${id}`,
        "unused-token-type"
      );
    }
  });

  zoneIds.forEach((id) => {
    if (!usedZoneIds.has(id)) {
      pushIssue(issues, "/state/zones", `Zone is never referenced: ${id}`, "unused-zone");
    }
  });

  return issues;
}

export function validateSemanticDefinition(definition) {
  const issues = collectSemanticIssues(definition);
  return {
    valid: issues.length === 0,
    issues,
  };
}
