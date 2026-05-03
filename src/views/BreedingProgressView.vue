<template>
  <div class="breeding-progress-view">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <n-flex align="center" :size="12">
          <span class="page-title">基因型繁配进度</span>
          <n-tag type="info" :bordered="false">
            {{ activePlans.length }} 进行中
          </n-tag>
          <n-tag type="success" :bordered="false" v-if="doneCount">
            {{ doneCount }} 达标
          </n-tag>
          <n-tag type="default" :bordered="false" v-if="archivedPlans.length">
            {{ archivedPlans.length }} 归档
          </n-tag>
        </n-flex>
      </div>
      <div class="toolbar-right">
        <n-flex :size="10" align="center">
          <n-radio-group v-model:value="tab">
            <n-radio-button value="active">进行中</n-radio-button>
            <n-radio-button value="done">已达标</n-radio-button>
            <n-radio-button value="archived">已归档</n-radio-button>
          </n-radio-group>
          <n-button @click="refreshData" :loading="refreshing">
            <template #icon><n-icon><RefreshOutline /></n-icon></template>
            刷新
          </n-button>
          <n-button type="primary" @click="openCreate">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            新建繁配计划
          </n-button>
        </n-flex>
      </div>
    </div>

    <!-- 概览卡片 -->
    <div class="overview-bar" v-if="activePlans.length">
      <div class="stat-card">
        <div class="stat-label">计划总数</div>
        <div class="stat-value">{{ plans.length }}</div>
      </div>
      <div class="stat-card accent-primary">
        <div class="stat-label">候选总数</div>
        <div class="stat-value">{{ totalQualified }}</div>
      </div>
      <div class="stat-card accent-success">
        <div class="stat-label">已达标计划</div>
        <div class="stat-value">{{ doneCount }} / {{ activePlans.length }}</div>
      </div>
      <div class="stat-card accent-warning">
        <div class="stat-label">待鉴定仔鼠</div>
        <div class="stat-value">{{ totalPending }}</div>
      </div>
    </div>

    <!-- 计划网格 -->
    <div class="plan-scroll">
      <n-empty
        v-if="!visiblePlans.length"
        :description="emptyHint"
        size="huge"
      >
        <template #extra>
          <n-button type="primary" @click="openCreate" v-if="tab === 'active' && !plans.length">
            新建第一个繁配计划
          </n-button>
        </template>
      </n-empty>

      <div v-else class="plan-grid">
        <div
          v-for="plan in visiblePlans"
          :key="plan.id"
          class="plan-card-wrap"
          @click="openDetail(plan)"
        >
          <n-card
            :bordered="true"
            class="plan-card"
            :class="{ 'is-done': progressMap[plan.id]?.done, 'is-archived': plan.archived }"
          >
            <div class="plan-card-head">
              <div class="plan-title-stack">
                <div class="title-row">
                  <div class="card-title">{{ plan.name }}</div>
                </div>
                <div class="title-meta-row">
                  <n-flex :size="6" class="plan-tags">
                    <n-tag size="small" :bordered="false" :type="strategyTagType(plan.strategy)">
                      {{ strategyLabel(plan.strategy) }}
                    </n-tag>
                    <n-tag size="small" :bordered="false" v-if="plan.sex && plan.sex !== 'any'">
                      {{ plan.sex === 'M' ? '♂ 雄' : '♀ 雌' }}
                    </n-tag>
                    <n-tag size="small" :bordered="false" type="warning" v-if="plan.deadline && !progressMap[plan.id]?.done">
                      {{ deadlineInfo(plan.deadline) }}
                    </n-tag>
                  </n-flex>
                  <div class="meta-divider" />
                  <div class="title-meta-item">
                    <div class="meta-label">
                      <n-icon :size="14" class="icon-gene"><GitBranchOutline /></n-icon>
                      <span>目标基因型</span>
                    </div>
                    <div class="target-symbol">
                      <GenotypeLabel :symbol="targetSymbol(plan)" />
                    </div>
                  </div>
                  <div class="meta-divider" />
                  <div class="title-meta-item">
                    <div class="meta-label">世代分布</div>
                    <div class="gen-pills">
                      <template v-if="genPills(plan).length">
                        <n-tag
                          v-for="p in genPills(plan)"
                          :key="p.gen"
                          size="small"
                          :bordered="false"
                          type="info"
                          class="gen-pill"
                          :title="`F${p.gen}: ${p.count} 只`"
                        >
                          F{{ p.gen }} {{ p.count }}
                        </n-tag>
                      </template>
                      <span v-else class="gen-empty">暂无候选</span>
                    </div>
                  </div>
                </div>
              </div>
              <n-dropdown
                trigger="click"
                :options="rowMenu(plan)"
                @select="k => onRowMenu(k, plan)"
              >
                <n-button quaternary circle @click.stop class="plan-menu-button">
                  <template #icon><n-icon><EllipsisVertical /></n-icon></template>
                </n-button>
              </n-dropdown>
            </div>

            <div class="card-main">
              <div class="metric-grid">
                <div class="metric-item metric-primary">
                  <div class="metric-title">候选</div>
                  <div class="metric-value">
                    {{ progressMap[plan.id]?.qualified.length || 0 }}<span>/{{ plan.targetCount }}</span>
                  </div>
                  <div class="metric-sub">{{ progressMap[plan.id]?.percent || 0 }}%</div>
                </div>
                <div class="metric-item">
                  <div class="metric-title">{{ progressMap[plan.id]?.done ? '状态' : '还差' }}</div>
                  <div class="metric-value">
                    {{ Math.max(0, plan.targetCount - (progressMap[plan.id]?.qualified.length || 0)) }}<span>/{{ plan.targetCount }}</span>
                  </div>
                  <div class="metric-sub">{{ progressMap[plan.id]?.done ? '已达标' : '待补足' }}</div>
                </div>
                <div class="metric-item">
                  <div class="metric-title">贡献笼</div>
                  <div class="metric-value">
                    {{ progressMap[plan.id]?.cages.length || 0 }}<span>个</span>
                  </div>
                  <div class="metric-sub">繁殖来源</div>
                </div>
                <div class="metric-item">
                  <div class="metric-title">待鉴定</div>
                  <div class="metric-value">
                    {{ progressMap[plan.id]?.pending.length || 0 }}<span>只</span>
                  </div>
                  <div class="metric-sub">{{ plan.createdAt }}</div>
                </div>
              </div>
            </div>
          </n-card>
        </div>
      </div>
    </div>

    <!-- 详情抽屉 -->
    <n-drawer v-model:show="drawerVisible" :width="720" placement="right">
      <n-drawer-content
        :title="detailPlan ? detailPlan.name : '计划详情'"
        closable
        :native-scrollbar="false"
      >
        <template v-if="detailPlan && detailProgress">
          <!-- 摘要区 -->
          <div class="detail-hero">
            <n-progress
              type="circle"
              :percentage="detailProgress.percent"
              :color="progressColor(detailPlan)"
              :rail-color="railColor"
              :stroke-width="10"
              style="width: 120px;"
            >
              <div class="ring-inner">
                <div class="ring-big">{{ detailProgress.qualified.length }}</div>
                <div class="ring-sub">/ {{ detailPlan.targetCount }}</div>
              </div>
            </n-progress>
            <div class="hero-right">
              <div class="hero-title">
                <GenotypeLabel :symbol="targetSymbol(detailPlan)" />
              </div>
              <n-descriptions :column="2" label-placement="left">
                <n-descriptions-item label="策略">
                  {{ strategyLabel(detailPlan.strategy) }}
                </n-descriptions-item>
                <n-descriptions-item label="性别">
                  {{ detailPlan.sex === 'M' ? '♂ 雄' : detailPlan.sex === 'F' ? '♀ 雌' : '不限' }}
                </n-descriptions-item>
                <n-descriptions-item label="品系">
                  {{ detailPlan.strain || '不限' }}
                </n-descriptions-item>
                <n-descriptions-item label="截止">
                  {{ detailPlan.deadline || '—' }}
                </n-descriptions-item>
                <n-descriptions-item label="创建">
                  {{ detailPlan.createdAt }}
                </n-descriptions-item>
                <n-descriptions-item label="状态">
                  <n-tag size="small" :type="detailProgress.done ? 'success' : 'info'" :bordered="false">
                    {{ detailProgress.done ? '已达标' : `还差 ${Math.max(0, detailPlan.targetCount - detailProgress.qualified.length)} 只` }}
                  </n-tag>
                </n-descriptions-item>
              </n-descriptions>
              <div class="hero-note" v-if="detailPlan.note">
                <n-icon :size="13"><DocumentTextOutline /></n-icon>
                <span>{{ detailPlan.note }}</span>
              </div>
            </div>
          </div>

          <n-divider style="margin: 14px 0 12px;" />

          <!-- 世代分布条 -->
          <div class="section-title">
            <n-icon><LayersOutline /></n-icon>
            <span>世代分布</span>
          </div>
          <div class="gen-bar" v-if="detailProgress.qualified.length">
            <div
              v-for="p in detailGenPills"
              :key="p.gen"
              class="gen-bar-seg"
              :class="{ active: activeGenFilter === p.gen }"
              :style="{ flex: p.count, background: genColor(p.gen) }"
              @click="toggleGenFilter(p.gen)"
            >
              <span class="gen-bar-k">F{{ p.gen }}</span>
              <span class="gen-bar-v">{{ p.count }}</span>
            </div>
          </div>
          <n-empty v-else description="暂无候选，先去登记/鉴定新仔" size="small" />

          <!-- 候选小鼠表 -->
          <div class="section-title" style="margin-top: 16px;">
            <n-icon><CheckmarkDoneOutline /></n-icon>
            <span>候选小鼠（种子鼠）</span>
            <n-tag v-if="activeGenFilter != null" size="small" type="info" closable @close="activeGenFilter = null">
              已筛选 F{{ activeGenFilter }}
            </n-tag>
            <span class="section-sub">
              共 {{ filteredQualified.length }} 只
            </span>
          </div>
          <n-data-table
            :columns="qualifiedCols"
            :data="filteredQualified"
            :bordered="true"
            :max-height="260"
            size="small"
            :row-key="r => r.tid"
          />

          <!-- 贡献笼位 -->
          <div class="section-title" style="margin-top: 16px;">
            <n-icon><HomeOutline /></n-icon>
            <span>贡献繁殖笼</span>
            <span class="section-sub">{{ detailProgress.cages.length }} 个</span>
          </div>
          <n-empty v-if="!detailProgress.cages.length" description="暂无" size="small" />
          <n-flex v-else wrap="wrap" :size="8">
            <n-tag
              v-for="c in detailProgress.cages"
              :key="c.id"
              size="small"
              :bordered="false"
              :type="c.breeding_status === 'delivered' ? 'info' : c.breeding_status === 'pregnant' ? 'error' : 'default'"
              class="cage-chip"
              @click="goGenotypingAndSelect(c)"
            >
              {{ c.section }}-{{ c.cage_id }}
            </n-tag>
          </n-flex>

          <!-- 待鉴定仔鼠 -->
          <div class="section-title" style="margin-top: 16px;">
            <n-icon><FlaskOutline /></n-icon>
            <span>待鉴定仔鼠</span>
            <span class="section-sub">{{ detailProgress.pending.length }} 只</span>
          </div>
          <n-empty v-if="!detailProgress.pending.length" description="无待鉴定" size="small" />
          <div v-else class="pending-list">
            <n-tag
              v-for="m in detailProgress.pending"
              :key="m.tid"
              size="small"
              type="warning"
              :bordered="false"
              class="pending-chip"
              @click="$router.push(`/mouse/${m.tid}`)"
            >
              {{ m.id }}
              <span class="pending-sub" v-if="m.sex">· {{ m.sex === 'M' ? '♂' : '♀' }}</span>
            </n-tag>
          </div>
        </template>

        <template #footer v-if="detailPlan">
          <n-space justify="space-between" style="width: 100%;">
            <n-space :size="6">
              <n-button size="small" @click="openEdit(detailPlan)">
                <template #icon><n-icon><CreateOutline /></n-icon></template>
                编辑
              </n-button>
              <n-button size="small" @click="onDuplicate(detailPlan)">
                <template #icon><n-icon><CopyOutline /></n-icon></template>
                复制
              </n-button>
            </n-space>
            <n-space :size="6">
              <n-button
                size="small"
                :type="detailPlan.archived ? 'primary' : 'default'"
                @click="onArchive(detailPlan)"
              >
                <template #icon><n-icon><ArchiveOutline /></n-icon></template>
                {{ detailPlan.archived ? '取消归档' : '归档' }}
              </n-button>
              <n-popconfirm @positive-click="onDelete(detailPlan)">
                <template #trigger>
                  <n-button size="small" type="error" ghost>
                    <template #icon><n-icon><TrashOutline /></n-icon></template>
                    删除
                  </n-button>
                </template>
                删除后不可恢复，确认？
              </n-popconfirm>
            </n-space>
          </n-space>
        </template>
      </n-drawer-content>
    </n-drawer>

    <!-- 新建/编辑弹窗 -->
    <BreedingPlanModal v-model:show="modalVisible" :plan="editingPlan" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, computed, h, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NTag, useMessage } from 'naive-ui'
