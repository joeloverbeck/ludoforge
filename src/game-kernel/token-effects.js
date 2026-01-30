import { allocateTokenId } from "./state.js";

function findTokenTypeDef(definition, typeId) {
  const tokenTypes = definition?.state?.tokenTypes ?? [];
  return tokenTypes.find((t) => t.id === typeId);
}

function buildTokenAttributes(tokenTypeDef) {
  const attributes = {};
  for (const attr of tokenTypeDef?.attributes ?? []) {
    attributes[attr.id] = attr.initial;
  }
  return attributes;
}

function getZoneTokens(zone, playerId) {
  if (zone.scope === "per_player" && playerId != null) {
    return zone.tokensByPlayer?.[playerId] ?? [];
  }
  return zone.tokens ?? [];
}

function setZoneTokens(zone, playerId, tokens) {
  if (zone.scope === "per_player" && playerId != null) {
    zone.tokensByPlayer[playerId] = tokens;
  } else {
    zone.tokens = tokens;
  }
}

function recordTokenImpact(context, zone, playerId) {
  const impact = context?.impact;
  if (!impact) {
    return;
  }
  if (zone.scope === "per_player" && playerId != null) {
    impact.affectedPlayerIds.add(playerId);
  } else {
    impact.affectedGlobal = true;
  }
}

export function applyTokenSpawn(state, effect, context, options) {
  const definition = context.definition ?? options?.definition;
  const typeId = effect.target?.id;
  const toZoneId = effect.toZone;
  if (!typeId || !toZoneId) {
    return { ok: false, reason: "missing-spawn-params" };
  }
  const zone = state.zones?.[toZoneId];
  if (!zone) {
    return { ok: false, reason: "unknown-zone" };
  }
  const tokenTypeDef = definition ? findTokenTypeDef(definition, typeId) : undefined;
  const attributes = tokenTypeDef ? buildTokenAttributes(tokenTypeDef) : {};
  const tokenId = allocateTokenId(state);
  const token = {
    id: tokenId,
    type: typeId,
    attributes,
    revealed: true,
    flags: {},
  };
  if (zone.spatial?.nodes?.length > 0) {
    token.node = zone.spatial.nodes[0];
  }
  state.tokens[tokenId] = token;
  const playerId = context.playerId;
  const tokens = getZoneTokens(zone, playerId);
  setZoneTokens(zone, playerId, [...tokens, tokenId]);
  recordTokenImpact(context, zone, playerId);
  return {
    ok: true,
    appliedEffect: {
      kind: "spawn",
      target: { kind: "token", id: typeId },
      toZone: toZoneId,
      tokenId,
    },
  };
}

function findTokenZone(state, tokenId, playerId) {
  for (const zone of Object.values(state.zones ?? {})) {
    if (zone.scope === "per_player") {
      for (const [pid, tokenIds] of Object.entries(zone.tokensByPlayer ?? {})) {
        if (tokenIds.includes(tokenId)) {
          return { zone, playerId: Number(pid) };
        }
      }
    } else {
      if ((zone.tokens ?? []).includes(tokenId)) {
        return { zone, playerId: undefined };
      }
    }
  }
  return null;
}

export function applyTokenMove(state, effect, context) {
  const tokenId = effect.target?.id;
  const toZoneId = effect.toZone;
  if (!tokenId || !toZoneId) {
    return { ok: false, reason: "missing-move-params" };
  }
  const resolvedId = context.bindings?.[tokenId] ?? tokenId;
  const token = state.tokens[resolvedId];
  if (!token) {
    return { ok: false, reason: "token-not-found" };
  }
  const toZone = state.zones?.[toZoneId];
  if (!toZone) {
    return { ok: false, reason: "unknown-zone" };
  }
  const location = findTokenZone(state, resolvedId);
  if (location) {
    const fromTokens = getZoneTokens(location.zone, location.playerId);
    setZoneTokens(
      location.zone,
      location.playerId,
      fromTokens.filter((id) => id !== resolvedId)
    );
    recordTokenImpact(context, location.zone, location.playerId);
  }
  const playerId = context.playerId;
  const toTokens = getZoneTokens(toZone, playerId);
  setZoneTokens(toZone, playerId, [...toTokens, resolvedId]);
  recordTokenImpact(context, toZone, playerId);
  return {
    ok: true,
    appliedEffect: {
      kind: "move",
      target: { kind: "token", id: tokenId },
      toZone: toZoneId,
      tokenId: resolvedId,
    },
  };
}

export function applyTokenDestroy(state, effect, context) {
  const tokenId = effect.target?.id;
  if (!tokenId) {
    return { ok: false, reason: "missing-destroy-params" };
  }
  const resolvedId = context.bindings?.[tokenId] ?? tokenId;
  const token = state.tokens[resolvedId];
  if (!token) {
    return { ok: false, reason: "token-not-found" };
  }
  const location = findTokenZone(state, resolvedId);
  if (location) {
    const tokens = getZoneTokens(location.zone, location.playerId);
    setZoneTokens(
      location.zone,
      location.playerId,
      tokens.filter((id) => id !== resolvedId)
    );
    recordTokenImpact(context, location.zone, location.playerId);
  }
  delete state.tokens[resolvedId];
  return {
    ok: true,
    appliedEffect: {
      kind: "destroy",
      target: { kind: "token", id: tokenId },
      tokenId: resolvedId,
    },
  };
}

export function applyTokenReveal(state, effect, context) {
  const tokenId = effect.target?.id;
  if (!tokenId) {
    return { ok: false, reason: "missing-reveal-params" };
  }
  const resolvedId = context.bindings?.[tokenId] ?? tokenId;
  const token = state.tokens[resolvedId];
  if (!token) {
    return { ok: false, reason: "token-not-found" };
  }
  token.revealed = true;
  const location = findTokenZone(state, resolvedId);
  if (location) {
    recordTokenImpact(context, location.zone, location.playerId);
  }
  return {
    ok: true,
    appliedEffect: {
      kind: "reveal",
      target: { kind: "token", id: tokenId },
      tokenId: resolvedId,
    },
  };
}

export function applyTokenHide(state, effect, context) {
  const tokenId = effect.target?.id;
  if (!tokenId) {
    return { ok: false, reason: "missing-hide-params" };
  }
  const resolvedId = context.bindings?.[tokenId] ?? tokenId;
  const token = state.tokens[resolvedId];
  if (!token) {
    return { ok: false, reason: "token-not-found" };
  }
  token.revealed = false;
  const location = findTokenZone(state, resolvedId);
  if (location) {
    recordTokenImpact(context, location.zone, location.playerId);
  }
  return {
    ok: true,
    appliedEffect: {
      kind: "hide",
      target: { kind: "token", id: tokenId },
      tokenId: resolvedId,
    },
  };
}

export { findTokenZone, getZoneTokens };
