const DEFAULT_PHASE = null;

function resolveTeamId(players, playerId) {
  if (!players.teams || players.teams.length === 0) {
    return undefined;
  }
  const role = players.roles?.[playerId - 1];
  if (!role) {
    return undefined;
  }
  const teamIndex = players.teams.findIndex((team) => team.includes(role));
  return teamIndex >= 0 ? teamIndex + 1 : undefined;
}

export function createInitialState(definition) {
  const globalVars = {};
  const perPlayerVarsTemplate = {};

  for (const variable of definition.state.variables) {
    if (variable.scope === "global") {
      globalVars[variable.id] = variable.initial;
    } else {
      perPlayerVarsTemplate[variable.id] = variable.initial;
    }
  }

  const perPlayerVars = {};
  const agents = [];

  for (let playerId = 1; playerId <= definition.players.count; playerId += 1) {
    perPlayerVars[playerId] = { ...perPlayerVarsTemplate };

    agents.push({
      id: playerId,
      role: definition.players.roles?.[playerId - 1],
      team: resolveTeamId(definition.players, playerId),
      variables: { ...perPlayerVarsTemplate },
      flags: {},
    });
  }

  const zones = {};
  for (const zone of definition.state.zones ?? []) {
    if (zone.scope === "global") {
      zones[zone.id] = {
        id: zone.id,
        tokenType: zone.tokenType,
        scope: zone.scope,
        order: zone.order,
        visibility: zone.visibility,
        spatial: zone.spatial,
        tokens: [],
      };
    } else {
      const tokensByPlayer = {};
      for (let playerId = 1; playerId <= definition.players.count; playerId += 1) {
        tokensByPlayer[playerId] = [];
      }
      zones[zone.id] = {
        id: zone.id,
        tokenType: zone.tokenType,
        scope: zone.scope,
        order: zone.order,
        visibility: zone.visibility,
        spatial: zone.spatial,
        tokensByPlayer,
      };
    }
  }

  const phase = definition.turn.phases?.[0] ?? DEFAULT_PHASE;

  return {
    variables: {
      global: globalVars,
      perPlayer: perPlayerVars,
    },
    tokens: {},
    zones,
    agents,
    turn: {
      currentPlayer: 1,
      phase,
      turn: 1,
      round: 1,
    },
    nextTokenId: 1,
  };
}

export function allocateTokenId(state) {
  const id = `t${state.nextTokenId}`;
  state.nextTokenId += 1;
  return id;
}