import {
  AddOutline, RefreshOutline, EllipsisVertical, GitBranchOutline, HomeOutline,
  FlaskOutline, TimeOutline, DocumentTextOutline, LayersOutline, CheckmarkDoneOutline,
  ArchiveOutline, TrashOutline, CreateOutline, CopyOutline
} from '@vicons/ionicons5'
import GenotypeLabel from '@/components/GenotypeLabel.vue'
import BreedingPlanModal from '@/components/BreedingPlanModal.vue'
import {
  useBreedingPlanStore,
  useGeneStore,
  useCageStore
} from '@/stores'
import { renderTargetSymbol } from '@/utils/pedigree'

const router = useRouter()
const planStore = useBreedingPlanStore()
const geneStore = useGeneStore()
const cageStore = useCageStore()
const message = useMessage()

// ===== 基础状态 =====
const tab = ref('active')
const refreshing = ref(false)
const modalVisible = ref(false)
const editingPlan = ref(null)
const drawerVisible = ref(false)
const detailPlan = ref(null)
const activeGenFilter = ref(null)

const plans = computed(() => planStore.plans)
const activePlans = computed(() => planStore.activePlans)
const archivedPlans = computed(() => planStore.archivedPlans)

// 每计划进度 —— 响应式重算
const progressMap = computed(() => {
  const map = {}
  for (const p of plans.value) {
    map[p.id] = planStore.computeProgress(p)
  }
  return map
})

