<template>
  <div class="main-content">
    <n-space vertical size="large" class="content-header" id="contentHeader">
      <h1 class="page-title">笼位视图</h1>
      <!-- 搜索框 -->
      <div class="search-container">
        <div class="search-box">
          <AppIcon  name="search" />
          <n-input
            v-model:value="searchTerm"
            placeholder="搜索小鼠ID..."
            @update:value="performSearch"
            @keyup.enter="performSearch"
            clearable
          />
          <n-button v-if="searchTerm" @click="clearSearch" class="search-clear" quaternary circle>
            <AppIcon  name="close" />
          </n-button>
        </div>
        
        <!-- 搜索结果下拉框 -->
        <div v-if="searchResults.length > 0" class="search-results">
          <div class="search-result-header">
            <span>找到 {{ searchResults.length }} 个结果</span>
            <div class="search-nav">
              <n-button quaternary circle @click="navigateResults(-1)" :disabled="currentResultIndex <= 0">
                <AppIcon  name="arrow_upward" />
              </n-button>
              <n-button quaternary circle @click="navigateResults(1)" :disabled="currentResultIndex >= searchResults.length - 1">
                <AppIcon  name="arrow_downward" />
              </n-button>
            </div>
          </div>
          
          <div 
            v-for="(result, index) in searchResults" 
            :key="index" 
            class="search-result-item"
            :class="{ active: index === currentResultIndex }"
            @click="selectSearchResult(result, index)"
          >
            <div class="mouse-sex" :class="result.mouse.sex === 'F' ? 'sex-female' : 'sex-male'">
              {{ result.mouse.sex === 'F' ? '♀' : '♂' }}
            </div>
            <div class="result-info">
              <div class="mouse-id">{{ result.mouse.id }}</div>
              <div class="cage-info">{{ result.cage.section }} - {{ result.cage.cage_id }} {{ result.cage.location ? `(${result.cage.location})` : "" }}</div>
            </div>
          </div>
        </div>
      </div>

      <n-space class="action-buttons">
        <n-button secondary @click="fetchCages">
          <AppIcon  class="btn-icon" name="refresh" />
          刷新数据
        </n-button>
        <n-badge :value="temporaryMice.length" :max="99">
          <n-button secondary @click="showTemporaryDrawer = true">
            <AppIcon class="btn-icon" name="keyboard_arrow_up" />
            打开临时区
          </n-button>
        </n-badge>
        <n-button secondary @click="exportToPDF">
          <AppIcon  class="btn-icon" name="picture_as_pdf" />
          当前位置导出pdf
        </n-button>
        <n-button type="primary" @click="openCageModal(null)">
          <AppIcon  class="btn-icon" name="add" />
          添加笼位
        </n-button>
      </n-space>
    </n-space>
    
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
        </n-tab-pane>
      </n-tabs>
    </div>

    <div
      v-if="sectionContextMenu.visible"
      class="section-context-menu"
      :style="{ top: sectionContextMenu.y + 'px', left: sectionContextMenu.x + 'px' }"
    >
      <ul>
        <li
          :class="{ disabled: sectionContextMenu.index <= 0 }"
          @click="moveSection(-1)"
        >
          <AppIcon name="chevron_left" /> 向左移
        </li>
        <li
          :class="{ disabled: sectionContextMenu.index >= sortedSections.length - 1 }"
          @click="moveSection(1)"
        >
          <AppIcon name="chevron_right" /> 向右移
        </li>
      </ul>
    </div>
    
    <div class="matrix-toolbar">
      <n-space align="center" size="small">
        <span class="matrix-label">矩阵布局</span>
        <n-input-number v-model:value="matrixRows" :min="1" size="small" />
        <span>x</span>
        <n-input-number v-model:value="matrixCols" :min="1" size="small" />
      </n-space>
    </div>

    <div class="cage-view-container">
      <div v-if="locations.length > 0" class="cage-matrix-scroll" id="cageGrid">
        <div class="cage-matrix" :style="matrixGridStyle">
          <div v-for="(cage, index) in matrixCells" :key="`matrix-cell-${index}`" class="matrix-cell">
            <div
              v-if="cage"
              class="cage-card"
              :data-cage-id="cage.id"
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
                <div class="cage-card-actions">
                  <n-dropdown
                    trigger="click"
                    :options="cageActionOptions"
                    @select="(key) => handleCageActionSelect(key, cage)"
                  >
                    <n-button quaternary circle size="small" class="drag-dot-btn">
                      <span class="dot-glyph">...</span>
                    </n-button>
                  </n-dropdown>
                </div>

                <div class="cage-header" @click.stop="openCageModal(cage)">
                  <div class="cage-header-type">{{ resolveCageSexMark(cage) }}</div>
                  <div class="cage-header-title">
                    <div class="cage-header-label">编号</div>
                    <div class="cage-header-main">{{ cage.cage_id || '-' }}</div>
                  </div>
                  <div class="cage-header-genotype">{{ cage.mice_genotype || '-' }}</div>
                </div>

                <div class="cage-count-line">笼内小鼠数量：{{ cage.mice?.length ?? cage.mice_count ?? 0 }}</div>

                <div class="cage-mice-table-wrapper">
                  <table class="cage-mice-table">
                    <thead>
                      <tr>
                        <th>性别</th>
                        <th>小鼠ID</th>
                        <th>年龄</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(row, rowIndex) in getCageDisplayRows(cage)"
                        :key="`${cage.id}-${rowIndex}`"
                        class="mouse-row"
                        :class="{
                          'placeholder-row': row.type === 'placeholder',
                          'empty-label-row': row.type === 'empty-label'
                        }"
                        :draggable="row.type === 'mouse'"
                        @dragstart="row.type === 'mouse' && handleDragStart($event, row.mouse.tid, cage.id)"
                        @dblclick="row.type === 'mouse' && openMouseDetail(row.mouse.tid)"
                      >
                        <td v-if="row.type === 'mouse'">
                          <n-tag size="small" :type="row.mouse.sex === 'F' ? 'error' : 'info'" round>
                            {{ row.mouse.sex === 'F' ? '♀' : '♂' }}
                          </n-tag>
                        </td>
                        <td v-if="row.type === 'mouse'">{{ row.mouse.id }}</td>
                        <td v-if="row.type === 'mouse'">{{ !row.mouse.days || row.mouse.days === 'none' ? 'NA' : `${row.mouse.days}天` }}</td>
                        <td v-if="row.type === 'placeholder'" colspan="3">&nbsp;</td>
                        <td v-if="row.type === 'empty-label'" colspan="3" class="empty-row">空笼位</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </n-card>
            </div>

            <n-card v-else size="small" class="cage-slot-empty" :bordered="true">
              空位
            </n-card>
          </div>
        </div>
      </div>

      <div v-else style="flex: 1;padding: 80px;background-color: white;">
        <div class="container">
          <AppIcon style="font-size: 120px; color: var(--n-text-color-disabled);" name="error_outline" />
          <h1>未设定区域</h1>
          <p>请前往设置页面设定区域。</p>
        </div>
      </div>
    </div>

    <n-drawer v-model:show="showTemporaryDrawer" placement="bottom" :height="360" resizable>
      <n-drawer-content title="临时区" closable>
        <div class="temporary-drawer-content">
          <n-space justify="space-between" align="center" class="temporary-drawer-header">
            <span>拖拽小鼠到此进行暂存</span>
            <n-tag type="warning" round>{{ temporaryMice.length }}只</n-tag>
          </n-space>

          <div class="temporary-drop-zone" @dragover.prevent @drop="handleDrop($event, -1)">
            <div v-if="temporaryMice.length > 0" class="temporary-mouse-grid">
              <n-card
                v-for="mouse in temporaryMice"
                :key="mouse.id"
                size="small"
                class="temporary-mouse-item"
                draggable="true"
                @dragstart="handleDragStart($event, mouse.tid, -1)"
                @dblclick="openMouseDetail(mouse.tid)"
              >
                <div class="temporary-mouse-content">
                  <div class="mouse-sex" :class="mouse.sex === 'F' ? 'sex-female' : 'sex-male'">
                    {{ mouse.sex === 'F' ? '♀' : '♂' }}
                  </div>
                  <div class="mouse-info">
                    <div class="mouse-id">{{ mouse.id }}</div>
                    <div class="mouse-genotype" v-html="mouse.genotype"></div>
                  </div>
                  <div class="mouse-days">{{ !mouse.days || mouse.days === 'none' ? 'NA天数' : `${mouse.days}天` }}</div>
                </div>
              </n-card>
            </div>
            <n-empty v-else description="临时区为空" size="small" />
          </div>
        </div>
      </n-drawer-content>
    </n-drawer>
    
    <!-- 小鼠详细视图 -->
    <MouseDetailModal 
      v-if="showMouseDetail" 
      :mouse-id="selectedMouseId" 
      @close="showMouseDetail = false" 
    />
  </div>

    <!-- 笼位右键菜单 -->
  <div v-if="cageContextMenu.visible" 
      class="context-menu"
      :style="{ top: cageContextMenu.y + 'px', left: cageContextMenu.x + 'px' }">
      <ul>
          <li @click="openCageModal(cageContextMenu.cage)">
              <AppIcon  name="edit" /> 编辑笼位信息
          </li>
          <li @click="exchangeCage(cageContextMenu.cage)">
              <AppIcon  name="swap_horiz" /> 笼位排序互换
          </li>
          <li @click="deleteCage(cageContextMenu.cage)">
              <AppIcon  name="delete" /> 删除笼位
          </li>
      </ul>
  </div>

  <!-- 统一笼位对话框 -->
  <n-modal v-model:show="cageModalVisible" :mask-closable="true" @mask-click="closeCageModal">
    <n-card class="dialog-container cage-modal" :bordered="false" role="dialog" aria-modal="true">
      <h2>{{ isEditing ? '修改笼位信息' : '添加新笼位' }}</h2>
      <div class="form-group">
        <n-form-item label="笼位ID *" label-placement="top">
          <n-input v-model:value="currentCage.cage_id" placeholder="输入笼位ID" />
        </n-form-item>
      </div>

      <div class="form-group">
        <n-form-item label="位置" label-placement="top">
          <n-input v-model:value="currentCage.location" placeholder="输入位置" />
        </n-form-item>
      </div>
      <div class="form-group">
        <n-form-item label="区域 *" label-placement="top">
          <n-select
            v-model:value="currentCage.section"
            :options="sectionOptions"
            placeholder="选择区域"
          />
        </n-form-item>
      </div>
      <n-space justify="end" class="dialog-buttons">
        <n-button secondary @click="closeCageModal">取消</n-button>
        <n-button type="primary" @click="isEditing ? updateCage() : addNewCage()" :disabled="isSaving">
          <div v-if="isSaving">{{ isEditing ? '更新中' : '添加中' }}</div>
          <div v-else>{{ isEditing ? '更新' : '添加' }}</div>
        </n-button>
      </n-space>
      <div class="icon-hr">下面是用于标记的笼位信息</div>
      <div class="form-group">
        <n-form-item label="笼位类型" label-placement="top">
          <n-select
            v-model:value="currentCage.cage_type"
            :options="cageTypeOptions"
            placeholder="选择笼位类型"
          />
        </n-form-item>
      </div>
      <div class="form-group">
        <n-form-item label="笼内小鼠出生日期" label-placement="top">
          <n-date-picker type="date" value-format="yyyy-MM-dd" v-model:formatted-value="currentCage.mice_birth_date" />
        </n-form-item>
      </div>
      <div class="form-group">
        <n-form-item label="笼内小鼠数量" label-placement="top">
          <n-input-number v-model:value="currentCage.mice_count" :min="0" style="width: 100%;" />
        </n-form-item>
      </div>
      <div class="form-group">
        <n-form-item label="笼内小鼠性别" label-placement="top">
          <n-select
            v-model:value="currentCage.mice_sex"
            :options="miceSexOptions"
            placeholder="选择性别"
          />
        </n-form-item>
      </div>
      <div class="form-group">
        <n-form-item label="笼内小鼠基因型" label-placement="top">
          <n-input v-model:value="currentCage.mice_genotype" placeholder="如: WT/KO/其他" />
        </n-form-item>
      </div>
    </n-card>
  </n-modal>
  
  <!-- 在组件模板中添加弹窗 -->
  <n-modal :show="swapStatus === 'select-target'" :mask-closable="true" @mask-click="cancelSwap">
    <n-card class="swap-dialog" :bordered="false" role="dialog" aria-modal="true">
      <div class="status-message">
        <p>确认交换以下笼位顺序：</p>
        <div class="cage-pair">
          <div class="selected-cage">
            <AppIcon  name="cage" />
            <div class="cage-info">
              <div class="cage-id">{{ sourceCage.cage_id }}</div>
              <div class="cage-location">{{ sourceCage.location }}</div>
            </div>
          </div>
          
          <div class="swap-icon">
            <AppIcon  name="swap_horiz" />
          </div>
          
          <div class="selected-cage">
            <AppIcon  name="cage" />
            <div class="cage-info">
              <div class="cage-id">{{ targetCage.cage_id }}</div>
              <div class="cage-location">{{ targetCage.location }}</div>
            </div>
          </div>
        </div>

          <!-- 底部按钮 -->
        <div class="modal-footer" v-if="swapStatus === 'select-target'">
          <n-button @click="cancelSwap" secondary>
            <AppIcon  name="cancel" /> 取消
          </n-button>
          <n-button @click="confirmSwap" type="primary">
            <AppIcon  name="check" /> 确认
          </n-button>
        </div>
      </div>
    </n-card>
  </n-modal>

  <!-- PDF渲染区域（隐藏） -->
  <div id="pdf-render-area" class="hidden-pdf-area"></div>
  
  <!-- 加载遮罩 -->
  <div class="loading-overlay" v-if="isGeneratingPDF">
    <div class="spinner"></div>
    <p>正在生成PDF，请稍候...</p>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import MouseDetailModal from './MouseDetailView.vue'
