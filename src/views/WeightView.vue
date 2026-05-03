<template>
<div class="main-content">
    <!-- 标题和操作按钮 -->
    <div class="section">
  <n-space justify="space-between" align="center" class="header-with-button">
        <h2>体重数据管理</h2>
        <n-button type="primary" @click="openStandaloneAdd" :render-icon="renderIcon(Add)">新增记录</n-button>
  </n-space>
    
    <!-- 搜索和筛选控件 -->
    <n-grid :cols="'1 s:2 m:4'" :x-gap="12" :y-gap="0" responsive="screen">
      <n-gi>
        <n-form-item label="小鼠ID" label-placement="top">
          <n-input v-model:value="filters.mouse_id" placeholder="请输入小鼠ID" clearable style="width:100%" />
        </n-form-item>
      </n-gi>
      <n-gi>
        <n-form-item label="开始日期" label-placement="top">
          <n-date-picker type="date" value-format="yyyy-MM-dd" v-model:formatted-value="filters.start_date" style="width:100%" />
        </n-form-item>
      </n-gi>
      <n-gi>
        <n-form-item label="结束日期" label-placement="top">
          <n-date-picker type="date" value-format="yyyy-MM-dd" v-model:formatted-value="filters.end_date" style="width:100%" />
        </n-form-item>
      </n-gi>
      <n-gi>
        <n-form-item label-placement="top">
          <template #label><span style="visibility:hidden">占位</span></template>
          <n-flex :gap="8" style="width:100%">
            <n-button type="primary" secondary @click="loadWeightRecords" :render-icon="renderIcon(Search)" style="flex:1">搜索</n-button>
            <n-button quaternary @click="resetFilters" :render-icon="renderIcon(Refresh)">重置</n-button>
          </n-flex>
        </n-form-item>
      </n-gi>
    </n-grid>
    
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <span>加载中...</span>
    </div>
    
    <!-- 体重记录表格 -->
    <div class="table-scroll">
      <n-data-table
        :columns="weightColumns"
        :data="filteredRecords"
        :bordered="false"
        :single-line="false"
        :row-key="(row) => row.id"
      />
    </div>
    
    <!-- 分页控件 -->
    <div v-if="totalPages > 1" class="pagination">
      <n-pagination
        v-model:page="currentPage"
        :page-count="totalPages"
        :page-size="pageSize"
        @update:page="handlePageChange"
      />
    </div>
    </div>
    
    <!-- 添加/编辑体重记录模态框 -->
    <n-modal v-model:show="showAddModal" :mask-closable="false" preset="card" style="width: 90%; max-width: 600px;" :title="editingRecord ? '编辑体重记录' : '添加体重记录'" closable @close="closeModal">
        <n-form
          ref="weightFormRef"
          :model="newRecord"
          :rules="weightRules"
          label-placement="top"
          class="form-body"
        >
        <div v-if="selectedMouse" class="form-group">
            <n-form-item label="选中小鼠信息">
              <div class="mouse-info">
              <p>ID: {{ selectedMouse.id }}</p>
              <p class="mouse-info-line">基因型: <GenotypeLabel :symbol="selectedMouse.genotype" /></p>
              <p>性别: {{ selectedMouse.sex === 'M' ? '雄性' : '雌性' }}</p>
              <p>生日: {{ formatDate(selectedMouse.birth_date) }}</p>
              </div>
            </n-form-item>
        </div>
        <div v-else class="form-group">
            <n-form-item label="小鼠ID" path="mouse_id" required>
              <n-input v-model:value="newRecord.mouse_id" placeholder="请输入小鼠ID" clearable />
            </n-form-item>
        </div>

        <div class="form-group">
            <n-form-item label="记录日期" path="record_date" required>
              <n-date-picker type="date" value-format="yyyy-MM-dd" v-model:formatted-value="newRecord.record_date" />
            </n-form-item>
        </div>

        <div class="form-group">
            <n-form-item label="体重(g)" path="weight" required>
              <n-input-number v-model:value="newRecord.weight" :min="0" :precision="2" :step="0.01" style="width: 100%;" />
            </n-form-item>
        </div>
        </n-form>
        
        <template #footer>
        <n-space justify="end" class="button-group">
        <n-button type="primary" @click="saveRecord" :disabled="saving" :render-icon="renderIcon(editingRecord ? Save : Add)">
            <span v-if="saving">保存中...</span>
            <span v-else>{{ editingRecord ? '保存' : '添加' }}</span>
        </n-button>
        <n-button tertiary @click="closeModal" :render-icon="renderIcon(CloseCircle)">取消</n-button>
        </n-space>
        </template>
    </n-modal>
</div>
</template>

