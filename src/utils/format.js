import { h } from 'vue'

/**
 * 格式化日期字符串为 YYYY-MM-DD 格式
 * @param {string|null} dateString
 * @returns {string}
 */
export function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

/**
 * 格式化文件大小为人类可读格式
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '未知'
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 将日期值标准化为 yyyy-MM-dd 格式字符串
 * 验证字符串是否符合日期格式，不符合则返回 null
 * @param {string|null} value
 * @returns {string|null}
 */
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/
export function normalizeDateValue(value) {
  if (typeof value !== 'string') return null
  return DATE_ONLY_REGEX.test(value) ? value : null
}

/**
 * 渲染空值占位符
 * @param {*} value
 * @returns {import('vue').VNode|string}
 */
export function renderEmpty(value) {
  return value != null && value !== '' ? String(value) : '-'
}
