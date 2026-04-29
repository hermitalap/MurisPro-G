<template>
  <n-scrollbar trigger="hover" :size="8">
  <div class="main-content">
    <n-grid
      class="content-header"
      id="contentHeader"
      :cols="24"
      :x-gap="24"
      :y-gap="14"
      responsive="screen"
      item-responsive
    >
      <!-- 左：标题 + 统计 -->
      <n-gi span="24 s:12" class="header-title-col">
        <div class="header-title-section">
          <h1 class="page-title">笼位视图</h1>
          <div class="header-stats-panel">
            <n-statistic label="存活小鼠" :value="survivingMouseCount">
              <template #prefix>
                <n-icon><FitnessOutline /></n-icon>
              </template>
              <n-number-animation :from="0" :to="survivingMouseCount" />
            </n-statistic>
            <n-statistic label="活跃笼位" :value="activeCageCount">
              <template #prefix>
                <n-icon><GridOutline /></n-icon>
              </template>
              <n-number-animation :from="0" :to="activeCageCount" />
            </n-statistic>
          </div>
        </div>
      </n-gi>

      <!-- 右：5 个控件（两行） -->
      <n-gi span="24 s:12" class="header-controls-col">
        <div class="header-controls-block">
          <!-- 第一行：搜索框 + 笼位插槽 -->
          <div class="controls-row controls-row-1">
            <div class="search-container">
            <div class="search-box">
              <n-icon><SearchOutline /></n-icon>
              <n-input
                  v-model:value="searchTerm"
                  placeholder="搜索小鼠ID..."
                  @update:value="performSearch"
                  @keyup.enter="performSearch"
                  clearable
                />
                <n-button v-if="searchTerm" @click="clearSearch" class="search-clear" quaternary circle :render-icon="renderIcon(CloseOutline)" />
              </div>

              <div v-if="searchResults.length > 0" class="search-results">
                <div class="search-result-header">
                  <span>找到 {{ searchResults.length }} 个结果</span>
                  <div class="search-nav">
                    <n-button quaternary circle @click="navigateResults(-1)" :disabled="currentResultIndex <= 0" :render-icon="renderIcon(ArrowDownOutline)" />
                    <n-button quaternary circle @click="navigateResults(1)" :disabled="currentResultIndex >= searchResults.length - 1" :render-icon="renderIcon(ArrowDownOutline)" />
                  </div>
                </div>

                <div
                  v-for="(result, index) in searchResults"
                  :key="index"
                  class="search-result-item"
                  :class="{ active: index === currentResultIndex }"
                  @click="selectSearchResult(result, index)"
                >
                  <div class="mouse-sex" :class="result.mouse.sex === 'F' ? 'sex-female' : (result.mouse.sex === 'Mixed' ? 'sex-mixed' : 'sex-male')">
                    {{ result.mouse.sex === 'F' ? '♀' : (result.mouse.sex === 'Mixed' ? '⚥' : '♂') }}
                  </div>
                  <div class="result-info">
                    <div class="mouse-id">{{ result.mouse.id }}</div>
                    <div class="cage-info">{{ result.cage.section }} - {{ result.cage.cage_id }} {{ result.cage.location ? `(${result.cage.location})` : "" }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="slot-toolbar">
              <span class="slot-label">笼位插槽数</span>
              <n-input-number v-model:value="cageSlotCount" :min="1" />
            </div>
          </div>

          <!-- 第二行：三个操作按钮 -->
          <div class="controls-row controls-row-2">
            <n-button secondary @click="fetchCages" :render-icon="renderIcon(RefreshOutline)">刷新数据</n-button>
            <n-button secondary @click="exportToPDF" :render-icon="renderIcon(DocumentTextOutline)">当前位置导出pdf</n-button>
            <n-button type="primary" @click="openCageModal(null)" :render-icon="renderIcon(AddOutline)">添加笼位</n-button>
          </div>
        </div>
      </n-gi>
    </n-grid>
    
    <!-- Section标签页导航 -->
    <div class="section-tabs">
      <n-tabs v-model:value="activeSection" type="segment" animated>
        <n-tab-pane
          v-for="(element, index) in sortedSections"
          :key="element.id"
          :name="element.identifier"
        >
          <template #tab>
            <div
              class="segment-tab-label"
              @contextmenu.prevent="openSectionContextMenu($event, element, index)"
            >
              {{ element.identifier }}
            </div>
          </template>
          <div class="cage-scroll-container">
            <n-scrollbar trigger="hover" :size="8">
              <n-flex class="cage-flex-container" wrap="wrap" justify="center" :size="16">
                <div v-for="(cage, idx) in getMatrixCellsForSection(element.identifier)" :key="`matrix-cell-${idx}`" class="matrix-cell">
                  <div
                    v-if="cage"
                    class="cage-card"
                    :ref="el => { if (el) cageRefs[cage.id] = el; else delete cageRefs[cage.id] }"
                    :class="{
                      breeding: cage.cage_type === 'breeding',
                      'swap-source': cage.id === sourceCage?.id,
                      'swap-target': cage.id === targetCage?.id,
                      'search-highlight': isCageHighlighted(cage.id)
                    }"
                    @dragover.prevent
                    @drop="handleDrop($event, cage.id)"
                    @contextmenu.prevent="openCageContextMenu($event, cage)"
                    @click="handleCageClick(cage)"
                  >
                    <n-card size="small" :bordered="true" class="cage-card-body">
                      <div class="cage-header" @click.stop="openCageModal(cage)">
                        <div class="cage-header-top">
                          <div class="cage-identifier">
                            <n-tooltip v-if="isCageMixedSexWarning(cage)" trigger="hover">
                              <template #trigger>
                                <div class="cage-sex-mark sex-mark-warning">
                                  <n-icon><WarningOutline /></n-icon>
                                </div>
                              </template>
                              非繁殖笼有混合性别
                            </n-tooltip>
                            <div v-else class="cage-sex-mark" :class="getCageSexClass(cage)">
                              <n-icon><component :is="getCageSexIcon(cage)" /></n-icon>
                            </div>
                            <span class="cage-id-text">{{ cage.cage_id || '-' }}</span>
                          </div>
                          <div class="cage-actions-right">
                            <n-tag 
                              v-if="cage.mice_genotype"
                              size="small" 
                              :type="getGenotypeTagType(cage.mice_genotype)" 
                              :bordered="false"
                              class="cage-genotype-badge"
                            >
                              {{ cage.mice_genotype }}
                            </n-tag>
                            <n-tag 
                              size="small" 
                              :type="getCageCountType(cage)" 
                              :bordered="false"
                              class="cage-count-badge"
                            >
                              {{ cage.mice?.length ?? cage.mice_count ?? 0 }}只
                            </n-tag>
                          </div>
                        </div>
                      </div>

                      <div class="cage-table-wrapper">
                        <n-data-table
                          :columns="mouseTableColumns"
                          :data="getCageDisplayRows(cage)"
                          size="small"
                          :bordered="false"
                          :single-line="false"
                          :max-height="240"
                          :min-height="240"
                          table-layout="fixed"
                        />
                      </div>
                    </n-card>
                  </div>

                    <n-card v-else size="small" class="cage-slot-empty" :bordered="false" @click="openCageModal(null)">
                      <div class="empty-slot-content">
                        <n-icon class="slot-icon"><AddOutline /></n-icon>
                        <span>新增笼位</span>
                      </div>
                    </n-card>
                </div>
              </n-flex>
            </n-scrollbar>
          </div>
        </n-tab-pane>
      </n-tabs>
    </div>

    <NDropdown
      trigger="manual"
      placement="bottom-start"
      :show="sectionContextMenu.visible"
      :x="sectionContextMenu.x"
      :y="sectionContextMenu.y"
      :options="sectionMenuOptions"
      @select="onSectionMenuSelect"
      @clickoutside="closeSectionContextMenu"
    />
    
    <n-drawer v-model:show="showTemporaryDrawer" placement="bottom" :height="460" resizable>
      <n-drawer-content title="临时区小鼠管理" closable>
        <div class="temporary-drawer-content" style="height: 100%;">
          <n-space vertical size="large" style="height: 100%;">
            <n-space align="center">
              <span style="font-weight: bold;">转移目标笼位：</span>
              <n-select
                v-model:value="drawerTargetCageId"
                :options="allCageOptions"
                placeholder="选择笼位"
                style="width: 250px;"
              />
              <n-button type="primary" @click="handleDrawerTransferConfirm" :disabled="!drawerTargetCageId || drawerTransferSelected.length === 0">
                确认转移
              </n-button>
            </n-space>

            <n-transfer
              v-model:value="drawerTransferSelected"
              :options="drawerTransferOptions"
              source-title="临时区小鼠"
              target-title="待转移小鼠"
              virtual-scroll
              style="height: 330px; margin: 0 10px;"
            />
          </n-space>
        </div>
      </n-drawer-content>
    </n-drawer>
    
    <!-- 小鼠详细视图 -->
    <MouseDetailModal 
      v-if="showMouseDetail" 
      :mouse-id="selectedMouseId" 
      @close="showMouseDetail = false" 
    />

    <!-- 笼位右键菜单 -->
    <NDropdown
      trigger="manual"
      placement="bottom-start"
      :show="cageContextMenu.visible"
      :x="cageContextMenu.x"
      :y="cageContextMenu.y"
      :options="cageMenuOptions"
      @select="onCageMenuSelect"
      @clickoutside="closeContextMenu"
    />

  <!-- 统一笼位对话框 -->
  <n-modal v-model:show="cageModalVisible" preset="card" style="width: 500px; max-width: 95vw; overflow: visible;" :title="isEditing ? '修改笼位信息' : '添加新笼位'" @close="closeCageModal">
    <n-form
      ref="cageFormRef"
      :model="currentCage"
      :rules="cageFormRules"
      label-placement="top"
    >
      <n-grid x-gap="12" y-gap="16" :cols="2">
        <n-gi>
          <n-form-item label="笼位ID" path="cage_id" required>
            <n-input v-model:value="currentCage.cage_id" placeholder="输入笼位ID" />
          </n-form-item>
        </n-gi>
        <n-gi>
          <n-form-item label="区域" path="section" required>
            <n-select v-model:value="currentCage.section" :options="sectionOptions" placeholder="选择区域" />
          </n-form-item>
        </n-gi>
        <n-gi :span="2">
          <n-form-item label="位置" :show-feedback="false">
            <n-input v-model:value="currentCage.location" placeholder="输入位置" />
          </n-form-item>
        </n-gi>
      </n-grid>

      <div class="icon-hr" style="margin: 20px 0;">下面是用于标记的笼位信息</div>

      <n-grid x-gap="12" y-gap="16" :cols="2">
        <n-gi>
          <n-form-item label="笼位类型" :show-feedback="false">
            <n-select v-model:value="currentCage.cage_type" :options="cageTypeOptions" placeholder="选择笼位类型" />
          </n-form-item>
        </n-gi>
        <n-gi>
          <n-form-item label="建笼日期" :show-feedback="false">
            <n-date-picker type="date" value-format="yyyy-MM-dd" v-model:formatted-value="currentCage.mice_birth_date" style="width: 100%" />
          </n-form-item>
        </n-gi>
        <n-gi :span="2">
          <n-form-item label="小鼠基因型" :show-feedback="false">
            <n-auto-complete
              v-model:value="currentCage.mice_genotype"
              :options="cageGenotypeOptions"
              placeholder="选择常用值或自由输入，如 +/-、f/f;Cre/+"
              clearable
            />
          </n-form-item>
        </n-gi>
      </n-grid>
    </n-form>

    <template #footer>
      <n-space justify="end" class="dialog-buttons">
        <n-button secondary @click="closeCageModal">取消</n-button>
        <n-button type="primary" @click="onSubmitCage" :disabled="isSaving">
          <div v-if="isSaving">{{ isEditing ? '更新中' : '添加中' }}</div>
          <div v-else>{{ isEditing ? '保存设置' : '创建笼位' }}</div>
        </n-button>
      </n-space>
    </template>
  </n-modal>
  
  <!-- 移动到临时区弹窗 -->
  <n-modal v-model:show="showMoveToTempModal" preset="card" style="width: 600px; max-width: 95vw;" title="转移小鼠至临时区">
    <div style="margin-bottom: 16px;">
      请选择要从笼位 <b v-if="currentMoveToTempCage">{{ currentMoveToTempCage.cage_id }}</b> 移动到临时区的小鼠：
    </div>
    <n-transfer
      v-model:value="moveToTempSelected"
      :options="moveToTempOptions"
      source-title="笼内小鼠"
      target-title="待移至临时区"
      virtual-scroll
      style="height: 350px;"
    />
    <template #footer>
      <n-space justify="end" style="margin-top: 16px;">
        <n-button @click="showMoveToTempModal = false">取消</n-button>
        <n-button type="primary" @click="handleMoveToTempConfirm" :disabled="moveToTempSelected.length === 0" :loading="isSaving">确认转移</n-button>
      </n-space>
    </template>
  </n-modal>

  <!-- 在组件模板中添加弹窗 -->
  <n-modal :show="swapStatus === 'select-target'" :mask-closable="true" preset="card" class="swap-dialog" style="width: 400px; max-width: 90vw;" title="确认交换以下笼位顺序：" closable @close="cancelSwap">
    <div v-if="sourceCage && targetCage">
        <div class="cage-pair">
        <div class="selected-cage">
          <n-icon><CubeOutline /></n-icon>
          <div class="cage-info">
            <div class="cage-id">{{ sourceCage.cage_id }}</div>
            <div class="cage-location">{{ sourceCage.location }}</div>
          </div>
        </div>

        <div class="swap-icon">
          <n-icon><SwapHorizontalOutline /></n-icon>
        </div>

        <div class="selected-cage">
          <n-icon><CubeOutline /></n-icon>
          <div class="cage-info">
            <div class="cage-id">{{ targetCage.cage_id }}</div>
            <div class="cage-location">{{ targetCage.location }}</div>
          </div>
        </div>
        </div>
    </div>
    <template #footer>
      <div v-if="sourceCage && targetCage" class="modal-footer" style="display: flex; justify-content: flex-end; gap: 12px;">
        <n-button @click="cancelSwap" secondary>取消</n-button>
        <n-button @click="confirmSwap" type="primary">确认交换</n-button>
      </div>
    </template>
  </n-modal>

  <!-- PDF渲染区域（隐藏） -->
  <div ref="pdfRenderAreaEl" class="hidden-pdf-area"></div>
  
  <!-- 加载遮罩 -->
  <div class="loading-overlay" v-if="isGeneratingPDF">
    <div class="spinner"></div>
    <p>正在生成PDF，请稍候...</p>
  </div>

  <!-- 浮动按钮 -->
  <div class="floating-button-group">
    <n-badge :value="temporaryMice.length" :max="99" :offset="[-5, 5]">
          <n-tooltip trigger="hover">
            <template #trigger>
              <n-button circle type="primary" @click="showTemporaryDrawer = true" :render-icon="renderIcon(FileTrayOutline)" />
            </template>
            临时区
          </n-tooltip>
    </n-badge>
  </div>
  </div>
  </n-scrollbar>
