<template>
<div class="main-content">
    <n-space justify="space-between" align="center" class="content-header">
    <h1 class="page-title">小鼠体重管理</h1>
    </n-space>
    
    <div class="card">
    <div class="card-header">
        <h5 class="mb-0">体重趋势分析</h5>
    </div>
    <div class="card-body">
        <!-- 控制按钮区域 -->
        <div class="d-flex mb-4">
        <n-select
          v-model:value="showChartType"
          :options="chartTypeOptions"
          style="min-width: 200px;"
        />
        <n-button type="primary" @click="openRecordModal">
            <AppIcon  class="btn-icon" name="add" />
            录入体重
        </n-button>
        </div>
        <div v-if="showChartType === 'pred'" class="d-flex justify-content-between mb-4">
            <n-select
              v-model:value="selectedPredefinedGroupId"
              :options="predefinedGroupOptions"
              placeholder="请在设置中确定预设分组"
              :disabled="predefinedGroups.length === 0"
              style="min-width: 180px;"
            />
            <n-button type="primary" @click="showChart('pred')">
            <AppIcon  name="insights" />
            以预设分组生成图表
            </n-button>
        </div>
        <div v-if="showChartType === 'temp'" class="d-flex justify-content-between mb-4">
            <n-button type="primary" @click="showChart('temp')">
            <AppIcon  name="insights" />
            以临时分组生成图表
            </n-button>
            <n-button id="addGroupBtn" secondary @click="addGroup">
            <AppIcon  name="add" /> 添加分组
            </n-button>
            <n-button id="addGroupBtn" type="error" @click="clearGroups">
            <AppIcon  name="add" /> 清空分组
            </n-button>
        </div>
        
        <!-- 分组设置 -->
        <div v-if="showChartType === 'temp'" class="mb-4">
            <h5>分组设置</h5>
            <div class="groups-container">
            <div 
                v-for="(group, index) in tempGroups"
                :key="index" 
                class="group-card"
            >
                <div class="card">
                <div class="card-header compact-header">
                    <span>分组 {{ index }}</span>
                    <n-button quaternary circle @click="removeGroup(index)"  v-if="tempGroups.length > 1">
                        <AppIcon  name="close" />
                    </n-button>
                </div>
                <div class="card-body">
                    <div class="mb-2">
                    <label class="form-label">性别</label>
                    <div class="d-flex flex-wrap">
                        <div class="form-check me-3">
                        <n-checkbox v-model:checked="group.sex.M">雄性</n-checkbox>
                        </div>
                        <div class="form-check">
                        <n-checkbox v-model:checked="group.sex.F">雌性</n-checkbox>
                        </div>
                    </div>
                    </div>
                    <div class="mb-2">
                        <div class="form-group">
                        <label class="form-label">基因型包含：（需要更加复杂的逻辑请使用预设分组）</label>
                        <div class="genotype-tree">
                            <div v-for="(combinations, locus) in geneStore.allGenotypes" :key="locus" class="locus-item">
                            <div class="locus-header">
                                <label class="locus-label">
                                <n-checkbox
                                    :checked="group.genotype.includes(locus)"
                                    @update:checked="onLocusSelect(index, locus)"
                                    class="locus-checkbox"
                                />
                                <span class="locus-name">{{ locus }}</span>
                                </label>
                            </div>
                            <div v-if="combinations && combinations.length" class="combinations-list">
                                <div v-for="combination in combinations" :key="combination" class="combination-item">
                                <label class="combination-label">
                                    <n-checkbox
                                    :checked="group.genotype.includes(`${locus}<sup>${combination}</sup>`)"
                                    @update:checked="onCombinationSelect(index, locus, combination)"
                                    class="combination-checkbox"
                                    />
                                    <span class="combination-name" v-html="`${locus}<sup>${combination}</sup>`"></span>
                                </label>
                                </div>
                            </div>
                            </div>
                        </div>
                        </div>
                    </div>
                </div>
                </div>
            </div>
            
            <div 
                v-if="tempGroups.length < 8" 
                class="group-card add-card"
                @click="addGroup"
            >
                <AppIcon  name="add" />
                <span>添加分组</span>
            </div>
            </div>
        </div>
        
        <!-- 图表控制选项 -->
        <div class="chart-controls" v-if="hasData">
            <div class="control-group">
                <span class="control-label">平均线计算方式</span>
                <n-radio-group v-model:value="averageMethod" class="average-method-group">
                    <n-radio value="monthly">按月平均</n-radio>
                    <n-radio value="weekly">按周平均</n-radio>
                    <n-radio value="daily">按天平均</n-radio>
                </n-radio-group>
            </div>
            
            <div class="control-group">
                <span class="control-label">趋势线拟合</span>
                <div>
                    <div class="form-check">
                        <n-checkbox v-model:checked="showTrendLine">显示趋势线</n-checkbox>
                    </div>
                </div>
            </div>
            
            <div class="control-group">
                <span class="control-label">置信区间</span>
                <div>
                    <div class="form-check">
                        <n-checkbox v-model:checked="showConfidenceBand">显示置信区间</n-checkbox>
                    </div>
                </div>
            </div>

            <div class="control-group">
                <span class="control-label">散点图</span>
                <div>
                    <div class="form-check">
                        <n-checkbox v-model:checked="showDot">显示散点</n-checkbox>
                    </div>
                </div>
            </div>
        </div>
            
        <!-- 图表容器 -->
        <div v-if="hasData" class="chart-area">
            <div class="chart-container">
                <canvas id="weightChart"></canvas>
            </div>
        </div>
            <!-- 无数据提示 -->
        <div v-else class="text-center py-5">
            <div class="mb-3">
                <AppIcon style="font-size: 3rem; color: var(--n-text-color-3);" name="bar_chart" />
            </div>
            <h5 class="text-muted">请设置分组条件并点击"生成图表"按钮</h5>
        </div>
    </div>
    </div>
    
    <!-- 录入模态框 -->
    <n-modal v-model:show="showModal" :mask-closable="true" preset="card" class="dialog-container" style="width: 90%; max-width: 800px; overflow: visible;" title="批量录入体重信息" closable @close="closeModal">
            <div class="modal-body">
            <div class="form-group">
                <label for="recordDate" class="form-label">记录日期</label>
                <n-date-picker type="date" value-format="yyyy-MM-dd" id="recordDate" v-model:formatted-value="recordDate" style="width: 100%;" to="body" />
            </div>
            
            <div class="input-table">
                <div class="table-wrapper">
                    <n-data-table
                        :columns="weightInputColumns"
                        :data="weightInputRows"
                        :single-line="false"
                        :bordered="false"
                        max-height="420"
                        :row-key="(row) => row.id"
                    />
                </div>
            </div>
            </div>
            <template #footer>
            <div class="d-grid mt-3">
                <n-button id="saveBtn" type="primary" @click="handleSaveWeight">
                <AppIcon  name="save" /> 保存体重记录
                </n-button>
            </div>
            </template>
    </n-modal>
