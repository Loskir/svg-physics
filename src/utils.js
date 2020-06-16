

export function roundWithPrecision(v) {
  return v ? v.toFixed && v.toFixed(2) : '0.00';
}

export function getDistanceBetweenPoints(a, b) {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

export function getVectorsScalarMul(a, b) {
  return a.x * b.x + a.y * b.y;
}

export function getVectorLength(a) {
  return getDistanceBetweenPoints(a.begin, a.end);
}

export function getVectorsCosine(a, b) {
  return getVectorsScalarMul(a, b) / (getVectorLength(a) * getVectorLength(b));
}