</template>

<script setup>
import { ref, reactive, nextTick, computed, onMounted, onUnmounted, watch, h, useTemplateRef } from 'vue'
import api from '@/utils/api'
import { normalizeDateValue } from '@/utils/format'
import MouseDetailModal from './MouseDetailView.vue'
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { NIcon, NDropdown, NAutoComplete, useDialog, useMessage } from 'naive-ui'
import {
  AddOutline,
  ArrowDownOutline,
  ChevronBackOutline,
  ChevronForwardOutline,
  CloseOutline,
  CreateOutline,
  CubeOutline,
  DocumentTextOutline,
  FileTrayOutline,
  FitnessOutline,
  GridOutline,
  HelpCircleOutline,
  MaleOutline,
  FemaleOutline,
  MaleFemaleOutline,
  RefreshOutline,
  SearchOutline,
  SwapHorizontalOutline,
  TrashOutline,
  WarningOutline
} from '@vicons/ionicons5'
import { renderIcon } from '@/utils/icon'

// 设置组件名称
defineOptions({
  name: 'AnimalLabDashboard'
})

import { useCageStore, useGeneStore } from '@/stores'
import { storeToRefs } from 'pinia'

const pdfRenderAreaEl = useTemplateRef('pdfRenderAreaEl')
const cageRefs = {}