</div>

    <!-- 确认对话框 -->
    <n-modal v-model:show="showConfirmModal" :mask-closable="true" preset="card" class="confirm-dialog" style="width: 90%; max-width: 400px; overflow: visible;" title="确认体重记录" closable @close="cancelConfirm">
        <div class="confirm-body">
            <div class="confirm-info">
            <div class="info-item">
                <span class="info-label">记录日期：</span>
                <span class="info-value">{{ confirmDate }}</span>
            </div>
            <div class="info-item">
                <span class="info-label">记录条数：</span>
                <span class="info-value">{{ confirmRecordCount }} 条</span>
            </div>
            </div>
        </div>
        <template #footer>
            <n-space justify="end" class="confirm-actions">
            <n-button secondary @click="cancelConfirm">取消</n-button>
            <n-button type="primary" @click="confirmSave" :disabled="isSaving">{{isSaving? "保存中...": "确认保存"}}</n-button>
            </n-space>
        </template>
    </n-modal>
</template>

<script setup>
import { h, ref, computed, nextTick, onMounted, watch } from 'vue'
import { NInputNumber, useMessage } from 'naive-ui'
import api from '@/utils/api'
import Chart from 'chart.js/auto'
import regression from 'regression'
import { useGeneStore, useExperimentStore } from '@/stores'
import { storeToRefs } from 'pinia'

const geneStore = useGeneStore()
const { tempGroups, mice } = storeToRefs(geneStore)
const { addGroup, removeGroup, clearGroups, getTempGroups, onLocusSelect, onCombinationSelect } = geneStore
const experimentStore = useExperimentStore()
const { predefinedGroups, selectedPredefinedGroupId, showChartType } = storeToRefs(experimentStore)
const { getPredefinedGroups } = experimentStore
const message = useMessage()
const chartTypeOptions = [
    { label: '使用预设分组', value: 'pred' },
    { label: '使用临时分组', value: 'temp' }
]
const predefinedGroupOptions = computed(() =>
    predefinedGroups.value.map(group => ({ label: group.name, value: group.id }))
)

