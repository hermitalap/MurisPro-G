/**
 * 新生仔 ID 生成策略
 *
 * - 耳标（ear_tag）：首位大写字母 + 3 位零填充数字，示例 A001 / A002
 * - 剪趾（toe_clip）：{cage_id}-{YYYYMMDD}-{toe_mark}，示例 B03-20260417-25
 */

/**
 * 在 existingIds 中查找同前缀的最大编号，并返回下一个可用编号
 * @param {string} prefix 单个大写字母
 * @param {Array<string>} existingIds 库中所有现有 ID 列表
 * @returns {number} 下一个号码（至少 1）
 */
export function nextEarTagNumber(prefix, existingIds = []) {
  if (!prefix) return 1
  const upper = prefix.toUpperCase()
  const re = new RegExp(`^${upper}(\\d+)$`)
  let max = 0
  for (const id of existingIds) {
    if (!id) continue
    const m = String(id).match(re)
    if (m) {
      const n = parseInt(m[1], 10)
      if (!Number.isNaN(n) && n > max) max = n
    }
  }
  return max + 1
}

/**
 * 生成一批耳标 ID（不校验重复，由上层确保 prefix/起始号正确）
 */
export function buildEarTagIds(prefix, startNumber, count) {
  const upper = (prefix || '').toUpperCase()
  const ids = []
  for (let i = 0; i < count; i++) {
    const n = startNumber + i
    ids.push(`${upper}${String(n).padStart(3, '0')}`)
  }
  return ids
}

/**
 * 剪趾策略 ID 拼接
 * @param {string} cageDisplayId 笼位卡上的编号（Cage.cage_id）
 * @param {string} dob 'YYYY-MM-DD'
 * @param {string} toeMark 脚趾号
 */
export function buildToeClipId(cageDisplayId, dob, toeMark) {
  const datePart = (dob || '').replaceAll('-', '')
  return `${cageDisplayId || ''}-${datePart}-${toeMark || ''}`
}

/**
 * 剪趾策略 ID 前缀（只读部分）
 */
export function toeClipPrefix(cageDisplayId, dob) {
  const datePart = (dob || '').replaceAll('-', '')
  return `${cageDisplayId || ''}-${datePart}-`
}
