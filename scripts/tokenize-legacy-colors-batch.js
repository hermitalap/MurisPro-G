const fs = require('fs')
const path = require('path')

const files = [
  'src/views/MiceView.vue',
  'src/views/BodyWeight.vue',
  'src/views/Survival.vue',
  'src/views/WeightView.vue',
  'src/views/DashBoard.vue',
  'src/views/MouseDetailView.vue',
  'src/views/InfoView.vue'
]

const replacements = [
  ['#ffffff', 'var(--n-color)'],
  ['#fff', 'var(--n-color)'],
  ['#f8f9fa', 'var(--n-color-embedded)'],
  ['#f9f9f9', 'var(--n-color-embedded)'],
  ['#f9fafb', 'var(--n-color-embedded)'],
  ['#f8fafc', 'var(--n-color-embedded)'],
  ['#f5f7fa', 'var(--n-hover-color)'],
  ['#f1f5f9', 'var(--n-border-color)'],
  ['#f0f0f0', 'var(--n-color-embedded)'],
  ['#eaeaea', 'var(--n-border-color)'],
  ['#e9ecef', 'var(--n-color-embedded)'],
  ['#e2e8f0', 'var(--n-border-color)'],
  ['#dee2e6', 'var(--n-border-color)'],
  ['#dcdfe6', 'var(--n-border-color)'],
  ['#d1ecf1', 'var(--n-info-color-suppl)'],
  ['#d4e6f1', 'var(--n-info-color-suppl)'],
  ['#ced4da', 'var(--n-border-color)'],
  ['#cbd5e0', 'var(--n-border-color)'],
  ['#c0c4cc', 'var(--n-text-color-disabled)'],
  ['#adb5bd', 'var(--n-text-color-3)'],
  ['#a0aec0', 'var(--n-text-color-disabled)'],
  ['#999', 'var(--n-text-color-3)'],
  ['#777', 'var(--n-text-color-3)'],
  ['#6c757d', 'var(--n-text-color-3)'],
  ['#606266', 'var(--n-text-color-2)'],
  ['#555', 'var(--n-text-color-2)'],
  ['#4a5568', 'var(--n-text-color-2)'],
  ['#495057', 'var(--n-text-color-2)'],
  ['#333', 'var(--n-text-color-1)'],
  ['#2d3748', 'var(--n-text-color-1)'],
  ['#2c3e50', 'var(--n-text-color-1)'],
  ['#4a9bff', 'var(--n-primary-color)'],
  ['#3a8beb', 'var(--n-primary-color-hover)'],
  ['#3367d6', 'var(--n-primary-color-hover)'],
  ['#4285f4', 'var(--n-primary-color)'],
  ['#3498db', 'var(--n-primary-color)'],
  ['#1890ff', 'var(--n-primary-color)'],
  ['#91d5ff', 'var(--n-info-color-suppl)'],
  ['#e6f7ff', 'var(--n-info-color-suppl)'],
  ['#dc3545', 'var(--n-error-color)'],
  ['#f56c6c', 'var(--n-error-color)'],
  ['#ff4d4f', 'var(--n-error-color)'],
  ['#f5222d', 'var(--n-error-color)'],
  ['#52c41a', 'var(--n-success-color)'],
  ['#34a853', 'var(--n-success-color)'],
  ['#ea4335', 'var(--n-error-color)'],
  ['#9c27b0', 'var(--n-info-color)'],
  ['#667eea', 'var(--n-primary-color)'],
  ['#5a67d8', 'var(--n-primary-color-hover)'],
  ['#764ba2', 'var(--n-info-color)'],
  ['#6b46c1', 'var(--n-info-color-hover)'],
  ['#1a2a6c', 'var(--n-text-color-1)'],
  ['#feb2b2', 'var(--n-error-color-suppl)'],
  ['rgba(0, 0, 0, 0.5)', 'color-mix(in srgb, var(--n-text-color) 50%, transparent)'],
  ['rgba(0, 0, 0, 0.6)', 'color-mix(in srgb, var(--n-text-color) 60%, transparent)'],
  ['rgba(0,0,0,0.1)', 'color-mix(in srgb, var(--n-text-color) 10%, transparent)'],
  ['rgba(0,0,0,0.15)', 'color-mix(in srgb, var(--n-text-color) 15%, transparent)'],
  ['rgba(0, 0, 0, 0.2)', 'color-mix(in srgb, var(--n-text-color) 20%, transparent)'],
  ['rgba(255, 255, 255, 0.8)', 'color-mix(in srgb, var(--n-color) 80%, transparent)'],
  ['rgba(255, 255, 255, 0.9)', 'color-mix(in srgb, var(--n-color) 90%, transparent)'],
  ['rgba(0,0,0,0.05)', 'color-mix(in srgb, var(--n-text-color) 5%, transparent)'],
  ['rgba(66, 133, 244, 0.1)', 'color-mix(in srgb, var(--n-primary-color) 10%, transparent)']
]

for (const file of files) {
  const p = path.join(process.cwd(), file)
  if (!fs.existsSync(p)) continue
  let c = fs.readFileSync(p, 'utf8')
  for (const [from, to] of replacements) {
    c = c.split(from).join(to)
  }
  fs.writeFileSync(p, c, 'utf8')
  console.log('tokenized', file)
}