const totalQualified = computed(() =>
  activePlans.value.reduce((s, p) => s + (progressMap.value[p.id]?.qualified.length || 0), 0)
)
const totalPending = computed(() => {
  // 去重（一只仔鼠可能命中多个计划）
  const set = new Set()
  for (const p of activePlans.value) {
    for (const m of progressMap.value[p.id]?.pending || []) set.add(m.tid)
  }
  return set.size
})
const doneCount = computed(() =>
  activePlans.value.filter(p => progressMap.value[p.id]?.done).length
)

const visiblePlans = computed(() => {
  if (tab.value === 'archived') return archivedPlans.value
  if (tab.value === 'done') return activePlans.value.filter(p => progressMap.value[p.id]?.done)
  return activePlans.value
})

const emptyHint = computed(() => {
  if (tab.value === 'done') return '暂无达标计划'
  if (tab.value === 'archived') return '暂无归档计划'
  return '尚无繁配计划，点击右上角新建一个'
})

// ===== 展示辅助 =====
function strategyLabel(s) {
  return s === 'global_ko' ? '全身敲除' : s === 'cko' ? '条件敲除' : '自定义'
}
function strategyTagType(s) {
  return s === 'global_ko' ? 'error' : s === 'cko' ? 'success' : 'info'
}
function targetSymbol(plan) {
  return renderTargetSymbol(plan.targets, geneStore.genotypes)
}
function deadlineInfo(dl) {
  if (!dl) return ''
  const days = Math.ceil((new Date(dl) - new Date()) / 86400000)
  if (days < 0) return `已逾期 ${-days}d`
  if (days === 0) return '今日截止'
  return `剩 ${days}d`
}
function progressColor(plan) {
  const p = progressMap.value[plan.id]
  if (!p) return '#909090'
  if (p.done) return '#18a058'
  if (p.percent >= 60) return '#2080f0'
  if (p.percent >= 30) return '#f0a020'
  return '#d03050'
}
const railColor = 'rgba(128,128,128,0.15)'

