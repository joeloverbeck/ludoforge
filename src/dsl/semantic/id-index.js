import { normalizeArray } from "./issue-collector.js";

function collectIds(list) {
  return new Set(list.map((item) => item?.id).filter((id) => typeof id === "string"));
}

function collectTokenAttributeIds(tokenTypes) {
  const map = new Map();
  tokenTypes.forEach((tokenType) => {
    const attributes = normalizeArray(tokenType?.attributes);
    map.set(
      tokenType?.id,
      new Set(
        attributes.map((attribute) => attribute?.id).filter((id) => typeof id === "string")
      )
    );
  });
  return map;
}

function collectTokenAttributeDefs(tokenTypes) {
  const map = new Map();
  tokenTypes.forEach((tokenType) => {
    const attributes = normalizeArray(tokenType?.attributes);
    const attributeMap = new Map();
    attributes.forEach((attribute) => {
      if (attribute?.id) {
        attributeMap.set(attribute.id, attribute);
      }
    });
    map.set(tokenType?.id, attributeMap);
  });
  return map;
}

export function buildIdIndex({ variables, tokenTypes, zones } = {}) {
  const variableList = normalizeArray(variables);
  const tokenTypeList = normalizeArray(tokenTypes);
  const zoneList = normalizeArray(zones);
  return {
    variableIds: collectIds(variableList),
    tokenTypeIds: collectIds(tokenTypeList),
    zoneIds: collectIds(zoneList),
    tokenAttributeIds: collectTokenAttributeIds(tokenTypeList),
    tokenAttributeDefs: collectTokenAttributeDefs(tokenTypeList),
    variableById: new Map(
      variableList
        .filter((variable) => typeof variable?.id === "string")
        .map((variable) => [variable.id, variable])
    ),
    zoneById: new Map(
      zoneList
        .filter((zone) => typeof zone?.id === "string")
        .map((zone) => [zone.id, zone])
    ),
  };
}
