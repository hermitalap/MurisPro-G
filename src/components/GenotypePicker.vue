<template>
  <div class="genotype-picker" :class="{ compact }">
    <!-- 位点选择 -->
    <n-select
      :value="modelValue?.locus || null"
      :options="locusOpts"
      :placeholder="locusPlaceholder"
      size="small"
      :disabled="disabled || lockLocus"
      clearable
      style="min-width: 140px;"
      @update:value="onLocusChange"
    />

    <!-- 预设组合 chips -->
    <div class="preset-row" v-if="currentLocus">
      <n-tag
        v-for="p in presets"
        :key="p.key"
        :type="activeKey === p.key ? tagTypeFor(p.kind) : 'default'"
        :bordered="activeKey !== p.key"
        size="small"
        class="preset-chip"
        :title="p.label"
        @click="applyPreset(p)"
      >
        {{ p.tag }}
      </n-tag>
      <n-button
        size="tiny"
        quaternary
        :type="advanced ? 'primary' : 'default'"
        @click="advanced = !advanced"
      >
        <template #icon><n-icon><OptionsOutline /></n-icon></template>
        自定义
      </n-button>
    </div>

    <!-- 自定义双 allele 下拉 -->
    <div class="advanced-row" v-if="advanced && currentLocus">
      <n-select
        :value="modelValue?.allele1 || null"
        :options="alleleOpts"
        size="small"
        placeholder="等位 1"
        style="width: 120px;"
        :disabled="disabled"
        @update:value="v => onAlleleChange('allele1', v)"
      />
      <span class="slash">/</span>
      <n-select
        :value="modelValue?.allele2 || null"
        :options="alleleOpts"
        size="small"
        placeholder="等位 2"
        style="width: 120px;"
        :disabled="disabled"
        @update:value="v => onAlleleChange('allele2', v)"
      />
    </div>

    <!-- 预览 -->
    <div v-if="!compact && modelValue?.locus && modelValue?.allele1 && modelValue?.allele2" class="preview-inline">
      = <GenotypeLabel :symbol="previewSym" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { NSelect, NTag, NButton, NIcon } from 'naive-ui'
import { OptionsOutline } from '@vicons/ionicons5'
import GenotypeLabel from '@/components/GenotypeLabel.vue'
import { generatePresets, detectLocusKind } from '@/utils/genotypePresets'

const props = defineProps({
  modelValue: { type: Object, default: () => null }, // { locus, allele1, allele2 }
  genotypes: { type: Array, required: true }, // geneStore.genotypes
  lockLocus: { type: Boolean, default: false },
  excludeLoci: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
  locusPlaceholder: { type: String, default: '选择位点' }
})
const emit = defineEmits(['update:modelValue'])

const advanced = ref(false)

const currentLocus = computed(() =>
  props.genotypes.find(g => g.symbol === props.modelValue?.locus) || null
)

const locusOpts = computed(() => {
  const excl = new Set(props.excludeLoci)
  return props.genotypes
    .filter(g => g.symbol !== 'WT')
    .map(g => ({
      label: `${g.symbol}  ·  ${kindLabel(detectLocusKind(g))}`,
      value: g.symbol,
      disabled: excl.has(g.symbol) && props.modelValue?.locus !== g.symbol
    }))
})

const alleleOpts = computed(() =>
  (currentLocus.value?.alleles || []).map(a => ({ label: a.symbol, value: a.id }))
)

const presets = computed(() =>
  currentLocus.value ? generatePresets(currentLocus.value) : []
)

const activeKey = computed(() => {
  const v = props.modelValue
  if (!v?.allele1 || !v?.allele2) return null
  const [lo, hi] = [v.allele1, v.allele2].sort((a, b) => a - b)
  return `${lo}-${hi}`
})

const previewSym = computed(() => {
  const v = props.modelValue
  if (!v?.locus || !v?.allele1 || !v?.allele2) return ''
  const locus = currentLocus.value
  if (!locus) return v.locus
  const s1 = locus.alleles.find(a => a.id === v.allele1)?.symbol
  const s2 = locus.alleles.find(a => a.id === v.allele2)?.symbol
  if (!s1 || !s2) return v.locus
  const sorted = [s1, s2].sort()
  return `${v.locus}<sup>${sorted[0]}/${sorted[1]}</sup>`
})

function kindLabel(k) {
  return {
    global_ko: '全敲除',
    cko_flox: 'Flox',
    cre_driver: 'Cre driver',
    point_mut: '点突变',
    custom: '自定义'
  }[k] || k
}

function tagTypeFor(kind) {
  return {
    wt: 'default',
    het: 'warning',
    homo_ko: 'error',
    het_ko: 'warning',
    flox_homo: 'success',
    flox_het: 'info',
    flox_null: 'warning',
    cre_hemi: 'primary',
    cre_homo: 'error',
    no_cre: 'default'
  }[kind] || 'default'
}

function emitVal(next) {
  emit('update:modelValue', next)
}

function onLocusChange(v) {
  if (!v) {
    emitVal(null)
    return
  }
  const locus = props.genotypes.find(g => g.symbol === v)
  // 若单等位（极罕见），自动填充
  if (locus && locus.alleles.length === 1) {
    const only = locus.alleles[0].id
    emitVal({ locus: v, allele1: only, allele2: only })
    return
  }
  // 尝试默认用第一个预设
  const ps = generatePresets(locus)
  if (ps.length) {
    emitVal({ locus: v, allele1: ps[0].allele1, allele2: ps[0].allele2 })
  } else {
    emitVal({ locus: v, allele1: null, allele2: null })
  }
}

function applyPreset(p) {
  emitVal({
    locus: props.modelValue?.locus || currentLocus.value?.symbol,
    allele1: p.allele1,
    allele2: p.allele2
  })
}

function onAlleleChange(field, v) {
  const next = { ...(props.modelValue || {}) }
  next[field] = v
  emitVal(next)
}

// 切换位点时若是高级视图，保留 advanced
watch(() => props.modelValue?.locus, (newL, oldL) => {
  if (newL !== oldL) advanced.value = false
})
</script>

<style scoped>
.genotype-picker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.genotype-picker.compact { gap: 4px; }
.preset-row {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}
.preset-chip {
  cursor: pointer;
  user-select: none;
}
.advanced-row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.slash {
  color: var(--n-text-color-3);
  font-weight: 600;
}
.preview-inline {
  font-size: 13px;
  color: var(--n-text-color-2);
  margin-left: 4px;
}
</style>