const cageStore = useCageStore()
const {locations, activeSection, cages} = storeToRefs(cageStore)
const {fetchCages} = cageStore
const geneStore = useGeneStore()
const { mice: allMice } = storeToRefs(geneStore)
const dialog = useDialog()
const message = useMessage()
const sectionOptions = computed(() =>
  locations.value.map(section => ({ label: section.identifier, value: section.identifier }))
)
const cageTypeOptions = [
  { label: '普通笼', value: 'normal' },
  { label: '繁殖笼', value: 'breeding' }
]
// 笼位基因型自动补全：取已有笼位中已使用的非空值，去重
const cageGenotypeOptions = computed(() => {
  const seen = new Set()
  for (const c of cages.value || []) {
    const v = (c.mice_genotype || '').trim()
    if (v) seen.add(v)
  }
  // 常用模板补充
  const presets = ['WT', '+/+', '+/-', '-/-', 'f/f', 'f/+', 'f/-', 'Cre/+', 'f/f;Cre/+', 'f/-;Cre/+']
  for (const p of presets) seen.add(p)
  return Array.from(seen).map(v => ({ label: v, value: v }))
})
const miceSexOptions = [
  { label: '雄性', value: 'M' },
  { label: '雌性', value: 'F' },
  { label: '混合', value: 'Mixed' }
]

const survivingMouseCount = computed(() => {
  // 以全量小鼠列表为准，避免只统计笼位内小鼠导致的漏计（未分配笼位的小鼠仍然存活）
  if (Array.isArray(allMice.value) && allMice.value.length) {
    return allMice.value.filter(m => m.live_status === 1).length
  }
  // 回退：笼位数据（未加载 mice 列表时保持旧逻辑）
  let count = 0
  for (const cage of cages.value) {
    if (Array.isArray(cage.mice)) {
      count += cage.mice.filter(m => m.live_status === 1).length
    }
  }
  return count
})

const activeCageCount = computed(() => {
  return cages.value.filter(cage => {
    const mouseCount = Array.isArray(cage.mice) ? cage.mice.length : (cage.mice_count ?? 0)
    return mouseCount > 0
  }).length
})

// 响应式状态
const temporaryMice = ref([])
const dragData = ref(null)
const showMouseDetail = ref(false)
const selectedMouseId = ref(null)
const cageModalVisible = ref(false)
const isEditing = ref(false)
const currentCage = reactive({
  id: '',
  cage_id: '',
  location: '',
  section: '',
  cage_type: 'normal',
  mice_birth_date: null,
  mice_genotype: ''
})

// normalizeDateValue 已从 @/utils/format 导入
const cageContextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  cage: null
})
const sectionContextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  sectionId: null,
  index: -1
})
const isSaving = ref(false)

const cageMenuOptions = computed(() => [
  { label: '编辑笼位信息', key: 'edit', icon: renderIcon(CreateOutline) },
  { label: '移动小鼠到临时区', key: 'moveToTemp', icon: renderIcon(ArrowDownOutline) },
  { label: '笼位排序互换', key: 'exchange', icon: renderIcon(SwapHorizontalOutline) },
  { label: '删除笼位', key: 'delete', icon: renderIcon(TrashOutline) },
])

const sectionMenuOptions = computed(() => [
  {
    label: '向左移', key: 'left', disabled: sectionContextMenu.index <= 0,
    icon: renderIcon(ChevronBackOutline)
  },
  {
    label: '向右移', key: 'right',
    disabled: sectionContextMenu.index >= sortedSections.value.length - 1,
    icon: renderIcon(ChevronForwardOutline)
  },
])

function onCageMenuSelect(key) {
  const cage = cageContextMenu.cage
  closeContextMenu()
  if (key === 'edit') openCageModal(cage)
  else if (key === 'moveToTemp') openMoveToTempModal(cage)
  else if (key === 'exchange') exchangeCage(cage)
  else if (key === 'delete') deleteCage(cage)
}

function onSectionMenuSelect(key) {
  if (key === 'left') moveSection(-1)
  else if (key === 'right') moveSection(1)
}

// 笼位表单校验（naive-ui 原生 required 规则）
const cageFormRef = ref(null)
const cageFormRules = {
  cage_id: {
    required: true,
    trigger: ['input', 'blur'],
    validator(rule, value) {
      if (!value || !String(value).trim()) return new Error('请输入笼位ID')
      return true
    }
  },
  section: {
    required: true,
    trigger: ['change', 'blur'],
    validator(rule, value) {
      if (!value) return new Error('请选择区域')
      return true
    }
  }
}

async function onSubmitCage() {
  try {
    await cageFormRef.value?.validate()
  } catch (errors) {
    return
  }
  if (isEditing.value) {
    await updateCage()
  } else {
    await addNewCage()
  }
}

// 搜索相关状态
const searchTerm = ref('')
const searchResults = ref([])
const currentResultIndex = ref(-1)
const highlightedCageId = ref(null)

const swapStatus = ref(null)
const sourceCage = ref(null)
const targetCage = ref(null)
const cageSlotCount = ref(12)

const showTemporaryDrawer = ref(false)

// ========= 临时区穿梭框相关 =========
const drawerTransferSelected = ref([])
const drawerTargetCageId = ref(null)
const pendingMiceTransfer = ref([]) // 用于暂存要转移到“新笼位”的小鼠

const drawerTransferOptions = computed(() => {
  return temporaryMice.value.map(m => ({
    label: `${m.id} (${m.sex === 'F' ? '♀' : (m.sex === 'Mixed' ? '⚥' : '♂')})`,
    value: m.tid
  }))
})

const allCageOptions = computed(() => {
  const opts = cages.value.map(c => ({
    label: `${c.section} - ${c.cage_id} ${c.location ? '(' + c.location + ')' : ''}`,
    value: c.id
  }))
  opts.unshift({ label: '+ 添加到新笼位', value: 'new' })
  return opts
})

// ========= 移至临时区穿梭框相关 =========
const showMoveToTempModal = ref(false)
const currentMoveToTempCage = ref(null)
const moveToTempSelected = ref([])

const moveToTempOptions = computed(() => {
  if (!currentMoveToTempCage.value) return []
  return currentMoveToTempCage.value.mice.map(m => ({
    label: `${m.id} (${m.sex === 'F' ? '♀' : (m.sex === 'Mixed' ? '⚥' : '♂')})`,
    value: m.tid
  }))
})

function openMoveToTempModal(cage) {
  currentMoveToTempCage.value = cage
  moveToTempSelected.value = []
  showMoveToTempModal.value = true
  closeContextMenu()
}

// 批量转移核心函数
async function performMiceMove(mouseTidArray, targetCageId) {
  isSaving.value = true
  try {
    for (const mouseTid of mouseTidArray) {
      await api.put(`/cage`, {
        cage_id: targetCageId,
        mouse_id: mouseTid
      })
      // 本地状态更新：找到鼠标来源
      let sourceCageId = -1
      let mouse = temporaryMice.value.find(m => m.tid === mouseTid)
      if (!mouse) {
        for (const cage of cages.value) {
          mouse = cage.mice.find(m => m.tid === mouseTid)
          if (mouse) {
            sourceCageId = cage.id
            break
          }
        }
      }
      if (mouse) {
        removeMouseFromSource(mouseTid, sourceCageId)
        addMouseToTarget(mouse, targetCageId)
      }
    }
  } catch(err) {
    console.error('转移小鼠失败', err)
    message.error(`部分或全部小鼠转移失败`)
    throw err
  } finally {
    isSaving.value = false
  }
}

async function handleDrawerTransferConfirm() {
  if (drawerTargetCageId.value === 'new') {
    // 准备转移到新笼位
    pendingMiceTransfer.value = [...drawerTransferSelected.value]
    showTemporaryDrawer.value = false
    openCageModal(null)
    return
  }
  
  const targetId = drawerTargetCageId.value
  try {
    await performMiceMove(drawerTransferSelected.value, targetId)
    drawerTransferSelected.value = []
    drawerTargetCageId.value = null
    message.success('已成功转移到目标笼位')
  } catch (e) {
    // Error handled in performMiceMove
  }
}

async function handleMoveToTempConfirm() {
  try {
    await performMiceMove(moveToTempSelected.value, -1)
    moveToTempSelected.value = []
    showMoveToTempModal.value = false
    message.success('已成功移动到临时区')
  } catch (e) {
    // Error handled in performMiceMove
  }
}

