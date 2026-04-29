<template>
  <div class="genotyping-view">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <n-space align="center" :size="12" wrap>
        <n-select
          v-model:value="filterSection"
          :options="sectionOptions"
          placeholder="全部区域"
          clearable
          style="width: 180px;"
        />
        <n-select
          v-model:value="filterStatus"
          :options="statusOptions"
          placeholder="全部状态"
          clearable
          style="width: 180px;"
        />
        <n-input
          v-model:value="searchText"
          placeholder="搜索笼位 ID / 基因型"
          clearable
          style="width: 220px;"
        >
          <template #prefix>
            <n-icon><SearchOutline /></n-icon>
          </template>
        </n-input>
        <n-button @click="refreshData" :loading="refreshing" :render-icon="renderIcon(Refresh)">刷新</n-button>
      </n-space>
      <n-space align="center" :size="8">
        <n-tag size="small" :bordered="false" type="error">已标记怀孕</n-tag>
        <n-tag size="small" :bordered="false" type="info">已生产</n-tag>
        <n-tag size="small" :bordered="false" type="warning">有待鉴定仔鼠</n-tag>
      </n-space>
    </div>

    <!-- 繁殖笼网格 -->
    <div class="cage-scroll">
      <n-empty
        v-if="visibleCages.length === 0"
        :description="`暂无繁殖笼（请在笼位视图将笼位类型设为 繁殖笼）`"
      />
      <n-flex v-else class="cage-grid" wrap="wrap" justify="flex-start" :size="16">
        <div
          v-for="cage in visibleCages"
          :key="cage.id"
          class="breeding-card"
          :class="{
            'is-pregnant': cage.breeding_status === 'pregnant',
            'is-delivered': cage.breeding_status === 'delivered'
          }"
          @click="openCageDrawer(cage)"
        >
          <n-card size="small" :bordered="true">
            <div class="card-header">
              <div class="cage-ident">
                <span class="cage-id">{{ cage.section }}-{{ cage.cage_id }}</span>
              </div>
              <div class="header-tags">
                <n-tag
                  v-if="cage.mice_genotype"
                  size="small"
                  :type="getGenotypeTagType(cage.mice_genotype)"
                  :bordered="false"
                >
                  {{ cage.mice_genotype }}
                </n-tag>
                <n-tag size="small" :bordered="false">
                  {{ cage.mice?.length ?? 0 }} 只
                </n-tag>
              </div>
            </div>

            <!-- 状态悬浮徽章 -->
            <div class="status-badge-wrapper" v-if="cage.breeding_status">
              <n-popover trigger="hover" placement="top">
                <template #trigger>
                    <div class="status-badge" :class="cage.breeding_status">
                    <n-icon v-if="cage.breeding_status === 'pregnant'" :size="16"><Heart /></n-icon>
                    <n-icon v-else :size="16"><HappySharp /></n-icon>
                  </div>
                </template>
                <div class="status-popover">
                  <div class="status-popover-title">
                    {{ cage.breeding_status === 'pregnant' ? '已标记怀孕' : '已生产' }}
                    <span v-if="cage.breeding_status_date">· {{ cage.breeding_status_date }}</span>
                  </div>
                  <div class="status-popover-sub" v-if="cage.breeding_status === 'delivered' && cage.mice_birth_date">
                    DOB = {{ cage.mice_birth_date }} · 出生第 {{ dayOfAge(cage.mice_birth_date) }} 天
                  </div>
                </div>
              </n-popover>
            </div>

            <div class="breeding-pair">
              <div class="pair-row">
                <n-icon class="pair-icon male"><MaleOutline /></n-icon>
                <span class="pair-label">父: </span>
                <span class="pair-value">{{ summarizeMice(getCageMiceBySex(cage, 'M')) || '—' }}</span>
              </div>
              <div class="pair-row">
                <n-icon class="pair-icon female"><FemaleOutline /></n-icon>
                <span class="pair-label">母: </span>
                <span class="pair-value">{{ summarizeMice(getCageMiceBySex(cage, 'F')) || '—' }}</span>
              </div>
            </div>

            <!-- 快捷操作 -->
            <div class="quick-actions" @click.stop>
              <n-space :size="6">
                <template v-if="!cage.breeding_status">
                  <n-button strong secondary size="small" type="primary" :render-icon="renderIcon(Heart)" @click="onMarkPregnant(cage)">
                    标记怀孕
                  </n-button>
                  <n-button strong secondary size="small" type="info" :render-icon="renderIcon(LogIn)" @click="onConfirmDelivered(cage)">
                    直接登记
                  </n-button>
                </template>
                <template v-else-if="cage.breeding_status === 'pregnant'">
                  <n-button strong secondary size="small" type="primary" :render-icon="renderIcon(Ribbon)" @click="onConfirmDelivered(cage)">
                    确认生产
                  </n-button>
                  <n-button strong secondary size="small" type="error" :render-icon="renderIcon(Close)" @click="onClearStatus(cage)">
                    取消标记
                  </n-button>
                </template>
                <template v-else>
                  <n-button strong secondary size="small" type="primary" :render-icon="renderIcon(Add)" @click="onOpenRegister(cage)">
                    登记新生仔
                  </n-button>
                  <n-button strong secondary size="small" type="error" :render-icon="renderIcon(Close)" @click="onRevertToPregnant(cage)">
                    取消标记
                  </n-button>
                  <n-tooltip
                    v-if="breedingStore.pendingPupsCount(cage.id) > 0"
                    placement="top"
                  >
                    <template #trigger>
                      <n-badge :value="breedingStore.pendingPupsCount(cage.id)" type="warning">
                        <n-button
                          strong secondary
                          size="small"
                          type="warning"
                          :render-icon="renderIcon(Flask)"
                          @click="onOpenBatchGenotype(cage)"
                        >
                          批量鉴定
                        </n-button>
                      </n-badge>
                    </template>
                    共 {{ breedingStore.pendingPupsCount(cage.id) }} 只待鉴定仔鼠
                  </n-tooltip>
                </template>
              </n-space>
            </div>
          </n-card>
        </div>
      </n-flex>
    </div>

    <!-- 笼位详情抽屉 -->
    <n-drawer v-model:show="drawerVisible" :width="560" placement="right">
      <n-drawer-content
        :title="drawerCage ? `${drawerCage.section}-${drawerCage.cage_id} · 繁殖笼详情` : '笼位详情'"
        closable
      >
        <n-tabs v-if="drawerCage" type="line" animated>
          <n-tab-pane name="pair" tab="繁育对">
            <div v-if="drawerCage.mice?.length" class="pair-detail">
              <n-descriptions :column="1" bordered size="small" label-placement="left">
                <n-descriptions-item
                  v-for="m in drawerCage.mice"
                  :key="m.tid"
                  :label="`${m.sex === 'M' ? '♂' : m.sex === 'F' ? '♀' : '?'} ${m.id}`"
                >
                  <div>
                    <GenotypeLabel :symbol="m.genotype" />
                    <span v-if="m.days != null" style="margin-left: 8px; color: var(--n-text-color-3);">
                      · 日龄 {{ m.days }}d
                    </span>
                  </div>
                </n-descriptions-item>
              </n-descriptions>
            </div>
            <n-empty v-else description="笼内暂无活体小鼠" />
          </n-tab-pane>

          <n-tab-pane name="litters" tab="窝历史">
            <n-empty v-if="!currentLitters.length" description="暂无窝记录" />
            <div v-else class="litters-list">
              <n-card
                v-for="litter in currentLitters"
                :key="litter.key"
                size="small"
                :bordered="true"
                class="litter-card"
              >
                <div class="litter-head">
                  <div>
                    <div class="litter-title">{{ litter.birth_date }}</div>
                    <div class="litter-sub">
                      出生 {{ dayOfAge(litter.birth_date) }} 天 · 共 {{ litter.mice.length }} 只
                      · 待鉴定 {{ litter.mice.filter(m => m.genotype_confirmed === false && m.live_status === 1).length }} 只
                    </div>
                  </div>
                  <n-button
                    size="small"
                    type="primary"
                    :disabled="litter.mice.filter(m => m.genotype_confirmed === false && m.live_status === 1).length === 0"
                    @click="onBatchGenotypeLitter(litter)"
                  >
                    <n-icon :size="14"><FlaskOutline /></n-icon>
                    批量鉴定此窝
                  </n-button>
                </div>
                <div class="litter-body">
                  <n-tag
                    v-for="m in litter.mice"
                    :key="m.tid"
                    size="small"
                    :type="tagTypeForMouse(m)"
                    :bordered="false"
                  >
                    {{ m.id }}<span v-if="m.sex">&nbsp;({{ m.sex }})</span>
                  </n-tag>
                </div>
              </n-card>
            </div>
          </n-tab-pane>
        </n-tabs>
      </n-drawer-content>
    </n-drawer>

    <!-- 子模态：登记新生仔 / 批量鉴定 -->
    <LitterRegistrationModal
      v-model:show="registerModalVisible"
      :cage="registerCage"
      @submitted="onRegisterSubmitted"
      @reset-status="onResetStatusFromRegister"
    />
    <BatchGenotypeModal
      v-model:show="batchModalVisible"
      :cage="batchCage"
      :litter="batchLitter"
      @submitted="onBatchSubmitted"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, h } from 'vue'