import { toast } from 'vue3-toastify';
import 'vue3-toastify/dist/index.css';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// 设置组件名称
defineOptions({
  name: 'AnimalLabDashboard'
})

import { useCageStore } from '@/stores'
import { storeToRefs } from 'pinia'

const cageStore = useCageStore()
const {locations, activeSection, cages} = storeToRefs(cageStore)
const {fetchCages} = cageStore
const sectionOptions = computed(() =>
  locations.value.map(section => ({ label: section.identifier, value: section.identifier }))
)
const cageTypeOptions = [
  { label: '普通笼', value: 'normal' },
  { label: '繁殖笼', value: 'breeding' }
]
const miceSexOptions = [
  { label: '雄性', value: 'M' },
  { label: '雌性', value: 'F' },
  { label: '混合', value: 'Mixed' }
]

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
  mice_count: null,
  mice_sex: '',
  mice_genotype: ''
})

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/
const normalizeDateValue = (value) => {
  if (typeof value !== 'string') return null
  return DATE_ONLY_REGEX.test(value) ? value : null
}
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

// 搜索相关状态
const searchTerm = ref('')
const searchResults = ref([])
const currentResultIndex = ref(-1)
const highlightedCageId = ref(null)

// 交换状态
const swapStatus = ref(null)
const sourceCage = ref(null)
const targetCage = ref(null)
const matrixRows = ref(4)
const matrixCols = ref(5)

