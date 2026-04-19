<template>
  <div class="main-content">
    <n-space justify="space-between" align="center" class="content-header">
      <h1 class="page-title">小鼠生存分析</h1>
    </n-space>
    
    <n-card title="生存曲线分析">
        <!-- 控制按钮区域 -->
        <div class="d-flex mb-4">
          <n-select
            v-model:value="showChartType"
            :options="chartTypeOptions"
            style="min-width: 200px;"
          />
        </div>
        <div v-if="showChartType === 'pred'" class="d-flex justify-content-between mb-4">
          <n-select
            v-model:value="selectedPredefinedGroupId"
            :options="predefinedGroupOptions"
            placeholder="请在设置中确定预设分组"
            :disabled="predefinedGroups.length === 0"
            style="min-width: 180px;"
          />
          <n-button type="primary" @click="fetchData('pred')" :render-icon="renderIcon(TrendingUp)">以预设分组生成生存曲线</n-button>
        </div>
        <div v-if="showChartType === 'temp'" class="d-flex justify-content-between mb-4">
            <n-button type="primary" @click="fetchData('temp')" :render-icon="renderIcon(TrendingUp)">以临时分组生成生存曲线</n-button>
            <n-button secondary @click="addGroup" :render-icon="renderIcon(Add)">添加分组</n-button>
            <n-button id="addGroupBtn" type="error" @click="clearGroups" :render-icon="renderIcon(Close)">清空分组</n-button>
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
                <div class="card-header compact-header d-flex justify-content-between align-items-center">
                  <span>分组 {{ index }}</span>
                  <n-button quaternary circle @click="removeGroup(index)" v-if="tempGroups.length > 1" :render-icon="renderIcon(Close)" />
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
                                    <span class="combination-name">{{ locus }}<sup>{{ combination }}</sup></span>
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
              <n-icon><AddOutline /></n-icon>
              <span>添加分组</span>
            </div>
          </div>
        </div>
        
        <div v-if="hasData">
          <!-- 统计信息卡片 -->
          <div class="card mb-4">
            <div class="card-header">
              统计摘要
            </div>
              <div 
                v-for="(group, index) in groups" 
                :key="index"
              >
              <div class="card-body">
                <n-space wrap justify="space-around" align="center">
                  <!-- 图例 -->
                  <div class="d-flex flex-wrap mt-4">
                    <span class="legend-color" :style="{backgroundColor: group.color}"></span>
                    {{ group.name || `分组 ${index}` }}
                  </div>
                  <n-statistic label="总小鼠数" :value="group.allMice" tabular-nums />
                  <n-statistic label="死亡小鼠数" :value="group.deadMice" tabular-nums />
                  <n-statistic label="存活小鼠数" :value="group.censoredMice" tabular-nums />
                  <n-statistic label="最长生存时间" :value="group.maxDays" tabular-nums>
                    <template #suffix>天</template>
                  </n-statistic>
                  <n-statistic label="中位生存时间" :value="group.ls50" tabular-nums>
                    <template #suffix>天</template>
                  </n-statistic>
                </n-space>
              </div>
            </div>
          </div>

          <!-- 图表容器 -->
          <div class="chart-container">
            <canvas ref="survivalChartEl" height="400"></canvas>
          </div>

          <!-- 数据表格 -->
          <div class="card mt-4">
            <div class="card-header">
              生存数据详情
            </div>
            <div class="card-body">
              <n-data-table
                :columns="survivalColumns"
                :data="displayedMice"
                :single-line="false"
                :bordered="false"
                :row-key="(row) => `${row.groupName}-${row.mouse_id}`"
              />

              <div v-if="filteredMice.length > pageSize" class="pagination-wrapper">
                <n-pagination
                  v-model:page="currentPage"
                  :page-count="totalPages"
                  :page-size="pageSize"
                />
              </div>
            </div>
          </div>
        </div>
        <!-- 无数据提示 -->
        <div v-else class="text-center py-5">
          <div class="mb-3">
            <n-icon style="font-size: 3rem; color: var(--n-text-color-3);"><BarChartOutline /></n-icon>
          </div>
          <h5 class="text-muted">请设置分组条件并点击"生成生存曲线"按钮</h5>
        </div>

    </n-card>
  </div>