const mouseTableColumns = [
  {
    title: '性别',
    key: 'sex',
    width: 50,
    align: 'center',
    render(row) {
      if (row.type !== 'mouse') return null
      const isMixed = row.mouse.sex === 'Mixed'
      return h('n-tag', {
        size: 'small',
        type: row.mouse.sex === 'F' ? 'error' : (isMixed ? 'default' : 'info'),
        round: true,
        style: isMixed ? { backgroundColor: 'color-mix(in srgb, #a25bc4 18%, var(--n-color))', color: '#a25bc4', borderColor: 'transparent' } : {}
      }, { default: () => row.mouse.sex === 'F' ? '♀' : (isMixed ? '⚥' : '♂') })
    }
  },
  {
    title: '小鼠ID',
    key: 'mouseId',
    align: 'center',
    ellipsis: { tooltip: true },
    render(row) {
      if (row.type !== 'mouse') return null
      return row.mouse.id
    }
  },
  {
    title: '年龄',
    key: 'days',
    width: 60,
    align: 'center',
    render(row) {
      if (row.type !== 'mouse') return null
      return !row.mouse.days || row.mouse.days === 'none' ? 'NA' : `${row.mouse.days}天`
    }
  }
]

// 监听搜索词变化
watch(searchTerm, (newVal) => {
  if (!newVal) {
    clearSearch()
  }
})

// 计算属性 - 按 order 排序后的部分
const sortedSections = computed(() => {
  return [...locations.value].sort((a, b) => {
    const orderA = typeof a.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER
    const orderB = typeof b.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER
    return orderA - orderB
  })
})

const filteredSectionCages = computed(() => cageStore.filteredCages || [])

function getCagesBySection(sectionIdentifier) {
  return cages.value.filter(cage => cage.section === sectionIdentifier)
}

const matrixCells = computed(() => {
  const total = Math.max(1, Number(cageSlotCount.value) || 1)
  return Array.from({ length: total }, (_, index) => filteredSectionCages.value[index] || null)
})

