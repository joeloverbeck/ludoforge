export function domainForType(type) {
  if (!type || typeof type !== "object") {
    return null;
  }
  if (type.kind === "int") {
    if (typeof type.min === "number" && typeof type.max === "number") {
      return { kind: "int", min: type.min, max: type.max };
    }
    return null;
  }
  if (type.kind === "bool") {
    return { kind: "bool", values: [true, false] };
  }
  if (type.kind === "enum") {
    if (Array.isArray(type.values) && type.values.every((value) => typeof value === "string")) {
      return { kind: "enum", values: type.values };
    }
    return null;
  }
  return null;
}

export function domainForRef(ref, { variableById, tokenAttributeDefs } = {}) {
  if (!ref || typeof ref !== "object") {
    return null;
  }
  if (ref.kind === "var" && typeof ref.id === "string") {
    const variable = variableById?.get?.(ref.id);
    return domainForType(variable?.type);
  }
  if (
    ref.kind === "token" &&
    typeof ref.id === "string" &&
    typeof ref.attribute === "string"
  ) {
    const attribute = tokenAttributeDefs?.get?.(ref.id)?.get(ref.attribute);
    return domainForType(attribute?.type);
  }
  return null;
}
