export function pairKey(a, b) {
  if (a == null || b == null) return null
  const [lo, hi] = [a, b].sort((x, y) => x - y)
  return `${lo}-${hi}`
}