// 小鼠数据
const lived_mice = ref([])
// 体重输入值
const weightValues = ref({})
// 模态框控制
const showModal = ref(false)
const recordDate = ref(new Date().toISOString().split('T')[0])

// 图表选项
const averageMethod = ref('weekly')
const showTrendLine = ref(false)
const showConfidenceBand = ref(false)
const showDot = ref(true)

// 图表实例
const hasData = ref(false)
let weightChart = null

// 体重记录数据
const weightRecords = ref([])
const showConfirmModal = ref(false)
const confirmDate = ref('')
const confirmRecordCount = ref(0)
const isSaving = ref(false)

const weightInputRows = computed(() => lived_mice.value.map((mouse, index) => ({ ...mouse, _index: index })))

const weightInputColumns = computed(() => [
{
    title: '区域',
    key: 'section'
},
{
    title: '笼位',
    key: 'cage_name'
},
{
    title: '小鼠ID',
    key: 'id'
},
{
    title: '基因型',
    key: 'genotype',
    render: (row) => h('span', { innerHTML: row.genotype || '' })
},
{
    title: '性别',
    key: 'sex'
},
{
    title: '体重 (g)',
    key: 'weight',
    render: (row) => h(NInputNumber, {
    class: 'weight-input',
    placeholder: '输入体重',
    value: weightValues.value[row.tid],
    'onUpdate:value': (value) => {
        weightValues.value[row.tid] = value
    },
    tabindex: row._index + 1,
    precision: 2,
    step: 0.01,
    min: 0,
    onKeydown: (event) => {
        if (event.key === 'Tab') {
        event.preventDefault()
        handleTab(row._index)
        }
    },
    onWheel: (event) => event.preventDefault(),
    style: 'width: 100%;'
    })
}
])

// 初始化方法
const init = async () => {
try {
    // 获取小鼠数据
    const response = await api.get('/lived_mice')
    lived_mice.value = response.data
    
    // 获取体重记录
    const recordsResponse = await api.get('/weight')
    weightRecords.value = recordsResponse.data
} catch (error) {
    console.error('获取小鼠数据失败:', error)
}
}

// 打开录入模态框
const openRecordModal = () => {
    showModal.value = true
    nextTick(() => {
        // 自动聚焦到第一个输入框
        const firstInput = document.querySelector('.weight-input input')
        if (firstInput) firstInput.focus()
    })
}

// 关闭模态框
const closeModal = () => {
    showModal.value = false
}

// 处理Tab键
const handleTab = (index) => {
    const inputs = document.querySelectorAll('.weight-input')
    if (index < inputs.length - 1) {
        inputs[index + 1].focus()
    }
}

// 保存体重记录的处理方法
const handleSaveWeight = () => {
    const records = []

    lived_mice.value.forEach((mouse) => {
        const weight = weightValues.value[mouse.tid]
        // 只添加有有效体重值的记录
        if (weight && weight > 0) {
        records.push({
            mouse_id: mouse.tid,
            weight: parseFloat(weight),
            record_date: recordDate.value
        })
        }
    })

    if (records.length === 0) {
        message.error('请至少填写一条有效的记录')
        return
    }

    confirmRecordCount.value = records.length
    confirmDate.value = recordDate.value
    showConfirmModal.value = true
}

// 确认保存
const confirmSave = async () => {
    isSaving.value = true
    const records = []

    lived_mice.value.forEach((mouse) => {
        const weight = weightValues.value[mouse.tid]
        // 只添加有有效体重值的记录
        if (weight && weight > 0) {
        records.push({
            mouse_id: mouse.tid,
            weight: parseFloat(weight),
            record_date: recordDate.value
        })
        }
    })
    try {
        // 发送批量请求
        await api.post('/weight', { records })
        message.success(`成功保存 ${records.length} 条记录！`)
        weightValues.value = {}
        showModal.value = false
        
        // 重新获取体重记录
        const recordsResponse = await api.get('/weight')
        weightRecords.value = recordsResponse.data
    } catch (error) {
        console.error('保存体重记录失败:', error)
        message.error('保存失败: ' + (error.response?.data?.error || error.message))
    } finally {
        confirmRecordCount.value = 0
        confirmDate.value = null
        showConfirmModal.value = false
        isSaving.value = false
    }
}