</template>

<script setup>
import { h, ref, computed, nextTick, useTemplateRef } from 'vue';
import { NTag, NIcon, useMessage } from 'naive-ui'
import { TrendingUp, Add, Close, AddOutline, BarChartOutline } from '@vicons/ionicons5'

const renderIcon = (IconComp) => () => h(NIcon, null, { default: () => h(IconComp) })
import api from '@/utils/api';
import Chart from 'chart.js/auto';
import { useGeneStore, useExperimentStore } from '@/stores'
import { storeToRefs } from 'pinia'

const geneStore = useGeneStore()
const { tempGroups } = storeToRefs(geneStore)
const { addGroup, removeGroup, clearGroups, getTempGroups, onLocusSelect, onCombinationSelect } = geneStore
const experimentStore = useExperimentStore()
const { predefinedGroups, selectedPredefinedGroupId, showChartType } = storeToRefs(experimentStore)

const chartTypeOptions = [
  { label: '使用预设分组', value: 'pred' },
  { label: '使用临时分组', value: 'temp' }
]
const predefinedGroupOptions = computed(() =>
  predefinedGroups.value.map(group => ({ label: group.name, value: group.id }))
)
const { getPredefinedGroups } = experimentStore
const message = useMessage()
const survivalChartEl = useTemplateRef('survivalChartEl')

// 响应式数据
const groups = ref([]);
const chartInstance = ref(null);
const hasData = ref(false);
const currentPage = ref(1);
const pageSize = 10;

const survivalColumns = computed(() => [
  {
    title: '小鼠ID',
    key: 'mouse_id'
  },
  {
    title: '性别',
    key: 'sex',
    render: (row) => (row.sex === 'M' ? '雄性' : '雌性')
  },
  {
    title: '基因型',
    key: 'genotype',
    render: (row) => h('span', { innerHTML: row.genotype || '' })
  },
  {
    title: '生存天数',
    key: 'living_days',
    render: (row) => `${row.living_days} 天`
  },
  {
    title: '状态',
    key: 'status',
    render: (row) => h(
      NTag,
      {
        bordered: false,
        type: row.status === 1 ? 'error' : 'success'
      },
      { default: () => (row.status === 1 ? '死亡' : '存活') }
    )
  },
  {
    title: '分组',
    key: 'groupName',
    render: (row) => h(
      NTag,
      {
        bordered: false,
        style: {
          backgroundColor: row.color,
          color: '#fff'
        }
      },
      { default: () => row.groupName }
    )
  }
]);

// 获取生存数据
const fetchData = async (groupType) => {
  try {
    currentPage.value = 1
    let groupData = []
    if (groupType === 'temp') {
      if (tempGroups.value.length === 0) {
        message.info('请至少添加一个分组');
        return;
      }
      groupData = await getTempGroups()
    } else if (groupType === 'pred') {
      if (!selectedPredefinedGroupId.value) {
        message.info('请选择预设分组');
        return;
      }
      groupData = await getPredefinedGroups()
    }
    if (groupData.length === 0) {
      message.info('预设分组暂无信息');
      return;
    }
    const response = await api.post('/survival-analysis', {
      groups: groupData.map(g => g.mice)
    });

    if (response.data.success) {
      // 更新前端状态
      groups.value = response.data.group_results.map((group, index) => {
        if (groupData[index]) {
          return {
            ...group, // 保留所有原有属性
            name: groupData[index].name,
            color: groupData[index].color
          };
        }
        return group; // 如果没有对应的 groupData，返回原对象
      });
      hasData.value = true;
      await nextTick();
      // 使用后端准备好的图表数据
      renderChart();
    } else {
      message.error(response.data.error || '分析失败');
    }
  } catch (error) {
    console.error('获取生存数据失败:', error);
    message.error(`获取数据失败：${error}`);
  }
};