<script setup>
import { h, ref, computed, onMounted } from 'vue'
import { NButton, NIcon, useDialog, useMessage } from 'naive-ui'
import { renderIcon } from '@/utils/icon'
import { Refresh, Search, Save, Add, CloseCircle, ScaleOutline, CreateOutline, TrashOutline, AddCircleOutline } from '@vicons/ionicons5'
import api from '@/utils/api'
import { formatDate, renderGenotypeSymbol } from '@/utils/format'
import GenotypeLabel from '@/components/GenotypeLabel.vue'

// 状态管理
const weightRecords = ref([])
const filteredRecords = ref([])
const loading = ref(false)
const saving = ref(false)
const showAddModal = ref(false)
const editingRecord = ref(null)
const selectedMouse = ref(null)
const dialog = useDialog()
const message = useMessage()

// 筛选和排序
const filters = ref({
mouse_id: '',
start_date: null,
end_date: null
})

const sortField = ref('record_date')
const sortDirection = ref('desc')

// 分页
const currentPage = ref(1)
const pageSize = ref(20)
const totalRecords = ref(0)

// 计算属性
const totalPages = computed(() => Math.ceil(totalRecords.value / pageSize.value))

const newRecord = ref({
mouse_id: '',
record_date: new Date().toISOString().split('T')[0],
weight: ''
})

const getSortValue = (record, field) => {
if (field === 'mouse_id') return record.mouse_info?.id || ''
if (field === 'birth_date') return record.mouse_info?.birth_date || ''
return record[field]
}

const weightColumns = computed(() => [
{
  title: '小鼠ID',
  key: 'mouse_id',
  sorter: (a, b) => String(getSortValue(a, 'mouse_id')).localeCompare(String(getSortValue(b, 'mouse_id'))),
  render: (row) => row.mouse_info?.id || ''
},
{
  title: '性别',
  key: 'sex',
  width: 70,
  render: (row) => row.mouse_info?.sex === 'M' ? '♂ 雄' : row.mouse_info?.sex === 'F' ? '♀ 雌' : '-'
},
{
  title: '基因型',
  key: 'genotype',
  render: (row) => renderGenotypeSymbol(row.mouse_info?.genotype)
},
{
  title: '生日',
  key: 'birth_date',
  sorter: (a, b) => String(getSortValue(a, 'birth_date')).localeCompare(String(getSortValue(b, 'birth_date'))),
  render: (row) => formatDate(row.mouse_info?.birth_date)
},
{
  title: '记录年龄(天)',
  key: 'record_livingdays',
  sorter: (a, b) => Number(a.record_livingdays || 0) - Number(b.record_livingdays || 0)
},
{
  title: '记录时间',
  key: 'record_date',
  sorter: (a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime(),
  render: (row) => formatDate(row.record_date)
},
{
  title: '体重(g)',
  key: 'weight',
  sorter: (a, b) => Number(a.weight || 0) - Number(b.weight || 0)
},
{
  title: '操作',
  key: 'actions',
  width: 120,
  render: (row) => h(NSpace, { size: 4 }, {
  default: () => [
    h(NButton, {
    circle: true,
    quaternary: true,
    type: 'primary',
    title: '添加记录',
    onClick: () => addRecord(row)
    }, { default: () => h(NIcon, null, { default: () => h(AddCircleOutline) }) }),
    h(NButton, {
    circle: true,
    quaternary: true,
    type: 'warning',
    title: '编辑',
    onClick: () => editRecord(row)
    }, { default: () => h(NIcon, null, { default: () => h(CreateOutline) }) }),
    h(NButton, {
    circle: true,
    quaternary: true,
    type: 'error',
    title: '删除',
    onClick: () => deleteRecord(row.id)
    }, { default: () => h(NIcon, null, { default: () => h(TrashOutline) }) })
  ]
  })
}
])

// 生命周期
onMounted(() => {
loadWeightRecords()
})

// 方法
const loadWeightRecords = async () => {
try {
    loading.value = true
    const params = {
    page: currentPage.value,
    limit: pageSize.value,
    ...filters.value
    }
    
    // 移除空值参数
    Object.keys(params).forEach(key => {
    if (params[key] === '' || params[key] === null) {
        delete params[key]
    }
    })
    
    const response = await api.get('/weight_records', { params })
    weightRecords.value = response.data.records
    totalRecords.value = response.data.total
    filteredRecords.value = weightRecords.value
} catch (error) {
    console.error('加载体重记录失败:', error)
    message.error('加载体重记录失败')
} finally {
    loading.value = false
}
}

const weightFormRef = ref(null)
const weightRules = {
  mouse_id: {
    required: true,
    trigger: ['blur', 'change'],
    validator(rule, value) {
      if (!selectedMouse.value && (!value || !value.trim())) {
        return new Error('请输入小鼠ID')
      }
      return true
    }
  },
  weight: {
    required: true,
    trigger: ['blur', 'change'],
    validator(rule, value) {
      if (value === null || value === undefined || value === '' || parseFloat(value) <= 0) {
        return new Error('请输入有效的体重值')
      }
      return true
    }
  },
  record_date: {
    required: true,
    trigger: ['blur', 'change'],
    validator(rule, value) {
      if (!value) return new Error('请选择记录日期')
      return true
    }
  }
}

const saveRecord = async () => {
try {
    await weightFormRef.value?.validate()
} catch (errors) { return }

try {
    saving.value = true

    if (editingRecord.value) {
        // 更新记录
        await api.put(`/weight_records/${editingRecord.value.id}`, newRecord.value)
        message.success('体重记录更新成功')
    } else {
        // 添加新记录
        await api.post('/weight_records', newRecord.value)
        message.success('体重记录添加成功')
    }
    } catch (error) {
        console.error('保存体重记录失败:', error)
        message.error('保存体重记录失败')
    } finally {
        saving.value = false
    }
    closeModal()
    loadWeightRecords()
}

const openStandaloneAdd = () => {
  newRecord.value = {
    mouse_id: '',
    record_date: new Date().toISOString().split('T')[0],
    weight: ''
  }
  selectedMouse.value = null
  editingRecord.value = null
  showAddModal.value = true
}

const addRecord = (record) => {
newRecord.value = {
    mouse_id: record.mouse_id,
  record_date: new Date().toISOString().split('T')[0],
    weight: ''
}
selectedMouse.value = record.mouse_info
showAddModal.value = true
}

const editRecord = (record) => {
editingRecord.value = record
newRecord.value = { ...record }
selectedMouse.value = record.mouse_info
showAddModal.value = true
}

const deleteRecord = async (id) => {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这条体重记录吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.delete(`/weight_records/${id}`)
        message.success('体重记录删除成功')
        loadWeightRecords()
      } catch (error) {
        console.error('删除体重记录失败:', error)
        message.error('删除体重记录失败')
      }
    }
  })
}