// 取消确认
const cancelConfirm = () => {
    confirmRecordCount.value = 0
    confirmDate.value = null
    showConfirmModal.value = false
}

const showChart = async (groupType) => {
    try {
        if (weightRecords.value.length === 0) {
        message.info('没有可用的体重记录数据')
        return
        }
        let groups = []
        if (groupType === 'temp') {
            if (tempGroups.value.length === 0) {
                message.info('请至少添加一个分组');
                return;
            }  
            groups = await getTempGroups()
        } else if (groupType === 'pred') {
            if (!selectedPredefinedGroupId.value) {
                message.info('请选择预设分组');
                return;
            }
            groups = await getPredefinedGroups()
        }
        if (groups.length === 0) {
            message.info('预设分组暂无信息');
            return;
        }
        hasData.value = true
        await nextTick();
        generateChart(weightRecords.value, groups)
    } catch (error) {
        console.error('生成图表失败:', error)
        message.error('生成图表失败: ' + error.message)
    }
}

// 生成图表
const generateChart = (records, groups) => {
try {
    const ctx = document.getElementById('weightChart')
    if (!ctx) {
        console.error('图表容器未找到')
        return
    }
    
    // 销毁现有图表
    if (weightChart) {
        weightChart.destroy()
    }
    const datasets = []
    
    // 处理数据
    groups.forEach(group => {
        const groupName = group.name || '暂无名称'
        const color = group.color || '#555'
        const groupMice = group.mice || []

    if (groupMice.length === 0){
        message.info("所选组别无小鼠！")
    }
    
    // 获取这些小鼠的体重记录
    const groupRecords = records.filter(record => 
        groupMice.some(m => m === record.mouse_id)
    )
    
    if (groupRecords.length === 0){
        message.info("所选组别无数据！")
    }
    // 1. 散点图数据集（显示所有数据点）
    const scatterData = []
    
    groupRecords.forEach(record => {
        const mouse = mice.value.find(m => m.tid === record.mouse_id)
        scatterData.push({
        x: record.record_livingdays,
        y: record.weight,
        mouseId: mouse.id
        })
    })
    
    // 添加散点图数据集
    datasets.push({
        label: `${groupName} - 数据点`,
        data: scatterData,
        borderColor: color,
        backgroundColor: `${color}80`, // 半透明
        pointRadius: 4,
        pointHoverRadius: 6,
        showLine: false,
        type: 'scatter'
    })
    
    // 2. 平均线数据集
    const lineData = []
    
    if (averageMethod.value === 'weekly') {
        // 按周计算平均值
        const weeklyAverages = {}
        
        // 按周分组数据
        groupRecords.forEach(record => {
        const week = Math.floor(record.record_livingdays / 7)
        if (!weeklyAverages[week]) {
            weeklyAverages[week] = { total: 0, count: 0 }
        }
        weeklyAverages[week].total += record.weight
        weeklyAverages[week].count += 1
        })
        
        // 计算每周平均值
        for (const week in weeklyAverages) {
        const avg = weeklyAverages[week].total / weeklyAverages[week].count
        lineData.push({
            x: parseInt(week) * 7 + 3.5, // 周中的天数（中间点）
            y: parseFloat(avg.toFixed(2))
        })
        }
        
        // 按周数排序
        lineData.sort((a, b) => a.x - b.x)
    }
    else if (averageMethod.value === 'monthly') {
        // 按月计算平均值
        const monthlyAverages = {}
        
        // 按月分组数据
        groupRecords.forEach(record => {
        const month = Math.floor(record.record_livingdays / 30)
        if (!monthlyAverages[month]) {
            monthlyAverages[month] = { total: 0, count: 0 }
        }
        monthlyAverages[month].total += record.weight
        monthlyAverages[month].count += 1
        })
        
        // 计算每月平均值
        for (const month in monthlyAverages) {
        const avg = monthlyAverages[month].total / monthlyAverages[month].count
        lineData.push({
            x: parseInt(month) * 30 + 15, // 周中的天数（中间点）
            y: parseFloat(avg.toFixed(2))
        })
        }
        
        // 按月数排序
        lineData.sort((a, b) => a.x - b.x)
    } 
    else {
        // 按天计算平均值
        const dailyAverages = {}
        
        // 按天分组数据
        groupRecords.forEach(record => {
        const day = record.record_livingdays
        if (!dailyAverages[day]) {
            dailyAverages[day] = { total: 0, count: 0 }
        }
        dailyAverages[day].total += record.weight
        dailyAverages[day].count += 1
        })
        
        // 计算每天平均值
        for (const day in dailyAverages) {
        const avg = dailyAverages[day].total / dailyAverages[day].count
        lineData.push({
            x: parseInt(day),
            y: parseFloat(avg.toFixed(2))
        })
        }
        
        // 按天数排序
        lineData.sort((a, b) => a.x - b.x)
    }
    
    // 添加平均线数据集
    datasets.push({
        label: `${groupName} - 平均线`,
        data: lineData,
        borderColor: color,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
        fill: false,
        tension: 0.3,
        type: 'line'
    })
    
    // 3. 趋势线（如果启用）
    if (showTrendLine.value && lineData.length >= 2) {
        // 准备回归分析数据
        const regressionData = lineData.map(point => [point.x, point.y])
        
        // 使用线性回归
        const result = regression.linear(regressionData)
        const gradient = result.equation[0]
        const intercept = result.equation[1]
        const r2 = result.r2
        
        // 计算趋势线的起点和终点
        const firstX = lineData[0].x
        const lastX = lineData[lineData.length - 1].x
        
        const trendData = [
        { x: firstX, y: gradient * firstX + intercept },
        { x: lastX, y: gradient * lastX + intercept }
        ]
        
        // 添加趋势线数据集
        datasets.push({
        label: `${groupName} - 趋势线 (R²=${r2.toFixed(3)})`,
        data: trendData,
        borderColor: color,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        borderDash: [5, 5],
        type: 'line'
        })
    }
    
    // 4. 置信区间（如果启用）
    if (showConfidenceBand.value && averageMethod.value === 'weekly' && lineData.length >= 2) {
        // 计算每周的标准差和置信区间
        const weeklyStats = {}
        
        // 按周分组数据
        groupRecords.forEach(record => {
        const week = Math.floor(record.record_livingdays / 7)
        if (!weeklyStats[week]) {
            weeklyStats[week] = { values: [] }
        }
        weeklyStats[week].values.push(record.weight)
        })
        
        // 计算置信区间
        const confidenceDataUpper = []
        const confidenceDataLower = []
        
        for (const week in weeklyStats) {
        const values = weeklyStats[week].values
        const mean = values.reduce((a, b) => a + b, 0) / values.length
        const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length)
        
        // 95% 置信区间
        const margin = 1.96 * stdDev / Math.sqrt(values.length)
        
        confidenceDataUpper.push({
            x: parseInt(week) * 7 + 3.5,
            y: mean + margin
        })
        
        confidenceDataLower.push({
            x: parseInt(week) * 7 + 3.5,
            y: mean - margin
        })
        }
        
        // 按周数排序
        confidenceDataUpper.sort((a, b) => a.x - b.x)
        confidenceDataLower.sort((a, b) => a.x - b.x)
        
        // 添加置信区间数据集
        datasets.push({
        label: `${groupName} - 95% 置信区间`,
        data: confidenceDataUpper,
        borderColor: 'transparent',
        backgroundColor: `${color}20`,
        pointRadius: 0,
        fill: '+1',
        type: 'line',
        showLine: false
        })
        
        datasets.push({
        label: `${groupName} - 置信区间下界`,
        data: confidenceDataLower,
        borderColor: 'transparent',
        backgroundColor: `${color}20`,
        pointRadius: 0,
        fill: false,
        type: 'line',
        showLine: false
        })
    } else if (showConfidenceBand.value && averageMethod.value === 'monthly' && lineData.length >= 2){
        // 计算每月的标准差和置信区间
        const monthlyStats = {}
        
        // 按月分组数据
        groupRecords.forEach(record => {
        const month = Math.floor(record.record_livingdays / 30)
        if (!monthlyStats[month]) {
            monthlyStats[month] = { values: [] }
        }
        monthlyStats[month].values.push(record.weight)
        })
        
        // 计算置信区间
        const confidenceDataUpper = []
        const confidenceDataLower = []
        
        for (const month in monthlyStats) {
        const values = monthlyStats[month].values
        const mean = values.reduce((a, b) => a + b, 0) / values.length
        const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length)
        
        // 95% 置信区间
        const margin = 1.96 * stdDev / Math.sqrt(values.length)
        
        confidenceDataUpper.push({
            x: parseInt(month) * 30 + 15,
            y: mean + margin
        })
        
        confidenceDataLower.push({
            x: parseInt(month) * 30 + 15,
            y: mean - margin
        })
        }
        
        // 按月数排序
        confidenceDataUpper.sort((a, b) => a.x - b.x)
        confidenceDataLower.sort((a, b) => a.x - b.x)
        
        // 添加置信区间数据集
        datasets.push({
        label: `${groupName} - 95% 置信区间`,
        data: confidenceDataUpper,
        borderColor: 'transparent',
        backgroundColor: `${color}20`,
        pointRadius: 0,
        fill: '+1',
        type: 'line',
        showLine: false
        })
        
        datasets.push({
        label: `${groupName} - 置信区间下界`,
        data: confidenceDataLower,
        borderColor: 'transparent',
        backgroundColor: `${color}20`,
        pointRadius: 0,
        fill: false,
        type: 'line',
        showLine: false
        })
    }
    })
    
    // 创建图表
    weightChart = new Chart(ctx, {
    type: 'scatter',
    data: { 
        datasets: datasets.filter(d => {
            // 根据 showDot 决定是否包含散点数据集
            if (d.label.includes('数据点')) {
            return showDot.value // 只返回 true 时包含散点
            }
            return true // 其他数据集始终显示
        }
        )
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
        legend: {
            position: 'top',
            labels: {
            filter: item => !item.text.includes('数据点') && 
                    !item.text.includes('置信区间下界')
            }
        },
        tooltip: {
            callbacks: {
            label: (context) => {
                const dataset = context.dataset
                const point = context.raw
                
                if (dataset.label.includes('数据点')) {
                return `小鼠 ${point.mouseId}: ${point.y}g`
                }
                return `${dataset.label}: ${point.y}g`
            },
            title: (context) => {
                const point = context[0].raw
                if (averageMethod.value === 'weekly') {
                const week = Math.floor(point.x / 7)
                return `第${week + 1}周 (${week*7}-${week*7+6}天)`
                } else if (averageMethod.value === 'monthly') {
                const month = Math.floor(point.x / 30)
                return `第${month + 1}月 (${month*30}-${month*30+29}天)`
                }
                return `生存天数: ${point.x}天`
            }
            }
        }
        },
        scales: {
        y: {
            title: {
            display: true,
            text: '体重 (g)'
            },
            beginAtZero: false
        },
        x: {
            type: 'linear',
            title: {
            display: true,
            text: () => {
                if (averageMethod.value === 'weekly') {
                return `生存周数`
                } else if (averageMethod.value === 'monthly') {
                return `生存月数`
                }
                return `生存天数(天)`
            }
            },
            ticks: {
            stepSize: 7,
            callback: function(value) {
                if (averageMethod.value === 'weekly') {
                const week = Math.floor(value / 7)
                return week >= 0 ? `第${week+1}周` : value
                } else if (averageMethod.value === 'monthly') {
                const month = Math.floor(value / 30)
                return month >= 0 ? `第${month+1}月` : value
                }
                return value
            }
            }
        }
        }
    }
    })
    } catch (error) {
    console.error('生成图表失败:', error)
    }
}