// 渲染图表
const renderChart = () => {
  const ctx = survivalChartEl.value;
  
  // 销毁现有图表实例
  if (chartInstance.value) {
    chartInstance.value.destroy();
  }
  
  if (groups.value.length === 0) {
    return;
  }

  // 创建生存曲线数据集
  const datasets = groups.value
    .filter(group => group.survivalData && group.survivalData.length > 0)
    .map((group, groupIndex) => {
      // 生存曲线数据集
      const survivalDataset = {
        label: group.name,
        data: group.survivalData.map(point => ({
          x: point.x,
          y: point.y
        })),
        borderColor: group.color,
        backgroundColor: `${group.color}20`,
        borderWidth: 3,
        pointRadius: 0, // 隐藏曲线上的点
        fill: false,
        stepped: true,
        tension: 0,
        spanGaps: false
      };

      // 死亡事件点数据集
      const eventPoints = group.survivalData
        .filter(point => point.mouseIds && point.mouseIds.length > 0)
        .map(point => ({
          x: point.x,
          y: point.y,
          mouseIds: point.mouseIds
        }));
      
      const eventDataset = {
        label: `${group.name} - 死亡事件`,
        data: eventPoints,
        pointBackgroundColor: group.color,
        pointBorderColor: `${group.color}20`,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointStyle: '',
        showLine: false,
        borderWidth: 0
      };

      // 删失事件数据集
      const censoredDataset = {
        label: `${group.name} - 删失事件`,
        data: group.censoredPoints.map(point => ({
          x: point.x,
          y: point.y,
          mouseIds: point.mouseIds
        })),
        pointBackgroundColor: `${group.color}20`,
        pointBorderColor: `${group.color}20`,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointStyle: 'rectRounded',
        showLine: false,
        borderWidth: 0
      };

      return [survivalDataset, eventDataset, censoredDataset];
    })
    .flat(); // 将多维数组展平为一维

  // 获取最大时间范围
  const maxTime = Math.max(
    ...groups.value.flatMap(group => [
      ...(group.survivalData || []).map(p => p.x),
      ...(group.censoredPoints || []).map(p => p.x)
    ]),
    10 // 确保最小值
  ) + 5; // 添加边距

  // 创建图表
  chartInstance.value = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: '生存时间 (天)'
          },
          min: 0,
          grid: {
            color: 'color-mix(in srgb, var(--n-text-color) 5%, transparent)'
          },
          ticks: {
            stepSize: Math.ceil(maxTime / 10)
          }
        },
        y: {
          type: 'linear',
          title: {
            display: true,
            text: '生存率'
          },
          min: 0,
          max: 1.1,
          ticks: {
            callback: (value) => (value * 100).toFixed(0) + '%'
          },
          grid: {
            color: 'color-mix(in srgb, var(--n-text-color) 5%, transparent)'
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 12,
            padding: 20,
            font: {
              size: 12
            },
            filter: item => !item.text.includes('事件') // 隐藏事件点的图例
          }
        },
        tooltip: {
          filter: function(tooltipItem) {
            // 只对死亡事件和删失事件显示工具提示
            return tooltipItem.dataset.label.includes('死亡事件') || 
                  tooltipItem.dataset.label.includes('删失事件');
          },
          callbacks: {
            label: (context) => {
              const datasetLabel = context.dataset.label || '';
              const value = context.parsed.y;
              const mouseIds = context.raw.mouseIds || [];
              
              if (datasetLabel.includes('死亡事件')) {
                return `死亡事件: ${(value * 100).toFixed(1)}% (${mouseIds.length}只小鼠死亡)`;
              } else if (datasetLabel.includes('删失事件')) {
                return `删失事件：${mouseIds.length}只小鼠尚存活`;
              }
              return `生存率: ${(value * 100).toFixed(1)}%`;
            },
            title: (tooltipItems) => {
              const item = tooltipItems[0];
              const dataPoint = item.raw;
              
              if (dataPoint.mouseIds && dataPoint.mouseIds.length > 0) {
                return `小鼠编号: ${dataPoint.mouseIds.join(', ')}\n时间: ${item.parsed.x} 天`;
              }
              return `存活时间: ${item.parsed.x} 天`;
            }
          }
        }
      }
    }
  });
};

