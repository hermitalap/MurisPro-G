<template>
  <n-modal
    :show="show"
    @update:show="v => $emit('update:show', v)"
    preset="card"
    style="width: 95%; max-width: 1000px;"
    title="批量基因型鉴定"
    :mask-closable="false"
    closable
  >
    <template v-if="litter && cage">
      <!-- 亲本信息 -->
      <div class="parents-block">
        <div class="parents-title">亲本信息</div>
        <n-space :size="16">
          <div v-for="p in parentSummaries" :key="p.tid" class="parent-chip">
            <AppIcon :name="p.sex === 'M' ? 'male' : 'female'" :size="14" />
            <span class="pid">{{ p.id }}</span>
            <span class="pgeno" v-html="p.genotype || '—'" />
          </div>
          <n-tag type="info" size="small" :bordered="false">
            DOB {{ litter.birth_date }} · 共 {{ pendingRows.length }} 只待鉴定
          </n-tag>
        </n-space>
      </div>

      <!-- 批量动作 -->
      <div class="bulk-actions">
        <n-space align="center" :size="10">
          <span style="font-size: 12px; color: var(--n-text-color-3);">批量设为：</span>
          <template v-for="locus in lociInPlay" :key="locus.symbol">
            <span class="bulk-locus">{{ locus.symbol }}</span>
            <n-select
              :value="bulkPick[locus.symbol] || null"
              :options="optionsForLocus(locus.symbol)"
              :render-label="renderOptionLabel"
              placeholder="选择组合"
              size="small"
              clearable
              style="width: 220px;"
              @update:value="v => (bulkPick[locus.symbol] = v)"
            />
          </template>
          <n-button size="small" type="primary" ghost :disabled="!canApplyBulk" @click="applyBulk">
            应用到所有
          </n-button>
          <n-button size="small" type="warning" ghost :disabled="!hasTargetSet" @click="cullNonTarget">
            非目标全部勾淘汰
          </n-button>
        </n-space>
      </div>

      <!-- 仔鼠表格 -->
      <n-data-table
        :columns="columns"
        :data="pendingRows"
        :bordered="true"
        :max-height="420"
        size="small"
      />
    </template>

    <template #footer>
      <n-space justify="end">
        <n-button @click="$emit('update:show', false)">取消</n-button>
        <n-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="onSubmit">
          提交鉴定
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup>
import { computed, h, reactive, ref, watch } from 'vue'
import {
  NModal, NSelect, NSpace, NButton, NTag, NCheckbox, NDataTable, useMessage
} from 'naive-ui'
import AppIcon from '@/components/AppIcon.vue'
import { useBreedingStore, useGeneStore } from '@/stores'
import { predictOffspringGenotypes, isPredicted } from '@/utils/mendelianPredictor'

const props = defineProps({
  show: { type: Boolean, default: false },
  cage: { type: Object, default: null },
  litter: { type: Object, default: null }
})
const emit = defineEmits(['update:show', 'submitted'])

const breedingStore = useBreedingStore()
const geneStore = useGeneStore()
const message = useMessage()
const submitting = ref(false)

// 待鉴定仔鼠行（本地可编辑副本）
const rows = ref([])
const bulkPick = reactive({})

function buildRow(m) {
  return {
    tid: m.tid,
    id: m.id,
    sex: m.sex,
    toe_mark: m.toe_mark,
    // 以位点为键的 {allele1, allele2}
    genotypes: {},
    cull: false
  }
}

// 亲本小鼠
const parentSummaries = computed(() => {
  if (!props.litter) return []
  const pups = props.litter.mice || []
  const first = pups[0]
  if (!first) return []
  const fathers = (first.father || []).map(tid => geneStore.mice.find(x => x.tid === tid)).filter(Boolean)
  const mothers = (first.mother || []).map(tid => geneStore.mice.find(x => x.tid === tid)).filter(Boolean)
  return [...fathers, ...mothers].map(m => ({
    tid: m.tid,
    id: m.id,
    sex: m.sex,
    genotype: m.genotype?.symbol
  }))
})

function getParentGeneEntities(sex) {
  if (!props.litter) return []
  const first = props.litter.mice?.[0]
  if (!first) return []
  const ids = sex === 'M' ? first.father || [] : first.mother || []
  const parents = ids.map(tid => geneStore.mice.find(x => x.tid === tid)).filter(Boolean)
  // 合并每位点（多父/多母场景：简化为取第一个）
  return parents[0]?.genotype?.geneEntity || []
}

// 孟德尔预测
const predictions = computed(() => {
  const fGenes = getParentGeneEntities('M')
  const mGenes = getParentGeneEntities('F')
  return predictOffspringGenotypes(fGenes, mGenes)
})

// 本窝需鉴定的全部位点
const lociInPlay = computed(() => {
  const symbols = new Set()
  getParentGeneEntities('M').forEach(g => symbols.add(g.locus))
  getParentGeneEntities('F').forEach(g => symbols.add(g.locus))
  // 兼容：若亲本缺，退化为使用全部位点
  if (!symbols.size) {
    return geneStore.genotypes.filter(g => g.symbol !== 'WT')
  }
  return geneStore.genotypes.filter(g => symbols.has(g.symbol))
})

const pendingRows = computed(() => rows.value)