// 监听图表选项变化
watch([averageMethod, showTrendLine, showConfidenceBand, showDot], () => {
if (hasData.value) {
    showChart(showChartType.value)
}
})

// 组件挂载时初始化
onMounted(() => {
init()
})
</script>

<style scoped>
/* 使用与dashboard一致的卡片样式 */
.card {
margin-bottom: 1.5rem;
border-radius: 8px;
box-shadow: 0 2px 8px color-mix(in srgb, var(--n-text-color) 10%, transparent);
background-color: var(--n-color);
overflow: hidden;
}

.card-header {
padding: 1rem;
background-color: var(--n-color-embedded);
border-bottom: 1px solid var(--n-border-color);
font-weight: 600;
}

.card-body {
padding: 1.5rem;
}

.content-header {
display: flex;
justify-content: space-between;
align-items: center;
margin-bottom: 20px;
}

.page-title {
font-size: 1.5rem;
font-weight: 600;
margin: 0;
}

.form-group {
margin-bottom: 1rem;
}

.form-label {
display: block;
margin-bottom: 0.5rem;
font-weight: 500;
}

.dialog-container {
background-color: var(--n-color);
border-radius: 8px;
width: 90%;
max-width: 800px;
max-height: 90vh;
overflow: auto;
box-shadow: 0 4px 20px color-mix(in srgb, var(--n-text-color) 20%, transparent);
}