const closeModal = () => {
showAddModal.value = false
editingRecord.value = null
newRecord.value = {
    mouse_id: '',
    record_date: new Date().toISOString().split('T')[0],
    weight: ''
}
selectedMouse.value = null
}

const resetFilters = () => {
filters.value = {
    mouse_id: '',
  start_date: null,
  end_date: null
}
loadWeightRecords()
}

const handlePageChange = (page) => {
currentPage.value = page
loadWeightRecords()
}

// sortBy / sortIconClass / sortIconName / nextPage / prevPage 已移除（排序由 NDataTable 原生处理，分页由 NPagination 处理）

// formatDate 已从 @/utils/format 导入
</script>

<style scoped>
.section {
  margin-bottom: 30px;
  padding: 25px;
  background: var(--n-color);
  border-radius: 12px;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--n-text-color) 5%, transparent);
  position: relative;
  overflow: hidden;
}

/* 头部按钮 */
.header-with-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  flex-wrap: wrap;
  gap: 15px;
}

.header-with-button h2 {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--n-text-color-1);
  margin: 0;
}

/* 复用MiceView的样式，添加一些特定于体重记录的样式 */

.mouse-info {
background: var(--n-hover-color);
padding: 12px;
border-radius: 6px;
margin-top: 8px;
}

.mouse-info p {
margin: 4px 0;
font-size: 14px;
}

.table-scroll {
overflow-x: auto;
border: 1px solid var(--n-border-color);
border-radius: 12px;
background: var(--n-color);
box-shadow: inset 0 1px 0 color-mix(in srgb, var(--n-color) 90%, transparent);
}

.pagination {
display: flex;
justify-content: center;
align-items: center;
margin-top: 20px;
gap: 15px;
}


@media (max-width: 768px) {
.header-with-button {
    flex-direction: column;
    align-items: flex-start;
}

.header-with-button h2 {
    margin-bottom: 15px;
}

}

.modal-content {
  background: var(--n-color);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px color-mix(in srgb, var(--n-text-color) 20%, transparent);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--n-border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.4rem;
}

.form-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--n-text-color-2);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
  font-size: 1rem;
  transition: all 0.3s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: var(--n-primary-color);
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--n-primary-color) 20%, transparent);
}

.form-group textarea {
  min-height: 100px;
  resize: vertical;
}

.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid var(--n-border-color);
}

/* 加载状态 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: color-mix(in srgb, var(--n-color) 80%, transparent);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-spinner {
  border: 4px solid color-mix(in srgb, var(--n-text-color) 10%, transparent);
  border-left-color: var(--n-primary-color);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 50px 20px;
  color: var(--n-text-color-3);
}

.empty-state .n-icon {
  font-size: 60px;
  color: var(--n-border-color);
  margin-bottom: 15px;
}

.sort-icon {
  margin-left: 4px;
  vertical-align: middle;
}

.empty-state p {
  font-size: 1.1rem;
  margin-bottom: 20px;
}


@media (max-width: 768px) {
.section {
  padding: 18px;
}

.filter-group {
  padding: 12px;
}
}
</style>