// 世代色
const GEN_PALETTE = ['#8c8c8c', '#2080f0', '#18a058', '#f0a020', '#d03050', '#7c3aed', '#0891b2']
function genColor(g) {
  return GEN_PALETTE[g % GEN_PALETTE.length]
}
function genPills(plan) {
  const p = progressMap.value[plan.id]
  if (!p) return []
  const arr = []
  for (const [gen, list] of p.buckets.entries()) {
    arr.push({ gen, count: list.length })
  }
  return arr.sort((a, b) => a.gen - b.gen)
}

// 右键/三点菜单
function rowMenu(plan) {
  return [
    { label: '查看详情', key: 'detail' },
    { label: '编辑', key: 'edit' },
    { label: '复制', key: 'duplicate' },
    { type: 'divider', key: 'd' },
    { label: plan.archived ? '取消归档' : '归档', key: 'archive' },
    { label: '删除', key: 'delete' }
  ]
}
async function onDuplicate(plan) {
  try {
    await planStore.duplicatePlan(plan.id)
    message.success('已复制计划')
  } catch (error) {
    console.error('复制繁配计划失败:', error)
    message.error(error.response?.data?.error || '复制繁配计划失败')
  }
}

async function onRowMenu(k, plan) {
  if (k === 'detail') openDetail(plan)
  else if (k === 'edit') openEdit(plan)
  else if (k === 'duplicate') {
    await onDuplicate(plan)
  } else if (k === 'archive') {
    await onArchive(plan)
  } else if (k === 'delete') {
    // 简易 confirm
    if (window.confirm(`删除计划「${plan.name}」？不可恢复`)) {
      await onDelete(plan)
    }
  }
}