.modal-header {
padding: 1rem;
background-color: var(--primary);
color: var(--n-color);
border-radius: 8px 8px 0 0;
display: flex;
justify-content: space-between;
align-items: center;
}

.modal-title {
margin: 0;
font-size: 1.25rem;
}

.modal-body {
padding: 1.5rem;
}

.input-table {
margin-top: 1rem;
}

.table-wrapper {
overflow-x: auto;
}

.weight-input {
width: 100%;
padding: 0.5rem;
border: 1px solid var(--n-border-color);
border-radius: 4px;
font-size: 1rem;
}

.d-grid {
display: grid;
}

.mt-3 {
margin-top: 1rem;
}

.chart-container {
position: relative;
height: 400px;
width: 100%;
}

.mb-4 {
margin-bottom: 1.5rem;
}

/* 图表控制区域 */
.chart-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 30px;
    margin-bottom: 20px;
    padding: 15px;
    background-color: var(--n-color-embedded);
    border-radius: 8px;
}

.control-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.control-label {
    font-weight: 500;
    font-size: 14px;
}

/* 响应式调整 */
@media (max-width: 992px) {
.content-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
}

.chart-container {
    height: 300px;
}
}

@media (max-width: 768px) {
    .chart-controls {
        flex-direction: column;
    }
}

