export function collectVariableTargets(definition) {
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

export function collectActionTargets(definition) {
  if (!Array.isArray(definition?.actions)) {
    return [];
  }
  return definition.actions.map((action, index) => ({
    container: definition.actions,
    index,
    action,
  }));
}

export function collectActionEffectTargets(definition) {
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

export function collectZoneTargets(definition) {
  return Array.isArray(definition?.state?.zones) ? definition.state.zones : [];
}

export function collectTokenTypeTargets(definition) {
  return Array.isArray(definition?.state?.tokenTypes) ? definition.state.tokenTypes : [];
}
