import { domainForRef } from "../../dsl/semantic/domain.js";
import { normalizeArray } from "./utils.js";

/**
 * Builds the evaluation context needed by `evaluateExpr` from a game definition.
 *
 * @param {object} definition
 * @returns {{ domainForRef: Function, domainContext: { variableById: Map, tokenAttributeDefs: Map } }}
 */
export function buildExprEvalContext(definition) {
  const variables = normalizeArray(definition?.state?.variables);
  const tokenTypes = normalizeArray(definition?.state?.tokenTypes);

  const variableById = new Map(
    variables
      .filter((v) => typeof v?.id === "string")
      .map((v) => [v.id, v]),
  );

  const tokenAttributeDefs = new Map();
  for (const tokenType of tokenTypes) {
    if (typeof tokenType?.id !== "string") continue;
    const attributeMap = new Map();
    for (const attr of normalizeArray(tokenType.attributes)) {
      if (typeof attr?.id === "string") {
        attributeMap.set(attr.id, attr);
      }
    }
    tokenAttributeDefs.set(tokenType.id, attributeMap);
  }

  return {
    domainForRef,
    domainContext: { variableById, tokenAttributeDefs },
  };
}