// ===== 弹窗控制 =====
function openCreate() {
  editingPlan.value = null
  modalVisible.value = true
}
function openEdit(plan) {
  editingPlan.value = plan
  modalVisible.value = true
  drawerVisible.value = false
}
function onSaved() {
  message.success('已保存')
}

function openDetail(plan) {
  detailPlan.value = plan
  activeGenFilter.value = null
  drawerVisible.value = true
}

// 详情数据
const detailProgress = computed(() =>
  detailPlan.value ? progressMap.value[detailPlan.value.id] : null
)
const detailGenPills = computed(() => {
  if (!detailProgress.value) return []
  const arr = []
  for (const [gen, list] of detailProgress.value.buckets.entries()) {
    arr.push({ gen, count: list.length })
  }
  return arr.sort((a, b) => a.gen - b.gen)
})
const filteredQualified = computed(() => {
  if (!detailProgress.value) return []
  const list = detailProgress.value.qualified
  if (activeGenFilter.value == null) return list
  return list.filter(m => planStore.generations.get(m.tid) === activeGenFilter.value)
})
function toggleGenFilter(g) {
  activeGenFilter.value = activeGenFilter.value === g ? null : g
}

const qualifiedCols = computed(() => [
  { title: 'ID', key: 'id', width: 100 },
  {
    title: '世代',
    key: 'gen',
    width: 70,
    render: (row) => {
      const g = planStore.generations.get(row.tid) ?? 0
      return h(NTag, { size: 'tiny', bordered: false, color: { color: genColor(g), textColor: '#fff' } }, { default: () => `F${g}` })
    }
  },
  {
    title: '性别',
    key: 'sex',
    width: 60,
    render: r => r.sex === 'M' ? '♂' : r.sex === 'F' ? '♀' : '—'
  },
  {
    title: '基因型',
    key: 'genotype',
    render: (row) => h(GenotypeLabel, { symbol: row.genotype?.symbol })
  },
  { title: '日龄', key: 'days_old', width: 70, render: r => r.days_old != null ? `${r.days_old}d` : '—' },
  {
    title: '笼位',
    key: 'cage',
    width: 90,
    render: (row) => {
      const c = cageStore.cages.find(x => x.id === row.cage_id)
      return c ? `${c.section}-${c.cage_id}` : '—'
    }
  },
  {
    title: '',
    key: 'action',
    width: 60,
    render: (row) =>
      h(NButton, {
        size: 'tiny',
        quaternary: true,
        onClick: () => router.push(`/mouse/${row.tid}`)
      }, { default: () => '查看' })
  }
])

function goGenotypingAndSelect(cage) {
  router.push({ name: 'Genotyping', query: { cageId: cage.id } })
}

// ===== 归档 / 删除 =====
async function onArchive(plan) {
  const nextArchived = !plan.archived
  try {
    await planStore.archivePlan(plan.id, nextArchived)
    if (detailPlan.value?.id === plan.id) {
      detailPlan.value = planStore.plans.find(p => p.id === plan.id) || null
    }
    message.success(nextArchived ? '已归档' : '已取消归档')
  } catch (error) {
    console.error('更新繁配计划归档状态失败:', error)
    message.error(error.response?.data?.error || '更新繁配计划归档状态失败')
  }
}
async function onDelete(plan) {
  try {
    await planStore.removePlan(plan.id)
    drawerVisible.value = false
    if (detailPlan.value?.id === plan.id) detailPlan.value = null
    message.success('已删除')
  } catch (error) {
    console.error('删除繁配计划失败:', error)
    message.error(error.response?.data?.error || '删除繁配计划失败')
  }
}

