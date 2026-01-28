function isDrawForAll(outcomes) {
  if (!outcomes || typeof outcomes !== "object") {
    return false;
  }
  const values = Object.values(outcomes);
  if (values.length === 0) {
    return false;
  }
  return values.every((outcome) => outcome === "draw");
}

export { isDrawForAll };
