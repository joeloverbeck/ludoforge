function safeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function average(values) {
  if (!values.length) {
    return 0;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function computePearsonCorrelation(valuesA, valuesB) {
  if (!Array.isArray(valuesA) || !Array.isArray(valuesB)) {
    return null;
  }
  if (valuesA.length < 2 || valuesA.length !== valuesB.length) {
    return null;
  }
  const count = valuesA.length;
  const meanA = average(valuesA);
  const meanB = average(valuesB);
  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let index = 0; index < count; index += 1) {
    const deltaA = valuesA[index] - meanA;
    const deltaB = valuesB[index] - meanB;
    cov += deltaA * deltaB;
    varA += deltaA * deltaA;
    varB += deltaB * deltaB;
  }
  const denom = Math.sqrt(varA * varB);
  if (!Number.isFinite(denom) || denom <= 0) {
    return null;
  }
  const correlation = cov / denom;
  return Number.isFinite(correlation) ? correlation : null;
}

export { safeNumber, average, computePearsonCorrelation };