import {
  NSpace, NSelect, NInput, NButton, NCard, NTag, NPopover, NFlex, NEmpty,
  NDrawer, NDrawerContent, NTabs, NTabPane, NDescriptions, NDescriptionsItem,
  NIcon, NBadge, NTooltip, useDialog, useMessage
} from 'naive-ui'
import GenotypeLabel from '@/components/GenotypeLabel.vue'
import {
  Heart, Ribbon, Flask, Add, Close, RefreshCircle, LogIn, Refresh, HappySharp,
  SearchOutline, MaleFemaleOutline, HeartOutline, HappyOutline, MaleOutline, FemaleOutline, FlaskOutline
} from '@vicons/ionicons5'

const renderIcon = (IconComp) => () => h(NIcon, null, { default: () => h(IconComp) })
import { useCageStore, useGeneStore, useBreedingStore } from '@/stores'
import LitterRegistrationModal from '@/components/LitterRegistrationModal.vue'
import BatchGenotypeModal from '@/components/BatchGenotypeModal.vue'

const cageStore = useCageStore()
const geneStore = useGeneStore()
const breedingStore = useBreedingStore()
const dialog = useDialog()
const message = useMessage()

const filterSection = ref(null)
const filterStatus = ref(null)
const searchText = ref('')
const refreshing = ref(false)