function getMatrixCellsForSection(sectionIdentifier) {
  const sectionCages = getCagesBySection(sectionIdentifier)
  const total = Math.max(1, Number(cageSlotCount.value) || 1)
  return Array.from({ length: total }, (_, index) => sectionCages[index] || null)
}
const matrixGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${effectiveMatrixCols.value}, var(--cage-card-width))`,
  gridTemplateRows: `repeat(${effectiveMatrixRows.value}, var(--cage-card-height))`
}))

// 生命周期钩子
onMounted(async () => {
  await fetchTemporaryMice()
  // 确保小鼠列表已加载（用于存活统计与全局一致性）
  if (!allMice.value || allMice.value.length === 0) {
    try { await geneStore.loadMice() } catch (e) { /* ignore */ }
  }
})

onUnmounted(() => {
  closeContextMenu()
  closeSectionContextMenu()
})

// 获取临时区小鼠数据
async function fetchTemporaryMice() {
  try {
    const response = await api.get('/cages/-1')
    temporaryMice.value = response.data.map(mouse => ({ ...mouse }))
  } catch (error) {
    console.error('获取临时区小鼠信息失败:', error)
  }
}

// 拖动开始
function handleDragStart(event, mouseId, sourceCageId) {
  dragData.value = {
    mouseId,
    sourceCageId
  }
  event.dataTransfer.setData('text/plain', mouseId)
}

// 放置处理
async function handleDrop(event, targetCageId) {
  event.preventDefault()
  if (dragData.value) {
    const { mouseId, sourceCageId } = dragData.value
    
    try {
      // 更新数据库
      await api.put(`/cage`, {
        cage_id: targetCageId,
        mouse_id: mouseId
      })
      // 更新本地数据
      const mouse = removeMouseFromSource(mouseId, sourceCageId)
      addMouseToTarget(mouse, targetCageId)
    } catch (error) {
      console.error('移动小鼠失败:', error)
      message.error('移动小鼠失败，请重试')
    }
    
    dragData.value = null
  }
}

// 更新本地数据：从源位置移除小鼠
function removeMouseFromSource(mouseId, sourceCageId) {
  // 从临时区移除
  if (sourceCageId === -1) {
    const mouse = temporaryMice.value.find(mouse => mouse.tid === mouseId)
    temporaryMice.value = temporaryMice.value.filter(mouse => mouse.tid !== mouseId)
    return mouse
  }
  // 从笼位中移除
  const cageIndex = cages.value.findIndex(cage => cage.id === sourceCageId)
  if (cageIndex !== -1) {
    const mouse = cages.value[cageIndex].mice.find(mouse => mouse.tid === mouseId)
    cages.value[cageIndex].mice = cages.value[cageIndex].mice.filter(mouse => mouse.tid !== mouseId)
    return mouse
  }
}

// 更新本地数据：添加到目标位置
function addMouseToTarget(mouse, targetCageId) {
  try {
    if (targetCageId === -1) {
      // 添加到临时区
      if (!temporaryMice.value) temporaryMice.value = []
      temporaryMice.value.push({...mouse})
    } else {
      // 添加到笼位
      const cage = cages.value.find(cage => cage.id === targetCageId)
      if (cage) {
        if (!cage.mice) cage.mice = []
        cage.mice.push({...mouse})
      }
    }
  } catch (error) {
    console.error('获取小鼠详情失败:', error)
  }
}

// 打开小鼠详情
function openMouseDetail(mouseId) {
  selectedMouseId.value = mouseId
  showMouseDetail.value = true
}

// 打开笼位对话框
function openCageModal(cage) {
  isEditing.value = cage
  
  if (isEditing.value) {
    // 编辑模式：填充当前笼位数据
    Object.assign(currentCage, { ...cage })
    currentCage.mice_birth_date = normalizeDateValue(currentCage.mice_birth_date)
  } else {
    // 添加模式：重置表单
    Object.assign(currentCage, {
      id: '',
      cage_id: '',
      location: '',
      section: activeSection.value,
      cage_type: 'normal',
      mice_birth_date: null,
      mice_genotype: ''
    })
  }
  
  cageModalVisible.value = true
  nextTick(() => {
    cageFormRef.value?.restoreValidation?.()
  })
}

function closeCageModal(){
  isEditing.value = false
  cageModalVisible.value = false
  Object.assign(currentCage, {
    id: '',
    cage_id: '',
    location: '',
    section: activeSection.value,
    cage_type: 'normal',
    mice_birth_date: null,
    mice_genotype: ''
  })
  pendingMiceTransfer.value = []
}

// 添加新笼位（必填校验由 n-form 完成）
async function addNewCage() {
  isSaving.value = true
  try {
    const responseId = await api.post('/cages', currentCage)
    const newCageId = responseId.data.id
    cages.value.push({
      ...currentCage,
      'mice': [],
      'id': newCageId
    })
    
    const hasPendingMice = pendingMiceTransfer.value && pendingMiceTransfer.value.length > 0;
    const tidsToMove = hasPendingMice ? [...pendingMiceTransfer.value] : [];
    
    closeCageModal()
    message.success('添加笼位成功')
    
    if (hasPendingMice) {
      // 在完成新建后，立刻执行剩余的转移逻辑
      await performMiceMove(tidsToMove, newCageId)
      drawerTransferSelected.value = []
      drawerTargetCageId.value = null
      message.success('小鼠已成功移入新笼位')
    }
  } catch (error) {
    console.error('添加笼位失败:', error)
    message.error('添加笼位失败，请重试')
  } finally {
    isSaving.value = false
  }
}

// 打开笼位上下文菜单
function openCageContextMenu(event, cage) {
  cageContextMenu.visible = false
  nextTick(() => {
    cageContextMenu.x = event.clientX
    cageContextMenu.y = event.clientY
    cageContextMenu.cage = cage
    cageContextMenu.visible = true
  })
}

// 关闭上下文菜单
function closeContextMenu() {
  cageContextMenu.visible = false
}

// 判定笼位性别显示：empty（空笼，合理的显示边界）、breeding、mixed、F、M、unknown
function getCageSexState(cage) {
  if (!cage) return 'empty'
  if (cage.cage_type === 'breeding') return 'breeding'
  const miceList = Array.isArray(cage.mice) ? cage.mice : []
  if (miceList.length === 0) return 'empty'
  const sexes = new Set(miceList.map(m => m.sex).filter(s => s === 'M' || s === 'F'))
  if (sexes.size > 1) return 'mixed'
  if (cage.mice_sex === 'Mixed') return 'mixed'
  if (sexes.has('F') || cage.mice_sex === 'F') return 'F'
  if (sexes.has('M') || cage.mice_sex === 'M') return 'M'
  return 'unknown'
}

function getCageSexIcon(cage) {
  const state = getCageSexState(cage)
  if (state === 'breeding' || state === 'mixed') return MaleFemaleOutline
  if (state === 'F') return FemaleOutline
  if (state === 'M') return MaleOutline
  return HelpCircleOutline
}

function getCageSexClass(cage) {
  const state = getCageSexState(cage)
  if (state === 'breeding' || state === 'mixed') return 'sex-mark-mixed'
  if (state === 'F') return 'sex-mark-female'
  if (state === 'M') return 'sex-mark-male'
  return 'sex-mark-unknown'
}

// 非繁殖笼 + 混合性别 → 触发黄色警告图标 + tooltip
function isCageMixedSexWarning(cage) {
  if (!cage || cage.cage_type === 'breeding') return false
  const miceList = Array.isArray(cage.mice) ? cage.mice : []
  if (miceList.length < 2) return false
  const sexes = new Set(miceList.map(m => m.sex).filter(s => s === 'M' || s === 'F'))
  return sexes.size > 1
}

function getGenotypeTagType(genotype) {
  if (!genotype) return 'default'
  const lower = genotype.toLowerCase()
  if (lower.includes('ko') || lower.includes('knockout') || lower.includes('-/-')) return 'error'
  if (lower.includes('wt') || lower.includes('wild') || lower.includes('+/+')) return 'success'
  if (lower.includes('het') || lower.includes('+/-')) return 'warning'
  return 'info'
}

function getCageCountType(cage) {
  const count = cage.mice?.length ?? cage.mice_count ?? 0
  if (count === 0) return 'default'
  if (count >= 5) return 'warning'
  return 'success'
}

function getCageDisplayRows(cage) {
  const mice = Array.isArray(cage?.mice) ? cage.mice : []
  return mice.map(mouse => ({ type: 'mouse', mouse }))
}

// 打开 section 右键菜单
function openSectionContextMenu(event, section, index) {
  sectionContextMenu.visible = false
  nextTick(() => {
    sectionContextMenu.x = event.clientX
    sectionContextMenu.y = event.clientY
    sectionContextMenu.sectionId = section.id
    sectionContextMenu.index = index
    sectionContextMenu.visible = true
  })
}

function closeSectionContextMenu() {
  sectionContextMenu.visible = false
  sectionContextMenu.sectionId = null
  sectionContextMenu.index = -1
}

async function moveSection(direction) {
  if (sectionContextMenu.sectionId === null) return

  const orderedSections = [...sortedSections.value]
  const currentIndex = orderedSections.findIndex(section => section.id === sectionContextMenu.sectionId)
  if (currentIndex === -1) {
    closeSectionContextMenu()
    return
  }

  const targetIndex = currentIndex + direction
  if (targetIndex < 0) {
    message.info('已经在最左侧')
    closeSectionContextMenu()
    return
  }
  if (targetIndex >= orderedSections.length) {
    message.info('已经在最右侧')
    closeSectionContextMenu()
    return
  }

  const previousSections = [...locations.value]
  const temp = orderedSections[currentIndex]
  orderedSections[currentIndex] = orderedSections[targetIndex]
  orderedSections[targetIndex] = temp

  const updatedSections = orderedSections.map((section, index) => ({
    ...section,
    order: index
  }))

  locations.value = updatedSections

  try {
    await api.put('/locations/order', {
      order: updatedSections.map(section => ({
        id: section.id,
        order: section.order
      }))
    })
    message.success('标签页顺序更新成功')
  } catch (error) {
    locations.value = previousSections
    console.error('更新标签页顺序失败:', error)
    message.error('更新标签页顺序失败，请重试')
  } finally {
    closeSectionContextMenu()
  }
}

// 更新笼位信息
async function updateCage() {
  if (!currentCage.section) {
    message.info("未填写区域")
    return
  }
  isSaving.value = true
  try {
    await api.put(`/cages/${currentCage.id}`, {
      cage_id: currentCage.cage_id,
      location: currentCage.location,
      section: currentCage.section,
      cage_type: currentCage.cage_type,
      mice_birth_date: currentCage.mice_birth_date,
      mice_genotype: currentCage.mice_genotype
    })
    // 更新本地数据
    const index = cages.value.findIndex(c => c.id === currentCage.id)
    if (index !== -1) {
      cages.value[index].cage_id = currentCage.cage_id
      cages.value[index].location = currentCage.location
      cages.value[index].section = currentCage.section
      cages.value[index].cage_type = currentCage.cage_type
      cages.value[index].mice_birth_date = currentCage.mice_birth_date
      cages.value[index].mice_genotype = currentCage.mice_genotype
    }
    message.success("笼位更新成功")
    closeCageModal()
  } catch (error) {
    console.error('修改笼位失败:', error)
    message.error('修改笼位失败，请重试')
  } finally {
    isSaving.value = false
  }
}

// 删除笼位
async function deleteCage(cage) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除笼位 ${cage.cage_id} 吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.delete(`/cages/${cage.id}`)
        // 更新本地数据
        const index = cages.value.findIndex(c => c.id === cage.id)
        if (index !== -1) {
          cage.mice.forEach(m=> {
            temporaryMice.value.push(m)
          })
          cages.value.splice(index, 1)
        }
        closeContextMenu()
        message.success('成功删除笼位')
      } catch (error) {
        console.error('删除笼位失败:', error)
        message.error('删除笼位失败，请重试')
      }
    }
  })
}

let timeoutId = null

// 开始笼位互换
async function exchangeCage(cage) {
  sourceCage.value = cage
  swapStatus.value = "select-source"
  closeContextMenu()
  message.info("请单击你想交换位置的笼位")
  
  timeoutId = setTimeout(() => {
    cancelSwap()
  }, 8000)
}

// 处理笼位点击
function handleCageClick(cage) {
  if (swapStatus.value === "select-source") {
    if (sourceCage.value.id === cage.id) {
      message.warning("不能选择同一个笼位进行互换")
      return
    }
    
    targetCage.value = cage
    swapStatus.value = "select-target"
  }
}

// 确认互换操作
function confirmSwap() {
  if (!sourceCage.value || !targetCage.value) return
  
  // 更新笼位列表（在实际应用中应调用API更新数据库）
  updateCageOrder(sourceCage.value.id, targetCage.value.id)
  
  message.success(`笼位 ${sourceCage.value.cage_id} 和 ${targetCage.value.cage_id} 位置已互换`)
  clearTimeout(timeoutId)
  // 重置状态
  resetSwapState()
}

// 取消互换操作
function cancelSwap() {
  message.error("已取消笼位互换操作")
  resetSwapState()
}

// 重置互换状态
function resetSwapState() {
  swapStatus.value = null
  sourceCage.value = null
  targetCage.value = null
}

// API更新笼位排序
async function updateCageOrder(cage_from_id, cage_to_id) {
  await api.put('/cages/order', {id_from: cage_from_id, id_to: cage_to_id})
  const indexI = cages.value.findIndex(c => c.id === cage_from_id)
  const indexJ = cages.value.findIndex(c => c.id === cage_to_id)
  if (indexI !== -1 && indexJ !== -1) {
    const temp = cages.value[indexI];
    cages.value[indexI] = cages.value[indexJ];
    cages.value[indexJ] = temp;
  }
}

const isGeneratingPDF = ref(false);
const today = new Date();
const today_formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;


// PDF导出函数
const exportToPDF = async () => {
  isGeneratingPDF.value = true;
  
  try {
    // 获取当前区域的笼位数据
    const sectionCages = cages.value.filter(
      cage => cage.section === activeSection.value
    );
    
    if (sectionCages.length === 0) {
      message.info("本区域无笼位，无法导出pdf")
      return
    }
    // 渲染PDF内容
    renderPDFContent(sectionCages, activeSection.value);
    
    // 等待DOM更新
    await nextTick();
    
    // 使用 PyWebview 的保存文件对话框
    if (window.pywebview && window.pywebview.api) {
      const filename = `${today_formatted} ${activeSection.value}.pdf`;
      const arrayBuffer = await generatePDFAsArrayBuffer();
      const uint8array = new Uint8Array(arrayBuffer)
      const dataArray = Array.from(uint8array)
      const state = await window.pywebview.api.save_file_dialog(dataArray, filename)
      if(state.success){
        message.success(`导出成功，文件路径：${state.path}`)
      } else {
        message.info(state.message || "导出失败")
      }
    } else {
      const arrayBuffer = await generatePDFAsArrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${today_formatted} ${activeSection.value}.pdf`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      message.success('PDF导出成功');
    }
  } catch (error) {
    console.error('导出PDF失败:', error);
    message.error('导出PDF失败，请重试');
  } finally {
    isGeneratingPDF.value = false;
  }
};

