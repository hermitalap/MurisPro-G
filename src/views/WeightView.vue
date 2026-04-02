<template>
<div class="main-content">
    <!-- 标题和操作按钮 -->
    <div class="section">
  <n-space justify="space-between" align="center" class="header-with-button">
        <h2>体重数据管理</h2>
  </n-space>
    
    <!-- 搜索和筛选控件 -->
    <div class="search-controls">
        <div class="filter-group">
        <n-form-item label="小鼠ID" label-placement="top">
          <n-input v-model:value="filters.mouse_id" placeholder="小鼠ID" @update:value="loadWeightRecords" clearable />
        </n-form-item>
        
        <n-button quaternary @click="resetFilters">
        <AppIcon  name="refresh" />
        重置
        </n-button>
        </div>

        <div class="filter-group">
        <n-form-item label="日期范围" label-placement="top">
          <div class="date-range">
            <n-date-picker type="date" value-format="yyyy-MM-dd" v-model:formatted-value="filters.start_date" /> 至
            <n-date-picker type="date" value-format="yyyy-MM-dd" v-model:formatted-value="filters.end_date" />
          </div>
        </n-form-item>
        
        <n-button type="primary" secondary @click="loadWeightRecords">
        <AppIcon  name="search" />
        搜索
        </n-button>
        </div>
    </div>
    
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
    
    <!-- 空状态 -->
    <div v-if="filteredRecords.length === 0 && !loading" class="empty-state">
        <AppIcon  name="monitor_weight" />
        <p>没有找到体重记录</p>
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
    <n-modal v-model:show="showAddModal" :mask-closable="false">
    <n-card class="modal-content" :bordered="false" role="dialog" aria-modal="true">
        <n-space justify="space-between" align="center" class="modal-header">
        <h3>{{ editingRecord ? '编辑体重记录' : '添加体重记录' }}</h3>
        <n-button quaternary circle @click="closeModal">
          <AppIcon  name="close" />
        </n-button>
        </n-space>
        
        <div class="form-body">
        
        <div class="form-group">
            <n-form-item label="选中小鼠信息" label-placement="top">
              <div class="mouse-info">
              <p>ID: {{ selectedMouse.id }}</p>
              <p>基因型: {{ selectedMouse.genotype }}</p>
              <p>性别: {{ selectedMouse.sex === 'M' ? '雄性' : '雌性' }}</p>
              <p>生日: {{ formatDate(selectedMouse.birth_date) }}</p>
              </div>
            </n-form-item>
        </div>
        
        <div class="form-group">
            <n-form-item label="记录日期" label-placement="top">
              <n-date-picker type="date" value-format="yyyy-MM-dd" v-model:formatted-value="newRecord.record_date" />
            </n-form-item>
        </div>
        
        <div class="form-group">
            <n-form-item label="体重(g)" label-placement="top">
              <n-input-number v-model:value="newRecord.weight" :min="0" :precision="2" :step="0.01" style="width: 100%;" />
            </n-form-item>
        </div>
        </div>
        
        <n-space justify="end" class="button-group">
        <n-button type="primary" @click="saveRecord" :disabled="saving">
            <AppIcon  :name="editingRecord ? 'save' : 'add'" />
            <span v-if="saving">保存中...</span>
            <span v-else>{{ editingRecord ? '保存' : '添加' }}</span>
        </n-button>
        <n-button tertiary @click="closeModal">
            <AppIcon  name="cancel" />
            取消
        </n-button>
        </n-space>
      </n-card>
    </n-modal>
</div>
</template>

<script setup>
import { h, ref, computed, onMounted, watch } from 'vue'
import { NButton, NSpace, useDialog } from 'naive-ui'
import { toast } from 'vue3-toastify';
import 'vue3-toastify/dist/index.css';
import axios from 'axios'

