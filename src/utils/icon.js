import { h } from 'vue'
import { NIcon } from 'naive-ui'

/**
 * 创建图标渲染函数，用于 Naive UI 组件的 icon / render-icon prop
 * @param {import('@vicons/ionicons5').Component} icon - 从 @vicons/ionicons5 按需导入的图标组件对象
 * @returns {() => import('vue').VNode} 返回 VNode 渲染函数
 *
 * @example
 * import { renderIcon } from '@/utils/icon'
 * import { SettingsOutline } from '@vicons/ionicons5'
 *
 * const menuOptions = [{ label: '设置', key: 'settings', icon: renderIcon(SettingsOutline) }]
 */
export const renderIcon = (icon) => {
  return () => h(NIcon, null, { default: () => h(icon) })
}