// 渲染PDF内容到隐藏区域
const renderPDFContent = (cages, sectionName) => {
  const pdfRenderArea = pdfRenderAreaEl.value;
  pdfRenderArea.innerHTML = '';
  
  // 按每页20个笼位分页
  const cagesPerPage = 12;
  const pageCount = Math.ceil(cages.length / cagesPerPage);
  
  // 创建分页
  for (let page = 0; page < pageCount; page++) {
    const pageDiv = document.createElement('div');
    pageDiv.className = 'pdf-page';
    
    // 添加页眉
    const header = document.createElement('div');
    header.className = 'pdf-header';
    header.innerHTML = `<h2>${today_formatted} -- ${sectionName}</h2><p>第${page + 1}页，共${pageCount}页</p>`;
    pageDiv.appendChild(header);
    
    // 创建笼位网格
    const grid = document.createElement('div');
    grid.className = 'pdf-cage-grid';
    
    // 获取当前页的笼位
    const startIdx = page * cagesPerPage;
    const endIdx = Math.min(startIdx + cagesPerPage, cages.length);
    const pageCages = cages.slice(startIdx, endIdx);
    
    // 填充笼位
    pageCages.forEach(cage => {
      const cageCard = document.createElement('div');
      cageCard.className = `pdf-cage-card ${cage.cage_type === 'breeding' ? 'breeding' : ''}`;
      
      // 笼位ID和位置
      const cageId = document.createElement('div');
      cageId.className = 'pdf-cage-id';
      if (cage.location) {
        cageId.textContent = cage.cage_id + " " + cage.location;
      } else {
        cageId.textContent = cage.cage_id;
      }
      
      cageCard.appendChild(cageId);
      
      // 小鼠列表
      const miceContainer = document.createElement('div');
      miceContainer.className = 'pdf-cage-mice';
      
      if (cage.mice && cage.mice.length > 0) {
        cage.mice.forEach(mouse => {
          const mouseItem = document.createElement('div');
          mouseItem.className = 'pdf-mouse-item';
          
          const mouseSex = document.createElement('div');
          mouseSex.className = `pdf-mouse-sex ${mouse.sex === 'F' ? 'sex-female' : 'sex-male'}`;
          mouseSex.textContent = mouse.sex === 'F' ? '♀' : '♂';
          
          const mouseInfo = document.createElement('div');
          mouseInfo.className = 'pdf-mouse-info';
          
          const mouseId = document.createElement('div');
          mouseId.className = 'pdf-mouse-id';
          mouseId.textContent = mouse.id;
          
          const mouseGenotype = document.createElement('div');
          mouseGenotype.className = 'pdf-mouse-genotype';
          mouseGenotype.innerHTML = mouse.genotype;
          
          mouseInfo.appendChild(mouseId);
          mouseInfo.appendChild(mouseGenotype);

          const mouseDays = document.createElement('div');
          mouseDays.className = 'pdf-mouse-days';
          
          if (!mouse.days || mouse.days === 'none') {
            mouseDays.textContent = 'NA';
          } else {
            mouseDays.textContent = `${mouse.days}天`;
          }
          
          mouseItem.appendChild(mouseSex);
          mouseItem.appendChild(mouseInfo);
          mouseItem.appendChild(mouseDays);
          
          miceContainer.appendChild(mouseItem);
        });
      } else {
        const emptyText = document.createElement('div');
        emptyText.className = 'pdf-empty-cage';
        emptyText.textContent = '空笼位';
        miceContainer.appendChild(emptyText);
      }
      
      cageCard.appendChild(miceContainer);
      grid.appendChild(cageCard);
    });
    
    pageDiv.appendChild(grid);
    pdfRenderArea.appendChild(pageDiv);
  }
};

// 生成PDF文件并返回ArrayBuffer
const generatePDFAsArrayBuffer = () => {
  return new Promise((resolve, reject) => {
    const pdfRenderArea = pdfRenderAreaEl.value;
    
    html2canvas(pdfRenderArea, {
      scale: 2,
      useCORS: true,
      logging: false
    }).then(canvas => {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const imgWidth = 210; // A4宽度（毫米）
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let position = 0;
      
      // 添加第一页
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      
      // 如果内容超过一页，添加额外页面
      if (imgHeight > 297) {
        let remainingHeight = imgHeight;
        
        while (remainingHeight > 297) {
          position -= 297;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          remainingHeight -= 297;
        }
      }
      
      // 获取PDF文件的ArrayBuffer
      const blob = pdf.output('blob');
      const reader = new FileReader();
      
      reader.onload = function() {
        resolve(reader.result);
      };
      
      reader.onerror = function() {
        reject(new Error('无法读取PDF文件'));
      };
      
      reader.readAsArrayBuffer(blob);
      
      // 清空渲染区域
      pdfRenderArea.innerHTML = '';
    }).catch(reject);
  });
};

// 添加搜索方法
function performSearch() {
  if (!searchTerm.value.trim()) {
    clearSearch()
    return
  }
  
  const term = searchTerm.value.toLowerCase().trim()
  searchResults.value = []
  
  // 搜索所有笼位中的小鼠
  cages.value.forEach(cage => {
    if (cage.mice && cage.mice.length > 0) {
      cage.mice.forEach(mouse => {
        if (mouse.id.toLowerCase().includes(term)) {
          searchResults.value.push({
            mouse: mouse,
            cage: cage
          })
        }
      })
    }
  })
  
  // 搜索临时区中的小鼠
  if (temporaryMice.value && temporaryMice.value.length > 0) {
    temporaryMice.value.forEach(mouse => {
      if (mouse.id.toLowerCase().includes(term)) {
        searchResults.value.push({
          mouse: mouse,
          cage: { 
            id: -1, 
            cage_id: '临时区', 
            section: '临时存放区' 
          }
        })
      }
    })
  }
  
  // 如果有结果，高亮第一个
  if (searchResults.value.length > 0) {
    currentResultIndex.value = 0
    highlightSearchResult(searchResults.value[0])
  } else {
    currentResultIndex.value = -1
    highlightedCageId.value = null
  }
}

// 清除搜索
function clearSearch() {
  searchTerm.value = ''
  searchResults.value = []
  currentResultIndex.value = -1
  highlightedCageId.value = null
}

// 导航搜索结果
function navigateResults(direction) {
  if (searchResults.value.length === 0) return
  
  const newIndex = currentResultIndex.value + direction
  if (newIndex >= 0 && newIndex < searchResults.value.length) {
    currentResultIndex.value = newIndex
    highlightSearchResult(searchResults.value[newIndex])
  }
}

// 选择搜索结果
function selectSearchResult(result, index) {
  currentResultIndex.value = index
  highlightSearchResult(result)
}