// 状态管理
const weightRecords = ref([])
const filteredRecords = ref([])
const loading = ref(false)
const saving = ref(false)
const showAddModal = ref(false)
const editingRecord = ref(null)
const selectedMouse = ref(null)
const dialog = useDialog()

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
  render: (row) => h(NSpace, { size: 6 }, {
  default: () => [
    h(NButton, {
    circle: true,
    quaternary: true,
    type: 'primary',
    onClick: () => addRecord(row)
    }, { default: () => '+' }),
    h(NButton, {
    circle: true,
    quaternary: true,
    type: 'warning',
    onClick: () => editRecord(row)
    }, { default: () => 'E' }),
    h(NButton, {
    circle: true,
    quaternary: true,
    type: 'error',
    onClick: () => deleteRecord(row.id)
    }, { default: () => 'D' })
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
    
    const response = await axios.get('/api/weight_records', { params })
    weightRecords.value = response.data.records
    totalRecords.value = response.data.total
    applySorting()
} catch (error) {
    console.error('加载体重记录失败:', error)
    toast.error('加载体重记录失败')
} finally {
    loading.value = false
}
}

const saveRecord = async () => {
try {
    saving.value = true
    
    if (!newRecord.value.weight || parseFloat(newRecord.value.weight) <= 0) {
    toast.error('请输入有效的体重值')
    return
    }
    if (!newRecord.value.record_date) {
    toast.error('请输入记录时间')
    return
    }
    
    if (editingRecord.value) {
        // 更新记录
        await axios.put(`/api/weight_records/${editingRecord.value.id}`, newRecord.value)
        toast.success('体重记录更新成功')
    } else {
        // 添加新记录
        await axios.post('/api/weight_records', newRecord.value)
        toast.success('体重记录添加成功')
    }
    } catch (error) {
        console.error('保存体重记录失败:', error)
        toast.error('保存体重记录失败')
    } finally {
        saving.value = false
    }
    closeModal()
    loadWeightRecords()
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
        await axios.delete(`/api/weight_records/${id}`)
        toast.success('体重记录删除成功')
        loadWeightRecords()
      } catch (error) {
        console.error('删除体重记录失败:', error)
        toast.error('删除体重记录失败')
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

const sortBy = (field) => {
if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
} else {
    sortField.value = field
    sortDirection.value = 'asc'
}
applySorting()
}

const applySorting = () => {
filteredRecords.value = [...weightRecords.value].sort((a, b) => {
    let modifier = sortDirection.value === 'asc' ? 1 : -1
    
    if (sortField.value === 'record_date') {
    return (new Date(a[sortField.value]) - new Date(b[sortField.value])) * modifier
    }
    
    if (a[sortField.value] < b[sortField.value]) return -1 * modifier
    if (a[sortField.value] > b[sortField.value]) return 1 * modifier
    return 0
})
}

const sortIconClass = (field) => {
if (sortField.value !== field) return 'sort-icon inactive-icon'
return sortDirection.value === 'asc' 
  ? 'sort-icon'
  : 'sort-icon rotated-icon'
}

const sortIconName = (field) => {
if (sortField.value !== field) return 'arrow_downward'
return sortDirection.value === 'asc' ? 'arrow_upward' : 'arrow_downward'
}

const formatDate = (dateString) => {
if (!dateString) return ''
const date = new Date(dateString)
return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

const nextPage = () => {
if (currentPage.value < totalPages.value) {
    currentPage.value++
    loadWeightRecords()
}
}

const prevPage = () => {
if (currentPage.value > 1) {
    currentPage.value--
    loadWeightRecords()
}
}

// 监听筛选条件变化
watch(filters, () => {
currentPage.value = 1
loadWeightRecords()
}, { deep: true })
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

.actions-cell {
display: flex;
align-items: center;
gap: 6px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
.search-controls {
    flex-direction: column;
    align-items: flex-start;
}

.filter-group {
    margin-bottom: 10px;
    width: 100%;
}

.filter-group input,
.filter-group select {
    flex-grow: 1;
}
}

@media (max-width: 768px) {
.header-with-button {
    flex-direction: column;
    align-items: flex-start;
}

.header-with-button h2 {
    margin-bottom: 15px;
}

.mouse-table {
    font-size: 14px;
}

.mouse-table th,
.mouse-table td {
    padding: 8px 6px;
}
}

.mouse-table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
  font-size: 0.95rem;
  box-shadow: 0 1px 3px color-mix(in srgb, var(--n-text-color) 5%, transparent);
  cursor: pointer;
  position: relative;
  user-select: none;
}

.mouse-table th {
  background: var(--n-color-embedded);
  color: var(--n-text-color-3);
  font-weight: 600;
  text-align: left;
  padding: 14px 12px;
  border-bottom: 2px solid var(--n-border-color);
}

.mouse-table td {
  padding: 12px;
  border-bottom: 1px solid var(--n-border-color);
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

/* 搜索控件 */
.search-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 25px;
  flex-wrap: wrap;
  align-items: stretch;
}

.filter-group {
display: flex;
align-items: center;
flex: 1 1 320px;
flex-wrap: wrap;
gap: 12px;
margin-right: 0;
padding: 14px 16px;
background: var(--n-color-embedded);
border: 1px solid var(--n-border-color);
border-radius: 12px;
}

.filter-group label {
margin-right: 8px;
font-weight: 500;
white-space: nowrap;
}

.filter-group input {
  flex: 1 1 150px;
  padding: 10px 15px;
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
  font-size: 1rem;
  min-width: 0;
  transition: border 0.3s;
}

.filter-group input:focus {
  border-color: var(--n-primary-color);
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--n-primary-color) 20%, transparent);
}

@media (max-width: 768px) {
.section {
  padding: 18px;
}

.filter-group {
  padding: 12px;
}

.filter-group label {
  width: 100%;
  margin-right: 0;
}

.filter-group input {
  width: 100%;
}

.mouse-table {
  min-width: 680px;
}
}
</style>