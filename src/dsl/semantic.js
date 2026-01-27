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

function recordIntBounds(issues, variable, path) {
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

  const usedVariableIds = new Set();
  const usedTokenTypeIds = new Set();

  variables.forEach((variable, index) => {
    recordIntBounds(issues, variable, joinPath("/state/variables", index + "/type"));
  });

  tokenTypes.forEach((tokenType, index) => {
    const attributes = normalizeArray(tokenType?.attributes);
    attributes.forEach((attribute, attributeIndex) => {
      recordIntBounds(
        issues,
        attribute,
        joinPath(`/state/tokenTypes/${index}/attributes`, attributeIndex + "/type")
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
  if (terminationConditions.length === 0 && typeof maxTurns !== "number") {
    pushIssue(
      issues,
      "/termination/conditions",
      "At least one termination condition or maxTurns is required",
      "termination-conditions"
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
      if (typeof id === "string" && !zoneIds.has(id)) {
        pushIssue(issues, path, `Unknown zone: ${id}`, "zone-unknown");
      }
      return;
    }
    if (kind === "player") {
      return;
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
  actions.forEach((action, index) => {
    if (action?.preconditions) {
      validateExpr(action.preconditions, `/actions/${index}/preconditions`);
    }
    normalizeArray(action?.costs).forEach((effect, effectIndex) => {
      validateEffect(effect, `/actions/${index}/costs/${effectIndex}`);
    });
    normalizeArray(action?.effects).forEach((effect, effectIndex) => {
      validateEffect(effect, `/actions/${index}/effects/${effectIndex}`);
    });
    normalizeArray(action?.targets).forEach((target, targetIndex) => {
      validateSelector(target?.selector, `/actions/${index}/targets/${targetIndex}/selector`);
    });
  });

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

  return issues;
}

export function validateSemanticDefinition(definition) {
  const issues = collectSemanticIssues(definition);
  return {
    valid: issues.length === 0,
    issues,
  };
}