const sectionOptions = computed(() =>
  cageStore.locations.map(loc => ({ label: loc.identifier, value: loc.identifier }))
)
const statusOptions = [
  { label: '已标记怀孕', value: 'pregnant' },
  { label: '已生产', value: 'delivered' },
  { label: '有待鉴定仔鼠', value: 'pending' },
  { label: '空闲繁殖笼', value: 'idle' }
]

const visibleCages = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  return breedingStore.breedingCages.filter(c => {
    if (filterSection.value && c.section !== filterSection.value) return false
    if (filterStatus.value) {
      if (filterStatus.value === 'pending') {
        if (breedingStore.pendingPupsCount(c.id) === 0) return false
      } else if (filterStatus.value === 'idle') {
        if (c.breeding_status) return false
      } else if (c.breeding_status !== filterStatus.value) return false
    }
    if (q) {
      const hay = `${c.section}-${c.cage_id}`.toLowerCase() + ' ' + (c.mice_genotype || '').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
})

// ===== Cage card helpers =====

function getGenotypeTagType(genotype) {
  if (!genotype) return 'default'
  const lower = genotype.toLowerCase()
  if (lower.includes('ko') || lower.includes('-/-')) return 'error'
  if (lower.includes('wt') || lower.includes('+/+')) return 'success'
  if (lower.includes('het') || lower.includes('+/-')) return 'warning'
  return 'info'
}

function dayOfAge(dobStr) {
  if (!dobStr) return 0
  const dob = new Date(dobStr)
  const now = new Date()
  return Math.max(0, Math.floor((now - dob) / 86400000))
}

function getCageMiceBySex(cage, sex) {
  return (cage.mice || []).filter(m => m.sex === sex)
}

function summarizeMice(mice) {
  if (!mice || !mice.length) return ''
  return mice.map(m => m.id).join(', ')
}

function tagTypeForMouse(m) {
  if (m.live_status === 4) return 'error'
  if (m.genotype_confirmed === false) return 'warning'
  return 'success'
}

// ===== Quick actions =====

async function onMarkPregnant(cage) {
  try {
    await breedingStore.setBreedingStatus(cage.id, 'pregnant')
    message.success(`已标记 ${cage.section}-${cage.cage_id} 为怀孕`)
  } catch (e) {
    message.error('操作失败: ' + (e.response?.data?.error || e.message))
  }
}

async function onConfirmDelivered(cage) {
  try {
    await breedingStore.setBreedingStatus(cage.id, 'delivered')
    message.success(`已确认 ${cage.section}-${cage.cage_id} 生产`)
  } catch (e) {
    message.error('操作失败: ' + (e.response?.data?.error || e.message))
  }
}

function onClearStatus(cage) {
  dialog.warning({
    title: '取消标记',
    content: `确认取消 ${cage.section}-${cage.cage_id} 的怀孕标记？`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await breedingStore.setBreedingStatus(cage.id, null)
        message.success('已取消标记')
      } catch (e) {
        message.error('操作失败: ' + (e.response?.data?.error || e.message))
      }
    }
  })
}

function onRevertToPregnant(cage) {
  dialog.warning({
    title: '回退生产状态',
    content: `将 ${cage.section}-${cage.cage_id} 回退到「已标记怀孕」状态？`,
    positiveText: '确认回退',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await breedingStore.setBreedingStatus(cage.id, 'pregnant')
        message.success('已回退到怀孕状态')
      } catch (e) {
        message.error('操作失败: ' + (e.response?.data?.error || e.message))
      }
    }
  })
}

