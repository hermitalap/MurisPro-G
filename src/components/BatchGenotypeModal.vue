<template>
  <n-modal
    :show="show"
    @update:show="v => $emit('update:show', v)"
    preset="card"
    style="width: 95%; max-width: 1100px;"
    title="批量基因型鉴定"
    :mask-closable="false"
    closable
  >
    <template v-if="litter && cage">
      <!-- 亲本信息 -->
      <div class="parents-block">
        <div class="parents-title">
          <n-icon :size="14"><GitNetworkOutline /></n-icon>
          亲本信息
        </div>
        <n-space :size="10" wrap>
          <n-tag v-for="p in parentSummaries" :key="p.tid" size="small" :bordered="false" :type="p.sex === 'M' ? 'info' : 'error'">
            <template #icon>
              <n-icon :size="14">
                <MaleOutline v-if="p.sex === 'M'" />
                <FemaleOutline v-else />
              </n-icon>
            </template>
            {{ p.id }} · <GenotypeLabel :symbol="p.genotype" />
          </n-tag>
          <n-tag type="info" size="small" :bordered="false">
            DOB {{ litter.birth_date }} · 共 {{ pendingRows.length }} 只待鉴定
          </n-tag>
        </n-space>
      </div>

      <!-- 命中计划摘要 -->
      <div class="plans-hint" v-if="relevantPlans.length">
        <n-icon :size="14"><FlagOutline /></n-icon>
        <span class="plans-hint-label">关联计划：</span>
        <n-tag
          v-for="plan in relevantPlans"
          :key="plan.id"
          size="small"
          type="success"
          :bordered="false"
          class="plan-chip"
          :title="plan.name"
        >
          {{ plan.name }}
        </n-tag>
      </div>

      <!-- 批量动作 -->
      <div class="bulk-actions">
        <n-space align="center" :size="12" wrap style="flex:1;">
          <span class="bulk-title">快速批量应用：</span>
          <template v-for="locus in lociInPlay" :key="locus.symbol">
            <span class="bulk-locus-label">{{ locus.symbol }}</span>
            <GenotypePicker
              :model-value="bulkValue(locus.symbol)"
              :genotypes="[locus]"
              :lock-locus="true"
              compact
              @update:model-value="v => setBulk(locus.symbol, v)"
            />
          </template>
          <n-button
            size="small"
            type="primary"
            ghost
            :disabled="!canApplyBulk"
            @click="applyBulk"
          >
            <template #icon><n-icon><CopyOutline /></n-icon></template>
            应用到全部仔鼠
          </n-button>
          <n-button size="small" type="warning" ghost :disabled="!hasTargetSet" @click="cullNonTarget">
            <template #icon><n-icon><CutOutline /></n-icon></template>
            非目标勾淘汰
          </n-button>
        </n-space>
        <n-button
          size="small"
          :type="editMode ? 'primary' : 'default'"
          :secondary="editMode"
          @click="editMode = !editMode"
        >
          <template #icon><n-icon><CreateOutline /></n-icon></template>
          编辑
        </n-button>
      </div>

      <!-- 仔鼠表格 -->
      <n-data-table
        :columns="columns"
        :data="pendingRows"
        :bordered="true"
        :max-height="440"
        size="small"
        :row-class-name="rowClass"
      />

      <!-- 底部统计 -->
      <div class="stats-row">
        <span class="stat-item">
          <n-icon :size="14"><CheckmarkDoneOutline /></n-icon>
          已录入：<strong>{{ filledCount }}</strong> / {{ pendingRows.length }}
        </span>
        <span class="stat-item" v-if="impossibleCount > 0">
          <n-icon :size="14" color="#d03050"><WarningOutline /></n-icon>
          <span class="warn-text">非预测组合 {{ impossibleCount }} 行</span>
        </span>
        <span class="stat-item" v-if="cullCount > 0">
          <n-icon :size="14"><TrashOutline /></n-icon>
          待淘汰 {{ cullCount }} 只
        </span>
        <span class="stat-item" v-for="p in planHitStats" :key="p.id">
          <n-icon :size="14" color="#18a058"><FlagOutline /></n-icon>
          命中「{{ p.name }}」{{ p.count }} 只
        </span>
      </div>
    </template>

    <template #footer>
      <n-space justify="end">
        <n-button @click="$emit('update:show', false)">取消</n-button>
        <n-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="onSubmit">
          <template #icon><n-icon><SaveOutline /></n-icon></template>
          提交鉴定
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup>
import { computed, h, reactive, ref, watch } from 'vue'
import {
  NModal, NSpace, NButton, NTag, NCheckbox, NDataTable, NIcon, NInput, useMessage
} from 'naive-ui'
import {
  MaleOutline, FemaleOutline, GitNetworkOutline, FlagOutline,
  CopyOutline, CutOutline, CheckmarkDoneOutline, WarningOutline,
  TrashOutline, SaveOutline, CreateOutline
} from '@vicons/ionicons5'
import GenotypeLabel from '@/components/GenotypeLabel.vue'
import GenotypePicker from '@/components/GenotypePicker.vue'
import { useBreedingStore, useGeneStore, useBreedingPlanStore } from '@/stores'
import { predictOffspringGenotypes } from '@/utils/mendelianPredictor'
import { matchesTargets } from '@/utils/pedigree'
import { pairKey } from '@/utils/allele'

