export function validateZoneTokenTypes(zones, tokenTypeIds, pushIssue) {
  zones.forEach((zone, index) => {
    const tokenType = zone?.tokenType;
    if (typeof tokenType === "string" && !tokenTypeIds.has(tokenType)) {
      pushIssue(
        `/state/zones/${index}/tokenType`,
        `Unknown token type: ${tokenType}`,
        "token-type-unknown"
      );
    }
  });
}
