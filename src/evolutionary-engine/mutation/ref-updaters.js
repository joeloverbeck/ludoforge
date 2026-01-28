function updateRefTokenType(ref, removedId, replacementId, replacementAttributes) {
  if (!ref || typeof ref !== "object") {
    return;
  }
  if (ref.kind !== "token") {
    return;
  }
  if (ref.id !== removedId) {
    return;
  }
  ref.id = replacementId;
  if (typeof ref.attribute === "string" && !replacementAttributes.has(ref.attribute)) {
    delete ref.attribute;
  }
}

function updateRefZone(ref, removedId, replacementId) {
  if (!ref || typeof ref !== "object") {
    return;
  }
  if (ref.kind !== "zone") {
    return;
  }
  if (ref.id !== removedId) {
    return;
  }
  ref.id = replacementId;
}

export { updateRefTokenType, updateRefZone };