/* 添加分组容器样式 */
.groups-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr); /* 每行最多四个 */
  gap: 15px;
  margin-bottom: 20px;
}

/* 分组卡片样式 */
.group-card {
  width: 200px;
  height: 210px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px color-mix(in srgb, var(--n-text-color) 5%, transparent);
  transition: all 0.3s ease;
}

.group-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 10px color-mix(in srgb, var(--n-text-color) 10%, transparent);
}

/* 添加分组卡片样式 */
.add-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--n-color-embedded);
  border: 1px dashed var(--n-border-color);
  cursor: pointer;
}

.add-card:hover {
  background-color: var(--n-color-embedded);
  border-color: var(--n-text-color-3);
}

.add-card i {
  font-size: 2rem;
  margin-bottom: 8px;
  color: var(--n-text-color-3);
}

.add-card span {
  font-weight: 500;
  color: var(--n-text-color-2);
}

/* 卡片内部调整 */
.group-card .card {
  height: 100%;
  margin: 0;
}

.group-card .card-header {
  padding: 8px;
  font-size: 0.9rem;
}

.group-card .card-body {
  padding: 10px;
  height: calc(100% - 40px); /* 减去头部高度 */
  overflow-y: auto;
}

.group-card .form-label {
  font-size: 0.8rem;
  margin-bottom: 4px;
}

.group-card .form-check {
  font-size: 0.8rem;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .groups-container {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  }
  
  .group-card {
    width: 130px;
    height: 130px;
  }
}

@media (max-width: 576px) {
  .groups-container {
    grid-template-columns: repeat(2, 1fr); /* 小屏幕每行两个 */
  }
}

.compact-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.3rem 0.5rem;
  background-color: var(--n-color-embedded);
  border-bottom: 1px solid var(--n-color-embedded);
  font-size: 0.85rem;
  font-weight: 600;
}

.compact-header button {
  background: none;
  border: none;
  padding: 0;
  color: var(--n-text-color-3);
  cursor: pointer;
  font-size: 0.9rem;
}

.compact-header button:hover {
  color: var(--n-error-color);
}

.text-center {
  text-align: center;
}

.text-muted {
  color: var(--n-text-color-3);
}

/* 确认对话框样式 */
.confirm-dialog {
    background-color: var(--n-color);
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 20px color-mix(in srgb, var(--n-text-color) 20%, transparent);
}

.confirm-header {
  padding: 1rem;
  background-color: var(--n-color-embedded);
  border-bottom: 1px solid var(--n-border-color);
  border-radius: 8px 8px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.confirm-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.confirm-body {
  padding: 1.5rem;
}

.confirm-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.info-label {
  font-weight: 500;
  min-width: 80px;
}

.info-value {
  color: var(--n-text-color-2);
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

</style>