const props = defineProps({
  show: { type: Boolean, default: false },
  cage: { type: Object, default: null },
  litter: { type: Object, default: null }
})
const emit = defineEmits(['update:show', 'submitted'])

const breedingStore = useBreedingStore()
const geneStore = useGeneStore()
const planStore = useBreedingPlanStore()
const message = useMessage()
const submitting = ref(false)
const editMode = ref(false)

// 可编辑副本
const rows = ref([])
/** bulkPick: { [locusSymbol]: {locus, allele1, allele2} } */
const bulkPick = reactive({})

function buildRow(m) {
  return {
    tid: m.tid,
    id: m.id,
    sex: m.sex,
    toe_mark: m.toe_mark,
    genotypes: {}, // locusSym -> {allele1, allele2}
    cull: false
  }
}

// 亲本
const parentSummaries = computed(() => {
  if (!props.litter) return []
  const first = (props.litter.mice || [])[0]
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
  return parents[0]?.genotype?.geneEntity || []
}

const predictions = computed(() => {
  const fGenes = getParentGeneEntities('M')
  const mGenes = getParentGeneEntities('F')
  return predictOffspringGenotypes(fGenes, mGenes)
})

// 本窝涉及的位点
const lociInPlay = computed(() => {
  const symbols = new Set()
  getParentGeneEntities('M').forEach(g => symbols.add(g.locus))
  getParentGeneEntities('F').forEach(g => symbols.add(g.locus))
  if (!symbols.size) return geneStore.genotypes.filter(g => g.symbol !== 'WT')
  return geneStore.genotypes.filter(g => symbols.has(g.symbol))
})

const pendingRows = computed(() => rows.value)

// ===== 批量预选 =====

function bulkValue(symbol) {
  return bulkPick[symbol] || null
}
function setBulk(symbol, v) {
  if (!v || !v.allele1 || !v.allele2) {
    delete bulkPick[symbol]
  } else {
    bulkPick[symbol] = { ...v, locus: symbol }
  }
}
const hasTargetSet = computed(() => Object.keys(bulkPick).length > 0)
const canApplyBulk = computed(() => hasTargetSet.value && rows.value.length > 0)

function applyBulk() {
  for (const row of rows.value) {
    for (const [sym, pick] of Object.entries(bulkPick)) {
      row.genotypes[sym] = { allele1: pick.allele1, allele2: pick.allele2 }
    }
  }
  rows.value = [...rows.value]
}

function cullNonTarget() {
  for (const row of rows.value) {
    const matchesAll = Object.entries(bulkPick).every(([sym, pick]) => {
      const cur = row.genotypes[sym]
      if (!cur) return false
      const k1 = pairKey(cur.allele1, cur.allele2)
      const k2 = pairKey(pick.allele1, pick.allele2)
      return k1 === k2
    })
    row.cull = !matchesAll
  }
  rows.value = [...rows.value]
}

// ===== 相关计划 / 命中 =====

const relevantPlans = computed(() => {
  const lociSet = new Set(lociInPlay.value.map(l => l.symbol))
  return planStore.activePlans.filter(p =>
    p.targets.some(t => lociSet.has(t.locus))
  )
})

function rowToMouseLike(row) {
  const geneEntity = Object.entries(row.genotypes).map(([locus, g]) => ({
    locus,
    allele1: g.allele1,
    allele2: g.allele2
  }))
  return {
    genotype: { geneEntity },
    sex: row.sex,
    live_status: 1,
    genotype_confirmed: true,
    strain: null
  }
}

function planHitsForRow(row) {
  if (row.cull) return []
  return relevantPlans.value.filter(p => {
    if (p.sex && p.sex !== 'any' && p.sex !== row.sex) return false
    return matchesTargets(rowToMouseLike(row), p.targets)
  })
}

const planHitStats = computed(() => {
  const counts = new Map()
  for (const r of rows.value) {
    for (const p of planHitsForRow(r)) {
      counts.set(p.id, (counts.get(p.id) || 0) + 1)
    }
  }
  return Array.from(counts.entries()).map(([id, count]) => {
    const p = relevantPlans.value.find(x => x.id === id)
    return { id, name: p?.name || '—', count }
  })
})

// ===== 不可能组合判定 =====

function isImpossible(row, locusSym) {
  const cur = row.genotypes[locusSym]
  if (!cur) return false
  const preds = predictions.value[locusSym] || []
  if (!preds.length) return false
  const k = pairKey(cur.allele1, cur.allele2)
  return !preds.some(p => p.key === k)
}

const impossibleCount = computed(() => {
  let n = 0
  for (const r of rows.value) {
    for (const locus of lociInPlay.value) {
      if (isImpossible(r, locus.symbol)) { n++; break }
    }
  }
  return n
})

const filledCount = computed(() =>
  rows.value.filter(r =>
    lociInPlay.value.every(l => r.genotypes[l.symbol])
  ).length
)

const cullCount = computed(() => rows.value.filter(r => r.cull).length)

function rowClass(row) {
  if (row.cull) return 'row-cull'
  const hits = planHitsForRow(row)
  if (hits.length) return 'row-hit'
  return ''
}

// ===== 表列 =====

const columns = computed(() => {
  const C = { align: 'center', titleAlign: 'center' }
  const cols = [
    {
      title: '#',
      key: 'idx',
      width: 36,
      ...C,
      render: (_r, i) => i + 1
    },
    { title: 'ID', key: 'id', width: 100, ...C },
    {
      title: '性别',
      key: 'sex',
      width: 70,
      ...C,
      render: (row) => h('span', {}, row.sex === 'M' ? '♂' : row.sex === 'F' ? '♀' : '—')
    }
  ]
  if (pendingRows.value.some(r => r.toe_mark)) {
    cols.push({ title: '脚趾', key: 'toe_mark', width: 70, ...C })
  }
  for (const locus of lociInPlay.value) {
    cols.push({
      title: locus.symbol,
      key: `gene_${locus.symbol}`,
      minWidth: 220,
      ...C,
      render: (row) => {
        const cur = row.genotypes[locus.symbol]
        const picker = h(GenotypePicker, {
          modelValue: cur ? { locus: locus.symbol, allele1: cur.allele1, allele2: cur.allele2 } : { locus: locus.symbol },
          genotypes: [locus],
          lockLocus: true,
          compact: true,
          'onUpdate:modelValue': (v) => {
            if (!v || !v.allele1 || !v.allele2) {
              delete row.genotypes[locus.symbol]
            } else {
              row.genotypes[locus.symbol] = { allele1: v.allele1, allele2: v.allele2 }
            }
          }
        })
        if (!cur) return picker
        const bad = isImpossible(row, locus.symbol)
        if (bad) {
          return h('div', { style: 'display:flex;align-items:center;justify-content:center;gap:4px;' }, [
            picker,
            h(NTag, { size: 'tiny', type: 'error', bordered: false }, {
              icon: () => h(NIcon, null, { default: () => h(WarningOutline) }),
              default: () => '非预测'
            })
          ])
        }
        return picker
      }
    })
  }
  cols.push({
    title: '命中',
    key: 'hit',
    width: 100,
    ...C,
    render: (row) => {
      const hits = planHitsForRow(row)
      if (!hits.length) return h('span', { style: 'color: var(--n-text-color-3);' }, '—')
      return h('div', { style: 'display:flex;flex-wrap:wrap;gap:2px;justify-content:center;' },
        hits.map(p => h(NTag, {
          size: 'tiny',
          type: 'success',
          bordered: false,
          title: p.name
        }, { default: () => p.name.length > 6 ? p.name.slice(0, 6) + '…' : p.name }))
      )
    }
  })
  if (editMode.value) cols.push({
    title: '编辑',
    key: '_edit',
    width: 190,
    ...C,
    render: (row) => h('div', { style: 'display:inline-flex;align-items:center;gap:6px;' }, [
      h(NButton, {
        size: 'tiny',
        type: row.sex === 'M' ? 'info' : 'default',
        secondary: row.sex !== 'M',
        onClick: () => { row.sex = 'M' }
      }, { default: () => '♂' }),
      h(NButton, {
        size: 'tiny',
        type: row.sex === 'F' ? 'error' : 'default',
        secondary: row.sex !== 'F',
        onClick: () => { row.sex = 'F' }
      }, { default: () => '♀' }),
      h(NInput, {
        value: row.id,
        size: 'tiny',
        style: 'width:90px;',
        placeholder: 'ID',
        'onUpdate:value': v => { row.id = v }
      })
    ])
  })
  cols.push({
    title: '淘汰',
    key: 'cull',
    width: 60,
    ...C,
    render: (row) =>
      h(NCheckbox, {
        checked: row.cull,
        'onUpdate:checked': v => (row.cull = v)
      })
  })
  return cols
})

const canSubmit = computed(() => rows.value.length > 0)

watch(
  () => [props.show, props.litter],
  () => {
    if (!props.show || !props.litter) {
      rows.value = []
      for (const k of Object.keys(bulkPick)) delete bulkPick[k]
      return
    }
    const pending = (props.litter.mice || []).filter(
      m => m.genotype_confirmed === false && m.live_status === 1
    )
    rows.value = pending.map(buildRow)
    for (const k of Object.keys(bulkPick)) delete bulkPick[k]
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
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
  margin-bottom: 8px;
}
.parents-title {
  font-size: 13px;
  color: var(--n-text-color-3);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.plans-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(24, 160, 88, 0.08);
  border-left: 3px solid #18a058;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.plans-hint-label { color: var(--n-text-color-3); }
.plan-chip { cursor: help; }

.bulk-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0 12px;
  border-bottom: 1px dashed var(--n-border-color);
  margin-bottom: 10px;
}
.bulk-title {
  font-size: 13px;
  color: var(--n-text-color-3);
  font-weight: 600;
}
.bulk-locus-label {
  font-size: 13px;
  font-weight: 600;
  margin-right: 2px;
}

.stats-row {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--n-border-color);
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 12px;
  color: var(--n-text-color-2);
}
.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.warn-text { color: #d03050; }

:deep(.row-cull) {
  background-color: rgba(208, 48, 80, 0.06) !important;
  text-decoration: line-through;
  opacity: 0.75;
}
:deep(.row-hit) {
  background-color: rgba(24, 160, 88, 0.06) !important;
}
</style>
