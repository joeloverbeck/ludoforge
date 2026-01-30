export function applySetTurnOrder(state, effect, context) {
  const variable = effect.variable;
  const direction = effect.direction;
  if (!variable || !direction) {
    return { ok: false, reason: "missing-set-turn-order-params" };
  }
  const playerCount = context.state?.agents?.length ?? 0;
  if (playerCount === 0) {
    return { ok: false, reason: "no-agents" };
  }
  const players = [];
  for (let pid = 1; pid <= playerCount; pid++) {
    const value = state.variables?.perPlayer?.[pid]?.[variable] ?? 0;
    players.push({ id: pid, value });
  }
  const ascending = direction === "asc";
  players.sort((a, b) => {
    const cmp = ascending ? a.value - b.value : b.value - a.value;
    return cmp !== 0 ? cmp : a.id - b.id;
  });
  const turnOrder = players.map((p) => p.id);
  state.turn.turnOrder = turnOrder;
  return {
    ok: true,
    appliedEffect: {
      kind: "set_turn_order",
      variable,
      direction,
      turnOrder,
    },
  };
}
