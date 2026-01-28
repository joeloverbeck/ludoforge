import { joinPath } from "./issue-collector.js";

export function createRefValidator({
  variableIds,
  tokenTypeIds,
  zoneIds,
  tokenAttributeIds,
  allowedMetaIds,
  pushIssue,
}) {
  const usedVariableIds = new Set();
  const usedTokenTypeIds = new Set();
  const usedZoneIds = new Set();

  function validateZoneRef(zoneId, path, options = {}) {
    const { trackUsage = true } = options;
    if (typeof zoneId !== "string") {
      return;
    }
    if (!zoneIds.has(zoneId)) {
      pushIssue(path, `Unknown zone: ${zoneId}`, "zone-unknown");
    } else if (trackUsage) {
      usedZoneIds.add(zoneId);
    }
  }

  function validateTokenTypeRef(tokenTypeId, path, options = {}) {
    const { trackUsage = true } = options;
    if (typeof tokenTypeId !== "string") {
      return;
    }
    if (!tokenTypeIds.has(tokenTypeId)) {
      pushIssue(path, `Unknown token type: ${tokenTypeId}`, "token-type-unknown");
    } else if (trackUsage) {
      usedTokenTypeIds.add(tokenTypeId);
    }
  }

  function validateRef(ref, path, options = {}) {
    if (!ref || typeof ref !== "object") {
      return;
    }
    const kind = ref.kind;
    const id = ref.id;
    if (kind === "meta") {
      if (!options.allowMeta) {
        pushIssue(path, "Meta refs are only allowed in expressions", "meta-ref-disallowed");
        return;
      }
      if (typeof id !== "string" || !allowedMetaIds.has(id)) {
        pushIssue(joinPath(path, "id"), `Unknown meta id: ${id}`, "meta-ref-unknown");
      }
      return;
    }
    if (kind === "var") {
      if (typeof id === "string") {
        if (!variableIds.has(id)) {
          pushIssue(path, `Unknown variable: ${id}`, "ref-unknown");
        } else {
          usedVariableIds.add(id);
        }
      }
      return;
    }
    if (kind === "token") {
      if (typeof id === "string") {
        if (!tokenTypeIds.has(id)) {
          pushIssue(path, `Unknown token type: ${id}`, "ref-unknown");
        } else {
          usedTokenTypeIds.add(id);
        }
      }
      if (typeof ref.attribute === "string") {
        const attributes = tokenAttributeIds.get(id);
        if (!attributes || !attributes.has(ref.attribute)) {
          pushIssue(
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
          pushIssue(path, `Unknown zone: ${id}`, "zone-unknown");
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

  return {
    validateRef,
    validateZoneRef,
    validateTokenTypeRef,
    usedVariableIds,
    usedTokenTypeIds,
    usedZoneIds,
  };
}