function onResetStatusFromRegister() {
  const cage = registerCage.value
  if (!cage) return
  dialog.warning({
    title: '重置繁殖状态',
    content: `确认将 ${cage.section}-${cage.cage_id} 直接重置为「未标记」状态？此操作不可撤销。`,
    positiveText: '确认重置',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await breedingStore.setBreedingStatus(cage.id, null)
        message.success('已重置为未标记状态')
        registerModalVisible.value = false
      } catch (e) {
        message.error('操作失败: ' + (e.response?.data?.error || e.message))
      }
    }
  })
}

// ===== Drawer =====

const drawerVisible = ref(false)
const drawerCage = ref(null)
const currentLitters = computed(() => {
  if (!drawerCage.value) return []
  return breedingStore.littersOfCage(drawerCage.value.id)
})
function openCageDrawer(cage) {
  drawerCage.value = cage
  drawerVisible.value = true
}

// ===== Modals =====

const registerModalVisible = ref(false)
const registerCage = ref(null)
function onOpenRegister(cage) {
  registerCage.value = cage
  registerModalVisible.value = true
}

const batchModalVisible = ref(false)
const batchCage = ref(null)
const batchLitter = ref(null)
function onOpenBatchGenotype(cage) {
  // 默认用最新的一窝
  const litters = breedingStore.littersOfCage(cage.id)
  const firstPending = litters.find(l =>
    l.mice.some(m => m.genotype_confirmed === false && m.live_status === 1)
  )
  batchCage.value = cage
  batchLitter.value = firstPending || litters[0] || null
  batchModalVisible.value = true
}
function onBatchGenotypeLitter(litter) {
  batchCage.value = drawerCage.value
  batchLitter.value = litter
  batchModalVisible.value = true
}

function onRegisterSubmitted() {
  registerModalVisible.value = false
  message.success('新生仔登记成功')
}
function onBatchSubmitted(result) {
  batchModalVisible.value = false
  message.success('批量鉴定完成')
  if (result?.reset_cage_ids?.length) {
    message.info(`已自动重置 ${result.reset_cage_ids.length} 个笼位的繁殖状态`)
  }
  // 关闭抽屉则 drawerCage 仍有效，无需额外动作
  nextTick(() => {
    // 保留抽屉打开状态的情况下，currentLitters 是 computed，会自动刷新
  })
}

async function refreshData() {
  refreshing.value = true
  try {
    await Promise.all([cageStore.fetchCages(), geneStore.loadMice()])
  } finally {
    refreshing.value = false
  }
}

onMounted(async () => {
  if (!cageStore.cages.length || !geneStore.mice.length) {
    await refreshData()
  }
})
</script>

<style scoped>
.genotyping-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  gap: 12px;
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

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--n-text-color-3);
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
.dot-pregnant { background: #ff85c0; }
.dot-delivered { background: #40a9ff; }
.dot-pending { background: #faad14; }

.cage-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  /* 顶部/右侧 padding 增加，避免卡片右上角 status-badge 被裁切 */
  padding: 14px 14px 8px 4px;
}
.cage-grid {
  min-height: 120px;
}
.breeding-card {
  width: 360px;
  position: relative;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.breeding-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
}
.breeding-card.is-pregnant :deep(.n-card) {
  border-color: #ff85c0;
  box-shadow: 0 0 0 1px #ff85c0 inset;
}
.breeding-card.is-delivered :deep(.n-card) {
  border-color: #40a9ff;
  box-shadow: 0 0 0 1px #40a9ff inset;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.cage-ident {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cage-id { font-weight: 600; }

.header-tags {
  display: flex;
  gap: 4px;
}

.status-badge-wrapper {
  position: absolute;
  top: -6px;
  right: -6px;
  z-index: 2;
}
.status-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}
.status-badge.pregnant { background: #ff85c0; }
.status-badge.delivered { background: #40a9ff; }

.breeding-pair {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
  font-size: 12px;
}
.pair-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pair-icon.male { color: #1890ff; }
.pair-icon.female { color: #eb2f96; }
.pair-label { color: var(--n-text-color-3); }
.pair-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.quick-actions {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--n-border-color);
}

.status-popover {
  font-size: 12px;
}
.status-popover-title { font-weight: 600; }
.status-popover-sub { color: var(--n-text-color-3); margin-top: 2px; }

.litters-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.litter-card {}
.litter-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.litter-title { font-weight: 600; }
.litter-sub { font-size: 12px; color: var(--n-text-color-3); margin-top: 2px; }
.litter-body {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pair-detail { padding: 8px 0; }
</style>
