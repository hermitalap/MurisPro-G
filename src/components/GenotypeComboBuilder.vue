<template>
  <div class="combo-builder">
    <!-- 头部：综合预览 + 操作 -->
    <div class="combo-head">
      <div class="combo-preview">
        <span class="combo-preview-label">综合：</span>
        <GenotypeLabel :symbol="fullSymbol" v-if="fullSymbol" />
        <span v-else class="combo-empty-text">暂未选择</span>
      </div>
      <n-space :size="6">
        <n-button
          v-if="enableWildtype"
          size="small"
          quaternary
          :type="isWildtype ? 'primary' : 'default'"
          @click="toggleWildtype"
        >
          <template #icon><n-icon><LeafOutline /></n-icon></template>
          {{ isWildtype ? '取消野生型' : '设为 WT' }}
        </n-button>
        <n-button
          size="small"
          type="primary"
          ghost
          :disabled="!canAddLocus"
          @click="addLocus"
        >
          <template #icon><n-icon><AddOutline /></n-icon></template>
          添加位点
        </n-button>
        <n-button
          v-if="modelValue.length > 0"
          size="small"
          type="error"
          quaternary
          @click="clearAll"
        >
          <template #icon><n-icon><TrashOutline /></n-icon></template>
          全部清空
        </n-button>
      </n-space>
    </div>

    <!-- 位点行 -->
    <n-empty v-if="!modelValue.length" description="暂未选择基因位点" size="small" />
    <div v-else class="locus-rows">
      <div v-for="(g, idx) in modelValue" :key="idx" class="locus-row">
        <div class="locus-idx">{{ idx + 1 }}</div>
        <GenotypePicker
          :model-value="pickerValueOf(g)"
          :genotypes="genotypes"
          :exclude-loci="otherLoci(idx)"
          @update:model-value="v => updateRow(idx, v)"
        />
        <n-button
          quaternary
          circle
          size="small"
          class="row-remove"
          @click="removeRow(idx)"
        >
          <template #icon><n-icon><CloseOutline /></n-icon></template>
        </n-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { NButton, NSpace, NIcon, NEmpty } from 'naive-ui'
import { AddOutline, CloseOutline, LeafOutline, TrashOutline } from '@vicons/ionicons5'
import GenotypePicker from '@/components/GenotypePicker.vue'
import GenotypeLabel from '@/components/GenotypeLabel.vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] }, // [{locus, allele1, allele2}]
  genotypes: { type: Array, required: true },
  enableWildtype: { type: Boolean, default: true }
})
const emit = defineEmits(['update:modelValue'])

const isWildtype = computed(() =>
  props.modelValue.length === 1 && props.modelValue[0].locus === 'WT'
)

const canAddLocus = computed(() => {
  if (isWildtype.value) return false
  const pool = props.genotypes.filter(g => g.symbol !== 'WT').length
  return props.modelValue.length < pool
})

function pickerValueOf(g) {
  if (!g) return null
  if (g.locus === 'WT') return { locus: 'WT', allele1: null, allele2: null }
  return { locus: g.locus, allele1: g.allele1, allele2: g.allele2 }
}

function otherLoci(idx) {
  return props.modelValue.map((g, i) => (i !== idx ? g.locus : null)).filter(Boolean)
}

function emitNext(arr) {
  emit('update:modelValue', arr)
}

function updateRow(idx, v) {
  const next = [...props.modelValue]
  if (!v) {
    next[idx] = { locus: '', allele1: null, allele2: null }
  } else {
    next[idx] = { locus: v.locus || '', allele1: v.allele1 ?? null, allele2: v.allele2 ?? null }
  }
  emitNext(next)
}

function addLocus() {
  if (isWildtype.value) emitNext([])
  emitNext([...props.modelValue, { locus: '', allele1: null, allele2: null }])
}

function removeRow(idx) {
  const next = [...props.modelValue]
  next.splice(idx, 1)
  emitNext(next)
}

function clearAll() {
  emitNext([])
}

function toggleWildtype() {
  if (isWildtype.value) {
    emitNext([])
  } else {
    emitNext([{ locus: 'WT', allele1: null, allele2: null }])
  }
}

const fullSymbol = computed(() => {
  if (isWildtype.value) return 'WT'
  const parts = []
  for (const g of props.modelValue) {
    if (!g.locus) continue
    if (g.locus === 'WT') { parts.push('WT'); continue }
    if (!g.allele1 || !g.allele2) continue
    const locus = props.genotypes.find(x => x.symbol === g.locus)
    if (!locus) continue
    const s1 = locus.alleles.find(a => a.id === g.allele1)?.symbol || '?'
    const s2 = locus.alleles.find(a => a.id === g.allele2)?.symbol || '?'
    const sorted = [s1, s2].sort()
    parts.push(`${g.locus}<sup>${sorted[0]}/${sorted[1]}</sup>`)
  }
  return parts.join('; ')
})
</script>

<style scoped>
.combo-builder {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.combo-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px 10px;
  background: var(--n-color-embedded, rgba(0, 0, 0, 0.025));
  border-radius: 6px;
}
.combo-preview {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}
.combo-preview-label {
  font-size: 12px;
  color: var(--n-text-color-3);
}
.combo-empty-text {
  color: var(--n-text-color-3);
  font-size: 12px;
}
.locus-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.locus-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
}
.locus-idx {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--n-text-color-3);
  color: #fff;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.row-remove { margin-left: auto; }
</style>