const showTemporaryDrawer = ref(false)

const cageActionOptions = [
  { label: '编辑笼位信息', key: 'edit' },
  { label: '笼位排序互换', key: 'swap' },
  { label: '删除笼位', key: 'delete' }
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
const effectiveMatrixCols = computed(() => Math.max(1, Number(matrixCols.value) || 1))
const effectiveMatrixRows = computed(() => {
  const requestedRows = Math.max(1, Number(matrixRows.value) || 1)
  const neededRows = Math.ceil(filteredSectionCages.value.length / effectiveMatrixCols.value)
  return Math.max(requestedRows, neededRows || 1)
})
const matrixCells = computed(() => {
  const total = effectiveMatrixRows.value * effectiveMatrixCols.value
  return Array.from({ length: total }, (_, index) => filteredSectionCages.value[index] || null)
})
const matrixGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${effectiveMatrixCols.value}, var(--cage-card-width))`,
  gridTemplateRows: `repeat(${effectiveMatrixRows.value}, var(--cage-card-height))`
}))

// 生命周期钩子
onMounted(async () => {
  await fetchTemporaryMice()
})

// 获取临时区小鼠数据
async function fetchTemporaryMice() {
  try {
    const response = await axios.get('/api/cages/-1')
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
      await axios.put(`/api/cage`, {
        cage_id: targetCageId,
        mouse_id: mouseId
      })
      // 更新本地数据
      const mouse = removeMouseFromSource(mouseId, sourceCageId)
      addMouseToTarget(mouse, targetCageId)
    } catch (error) {
      console.error('移动小鼠失败:', error)
      toast.error('移动小鼠失败，请重试')
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
      mice_count: null,
      mice_sex: '',
      mice_genotype: ''
    })
  }
  
  cageModalVisible.value = true
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
    mice_count: null,
    mice_sex: '',
    mice_genotype: ''
  })
}

// 添加新笼位
async function addNewCage() {
  if (!currentCage.cage_id || !currentCage.section) {
    toast.info('请填写笼位ID和区域')
    return
  }
  isSaving.value = true
  try {
    const responseId = await axios.post('/api/cages', currentCage)
    cages.value.push({
      ...currentCage,
      'mice': [],
      'id': responseId.data.id
    })
    closeCageModal()
    toast.success('添加笼位成功')
  } catch (error) {
    console.error('添加笼位失败:', error)
    toast.error('添加笼位失败，请重试')
  } finally {
    isSaving.value = false
  }
}

// 打开笼位上下文菜单
function openCageContextMenu(event, cage) {
  cageContextMenu.visible = true
  cageContextMenu.x = event.clientX
  cageContextMenu.y = event.clientY
  cageContextMenu.cage = cage
  // 点击其他地方关闭菜单
  document.addEventListener('click', closeContextMenu)
  // 在下一个tick中获取实际菜单尺寸并调整位置
  nextTick(() => {
    const menu = document.querySelector('.context-menu')
    if (menu) {
      const rect = menu.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      
      // 垂直方向避让
      if (event.pageY + rect.height > viewportHeight) {
        cageContextMenu.y = event.pageY - rect.height
      }
      
      // 水平方向避让
      if (event.pageX + rect.width > viewportWidth) {
        cageContextMenu.x = event.pageX - rect.width
      }
    }
  })
}

// 关闭上下文菜单
function closeContextMenu() {
  cageContextMenu.visible = false
  document.removeEventListener('click', closeContextMenu)
}

function handleCageActionSelect(key, cage) {
  if (key === 'edit') {
    openCageModal(cage)
    return
  }
  if (key === 'swap') {
    exchangeCage(cage)
    return
  }
  if (key === 'delete') {
    deleteCage(cage)
  }
}

function resolveCageSexMark(cage) {
  if (cage?.mice_sex === 'F') return '♀'
  if (cage?.mice_sex === 'M') return '♂'
  if (cage?.mice_sex === 'Mixed') return '♂♀'
  return cage?.cage_type === 'breeding' ? '♂♀' : '○'
}

function getCageDisplayRows(cage) {
  const mice = Array.isArray(cage?.mice) ? cage.mice : []
  const minRows = 6

  if (mice.length === 0) {
    return Array.from({ length: minRows }, (_, index) => ({
      type: index === minRows - 1 ? 'empty-label' : 'placeholder'
    }))
  }

  const rows = mice.map(mouse => ({ type: 'mouse', mouse }))
  while (rows.length < minRows) {
    rows.push({ type: 'placeholder' })
  }
  return rows
}

// 打开 section 右键菜单
function openSectionContextMenu(event, section, index) {
  sectionContextMenu.visible = true
  sectionContextMenu.x = event.clientX
  sectionContextMenu.y = event.clientY
  sectionContextMenu.sectionId = section.id
  sectionContextMenu.index = index

  document.addEventListener('click', closeSectionContextMenu)

  nextTick(() => {
    const menu = document.querySelector('.section-context-menu')
    if (menu) {
      const rect = menu.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth

      if (event.pageY + rect.height > viewportHeight) {
        sectionContextMenu.y = event.pageY - rect.height
      }

      if (event.pageX + rect.width > viewportWidth) {
        sectionContextMenu.x = event.pageX - rect.width
      }
    }
  })
}

function closeSectionContextMenu() {
  sectionContextMenu.visible = false
  sectionContextMenu.sectionId = null
  sectionContextMenu.index = -1
  document.removeEventListener('click', closeSectionContextMenu)
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
    toast.info('已经在最左侧')
    closeSectionContextMenu()
    return
  }
  if (targetIndex >= orderedSections.length) {
    toast.info('已经在最右侧')
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
    await axios.put('/api/locations/order', {
      order: updatedSections.map(section => ({
        id: section.id,
        order: section.order
      }))
    })
    toast.success('标签页顺序更新成功')
  } catch (error) {
    locations.value = previousSections
    console.error('更新标签页顺序失败:', error)
    toast.error('更新标签页顺序失败，请重试')
  } finally {
    closeSectionContextMenu()
  }
}

// 更新笼位信息
async function updateCage() {
  if (!currentCage.section) {
    toast.info("未填写区域")
    return
  }
  isSaving.value = true
  try {
    await axios.put(`/api/cages/${currentCage.id}`, {
      cage_id: currentCage.cage_id,
      location: currentCage.location,
      section: currentCage.section,
      cage_type: currentCage.cage_type,
      mice_birth_date: currentCage.mice_birth_date,
      mice_count: currentCage.mice_count,
      mice_sex: currentCage.mice_sex,
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
      cages.value[index].mice_count = currentCage.mice_count
      cages.value[index].mice_sex = currentCage.mice_sex
      cages.value[index].mice_genotype = currentCage.mice_genotype
    }
    toast.success("笼位更新成功")
    closeCageModal()
  } catch (error) {
    console.error('修改笼位失败:', error)
    toast.error('修改笼位失败，请重试')
  } finally {
    isSaving.value = false
  }
}

// 删除笼位
async function deleteCage(cage) {
  if (!confirm(`确定要删除笼位 ${cage.cage_id} 吗？`)) return
  
  try {
    await axios.delete(`/api/cages/${cage.id}`)
    // 更新本地数据
    const index = cages.value.findIndex(c => c.id === cage.id)
    if (index !== -1) {
      cage.mice.forEach(m=> {
        temporaryMice.value.push(m)
      })
      cages.value.splice(index, 1)
    }
    closeContextMenu()
    toast.success('成功删除笼位')
  } catch (error) {
    console.error('删除笼位失败:', error)
    toast.error('删除笼位失败，请重试')
  }
}

let timeoutId = null

// 开始笼位互换
async function exchangeCage(cage) {
  sourceCage.value = cage
  swapStatus.value = "select-source"
  closeContextMenu()
  timeoutId = setTimeout(() => {
    cancelSwap()
  }, 5000)
}

// 处理笼位点击
function handleCageClick(cage) {
  if (swapStatus.value === "select-source") {
    if (sourceCage.value.id === cage.id) {
      toast.warning("不能选择同一个笼位进行互换")
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
  
  toast.success(`笼位 ${sourceCage.value.cage_id} 和 ${targetCage.value.cage_id} 位置已互换`)
  clearTimeout(timeoutId)
  // 重置状态
  resetSwapState()
}

// 取消互换操作
function cancelSwap() {
  toast.error("已取消笼位互换操作")
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
  await axios.put('/api/cages/order', {id_from: cage_from_id, id_to: cage_to_id})
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
      toast.info("本区域无笼位，无法导出pdf")
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
        toast.success(`导出成功，文件路径：${state.path}`)
      } else {
        toast.info(state.message || "导出失败")
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
      toast.success('PDF导出成功');
    }
  } catch (error) {
    console.error('导出PDF失败:', error);
    toast.error('导出PDF失败，请重试');
  } finally {
    isGeneratingPDF.value = false;
  }
};

// 渲染PDF内容到隐藏区域
const renderPDFContent = (cages, sectionName) => {
  const pdfRenderArea = document.getElementById('pdf-render-area');
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
    const pdfRenderArea = document.getElementById('pdf-render-area');
    
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
    const cageElement = document.querySelector(`.cage-card[data-cage-id="${result.cage.id}"]`)
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
  min-height: 100%;
}

.matrix-toolbar {
  margin-bottom: 12px;
}

.matrix-label {
  color: var(--n-text-color-2);
  font-size: 13px;
}

.cage-view-container {
  --cage-card-width: 360px;
  --cage-card-height: 500px;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.cage-matrix-scroll {
  width: 100%;
  height: calc(100vh - 300px);
  min-height: 500px;
  overflow: auto;
  background-color: var(--n-color);
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  box-shadow: 0 2px 10px color-mix(in srgb, var(--n-text-color) 5%, transparent);
  padding: 16px;
}

.cage-matrix {
  display: grid;
  gap: 16px;
  width: max-content;
  min-width: 100%;
  align-items: start;
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
  margin-bottom: 15px;
  padding: 0 4px 8px;
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
.content-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 16px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

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
  padding-top: 22px;
}

.cage-card.breeding {
  outline: 2px solid color-mix(in srgb, var(--n-error-color) 40%, transparent);
}

.cage-card-actions {
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
}

.drag-dot-btn {
  width: 26px;
  height: 26px;
}

.dot-glyph {
  font-size: 16px;
  letter-spacing: 1px;
  line-height: 1;
  color: var(--n-text-color-2);
}

.cage-header {
  border: 2px solid var(--n-border-color);
  border-radius: 12px 12px 0 0;
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) minmax(88px, 104px);
  align-items: center;
  gap: 10px;
  min-height: 110px;
  padding: 14px 12px;
  cursor: pointer;
}

.cage-header-type {
  font-size: 44px;
  text-align: center;
  line-height: 1;
}

.cage-header-title {
  text-align: center;
  min-width: 0;
  overflow: hidden;
}

.cage-header-label {
  font-size: 10px;
  font-weight: 700;
  line-height: 1.1;
}

.cage-header-main {
  margin-top: 2px;
  font-size: 60px;
  font-weight: 800;
  line-height: 0.9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cage-header-genotype {
  font-size: 48px;
  font-weight: 700;
  text-align: right;
  line-height: 0.9;
  word-break: break-word;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.cage-count-line {
  border: 2px solid var(--n-border-color);
  border-top: 0;
  padding: 12px;
  font-size: 20px;
  font-weight: 600;
}

.cage-mice-table-wrapper {
  border: 2px solid var(--n-border-color);
  border-top: 0;
  border-radius: 0 0 12px 12px;
  overflow: auto;
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
  border: 1px solid var(--n-border-color);
  text-align: center;
  padding: 9px 6px;
  font-size: 20px;
}

.cage-mice-table th {
  position: sticky;
  top: 0;
  background: var(--n-color);
  z-index: 1;
  font-size: 22px;
  font-weight: 700;
}

.mouse-row {
  cursor: pointer;
}

.mouse-row:hover {
  background: var(--n-info-color-suppl);
}

.empty-row {
  color: var(--n-text-color-3);
  font-style: italic;
}

.placeholder-row td {
  color: transparent;
}

.empty-label-row td {
  font-size: 32px;
  font-weight: 500;
  color: var(--n-text-color-1);
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
  color: white;
  font-weight: bold;
  flex-shrink: 0; /* 防止在flex容器中缩小 */
  overflow: hidden; /* 防止内容溢出导致变形 */
  box-sizing: border-box; /* 确保内边距不影响尺寸 */
}

.sex-female {
  background-color: var(--n-error-color);
}

.sex-male {
  background-color: var(--n-info-color);
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
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: color-mix(in srgb, var(--n-text-color) 50%, transparent);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

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

.form-group input, .form-group select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--n-border-color);
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.dialog-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

/* 右键菜单样式 */
.context-menu {
    position: fixed;
  background: var(--n-color);
  border: 1px solid var(--n-border-color);
    border-radius: 6px;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--n-text-color) 15%, transparent);
    z-index: 1000;
    min-width: 180px;
}

.context-menu ul {
    list-style: none;
    margin: 0;
    padding: 5px 0;
}

.context-menu li {
    padding: 8px 15px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 0.2s;
}

.context-menu li:hover {
  background-color: var(--n-info-color-suppl);
}

.section-context-menu {
  position: fixed;
  background: var(--n-color);
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--n-text-color) 15%, transparent);
  z-index: 1001;
  min-width: 140px;
}

.section-context-menu ul {
  list-style: none;
  margin: 0;
  padding: 5px 0;
}

.section-context-menu li {
  padding: 8px 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s;
}

.section-context-menu li:hover {
  background-color: var(--n-info-color-suppl);
}

.section-context-menu li.disabled {
  color: var(--n-text-color-disabled);
  cursor: not-allowed;
}

.section-context-menu li.disabled:hover {
  background-color: transparent;
}

.context-menu li i {
    font-size: 18px;
    color: var(--n-primary-color);
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

.status-message {
  text-align: center;
  margin-bottom: 20px;
}

.status-message p {
  font-size: 1.1rem;
  margin-bottom: 15px;
  color: var(--n-text-color-2);
}

.cage-pair {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
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
  justify-content: flex-end;
  gap: 15px;
  padding: 15px 20px;
  background: var(--n-color-embedded);
  border-top: 1px solid var(--n-border-color);
}

/* 搜索相关样式 */
.search-container {
  position: relative;
  flex: 1;
  min-width: min(100%, 260px);
  max-width: 360px;
  margin: 0;
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

.search-result-item .sex-female {
  background-color: var(--n-error-color);
  color: white;
}

.search-result-item .sex-male {
  background-color: var(--n-info-color);
  color: white;
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

/* 调整内容头部布局 */
.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.page-title {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--primary);
  white-space: nowrap;
}

.action-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 1200px) {
  .cage-view-container {
    --cage-card-width: 320px;
    --cage-card-height: 460px;
  }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .content-header {
    flex-direction: column;
    align-items: stretch;
  }

  .cage-matrix-scroll {
    height: calc(100vh - 360px);
    padding: 12px;
  }

  .cage-view-container {
    --cage-card-width: 280px;
    --cage-card-height: 430px;
  }

  .cage-header-title,
  .cage-header-genotype {
    font-size: initial;
  }

  .cage-header-main {
    font-size: 40px;
  }

  .cage-header-genotype {
    font-size: 34px;
  }

  .cage-count-line {
    font-size: 16px;
  }

  .cage-mice-table th,
  .cage-mice-table td {
    font-size: 16px;
  }

  .empty-label-row td {
    font-size: 22px;
  }
  
  .search-container {
    max-width: 100%;
    margin: 10px 0;
  }
  
  .action-buttons {
    justify-content: center;
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