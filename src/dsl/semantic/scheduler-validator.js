export function validateScheduler(definition, { variableIds, tokenTypeIds, zoneIds, pushIssue }) {
  const scheduler = definition.turn?.scheduler;
  if (scheduler === "priority_queue") {
    const orderByVar = definition.turn?.orderBy?.variable;
    if (typeof orderByVar === "string" && !variableIds.has(orderByVar)) {
      pushIssue(
        "/turn/orderBy/variable",
        `priority_queue orderBy references unknown variable: ${orderByVar}`,
        "ref-unknown"
      );
    }
  }
  if (scheduler === "token_holder") {
    const tokenType = definition.turn?.tokenType;
    if (typeof tokenType === "string" && !tokenTypeIds.has(tokenType)) {
      pushIssue(
        "/turn/tokenType",
        `token_holder references unknown token type: ${tokenType}`,
        "token-type-unknown"
      );
    }
    const zone = definition.turn?.zone;
    if (typeof zone === "string" && !zoneIds.has(zone)) {
      pushIssue(
        "/turn/zone",
        `token_holder references unknown zone: ${zone}`,
        "zone-unknown"
      );
    }
  }
  if (scheduler === "simultaneous") {
    const order = definition.turn?.resolution?.order;
    if (order != null && order !== "by_player_id" && order !== "random") {
      pushIssue(
        "/turn/resolution/order",
        `simultaneous resolution order is invalid: ${order}`,
        "turn-resolution-order"
      );
    }
  }
}