function optionsForLocus(locusSymbol) {
  const locus = geneStore.genotypes.find(g => g.symbol === locusSymbol)
  if (!locus) return []
  const alleles = locus.alleles
  const predicted = predictions.value[locusSymbol] || []
  const seen = new Set()
  const opts = []
  for (const a1 of alleles) {
    for (const a2 of alleles) {
      const [lo, hi] = [a1.id, a2.id].sort((x, y) => x - y)
      const key = `${lo}-${hi}`
      if (seen.has(key)) continue
      seen.add(key)
      const s1 = alleles.find(x => x.id === lo).symbol
      const s2 = alleles.find(x => x.id === hi).symbol
      const predictedFlag = predicted.some(p => p.key === key)
      opts.push({
        label: `${s1}/${s2}`,
        value: key,
        allele1: lo,
        allele2: hi,
        predicted: predictedFlag
      })
    }
  }
  // 推断组合排前面
  opts.sort((a, b) => (b.predicted ? 1 : 0) - (a.predicted ? 1 : 0))
  return opts
}

function renderOptionLabel(option) {
  return h(
    'div',
    { style: 'display:flex;align-items:center;gap:6px;' },
    [
      h('span', {}, option.label),
      option.predicted
        ? h(NTag, { type: 'success', size: 'small', bordered: false }, { default: () => '可能' })
        : null
    ]
  )
}

const columns = computed(() => {
  const cols = [
    { title: 'ID', key: 'id', width: 120 },
    {
      title: '性别',
      key: 'sex',
      width: 80,
      render: (row) => (row.sex === 'M' ? '♂' : row.sex === 'F' ? '♀' : '—')
    }
  ]
  if (pendingRows.value.some(r => r.toe_mark)) {
    cols.push({ title: '脚趾号', key: 'toe_mark', width: 90 })
  }
  for (const locus of lociInPlay.value) {
    cols.push({
      title: locus.symbol,
      key: `gene_${locus.symbol}`,
      render: (row) => {
        const current = row.genotypes[locus.symbol]
        const val = current ? `${Math.min(current.allele1, current.allele2)}-${Math.max(current.allele1, current.allele2)}` : null
        return h(NSelect, {
          value: val,
          size: 'small',
          options: optionsForLocus(locus.symbol),
          renderLabel: renderOptionLabel,
          placeholder: '选择',
          clearable: true,
          'onUpdate:value': (v, opt) => {
            if (!v) {
              delete row.genotypes[locus.symbol]
            } else {
              row.genotypes[locus.symbol] = { allele1: opt.allele1, allele2: opt.allele2 }
            }
          }
        })
      }
    })
  }
  cols.push({
    title: '淘汰',
    key: 'cull',
    width: 70,
    align: 'center',
    render: (row) =>
      h(NCheckbox, {
        checked: row.cull,
        'onUpdate:checked': v => (row.cull = v)
      })
  })
  return cols
})

const hasTargetSet = computed(() =>
  lociInPlay.value.some(l => bulkPick[l.symbol])
)
const canApplyBulk = computed(() => hasTargetSet.value && rows.value.length > 0)
const canSubmit = computed(() => rows.value.length > 0)

function applyBulk() {
  for (const row of rows.value) {
    for (const locus of lociInPlay.value) {
      const pick = bulkPick[locus.symbol]
      if (!pick) continue
      const [a1, a2] = pick.split('-').map(Number)
      row.genotypes[locus.symbol] = { allele1: a1, allele2: a2 }
    }
  }
  // 强制触发表格刷新
  rows.value = [...rows.value]
}

function cullNonTarget() {
  for (const row of rows.value) {
    const matchesAll = lociInPlay.value.every(locus => {
      const target = bulkPick[locus.symbol]
      if (!target) return true
      const cur = row.genotypes[locus.symbol]
      if (!cur) return false
      const key = `${Math.min(cur.allele1, cur.allele2)}-${Math.max(cur.allele1, cur.allele2)}`
      return key === target
    })
    row.cull = !matchesAll
  }
  rows.value = [...rows.value]
}

watch(
  () => [props.show, props.litter],
  () => {
    if (!props.show || !props.litter) {
      rows.value = []
      return
    }
    const pending = (props.litter.mice || []).filter(
      m => m.genotype_confirmed === false && m.live_status === 1
    )
    rows.value = pending.map(buildRow)
    // 清空批量选择
    for (const key of Object.keys(bulkPick)) delete bulkPick[key]
  },
  { immediate: true }
)

async function onSubmit() {
  submitting.value = true
  try {
    const items = rows.value.map(r => ({
      tid: r.tid,
      cull: !!r.cull,
      genotypes: Object.entries(r.genotypes).map(([locus, g]) => ({
        locus,
        allele1: g.allele1,
        allele2: g.allele2
      }))
    }))
    const result = await breedingStore.batchGenotype(items)
    emit('submitted', result)
  } catch (e) {
    message.error('提交失败: ' + (e.response?.data?.error || e.message))
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.parents-block {
  padding: 10px 12px;
  background: var(--n-color-embedded, rgba(0, 0, 0, 0.03));
  border-radius: 6px;
  margin-bottom: 10px;
}
.parents-title {
  font-size: 12px;
  color: var(--n-text-color-3);
  margin-bottom: 6px;
}
.parent-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 14px;
  background: var(--n-card-color);
  border: 1px solid var(--n-border-color);
  font-size: 12px;
}
.pid { font-weight: 600; }
.pgeno :deep(sup) { font-size: 0.75em; }

.bulk-actions {
  padding: 8px 0;
}
.bulk-locus {
  font-size: 12px;
  font-weight: 600;
  margin-right: 2px;
}
</style>