// 高亮搜索结果
function highlightSearchResult(result) {
  highlightedCageId.value = result.cage.id
  
  // 如果结果在临时区，确保临时区可见
  if (result.cage.id === -1) {
    showTemporaryDrawer.value = true
  } else {
    // 切换到正确的section
    activeSection.value = result.cage.section
  }
  
  // 滚动到可见区域
  nextTick(() => {
    // 滚动到笼位
    const cageElement = cageRefs[result.cage.id]
    if (cageElement) {
      cageElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  })
}

// 检查笼位是否应该高亮
function isCageHighlighted(cageId) {
  return highlightedCageId.value === cageId
}
</script>

<style scoped>

/* 主容器布局 */
.main-content {
  height: 100%;
  min-height: 0;
}

.content-header {
  margin-bottom: 12px;
  row-gap: 14px;
}

/* 左列：标题 + 统计，左对齐 */
.header-title-col {
  display: flex;
  align-items: center;
}

.header-title-section {
  display: flex;
  align-items: center;
  gap: 32px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
}

.header-stats-panel {
  display: flex;
  gap: 24px;
}

.header-stats-panel :deep(.n-statistic) {
  text-align: center;
}

.header-stats-panel :deep(.n-statistic .n-statistic-label) {
  color: var(--n-text-color-2);
  font-size: 12px;
}

.header-stats-panel :deep(.n-statistic .n-statistic-value) {
  font-size: 20px;
  font-weight: 600;
}

/* 右列：5 个控件 —— 宽屏右对齐，窄屏铺满 */
.header-controls-col {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.header-controls-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: end;
  width: 100%;
  flex-wrap: nowrap;
}

.controls-row-1 .search-container {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 260px;
}

.controls-row-1 .slot-toolbar {
  flex: 0 0 auto;
}

.controls-row-2 :deep(.n-button) {
  flex: 0 0 auto;
}

.slot-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.slot-toolbar :deep(.n-input-number) {
  width: 90px;
}

.slot-label {
  color: var(--n-text-color-2);
  font-size: 13px;
  white-space: nowrap;
}

/* 移动端（<640px）：
   - 标题 + 统计占一行
   - 搜索框 + 笼位插槽一行两端对齐
   - 三个按钮一行两端对齐，隐藏图标以确保不换行 */
@media (max-width: 768px) {
 .controls-row-2 :deep(.n-button .n-button__icon) {
    display: none;
 }
}

@media (max-width: 640px) {
  .controls-row-1 {
    justify-content: center;
  }
  .controls-row-2 {
    justify-content: center;
  }
   .header-title-col {
    display: none;
 }

}

.cage-flex-container {
  --cage-card-width: 270px;
  --cage-card-height: 340px;
}

.cage-scroll-container {
  flex: 1 1 auto;
  min-height: 0;
}

.cage-scroll-container :deep(.n-scrollbar-container) {
  flex: 1 1 auto;
  min-height: 0;
}

.cage-flex-container :deep(.matrix-cell) {
  width: var(--cage-card-width);
  height: var(--cage-card-height);
}

.matrix-cell {
  width: var(--cage-card-width);
  height: var(--cage-card-height);
}

.cage-slot-empty {
  width: 100%;
  height: 100%;
  border: 1px dashed var(--n-border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--n-text-color-disabled);
}

/* Section标签页样式 */
.section-tabs {
  border-bottom: 1px solid var(--n-border-color);
  margin-bottom: 0;
  padding: 0 4px 4px;
}

.section-tabs :deep(.n-tabs-nav) {
  overflow-x: auto;
  overflow-y: hidden;
}

.section-tabs :deep(.n-tabs-wrapper) {
  width: 100%;
}

.segment-tab-label {
  user-select: none;
  white-space: nowrap;
}

/* 保持其他样式不变 */

/* 笼位卡片样式 */
.cage-card {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 8px;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.cage-card-body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.cage-card:hover {
  box-shadow: 0 4px 8px color-mix(in srgb, var(--n-text-color) 10%, transparent);
  transform: translateY(-2px);
}

.cage-card :deep(.n-card) {
  height: 100%;
}

.cage-card :deep(.n-card__content) {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 4px;
  overflow: hidden;
  box-sizing: border-box;
  gap: 8px;
  max-height: 100%;
}

.cage-card :deep(.n-card__content > *:not(.cage-table-wrapper)) {
  flex-shrink: 0;
}

.cage-card :deep(.n-data-table-wrapper) {
  max-height: 100% !important;
  overflow: hidden !important;
  flex: 1 !important;
  min-height: 0 !important;
}

.cage-card :deep(.n-data-table) {
  max-height: 100% !important;
  height: 100% !important;
  overflow: hidden !important;
}

.cage-card :deep(.n-data-table .n-data-table-base-table) {
  max-height: 100% !important;
}

.cage-card :deep(.n-data-table-body) {
  max-height: calc(100% - 32px) !important; /* reserve space for table header */
  overflow-y: auto !important;
}

.cage-card :deep(.n-data-table-tr) {
  height: 32px !important;
}

.cage-card.breeding {
  outline: 2px solid color-mix(in srgb, var(--n-error-color) 40%, transparent);
}

.action-btn {
  font-size: 27px;
}

.cage-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0px 0px 8px;
  background: var(--n-color-embedded);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.cage-header:hover {
  background: color-mix(in srgb, var(--n-color-embedded) 80%, var(--n-primary-color));
}

.cage-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 8px;
}

.cage-identifier {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.cage-sex-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 23px;
  flex-shrink: 0;
  box-sizing: border-box;
}

.sex-mark-mixed {
  background-color: color-mix(in srgb, #a25bc4 18%, transparent);
  color: #a25bc4;
}

.sex-mark-female {
  background-color: color-mix(in srgb, #d03050 18%, transparent);
  color: #d03050;
}

.sex-mark-male {
  background-color: color-mix(in srgb, #2080f0 18%, transparent);
  color: #2080f0;
}

.sex-mark-unknown {
  background-color: color-mix(in srgb, #808080 18%, transparent);
  color: #808080;
}

.sex-mark-warning {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 20px;
  flex-shrink: 0;
  box-sizing: border-box;
  background-color: color-mix(in srgb, var(--n-warning-color, #f0a020) 18%, transparent);
  color: var(--n-warning-color, #f0a020);
  cursor: help;
}

.cage-id-text {
  font-size: 20px;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--n-text-color-1);
}

.cage-actions-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 1;
  flex-wrap: nowrap;
  justify-content: flex-end;
  min-width: 0;
  overflow: hidden;
}

.cage-count-badge {
  font-weight: bold;
}

.cage-genotype-badge {
  max-width: 100px;
  font-weight: 600;
  flex-shrink: 1;
}

.cage-genotype-badge :deep(.n-tag__content) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cage-card :deep(.n-data-table) {
  overflow: hidden;
}

.cage-card :deep(.n-data-table .n-data-table-td) {
  height: 32px;
}

.cage-table-wrapper {
  flex: 1 1 0;
  min-height: 0;
  max-height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 6px;
  border: 1px solid var(--n-border-color);
}

.cage-table-wrapper :deep(.n-data-table) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.cage-table-wrapper :deep(.n-data-table-wrapper) {
  flex: 1;
  min-height: 0;
}

.cage-mice-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.cage-mice-table th,
.cage-mice-table td {
  border-bottom: 1px solid var(--n-border-color);
  text-align: center;
  padding: 8px 6px;
  font-size: 13px;
}

.cage-mice-table th {
  position: sticky;
  top: 0;
  background: var(--n-color-embedded);
  z-index: 1;
  font-size: 12px;
  font-weight: 600;
  color: var(--n-text-color-2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.cage-mice-table tr:last-child td {
  border-bottom: none;
}

.mouse-row {
  cursor: pointer;
  transition: background 0.15s;
}

.mouse-row:hover {
  background: var(--n-info-color-suppl);
}

.placeholder-row td {
  color: transparent;
  border-bottom-color: transparent;
}

.cage-empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background-color: color-mix(in srgb, var(--n-color-embedded) 40%, transparent);
  border-radius: 6px;
  border: 1px dashed var(--n-border-color);
}

.cage-slot-empty {
  height: 100%;
  background-color: var(--n-color);
  border: 2px dashed var(--n-border-color);
  border-radius: var(--n-border-radius, 8px);
  cursor: pointer;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.cage-slot-empty:hover {
  border-color: var(--n-primary-color);
}

.cage-slot-empty :deep(.n-card__content) {
  height: 100%;
  padding: 0;
}

.empty-slot-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--n-text-color-disabled);
  gap: 8px;
  transition: color 0.2s ease;
}

.cage-slot-empty:hover .empty-slot-content {
  color: var(--n-primary-color);
}

.empty-slot-content .slot-icon {
  font-size: 32px;
  opacity: 0.8;
}

.empty-slot-content span {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.mouse-sex {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
  overflow: hidden;
  box-sizing: border-box;
}

.sex-mixed {
  background-color: color-mix(in srgb, #a25bc4 18%, transparent);
  color: #a25bc4;
}

.sex-female {
  background-color: color-mix(in srgb, #d03050 18%, transparent);
  color: #d03050;
}

.sex-male {
  background-color: color-mix(in srgb, #2080f0 18%, transparent);
  color: #2080f0;
}

.mouse-info {
  flex-grow: 1;
}

.mouse-id {
  font-weight: 600;
  font-size: 1rem;
}

.mouse-genotype {
  font-size: 0.8rem;
  color: var(--n-text-color-3);
  max-width: 70px;
  overflow: auto;
}

.mouse-days {
  font-size: 1rem;
  color: var(--n-text-color-1);
}

.temporary-drawer-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.temporary-drawer-header {
  margin-bottom: 4px;
}

.temporary-drop-zone {
  border: 1px dashed var(--n-border-color);
  border-radius: 10px;
  background: var(--n-color-embedded);
  padding: 12px;
  overflow: auto;
  min-height: 230px;
}

.temporary-mouse-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.temporary-mouse-item {
  cursor: grab;
}

.temporary-mouse-content {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.temporary-mouse-content .mouse-days {
  white-space: nowrap;
}

/* 对话框样式 */
.dialog-container {
  z-index: 2;
  background-color: var(--n-color);
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px color-mix(in srgb, var(--n-text-color) 20%, transparent);
}

.dialog-container h2 {
  margin-top: 0;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.dialog-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}


.cage-card.swap-source {
    border-color: var(--n-primary-color);
    animation: pulse 1.5s infinite;
}

.cage-card.swap-target {
  border-color: var(--n-success-color);
    animation: pulse-green 1.5s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--n-primary-color) 40%, transparent); }
  70% { box-shadow: 0 0 0 10px color-mix(in srgb, var(--n-primary-color) 0%, transparent); }
  100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--n-primary-color) 0%, transparent); }
}

@keyframes pulse-green {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--n-success-color) 40%, transparent); }
  70% { box-shadow: 0 0 0 10px color-mix(in srgb, var(--n-success-color) 0%, transparent); }
  100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--n-success-color) 0%, transparent); }
}