// 计算属性
const filteredMice = computed(() => {
  return groups.value.flatMap(group => 
    (group.mice || []).map(mouse => ({
      ...mouse,
      groupName: group.name || `分组 ${groups.value.indexOf(group)}`,
      color: group.color
    }))
  );
});
const totalPages = computed(() => Math.ceil(filteredMice.value.length / pageSize));
const displayedMice = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredMice.value.slice(start, start + pageSize);
});
</script>

<style scoped>
/* 使用与bodyweight.vue一致的卡片样式 */
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

.btn-icon {
  margin-right: 5px;
}

.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-control {
  display: block;
  width: 100%;
  padding: 0.5rem;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--n-text-color-2);
  background-color: var(--n-color);
  border: 1px solid var(--n-border-color);
  border-radius: 4px;
  transition: border-color 0.15s;
}

.form-select {
  display: block;
  width: 100%;
  padding: 0.5rem;
  font-size: 1rem;
  background-color: var(--n-color);
  border: 1px solid var(--n-border-color);
  border-radius: 4px;
  height: auto;
}

.mb-4 {
  margin-bottom: 1.5rem;
}

.me-2 {
  margin-right: 0.5rem;
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

.group-card .form-select {
  font-size: 0.8rem;
  height: 80px;
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

/* 图表容器 */
.chart-container {
  position: relative;
  height: 400px;
  width: 100%;
  margin-bottom: 1.5rem;
}

.legend-item {
  display: inline-block;
  margin-right: 20px;
  font-size: 0.9rem;
}

.legend-color {
  display: inline-block;
  width: 15px;
  height: 15px;
  border-radius: 3px;
  margin-right: 5px;
}

.text-muted {
  color: var(--n-text-color-3);
}

.genotype-tree {
  border: 1px solid var(--n-border-color);
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
  background-color: var(--n-color);
}

.locus-item {
  border-bottom: 1px solid var(--n-color-embedded);
}

.locus-item:last-child {
  border-bottom: none;
}

.locus-header {
  padding: 8px 12px;
  background-color: var(--n-color-embedded);
  border-bottom: 1px solid var(--n-color-embedded);
}

.locus-label {
  display: flex;
  align-items: center;
  font-weight: 600;
  margin: 0;
  cursor: pointer;
}

.locus-checkbox {
  margin-right: 8px;
}

.locus-name {
    font-size: 0.8rem;
  color: var(--n-text-color-2);
}

.combinations-list {
  padding-left: 20px;
}

.combination-item {
  padding: 6px 12px;
  border-bottom: 1px solid var(--n-color-embedded);
}

.combination-item:last-child {
  border-bottom: none;
}

.combination-label {
  display: flex;
  align-items: center;
  margin: 0;
  cursor: pointer;
}

.combination-checkbox {
  margin-right: 8px;
}

.combination-name {
  color: var(--n-text-color-3);
  font-size: 0.7em;
}

/* 悬停效果 */
.locus-label:hover,
.combination-label:hover {
  background-color: var(--n-color-embedded);
}

/* 选中状态 */
.locus-checkbox:checked + .locus-name {
  color: var(--n-info-color);
}

.combination-checkbox:checked + .combination-name {
  color: var(--n-success-color);
  font-weight: 500;
}
</style>