// ===== 刷新 =====
async function refreshData() {
  refreshing.value = true
  try {
    await Promise.all([
      geneStore.loadMice(),
      cageStore.fetchCages(),
      geneStore.loadGenotypes(),
      planStore.loadInitialData()
    ])
  } finally {
    refreshing.value = false
  }
}

onMounted(async () => {
  if (!geneStore.mice.length || !cageStore.cages.length) {
    await refreshData()
  }
})
</script>

<style scoped>
.breeding-progress-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px 28px;
  gap: 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--n-border-color);
}
.page-title {
  font-size: 20px;
  font-weight: 600;
}

.overview-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.stat-card {
  padding: 16px 20px;
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  background: var(--n-card-color);
}
.stat-label {
  font-size: 13px;
  color: var(--n-text-color-3);
}
.stat-value {
  font-size: 28px;
  font-weight: 600;
  margin-top: 4px;
  letter-spacing: -0.5px;
}
.stat-card.accent-primary { border-left: 3px solid #2080f0; }
.stat-card.accent-success { border-left: 3px solid #18a058; }
.stat-card.accent-warning { border-left: 3px solid #f0a020; }

.plan-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 4px 8px;
}
.plan-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 140px;
}

.plan-card-wrap {
  width: 100%;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.plan-card-wrap:hover {
  transform: translateY(-2px);
}
.plan-card {
  position: relative;
}
.plan-card :deep(.n-card__content) {
  padding: 18px 22px 16px;
}
.plan-card.is-done {
  border-color: #18a058;
  box-shadow: 0 0 0 1px #18a058 inset;
}
.plan-card.is-archived {
  opacity: 0.75;
}

.plan-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.plan-title-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.title-row {
  display: flex;
  align-items: center;
  min-width: 0;
}

.title-meta-row {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  width: fit-content;
  max-width: 100%;
  min-width: 0;
  padding: 7px 10px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--n-color) 91%, var(--n-color-embedded));
}

.title-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.plan-tags {
  flex-wrap: wrap;
  flex: 0 0 auto;
}

.plan-menu-button {
  flex: 0 0 auto;
}

/* 卡片主体：数字指标分栏 */
.card-main {
  display: block;
}

.card-title {
  font-weight: 700;
  font-size: 18px;
  line-height: 1.35;
  color: #2080f0;
  white-space: normal;
  word-break: break-word;
}

.icon-gene { color: var(--n-text-color-3); flex-shrink: 0; }

.meta-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--n-text-color-3);
  font-size: 12px;
  flex: 0 0 auto;
}

.meta-divider {
  width: 1px;
  height: 18px;
  background: var(--n-border-color);
}

.target-symbol {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: 10px;
}

.metric-item {
  min-height: 86px;
  padding: 12px 14px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--n-color) 88%, var(--n-color-embedded));
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.metric-title {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.metric-value {
  font-size: 30px;
  line-height: 1.05;
  font-weight: 800;
  color: var(--n-text-color-1);
}

.metric-value span {
  margin-left: 3px;
  font-size: 16px;
  font-weight: 600;
  color: var(--n-text-color-3);
}

.metric-sub {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.metric-primary {
  background: color-mix(in srgb, #2080f0 13%, var(--n-color));
}

.gen-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.gen-empty { font-size: 13px; color: var(--n-text-color-3); }

/* 详情抽屉 */
.detail-hero {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}
.hero-right { flex: 1; }
.hero-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}
.hero-note {
  margin-top: 8px;
  padding: 6px 10px;
  background: var(--n-color-embedded, rgba(0, 0, 0, 0.03));
  border-radius: 6px;
  font-size: 12px;
  color: var(--n-text-color-2);
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--n-text-color-2);
  margin-bottom: 8px;
}
.section-sub {
  font-weight: 400;
  font-size: 12px;
  color: var(--n-text-color-3);
  margin-left: 4px;
}

.gen-bar {
  display: flex;
  height: 32px;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 4px;
}
.gen-bar-seg {
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: filter 0.15s;
  min-width: 36px;
}
.gen-bar-seg:hover { filter: brightness(1.1); }
.gen-bar-seg.active { outline: 2px solid var(--n-text-color); outline-offset: -2px; }
.gen-bar-k { font-weight: 600; }

.cage-chip, .pending-chip {
  cursor: pointer;
}
.pending-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pending-sub { color: var(--n-text-color-3); margin-left: 4px; }

@media (max-width: 900px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .title-meta-row {
    align-items: flex-start;
  }

  .target-symbol {
    white-space: normal;
  }
}
</style>
