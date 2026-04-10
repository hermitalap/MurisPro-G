/**
 * 模糊搜索并排序（前缀匹配优先 > 包含匹配按位置排序）
 * 用于替换 father/mother/cage 三处完全相同的搜索排序逻辑
 *
 * @param {Array} items - 待搜索数组
 * @param {string} query - 搜索关键词
 * @param {string|function} key - 提取比较字段的键名或函数
 * @param {number} [limit=10] - 最大返回数量
 * @returns {Array} 排序后的结果
 */
export function fuzzySearch(items, query, key, limit = 10) {
  if (!query || query.length < 1) return []

  const lowerQuery = query.toLowerCase()
  const getKey = typeof key === 'function' ? key : (item) => item[key]

  const filtered = items.filter(item => {
    const val = getKey(item)
    return val && val.toLowerCase().includes(lowerQuery)
  })

  filtered.sort((a, b) => {
    const aVal = getKey(a).toLowerCase()
    const bVal = getKey(b).toLowerCase()
    const aStartsWith = aVal.startsWith(lowerQuery)
    const bStartsWith = bVal.startsWith(lowerQuery)

    if (aStartsWith && !bStartsWith) return -1
    if (!aStartsWith && bStartsWith) return 1

    if (aStartsWith && bStartsWith) {
      return aVal.length - bVal.length
    }

    const aIndex = aVal.indexOf(lowerQuery)
    const bIndex = bVal.indexOf(lowerQuery)
    return aIndex - bIndex
  })

  return filtered.slice(0, limit)
}
