<template>
  <div class="main-content">
    <n-flex justify="space-between" align="center" class="content-header">
      <h1 class="page-title">小鼠生存分析</h1>
    </n-flex>

    <n-card title="生存曲线分析">
      <!-- 图表类型选择 -->
      <n-flex align="center" :size="[8, 8]" style="margin-bottom: 16px;">
        <n-select
          v-model:value="showChartType"
          :options="chartTypeOptions"
          style="width: 200px;"
        />
      </n-flex>

      <!-- 预设分组操作行 -->
      <n-flex v-if="showChartType === 'pred'" wrap align="center" :size="[12, 8]" style="margin-bottom: 16px;">
        <n-select
          v-model:value="selectedPredefinedGroupId"
          :options="predefinedGroupOptions"
          placeholder="请在设置中确定预设分组"
          :disabled="predefinedGroups.length === 0"
          style="flex: 1; min-width: 180px;"
        />
        <n-button type="primary" @click="fetchData('pred')" :render-icon="renderIcon(TrendingUp)">以预设分组生成生存曲线</n-button>
      </n-flex>

      <!-- 临时分组操作行 -->
      <n-flex v-if="showChartType === 'temp'" wrap align="center" :size="[8, 8]" style="margin-bottom: 16px;">
        <n-button type="primary" @click="fetchData('temp')" :render-icon="renderIcon(TrendingUp)">以临时分组生成生存曲线</n-button>
        <n-button secondary @click="addGroup" :render-icon="renderIcon(Add)">添加分组</n-button>
        <n-button type="error" @click="clearGroups" :render-icon="renderIcon(Close)">清空分组</n-button>
      </n-flex>

      <!-- 分组设置 -->
      <div v-if="showChartType === 'temp'" style="margin-bottom: 16px;">
        <h5 style="margin: 0 0 12px;">分组设置</h5>
        <div class="groups-container">
          <div
            v-for="(group, index) in tempGroups"
            :key="index"
            class="group-card"
          >
            <n-card size="small" class="group-inner-card">
              <template #header>
                <n-flex justify="space-between" align="center">
                  <span>分组 {{ index }}</span>
                  <n-button v-if="tempGroups.length > 1" quaternary circle size="tiny" @click="removeGroup(index)" :render-icon="renderIcon(Close)" />
                </n-flex>
              </template>
              <n-flex vertical size="small">
                <div>
                  <div class="group-label">性别</div>
                  <n-flex wrap :size="[12, 4]">
                    <n-checkbox v-model:checked="group.sex.M">雄性</n-checkbox>
                    <n-checkbox v-model:checked="group.sex.F">雌性</n-checkbox>
                  </n-flex>
                </div>
                <div>
                  <div class="group-label">基因型包含：</div>
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
              </n-flex>
            </n-card>
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

      <template v-if="hasData">
        <!-- 统计摘要 -->
        <n-card
          v-for="(group, index) in groups"
          :key="index"
          size="small"
          style="margin-bottom: 12px;"
        >
          <n-flex wrap align="center" justify="space-around" :size="[24, 12]">
            <n-flex align="center" :size="8">
              <span class="legend-color" :style="{ backgroundColor: group.color }"></span>
              <span style="font-weight: 600;">{{ group.name || `分组 ${index}` }}</span>
            </n-flex>
            <n-statistic label="总小鼠数" :value="group.allMice" tabular-nums />
            <n-statistic label="死亡小鼠数" :value="group.deadMice" tabular-nums />
            <n-statistic label="存活小鼠数" :value="group.censoredMice" tabular-nums />
            <n-statistic label="最长生存时间" :value="group.maxDays" tabular-nums>
              <template #suffix>天</template>
            </n-statistic>
            <n-statistic label="中位生存时间" :value="group.ls50" tabular-nums>
              <template #suffix>天</template>
            </n-statistic>
          </n-flex>
        </n-card>

        <!-- 图表容器 -->
        <div class="chart-container">
          <canvas ref="survivalChartEl" height="400"></canvas>
        </div>

        <!-- 数据表格 -->
        <n-card size="small" title="生存数据详情" style="margin-top: 16px;">
          <n-data-table
            :columns="survivalColumns"
            :data="displayedMice"
            :single-line="false"
            :bordered="false"
            :row-key="(row) => `${row.groupName}-${row.mouse_id}`"
          />
          <n-flex v-if="filteredMice.length > pageSize" justify="center" style="margin-top: 12px;">
            <n-pagination
              v-model:page="currentPage"
              :page-count="totalPages"
              :page-size="pageSize"
            />
          </n-flex>
        </n-card>
      </template>

      <!-- 无数据提示 -->
      <n-empty v-else description="请设置分组条件并点击「生成生存曲线」按钮" style="padding: 40px 0;" />
    </n-card>
  </div>
</template>

<script setup>
import { h, ref, computed, nextTick, useTemplateRef } from 'vue';
import {
  NTag, NIcon, NCard, NFlex, NSelect, NButton, NCheckbox,
  NStatistic, NDataTable, NPagination, NEmpty,
  useMessage
} from 'naive-ui'
import { TrendingUp, Add, Close, AddOutline } from '@vicons/ionicons5'

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
.content-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

/* 分组容器 */
.groups-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.group-card {
  width: 100%;
  min-height: 210px;
  height: auto;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.group-card:hover {
  transform: translateY(-3px);
}

.group-inner-card {
  height: 100%;
}

.group-inner-card :deep(.n-card__content) {
  overflow-y: auto;
  padding: 8px;
}

.group-inner-card :deep(.n-card-header) {
  padding: 6px 8px;
  font-size: 0.85rem;
}

.group-label {
  font-size: 0.8rem;
  font-weight: 500;
  margin-bottom: 4px;
}

.add-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 210px;
  background-color: var(--n-color-embedded);
  border: 1px dashed var(--n-border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.add-card:hover {
  border-color: var(--n-text-color-3);
}

.add-card span {
  font-weight: 500;
  color: var(--n-text-color-2);
  margin-top: 6px;
}

/* 图表容器 */
.chart-container {
  position: relative;
  height: 400px;
  width: 100%;
  margin-bottom: 16px;
}

.legend-color {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  flex-shrink: 0;
}

/* 基因型树 */
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
  padding: 6px 10px;
  background-color: var(--n-color-embedded);
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
  padding: 4px 10px;
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
  font-size: 0.75em;
}

@media (max-width: 768px) {
  .groups-container {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
  .chart-container { height: 300px; }
}

@media (max-width: 480px) {
  .groups-container { grid-template-columns: repeat(2, 1fr); }
}
</style>