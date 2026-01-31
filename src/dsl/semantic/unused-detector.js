export function reportUnusedResources({
  variableIds,
  tokenTypeIds,
  zoneIds,
  usedVariableIds,
  usedTokenTypeIds,
  usedZoneIds,
  pushIssue,
}) {
  variableIds.forEach((id) => {
    if (!usedVariableIds.has(id)) {
      pushIssue("/state/variables", `Variable is never referenced: ${id}`, "unused-variable");
    }
  });

  tokenTypeIds.forEach((id) => {
    if (!usedTokenTypeIds.has(id)) {
      pushIssue(
        "/state/tokenTypes",
        `Token type is never referenced: ${id}`,
        "unused-token-type"
      );
    }
  });

  zoneIds.forEach((id) => {
    if (!usedZoneIds.has(id)) {
      pushIssue("/state/zones", `Zone is never referenced: ${id}`, "unused-zone");
    }
  });
}
