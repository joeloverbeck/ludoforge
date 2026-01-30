import { normalizeArray } from "./utils.js";

/**
 * @param {object} definition
 * @returns {Set<string>}
 */
export function collectZoneIds(definition) {
  const zones = normalizeArray(definition?.state?.zones);
  return new Set(zones.map((z) => z?.id).filter((id) => typeof id === "string"));
}

/**
 * @param {object} definition
 * @returns {Set<string>}
 */
export function collectVariableIds(definition) {
  const variables = normalizeArray(definition?.state?.variables);
  return new Set(variables.map((variable) => variable?.id).filter((id) => typeof id === "string"));
}

/**
 * @param {object} definition
 * @returns {Set<string>}
 */
export function collectTokenTypeIds(definition) {
  const tokenTypes = normalizeArray(definition?.state?.tokenTypes);
  return new Set(tokenTypes.map((tokenType) => tokenType?.id).filter((id) => typeof id === "string"));
}

/**
 * @param {object} definition
 * @returns {Map<string, Set<string>>}
 */
export function collectTokenAttributeIds(definition) {
  const tokenTypes = normalizeArray(definition?.state?.tokenTypes);
  const map = new Map();
  for (const tokenType of tokenTypes) {
    const tokenTypeId = tokenType?.id;
    if (typeof tokenTypeId !== "string") {
      continue;
    }
    const attributes = new Set(
      normalizeArray(tokenType?.attributes)
        .map((attribute) => attribute?.id)
        .filter((id) => typeof id === "string")
    );
    map.set(tokenTypeId, attributes);
  }
  return map;
}

/**
 * @param {object} definition
 * @returns {Map<string, Set<string>>}
 */
export function collectSpatialZoneNodes(definition) {
  const zones = normalizeArray(definition?.state?.zones);
  const map = new Map();
  for (const zone of zones) {
    if (zone?.spatial?.nodes?.length > 0) {
      map.set(zone.id, new Set(zone.spatial.nodes));
    }
  }
  return map;
}
