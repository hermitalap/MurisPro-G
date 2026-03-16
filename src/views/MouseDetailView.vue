<template>
<div class="main-content">
<n-modal :show="true" @mask-click="closeMainModal">
<n-card class="mouse-detail-modal" :bordered="false" role="dialog" aria-modal="true">
  <n-space justify="space-between" align="center" class="page-header">
    <n-button class="back-button" type="primary" @click="closeMainModal">
      <AppIcon  name="arrow_back" />
      返回
    </n-button>
    <!-- 添加返回上一只按钮 -->
    <n-button 
      v-if="prevMouseId"
      class="back-button"
      secondary
      type="primary"
      @click="navigateToMouse(prevMouseId)"
    >
      <AppIcon  name="replay" />
      返回上一只
    </n-button>
    <h2>小鼠详情 #{{ mouseData.id }}</h2>
  </n-space>

  <div class="detail-grid">
    <div class="grid-item basic-info">
      <div class="card">
        <h3 class="card-title">小鼠基本信息</h3>
        <div class="info-grid">
          <div class="info-row">
            <span class="info-label">ID:</span>
            <span class="info-value">{{ mouseData.id }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">性别:</span>
            <span class="info-value">{{ mouseData.sex === 'M' ? '雄性' : '雌性' }}</span>
          </div>
        </div>
          <div class="info-row">
            <span class="info-label">基因型:</span>
            <span class="info-value" v-html="mouseData.genotype?.symbol"></span>
          </div>
          <div class="info-row">
            <span class="info-label">笼位位置:</span>
            <span class="info-value">{{ mouseData.cage_name ? mouseData.cage_name : '未分配' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">完成实验:</span>
            <span class="info-value">{{ mouseData.tests_done && mouseData.tests_done.length ? mouseData.tests_done.join(', ') : '无' }}</span>
        </div>
      </div>
    </div>

    <div class="grid-item status-records">
      <div class="card">
        <h3 class="card-title">状态记录</h3>
          <n-button 
            v-if="!showAddRecordForm" 
            class="add-record-button"
            secondary
            type="primary"
            @click.stop="openAddRecordForm">
            <AppIcon  name="add" />
            添加记录
          </n-button>

          <!-- 添加记录表单（内联显示） -->
          <div v-else class="add-record-form">
            <div class="form-group">
              <n-form-item label="记录日期" label-placement="top">
                <n-date-picker type="date" value-format="yyyy-MM-dd" v-model:formatted-value="newRecord.record_date" />
              </n-form-item>
            </div>
            <div class="form-group">
              <n-form-item label="详细描述" label-placement="top">
                <n-input
                  v-model:value="newRecord.status"
                  type="textarea"
                  placeholder="输入详细描述..."
                  :rows="2"
                />
              </n-form-item>
            </div>
            <n-space justify="end" class="form-buttons">
              <n-button secondary @click="cancelAddRecord">取消</n-button>
              <n-button type="primary" @click="saveNewRecord">保存</n-button>
            </n-space>
          </div>

        <div class="status-content">
          <div v-if="mouseData.status_records && mouseData.status_records.length" class="status-list">
            <div v-for="record in mouseData.status_records" :key="record.id" class="status-item" :class="{ 'deleting': deletingRecordId === record.id }" @click="setDeletingRecord(record)">
              <div class="status-date" v-if="record.record_livingdays === -1">导入默认</div>
              <div class="status-date" v-else>{{ record.record_livingdays }}天时</div>
              <div class="status-description">{{ record.status }}</div>
            </div>
          </div>
          <div v-else-if="!showAddRecordForm" class="no-data">
            <AppIcon  name="info" />
            <p>暂无状态记录</p>
          </div>
        </div>
      </div>
    </div>

    <div class="grid-item pedigree">
      <div class="card">
        <div class="pedigree-header card-title">
          <h3>谱系图</h3>
          <div class="checkbox-group">
            <n-checkbox v-model:checked="liveOnly">仅显示存活小鼠的关系</n-checkbox>
          </div>
        </div>
        <!-- SVG 容器（D3 绘图） -->
        <div ref="pedigreeChart" class="chart-container svg-container"></div>
      </div>
    </div>

    <div class="grid-item weight-chart">
      <div class="card">
        <h3 class="card-title">体重变化图</h3>
        <!-- 为 Chart.js 提供固定高度的父容器，canvas 放在内部 -->
        <div class="chart-container canvas-wrapper">
          <canvas ref="weightChart"></canvas>
        </div>
      </div>
    </div>
  </div>
</n-card>
</n-modal>
</div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import * as d3 from 'd3'
import { Chart, registerables } from 'chart.js'
import { toast } from 'vue3-toastify';
import { useGeneStore } from '@/stores'
import { storeToRefs } from 'pinia'

const geneStore = useGeneStore()
const { mice } = storeToRefs(geneStore)

Chart.register(...registerables)

// 定义 props
const props = defineProps({
  mouseId: { type: Number, required: true }
})
// 定义 emits
const emit = defineEmits(['close'])

const closeMainModal = () => { emit('close') }

const prevMouseId = ref(null);
const currentMouseID = ref(props.mouseId)
const mouseData = ref({})
const weightChart = ref(null)
const pedigreeChart = ref(null)
const liveOnly = ref(false)

// chart / d3 refs
let chartInstance = null
const simulationRef = ref(null)
let resizeObserver = null
let resizeTimer = null

// 监听props.mouseId变化
watch(currentMouseID, (newId) => {
  if (newId) {
    fetchMouseData();
  }
});

watch(liveOnly, async () => {
  // 重新渲染谱系图
  await nextTick()
  renderPedigreeChart()
})

const fetchMouseData = async () => {
  try {
    const response = await fetch(`/api/mice/${currentMouseID.value}`)
    if (!response.ok) throw new Error('获取数据失败')
    mouseData.value = await response.json()
    // 渲染图表在 DOM 更新后进行
    await nextTick()
    renderWeightChart()
    renderPedigreeChart()
  } catch (error) {
    console.error('获取小鼠数据失败:', error)
  }
}

// ========== 状态记录相关 ==========
const deletingRecordId = ref(null)
  let clickTimer = null
  const setDeletingRecord = (record) => {
  if (deletingRecordId.value === record.id) {
    deleteRecord(record)
    return
  }
  if (clickTimer) { clearTimeout(clickTimer); clickTimer = null }
  deletingRecordId.value = record.id
  clickTimer = setTimeout(() => { deletingRecordId.value = null }, 1000)
}

const deleteRecord = async (record) => {
  try {
    const response = await fetch(`/api/status_records/${record.id}`, { method: 'DELETE' })
    if (response.ok) {
      const index = mouseData.value.status_records.findIndex(r => r.id === record.id)
    if (index !== -1) mouseData.value.status_records.splice(index, 1)
    console.log('记录删除成功')
    } else {
      console.error('删除记录失败')
    }
  } catch (error) {
    console.error('删除记录时出错:', error)
  } finally {
    deletingRecordId.value = null
  }
}

// 添加记录表单状态
const showAddRecordForm = ref(false)
const newRecord = ref({ record_date: null, status: '' }) 

const openAddRecordForm = () => {
  // 设置默认日期为今天
  const today = new Date()
  const formattedDate = today.toISOString().split('T')[0]
  newRecord.value = { record_date: formattedDate, status: '' }
  showAddRecordForm.value = true
}

const cancelAddRecord = () => {
  showAddRecordForm.value = false
}

const saveNewRecord = async () => {
  try {
    const recordToSave = { ...newRecord.value, mouse_tid: currentMouseID.value, birth_date: mouseData.value.birth_date }
    const response = await fetch(`/api/status_records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recordToSave)
    })
    showAddRecordForm.value = false
    toast.success('状态记录已添加')
    // 刷新数据
    await fetchMouseData()
  } catch (error) {
    console.error('添加记录失败:', error)
    toast.error('添加记录失败，请重试')
  }
}
    
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

// ========== Chart.js 渲染（体重图） ==========
const renderWeightChart = () => {
  if (!weightChart.value || !mouseData.value.weight_records) return
  const weightRecords = Array.isArray(mouseData.value.weight_records) ? mouseData.value.weight_records : []
  if (weightRecords.length === 0) {
    // 若无数据，销毁实例并返回（保持 canvas 空白）
    if (chartInstance) { chartInstance.destroy(); chartInstance = null }
    return
  }

  const dataPoints = weightRecords.map(record => ({ x: record.record_livingdays, y: record.weight }))

  // 如果已经有实例，更新数据即可，避免 destroy -> create 循环
  if (chartInstance) {
    chartInstance.data.datasets[0].data = dataPoints
    chartInstance.update()
    return
  }

  // 首次创建 Chart 实例（使用 canvas context）
  const ctx = weightChart.value.getContext('2d')
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
      datasets: [{
        label: '体重 (g)',
        data: dataPoints,
        borderColor: 'var(--n-primary-color)',
        backgroundColor: 'color-mix(in srgb, var(--n-primary-color) 10%, transparent)',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: 'var(--n-primary-color)',
        pointBorderColor: 'var(--n-color)',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
      },
      options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { 
          mode: 'index',
          intersect: false,
          callbacks: {
            title: function(tooltipItems) {
                return `${tooltipItems[0].label}天时，`;
            },
            label: function(context) {
                return `体重${context.parsed.y}g`;
            }
          }
        }
      },
      scales: {
        x: {
        type: 'linear', // 关键：x 轴为线性数值轴（天数）
        title: { display: true, text: '天数' },
        grid: { color: 'color-mix(in srgb, var(--n-text-color) 5%, transparent)' }
        },
        y: {
        beginAtZero: false,
        title: { display: true, text: '体重 (g)' },
        grid: { color: 'color-mix(in srgb, var(--n-text-color) 5%, transparent)' }
        }
      }
    }
  })
  }

const renderPedigreeChart = async () => {
  if (!pedigreeChart.value || !mouseData.value.pedigree) return

  // 清除旧内容
  d3.select(pedigreeChart.value).selectAll('*').remove()

  // 停止旧的 simulation
  if (simulationRef.value) {
    try { simulationRef.value.stop() } catch (e) { /* ignore */ }
    simulationRef.value = null
  }

  const pedigree = mouseData.value.pedigree || {};
  const width = pedigreeChart.value.clientWidth || 400
  const height = pedigreeChart.value.clientHeight || 220

  const svg = d3.select(pedigreeChart.value)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .attr('preserveAspectRatio', 'xMidYMid meet')

  // 添加箭头标记
  const defs = svg.append('defs');

  // 父代到当前小鼠的箭头
  defs.append('marker')
    .attr('id', 'arrow-father')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 25)
    .attr('refY', 0)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', 'var(--n-border-color)');

  // 当前小鼠到后代的箭头
  defs.append('marker')
    .attr('id', 'arrow-offspring')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 25)
    .attr('refY', 0)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', 'var(--n-text-color-3)');

  // 创建节点数组
  const nodes = []
  const links = []
  
  // 创建当前小鼠节点
  const currentNode = {
    id: currentMouseID.value,
    name: `${mouseData.value.id}`,
    type: 'current',
    birth_date: mouseData.value.birth_date,
    genotype: mouseData.value.genotype,
    sex: mouseData.value.sex,
    live: mouseData.value.live_status,
    // 设置初始位置为中心
    x: width / 2,
    y: height / 2,
    fixed: true // 固定当前节点位置
  }
  nodes.push(currentNode)

  // 等待所有节点加载完成
  try {
    // 处理父代
    if (pedigree.father_id && pedigree.father_id.length) {
      for (const id of pedigree.father_id) {
        const father = mice.value.find(m => m.tid === id)
        if (father) {
          if (father.live_status !== 1 && liveOnly.value) {
            // 若选择仅显示存活小鼠，且父代已死亡，则跳过该节点
            continue;
          }
          const fatherNode = {
            id,
            name: `${father.id}`,
            birth_date: father.birth_date,
            type: 'father',
            genotype: father.genotype,
            sex: father.sex,
            live: father.live_status,
            // 设置父代初始位置在左侧
            x: width / 4,
            y: height / 2 - (pedigree.father_id.length > 1 ? 30 : 0)
          }
          nodes.push(fatherNode)
          links.push({
            source: fatherNode,
            target: currentNode,
            type: 'father'
          })
        } else {
          console.error(`获取父代小鼠 ${id} 失败:`, error)
          const fallbackNode = {
            id,
            name: '未知',
            birth_date: '未知',
            type: 'father',
            genotype: '未知',
            sex: '未知',
            live: -1,
            x: width / 4,
            y: height / 2 - (pedigree.father_id.length > 1 ? 30 : 0)
          }
          nodes.push(fallbackNode)
          links.push({
            source: fallbackNode,
            target: currentNode,
            type: 'father'
          })
        }
      }
    }
  
    // 处理母代
    if (pedigree.mother_id && pedigree.mother_id.length) {
      for (const id of pedigree.mother_id) {
        const mother = mice.value.find(m => m.tid === id)
        if (mother) {
          if (mother.live_status !== 1 && liveOnly.value) {
            // 若选择仅显示存活小鼠，且母代已死亡，则跳过该节点
            continue;
          }
          const motherNode = {
            id,
            name: `${mother.id}`,
            birth_date: mother.birth_date,
            type: 'mother',
            genotype: mother.genotype,
            sex: mother.sex,
            live: mother.live_status,
            // 设置母代初始位置在左侧
            x: width / 4,
            y: height / 2 + (pedigree.mother_id.length > 1 ? 30 : 0)
          }
          nodes.push(motherNode)
          links.push({
            source: motherNode,
            target: currentNode,
            type: 'mother'
          })
        }else {
          console.error(`获取母代小鼠 ${id} 失败:`, error)
          const fallbackNode = {
            id,
            name: '未知',
            birth_date: '未知',
            type: 'mother',
            genotype: '未知',
            sex: '未知',
            live: -1,
            x: width / 4,
            y: height / 2 + (pedigree.mother_id.length > 1 ? 30 : 0)
          }
          nodes.push(fallbackNode)
          links.push({
            source: fallbackNode,
            target: currentNode,
            type: 'mother'
          })
        }
      }
    }

    // 处理后代
    if (pedigree.offspring && pedigree.offspring.length) {
      for (const [index, id] of pedigree.offspring.entries()) {
        const offspring = mice.value.find(m => m.tid === id)
        if (offspring) {
          if (offspring.live_status !== 1 && liveOnly.value) {
            // 若选择仅显示存活小鼠，且后代已死亡，则跳过该节点
            continue;
          }
          const offspringNode = {
            id,
            name: `${offspring.id}`,
            birth_date: offspring.birth_date,
            type: 'offspring',
            genotype: offspring.genotype,
            sex: offspring.sex,
            live: offspring.live_status,
            // 设置后代初始位置在右侧，根据数量垂直分布
            x: width * 0.75,
            y: height / (pedigree.offspring.length + 1) * (index + 1)
          }
          nodes.push(offspringNode)
          links.push({
            source: currentNode,
            target: offspringNode,
            type: 'offspring'
          })
        } else {
          console.error(`获取后代小鼠 ${id} 失败:`, error)
          const fallbackNode = {
            id,
            name: '未知',
            birth_date: '未知',
            type: 'offspring',
            genotype: '未知',
            sex: '未知',
            live: -1,
            x: width * 0.75,
            y: height / (pedigree.offspring.length + 1) * (index + 1)
          }
          nodes.push(fallbackNode)
          links.push({
            source: currentNode,
            target: fallbackNode,
            type: 'offspring'
          })
          return fallbackNode
        }
      }
    }
  } catch (error) {
    console.error('谱系图节点加载错误:', error)
  }

  // 创建力导向图并保存引用
  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links)
      .id(d => d.id)
      .distance(100) // 连接距离
      .strength(0.8) // 连接强度
    )
    .force('charge', d3.forceManyBody()
      .strength(-200) // 减少排斥力
    )
    .force('collide', d3.forceCollide().radius(30)) // 防止节点重叠
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('x', d3.forceX().x(d => {
      // 根据类型设置水平位置约束
      if (d.type === 'father' || d.type === 'mother') return width * 0.25
      if (d.type === 'current') return width / 2
      return width * 0.75
    }).strength(0.1)) // 水平位置约束强度
    .force('y', d3.forceY().y(height / 2).strength(0.05)) // 垂直居中约束

  const link = svg.append('g')
    .selectAll('line')
    .data(links)
    .enter()
    .append('line')
    .attr('stroke', d => {
      if (d.type === 'father') return 'var(--n-success-color)' // 父代用绿色
      if (d.type === 'mother') return 'var(--n-error-color)' // 母代用红色
      return 'var(--n-text-color-3)' // 后代用灰色
    })
    .attr('stroke-width', 2)
    .attr('marker-end', d => {
      if (d.type === 'father' || d.type === 'mother') {
        return 'url(#arrow-father)';
      } else {
        return 'url(#arrow-offspring)';
      }
    });

  // 创建节点组（包含圆形和文本）
  const nodeGroups = svg.append('g')
    .selectAll('g')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'node-group')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .call(d3.drag()
      .on('start', dragStarted)
      .on('drag', dragged)
      .on('end', dragEnded)
    );

  // 在节点组内添加圆形
  nodeGroups.append('circle')
    .attr('r', 20)
    .attr('fill', d => {
      // 如果 live 为 -1，直接返回灰色
      if (d.live === -1) {
        return 'var(--n-border-color)'; // 未知状态用浅灰色
      }
      // 根据节点类型设置基础颜色
      let baseColor = 'var(--n-text-color-3)'; // 默认灰色
      switch (d.type) {
        case 'current': baseColor = 'var(--n-primary-color)'; break; // 当前小鼠用蓝色
        case 'father': baseColor = 'var(--n-success-color)'; break;  // 父代用绿色
        case 'mother': baseColor = 'var(--n-error-color)'; break;  // 母代用红色
        case 'offspring': baseColor = 'var(--n-info-color)'; break; // 后代用紫色
      }
      // 根据 live 值调整亮度
      if (d.live === 1) {
        // live=1: 明亮
        return baseColor;
      } else {
        // live=0或其他: 变暗
        return d3.color(baseColor).darker(1.5);
      }
    });

  // 在节点组内添加文本标签
  nodeGroups.append('text')
    .text(d => d.name)
    .attr('font-size', '12px')
    .attr('text-anchor', 'middle')
    .attr('dy', 5)
    .attr('fill', 'var(--n-color)');

  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)

    nodeGroups
      .attr('transform', d => `translate(${d.x},${d.y})`)
  })

  function dragStarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart()
    d.fx = d.x
    d.fy = d.y
  }
  
  function dragged(event, d) {
    d.fx = event.x
    d.fy = event.y
  }
  
  function dragEnded(event, d) {
    if (!event.active) simulation.alphaTarget(0)
    // 保持拖动后的位置
    d.fx = event.x
    d.fy = event.y
  }

  // 创建tooltip元素
  let tooltip = d3.select('.pedigree-tooltip');

  if (tooltip.empty()) {
    tooltip = d3.select('body')
      .append('div')
      .attr('class', 'pedigree-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'color-mix(in srgb, var(--n-color) 90%, transparent)')
      .style('border', '1px solid var(--n-border-color)')
      .style('border-radius', '4px')
      .style('padding', '8px')
      .style('box-shadow', '0 2px 8px color-mix(in srgb, var(--n-text-color) 15%, transparent)')
      .style('z-index', '1000')
      .style('font-size', '14px')
  }

  // 节点添加悬停事件
  nodeGroups
    .on('mouseover', function(event, d) {
      if (tooltip) {
        tooltip
          .html(`
          <div>ID: ${d.name}</div>
          <div>生日: ${formatDate(d.birth_date)}</div>
          <div>基因型: ${d.genotype.symbol || '未知'}</div>
          <div>性别: ${d.sex === 'M' ? '雄性' : d.sex === 'F' ? '雌性' : '未知'}</div>
          `)
          .style('visibility', 'visible')
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 30) + 'px');
      }
      
      // 高亮当前节点和相关边
      nodeGroups.attr('stroke-width', 0);
      d3.select(this).attr('stroke', 'var(--n-text-color-1)').attr('stroke-width', 2);
      
      link.attr('stroke-opacity', 0.2);
      link.filter(l => l.source.id === d.id || l.target.id === d.id)
        .attr('stroke-opacity', 1)
        .attr('stroke', d => {
            if (d.type === 'father') return 'var(--n-success-color)'
            if (d.type === 'mother') return 'var(--n-error-color)'
            return 'var(--n-primary-color)'
          })
      })
    .on('mouseout', function() {
        tooltip.style('visibility', 'hidden')
        
        // 恢复默认样式
        nodeGroups.attr('stroke-width', 0)
        link.attr('stroke-opacity', 1).attr('stroke', d => {
          if (d.type === 'father') return 'var(--n-success-color)'
          if (d.type === 'mother') return 'var(--n-error-color)'
          return 'var(--n-text-color-3)'
        })
      })
    .on('dblclick', (event, d) => {
      if (d.id !== currentMouseID.value) {
        tooltip.style('visibility', 'hidden');
        // 存储当前小鼠ID作为返回目标
        navigateToMouse(d.id);
      }
    });

  // 保存引用
  simulationRef.value = simulation
}

// ========== ResizeObserver（只观察谱系图容器，带防抖） ==========
const setupResizeObserver = () => {
  resizeObserver = new ResizeObserver((entries) => {
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      // 只对 d3 svg 重新布局/重绘
      renderPedigreeChart()
      // Chart.js 会自己监听容器变化，若需要强制 resize：
      if (chartInstance) {
        try { chartInstance.resize() } catch (e) { /* ignore */ }
      }
    }, 120)
  })

  if (pedigreeChart.value) resizeObserver.observe(pedigreeChart.value)
  // **注意**：不要 observe weightChart（canvas）本身 — 会造成 destroy/create 循环
}

const navigateToMouse = (mouseId) => {
  prevMouseId.value = currentMouseID.value
  currentMouseID.value = mouseId
};

onMounted(() => {
  fetchMouseData()
  setupResizeObserver()
})

onUnmounted(() => {
  if (chartInstance) chartInstance.destroy()
  if (resizeObserver) resizeObserver.disconnect()
  if (simulationRef.value) {
    try { simulationRef.value.stop() } catch (e) {}
    simulationRef.value = null
  }
})
</script>

<style scoped>
/* 主模态 */
.mouse-detail-modal {
width: 90%; 
max-width: 1200px; 
max-height: 90vh;
background-color: var(--n-color-embedded);
border-radius: 12px;
box-shadow: 0 10px 40px color-mix(in srgb, var(--n-text-color) 30%, transparent);
padding: 20px;
overflow-y: auto;
animation: slideIn 0.4s ease;
}

@keyframes slideIn {
from { 
    opacity: 0;
    transform: translate(-50%, -45%);
}
to { 
    opacity: 1;
    transform: translate(-50%, -50%);
}
}

.page-header {
display: flex;
align-items: center;
margin-bottom: 20px;
}

.back-button {
display: flex;
align-items: center;
margin-right: 15px;
font-size: 14px;
transition: all 0.2s;
}

.back-button:hover {
transform: translateX(-2px);
}

.page-header h2 {
color: var(--n-text-color-1);
margin: 0;
font-weight: 600;
font-size: 1.8rem;
}

.detail-grid {
display: grid;
grid-template-columns: 1fr 1fr;
grid-template-rows: auto auto;
gap: 20px;
min-height: 400px;
}

.grid-item {
min-height: 200px;
}

.basic-info {
grid-column: 1;
grid-row: 1;
}

.status-records {
grid-column: 2;
grid-row: 1;
}

.status-item {
pointer-events: auto;
cursor: pointer;
padding: 8px 12px;
border: 1px solid var(--n-border-color);
border-radius: 4px;
margin-bottom: 8px;
transition: all 0.3s ease;
position: relative;
}

.status-item.deleting {
background-color: var(--n-color)5f5;
border-color: var(--n-error-color-suppl);
box-shadow: 0 0 0 1px var(--n-error-color-suppl);
}

.pedigree {
grid-column: 1;
grid-row: 2;
}

.weight-chart {
grid-column: 2;
grid-row: 2;
}

.card {
background: var(--n-color);
border-radius: 8px;
box-shadow: 0 2px 10px color-mix(in srgb, var(--n-text-color) 8%, transparent);
padding: 20px;
height: 100%;
display: flex;
flex-direction: column;
flex:1;
max-width: 600px;
}

.card-title {
color: var(--n-primary-color);
margin-top: 0;
margin-bottom: 15px;
font-size: 16px;
font-weight: 600;
padding-bottom: 10px;
border-bottom: 1px solid var(--n-border-color);
}

.info-content {
flex: 1;
}

.info-row {
display: flex;
margin-bottom: 12px;
align-items: center;
}

.info-label {
font-weight: 600;
color: var(--n-text-color-2);
width: 120px;
flex-shrink: 0;
}

.info-value {
color: var(--n-text-color-1);
overflow : auto;
}

.status-content {
flex: 1;
overflow-y: auto;
max-height: 200px;
}

.status-list {
display: flex;
flex-direction: column;
gap: 12px;
}

.status-item {
display: flex;
align-items: center;
padding: 10px;
background-color: var(--n-color-embedded);
border-radius: 6px;
border-left: 3px solid var(--n-primary-color);
}

.status-date {
font-weight: 600;
color: var(--n-primary-color);
margin-right: 12px;
min-width: 80px;
}

.status-description {
color: var(--n-text-color-2);
}

.no-data {
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
height: 100%;
color: var(--n-text-color-3);
}

.no-data i {
font-size: 36px;
margin-bottom: 10px;
opacity: 0.5;
}

.no-data p {
margin: 0;
font-style: italic;
}
/* Chart / SVG 容器：为 canvas 提供固定高度，避免 flex:1 导致尺寸被父 flex 反复拉伸 */
.chart-container {
width: 100%;
}

.pedigree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0 0.5rem;
}

/* pedigree SVG 的容器 */
.svg-container {
min-height: 220px;
height: 220px;
}

/* weight chart 父容器（有固定高度），canvas 填满该容器 */
.canvas-wrapper {
height: 260px;
flex: none;
position: relative;
}

/* 确保 canvas 正确填充父容器（Chart.js 使用父容器大小） */
canvas {
width: 100% !important;
height: 100% !important;
display: block;
}

.action-buttons {
display: flex;
justify-content: flex-end;
gap: 15px;
margin-top: 25px;
padding-top: 20px;
border-top: 1px solid var(--n-border-color);
}

.btn {
padding: 10px 20px;
border-radius: 6px;
font-size: 14px;
display: flex;
align-items: center;
gap: 8px;
cursor: pointer;
transition: all 0.2s;
}

/* 响应式设计 */
@media (max-width: 1200px) {
.mouse-detail-modal {
    width: 95%;
}
}

@media (max-width: 992px) {
.mouse-detail-modal {
    width: 95%;
}
.detail-grid {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(4, auto);
    height: auto;
}

.basic-info {
    grid-column: 1;
    grid-row: 1;
}

.status-records {
    grid-column: 1;
    grid-row: 2;
}

.pedigree {
    grid-column: 1;
    grid-row: 3;
}

.weight-chart {
    grid-column: 1;
    grid-row: 4;
}

.action-buttons {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
}
}

@media (max-width: 768px) {
.mouse-detail-modal {
    padding: 15px;
    width: 98%;
}

.page-header {
    flex-direction: column;
    align-items: flex-start;
}

.back-button {
    margin-bottom: 10px;
    width: 100%;
    justify-content: center;
}

.info-row {
    flex-direction: column;
    align-items: flex-start;
}

.info-label {
    margin-bottom: 4px;
}

.status-item {
    flex-direction: column;
    align-items: flex-start;
}

.status-date {
    margin-bottom: 6px;
}
}


.add-record-button {
display: flex;
align-items: center;
font-size: 14px;
transition: all 0.2s;
}

.add-record-button:hover {
transform: translateY(-1px);
}

.modal-content {
background: var(--n-color);
border-radius: 12px;
width: 90%;
max-width: 500px;
box-shadow: 0 10px 30px color-mix(in srgb, var(--n-text-color) 20%, transparent);
animation: modalIn 0.3s ease;
}

@keyframes modalIn {
from { opacity: 0; transform: translateY(-20px); }
to { opacity: 1; transform: translateY(0); }
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
color: var(--n-text-color-1);
}

.close-button {
background: none;
border: none;
cursor: pointer;
color: var(--n-text-color-3);
font-size: 24px;
padding: 5px;
}

.close-button:hover {
color: var(--n-text-color-1);
}

.btn-cancel {
background: var(--n-color-embedded);
color: var(--n-text-color-2);
border: 1px solid var(--n-border-color);
}

.btn-cancel:hover {
background: var(--n-border-color);
}

.btn-confirm {
background: var(--n-primary-color);
color: white;
}

.btn-confirm:hover {
background: var(--n-primary-color-hover);
}

.add-record-form {
  background-color: var(--n-color-embedded);
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 15px;
  border: 1px solid var(--n-border-color);
}

.add-record-form .form-group {
  margin-bottom: 12px;
}

.add-record-form label {
  display: block;
  font-weight: 500;
  color: var(--n-text-color-2);
  margin-bottom: 5px;
}

.add-record-form input[type="date"] {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--n-border-color);
  border-radius: 4px;
}

.add-record-form textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--n-border-color);
  border-radius: 4px;
  resize: vertical;
  min-height: 60px;
}

.form-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

/* 添加悬停提示样式 */
.pedigree-tooltip {
  z-index: 1000;
  font-size: 14px;
  line-height: 1.4;
  min-width: 120px;
  background: color-mix(in srgb, var(--n-color) 90%, transparent);
  border: 1px solid var(--n-border-color);
  border-radius: 4px;
  padding: 8px;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--n-text-color) 15%, transparent);
  position: absolute;
}

/* 返回按钮样式调整 */
.page-header .back-button {
  margin-right: 10px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

</style>
