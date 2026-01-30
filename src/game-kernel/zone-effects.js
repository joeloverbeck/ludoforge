import { findTokenZone, getZoneTokens } from "./token-effects.js";

function setZoneTokens(zone, playerId, tokens) {
  if (zone.scope === "per_player" && playerId != null) {
    zone.tokensByPlayer[playerId] = tokens;
  } else {
    zone.tokens = tokens;
  }
}

export function applyQueuePush(state, effect, context) {
  const tokenRef = effect.target;
  const toZoneId = effect.toZone;
  if (!tokenRef || tokenRef.kind !== "token" || !toZoneId) {
    return { ok: false, reason: "missing-queue-push-params" };
  }
  const resolvedId = context.bindings?.[tokenRef.id] ?? tokenRef.id;
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
  }
  const playerId = context.playerId;
  const targetPlayerId =
    toZone.scope === "per_player" && playerId != null ? playerId : undefined;
  const existing = getZoneTokens(toZone, targetPlayerId);
  setZoneTokens(toZone, targetPlayerId, [...existing, resolvedId]);
  return {
    ok: true,
    appliedEffect: {
      kind: "queue_push",
      target: tokenRef,
      toZone: toZoneId,
      tokenId: resolvedId,
    },
  };
}

export function applyQueuePop(state, effect, context) {
  const fromZoneId = effect.fromZone;
  if (!fromZoneId) {
    return { ok: false, reason: "missing-queue-pop-params" };
  }
  const fromZone = state.zones?.[fromZoneId];
  if (!fromZone) {
    return { ok: false, reason: "unknown-zone" };
  }
  const playerId = context.playerId;
  const sourcePlayerId =
    fromZone.scope === "per_player" && playerId != null ? playerId : undefined;
  const tokens = getZoneTokens(fromZone, sourcePlayerId);
  if (tokens.length === 0) {
    return {
      ok: true,
      appliedEffect: { kind: "queue_pop", fromZone: fromZoneId, popped: false },
    };
  }
  const poppedId = tokens[0];
  setZoneTokens(fromZone, sourcePlayerId, tokens.slice(1));

  const toZoneId = effect.toZone;
  if (toZoneId) {
    const toZone = state.zones?.[toZoneId];
    if (!toZone) {
      return { ok: false, reason: "unknown-zone" };
    }
    const destPlayerId =
      toZone.scope === "per_player" && playerId != null ? playerId : undefined;
    const destTokens = getZoneTokens(toZone, destPlayerId);
    setZoneTokens(toZone, destPlayerId, [...destTokens, poppedId]);
  } else {
    delete state.tokens[poppedId];
  }

  return {
    ok: true,
    appliedEffect: {
      kind: "queue_pop",
      fromZone: fromZoneId,
      toZone: toZoneId ?? null,
      tokenId: poppedId,
      popped: true,
    },
  };
}

export function applyShuffle(state, effect, context) {
  const zoneRef = effect.target;
  if (!zoneRef || zoneRef.kind !== "zone") {
    return { ok: false, reason: "missing-shuffle-params" };
  }
  const zone = state.zones?.[zoneRef.id];
  if (!zone) {
    return { ok: false, reason: "unknown-zone" };
  }
  const playerId = context.playerId;
  const tokens =
    zone.scope === "per_player" && playerId != null
      ? (zone.tokensByPlayer?.[playerId] ?? [])
      : (zone.tokens ?? []);

  if (tokens.length <= 1) {
    return { ok: true, appliedEffect: { kind: "shuffle", target: zoneRef, shuffled: false } };
  }

  const shuffled = [...tokens];
  const rng = context.rng;
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = rng?.nextInt
      ? rng.nextInt(i + 1)
      : Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }

  if (zone.scope === "per_player" && playerId != null) {
    zone.tokensByPlayer[playerId] = shuffled;
  } else {
    zone.tokens = shuffled;
  }

  return {
    ok: true,
    appliedEffect: { kind: "shuffle", target: zoneRef, shuffled: true },
  };
}