/* 弹窗样式 */
.swap-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-backdrop {
  position: absolute;
  z-index: 1;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: color-mix(in srgb, var(--n-text-color) 50%, transparent);
  backdrop-filter: blur(4px);
}

.swap-dialog {
  z-index: 2;
  background: var(--n-color);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 25px color-mix(in srgb, var(--n-text-color) 20%, transparent);
  overflow: hidden;
  padding: 25px;
}

.swap-title {
  text-align: center;
  font-size: 1.1rem;
  margin: 0 0 20px;
  color: var(--n-text-color-2);
}

.cage-pair {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selected-cage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  background: var(--n-color-embedded);
  border-radius: 8px;
  border: 1px solid var(--n-border-color);
}

.swap-icon {
  padding: 0 20px;
}

.swap-icon i {
  font-size: 36px;
  color: var(--n-primary-color);
}

.cage-info {
  margin-top: 10px;
  text-align: center;
}

.modal-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
}

/* 搜索相关样式 */
.search-container {
  position: relative;
}

.search-box {
  display: flex;
  align-items: center;
  background: var(--n-color);
  border: 1px solid var(--n-border-color);
  border-radius: 20px;
  padding: 5px 12px;
  transition: all 0.3s;
}

.search-box:focus-within {
  border-color: var(--n-primary-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--n-primary-color) 25%, transparent);
}

.search-box i {
  color: var(--n-text-color-3);
  margin-right: 8px;
}

.search-box input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
}

.search-clear {
  background: none;
  border: none;
  color: var(--n-text-color-3);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-clear:hover {
  color: var(--n-text-color-2);
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--n-color);
  border: 1px solid var(--n-border-color);
  border-radius: 4px;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--n-text-color) 10%, transparent);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
  margin-top: 5px;
}

.search-result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: var(--n-color-embedded);
  border-bottom: 1px solid var(--n-border-color);
  font-size: 12px;
  color: var(--n-text-color-3);
}

.search-nav {
  display: flex;
  gap: 4px;
}

.search-nav :deep(.n-button) {
  display: inline-flex;
}

.search-nav :deep(.n-button:disabled) {
  opacity: 0.5;
}

.search-nav :deep(.n-button:not(:disabled):hover) {
  background-color: var(--n-color-embedded);
}

.search-result-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--n-color-embedded);
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background-color: var(--n-info-color-suppl);
}

.search-result-item.active {
  background-color: color-mix(in srgb, var(--n-info-color) 18%, var(--n-color));
}

.search-result-item .mouse-sex {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}


.result-info {
  display: flex;
  gap: 10px;
  align-items: center;
}

.result-info .mouse-id {
  font-weight: 600;
  font-size: 14px;
}

.result-info .cage-info {
  font-size: 12px;
  color: var(--n-text-color-3);
}

/* 添加笼位高亮样式 */
.cage-card.search-highlight {
  border: 2px solid var(--n-primary-color);
  box-shadow: 0 0 10px color-mix(in srgb, var(--n-primary-color) 40%, transparent);
  animation: pulse-highlight 2s infinite;
}

@keyframes pulse-highlight {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--n-primary-color) 40%, transparent); }
  70% { box-shadow: 0 0 0 10px color-mix(in srgb, var(--n-primary-color) 0%, transparent); }
  100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--n-primary-color) 0%, transparent); }
}

@media (max-width: 1200px) {
  .cage-view-container {
    --cage-card-width: 240px;
    --cage-card-height: 340px;
  }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .cage-matrix-scroll {
    height: calc(100vh - 360px);
    padding: 12px;
  }

  .cage-view-container {
    --cage-card-width: 210px;
    --cage-card-height: 340px;
  }

  .cage-header-main {
    font-size: 18px;
  }

  .cage-mice-table th,
  .cage-mice-table td {
    font-size: 12px;
    padding: 6px 4px;
  }
}

.icon-hr {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 30px 0;
  color: var(--n-text-color-3);
}

.icon-hr::before,
.icon-hr::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--n-border-color);
}

.icon-hr::before {
  margin-right: 10px;
}

.icon-hr::after {
  margin-left: 10px;
}

.icon {
  width: 120px;
  height: 120px;
  margin: 0 auto 30px;
  color: var(--n-text-color-disabled);
}
h1 {
  font-size: 1.8rem;
  color: var(--n-text-color-1);
  margin-bottom: 12px;
  font-weight: 600;
}

p {
  color: var(--n-text-color-3);
  font-size: 1.1rem;
  line-height: 1.5;
}
.container {
  text-align: center;
  padding: 40px 20px;
  max-width: 400px;
}

.floating-button-group {
  position: fixed;
  left: 90%;
  top: 90%;
  z-index: 100;
  transform: translate(-50%, -50%);
}

.floating-button-group .n-button {
  width: 48px;
  height: 48px;
  font-size: 20px;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--n-text-color) 20%, transparent);
}
</style>

/* PDF渲染 - 默认隐藏 */
<style>
    .hidden-pdf-area {
      position: absolute;
      left: -9999px;
      top: -9999px;
      width: 794px; /* A4宽度(像素) */
      background: white;
      padding: 20px;
    }
    
    .pdf-page {
      width: 100%;
      padding: 15px;
      margin-bottom: 20px;
      background: white;
      box-shadow: 0 0 5px color-mix(in srgb, var(--n-text-color) 10%, transparent);
    }
    
    .pdf-header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid var(--n-text-color-1);
    }
    
    .pdf-cage-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(4, 1fr);
      gap: 12px;
    }
    
    .pdf-cage-card {
      border: 1px solid var(--n-border-color);
      border-radius: 4px;
      padding: 8px;
      width: 220px;
      height: 240px;
      display: flex;
      flex-direction: column;
      page-break-inside: avoid;
    }
    
    .pdf-cage-id {
      font-weight: bold;
      text-align: center;
      font-size: 14px;
      margin-bottom: 5px;
      border-bottom: 1px solid var(--n-border-color);
      padding-bottom: 3px;
    }
    
    .pdf-cage-mice {
      flex-grow: 1;
      overflow: hidden;
    }
    
    .pdf-mouse-item {
      display: flex;
      align-items: center;
      margin: 0;
      gap: 1px;
      font-size: 11px;
      box-sizing: border-box;
      background-color: var(--n-color-embedded); /* 添加底纹 */
      border: 1px solid var(--n-color-embedded);
    }

    /* 添加斑马条纹效果 */
.pdf-mouse-item:nth-child(odd) {
  background-color: var(--n-color-embedded);
}

.pdf-mouse-item:nth-child(even) {
  background-color: var(--n-color-embedded);
}
    
    .pdf-mouse-sex {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 5px;
      font-size: 10px;
      color: var(--n-text-color-1);
      flex-shrink: 0;
    }
    
    .pdf-mouse-info {
      overflow: hidden;
    }

    .pdf-mouse-days {
      text-align: right;
    }
    
    .pdf-mouse-id {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .pdf-mouse-genotype {
      color: var(--n-text-color-3);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .pdf-empty-cage {
      text-align: center;
      color: var(--n-text-color-3);
      font-style: italic;
      margin-top: 20px;
    }
    
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: color-mix(in srgb, var(--n-color) 80%, transparent);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      flex-direction: column;
    }
    
    .spinner {
      width: 50px;
      height: 50px;
      border: 5px solid var(--n-color-embedded);
      border-top: 5px solid var(--n-primary-color);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 15px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    </style>