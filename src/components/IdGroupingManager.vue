<template>
  <div class="mouse-group-manager">
    <h2 class="section-title">ID分组管理</h2>
    
    <div class="id-grouping-container">
      <!-- 候选小鼠列表 -->
      <div class="candidate-mice">
        <h3>候选小鼠</h3>
        <div class="selection-controls">
          <div class="selection-info">
            已选择 {{ selectedMiceCount }} 只小鼠
          </div>
          <div class="selection-buttons">
            <n-button quaternary @click="selectAllMice">
              全选
            </n-button>
            <n-button quaternary @click="deselectAllMice">
              全不选
            </n-button>
          </div>
        </div>
        <div class="detail-item">
          <div class="checkbox-group">
            <n-checkbox v-model:checked="isRepeated" :disabled="isRepeatedAble">
              是否可重复选择小鼠
            </n-checkbox>
          </div>
        </div>
        <div class="search-container">
          <n-input
            class="search-input"
            placeholder="搜索小鼠ID或基因型..."
            v-model:value="searchTerm"
          />
        </div>
        <div class="mice-list">
          <div 
            v-for="mouse in filteredMice" 
            :key="mouse.tid"
            class="mouse-item"
            :class="{ selected: isMouseSelected(mouse.tid) }"
            @click="toggleMouseSelection(mouse.tid)"
            draggable="true"
            @dragstart="onDragStart($event, mouse.tid)"
          >
            <n-checkbox
              class="mouse-checkbox"
              :checked="isMouseSelected(mouse.tid)"
              @click.stop
              @update:checked="() => toggleMouseSelection(mouse.tid)"
            />
            <div class="mouse-info">
              <div class="mouse-id">{{ mouse.id }}</div>
              <GenotypeLabel class="mouse-details" :symbol="mouse.genotype.symbol || mouse.genotype" />
              <div class="mouse-details">{{ mouse.sex }} · {{ mouse.strain }} · {{ mouse.birth_date }}</div>
            </div>
          </div>
          <n-empty v-if="filteredMice.length === 0" description='暂无可选小鼠，请在小鼠页面为小鼠添加"完成实验"' size="small" />
        </div>
      </div>
      
      <!-- 分组管理 -->
      <div class="grouping-section">
        <h3>分组管理</h3>
        <div class="groups-container">
          <div 
            v-for="(group, groupIndex) in editingRules"
            :key="group.id || group.name || groupIndex"
            class="group-item"
            @dragover="onDragOver"
            @dragleave.prevent="onDragLeave"
            @drop="onDrop($event, groupIndex)"
          >
            <div class="group-header">
              <div class="group-name">
                <n-input
                  class="group-name-input"
                  :value="group.name"
                  placeholder="分组名称"
                  @update:value="updateGroupName(groupIndex, $event)"
                />
                <div class="color-picker">
                  <div 
                    v-for="color in colors" 
                    :key="color"
                    class="color-option"
                    :class="{ selected: group.color === color }"
                    :style="{ backgroundColor: color }"
                    @click="updateGroupColor(groupIndex, color)"
                  >
                    <n-icon v-if="group.color === color"><CheckmarkOutline /></n-icon>
                  </div>
                </div>
              </div>
              <div class="group-actions">
                <n-button
                  @click="removeGroup(groupIndex)"
                  :disabled="editingRules.length <= 1"
                  type="error"
                  quaternary
                  :render-icon="renderIcon(Trash)"
                />
              </div>
            </div>
            <div class="group-mice">
              <div 
                v-for="mouse in groupedMice[groupIndex]" 
                :key="mouse.tid"
                class="assigned-mouse"
              >
                <div class="mouse-id">{{ mouse.id }}</div>
                <GenotypeLabel class="mouse-details" :symbol="mouse.genotype.symbol || mouse.genotype" />
                <div class="mouse-details">{{ mouse.sex }} · {{ mouse.strain }} · {{ mouse.birth_date }}</div>
                <div class="mouse-actions">
                  <n-button
                    @click="removeMouseFromGroup(mouse.tid, groupIndex)"
                    quaternary
                    :render-icon="renderIcon(RemoveCircle)"
                  />
                </div>
              </div>
              <div v-if="!group.mouseId?.length" class="empty-group">
                暂无小鼠，请从左侧拖拽或选择添加
              </div>
            </div>
          </div>
        </div>
        
        <div class="grouping-actions">
          <n-button quaternary @click="addGroup" :render-icon="renderIcon(Add)">添加新分组</n-button>
          <n-button v-if="editingRules.length > 0" quaternary @click="resetGroup" :render-icon="renderIcon(Refresh)">重置分组</n-button>
          <n-button type="success" @click="saving" :disabled="isSaving" :render-icon="renderIcon(Save)">{{ isSaving? "保存中...": "保存ID分组" }}</n-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { h, ref, computed } from 'vue'
import GenotypeLabel from '@/components/GenotypeLabel.vue'
import { useMessage } from 'naive-ui'
import { renderIcon } from '@/utils/icon'
import { Trash, RemoveCircle, Add, Refresh, Save, CheckmarkOutline } from '@vicons/ionicons5'

const message = useMessage()

// 定义props
const props = defineProps({
  candidateMice: {
    type: Array,
    default: () => []
  },
  editingGroup: {
    type: Object,
    default: () => ({ rules: [] })
  },
  colors: {
    type: Array,
    default: () => []
  },
  isSaving: {
    type: Boolean,
    default: false
  }
})

// 定义emits
const emit = defineEmits(['update:editingGroup', 'update:isSaving', 'save-group'])

// 使用ref创建本地数据
const searchTerm = ref('')
const selectedMouseIds = ref(new Set())
const isRepeated = ref(false)

const editingRules = computed(() => Array.isArray(props.editingGroup?.rules) ? props.editingGroup.rules : [])

const cloneRules = () => editingRules.value.map(group => ({
  ...group,
  mouseId: Array.isArray(group.mouseId) ? [...group.mouseId] : []
}))

const emitRules = (rules) => {
  emit('update:editingGroup', { ...props.editingGroup, rules })
}

// 计算属性
const filteredMice = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  if (!term) {
    return props.candidateMice.filter(mouse => 
      !isMouseInAnyGroup(mouse.tid)
    )
  }
  return props.candidateMice.filter(mouse => {
    if (isMouseInAnyGroup(mouse.tid)) {
      return false
    }
    const searchableFields = [
      mouse.id || '',
      mouse.strain || '',
      mouse.sex || '',
      mouse.genotype?.symbol || mouse.genotype || ''
    ]
    return searchableFields.some(field => 
      field.toLowerCase().includes(term)
    )
  })
})

const selectedMiceCount = computed(() => selectedMouseIds.value.size)

const isRepeatedAble = computed(() => {
  return editingRules.value.some(group => group.mouseId?.length > 0)
})

const groupedMice = computed(() => {
  return editingRules.value.map(group => {
    return (group.mouseId || [])
      .map(mId => props.candidateMice.find(m => m.tid === mId))
      .filter(Boolean)
  })
})

// 方法
const isMouseInAnyGroup = (mouseId) => {
  if (isRepeated.value) {
    return false
  } else {
    return editingRules.value.some(group => (group.mouseId || []).includes(mouseId))
  }
}

const isMouseSelected = (mouseId) => {
  return selectedMouseIds.value.has(mouseId)
}

const toggleMouseSelection = (mouseId) => {
  const next = new Set(selectedMouseIds.value)
  if (next.has(mouseId)) {
    next.delete(mouseId)
  } else {
    next.add(mouseId)
  }
  selectedMouseIds.value = next
}

const selectAllMice = () => {
  const next = new Set(selectedMouseIds.value)
  filteredMice.value.forEach(mouse => {
    next.add(mouse.tid)
  })
  selectedMouseIds.value = next
}

const deselectAllMice = () => {
  selectedMouseIds.value = new Set()
}

const removeMouseFromGroup = (mouseId, groupIndex) => {
  const rules = cloneRules()
  const mouseIndex = rules[groupIndex].mouseId.indexOf(mouseId)
  if (mouseIndex > -1) {
    rules[groupIndex].mouseId.splice(mouseIndex, 1)
    emitRules(rules)
  }
}

const updateGroupName = (groupIndex, name) => {
  const rules = cloneRules()
  rules[groupIndex].name = name
  emitRules(rules)
}

const updateGroupColor = (groupIndex, color) => {
  const rules = cloneRules()
  rules[groupIndex].color = color
  emitRules(rules)
}

const onDragStart = (event, mId) => {
  if (!selectedMouseIds.value.has(mId)) {
    selectedMouseIds.value = new Set([...selectedMouseIds.value, mId]);
  }
  const selectedMIs = Array.from(selectedMouseIds.value);
  event.dataTransfer.setData('application/json', JSON.stringify(selectedMIs));
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', `移动 ${selectedMIs.length} 只小鼠`);
}

const onDragOver = (event) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move';
  event.currentTarget.classList.add('drag-over');
}

const onDragLeave = (event) => {
  event.currentTarget.classList.remove('drag-over')
}

const onDrop = (event, groupIndex) => {
  event.preventDefault()
  event.currentTarget.classList.remove('drag-over');
  try {
    const mouseIdsData = event.dataTransfer.getData('application/json');
    const mouseIds = JSON.parse(mouseIdsData);
    if (!Array.isArray(mouseIds) || mouseIds.length === 0) {
      console.error('无效的拖拽数据');
      return;
    }
    const rules = cloneRules()
    mouseIds.forEach(mouseId => {
      if (!isMouseInAnyGroup(mouseId)) {
        if (!rules[groupIndex].mouseId.includes(mouseId)) {
          rules[groupIndex].mouseId.push(mouseId);
        }
      }
    });
    emitRules(rules)
    selectedMouseIds.value = new Set();
  } catch (error) {
    console.error('拖拽放置失败:', error);
  }
}

const addGroup = () => {
  const rules = cloneRules()
  const usedColors = new Set(rules.map(g => g.color))
  const availableColor = props.colors.find(color => !usedColors.has(color)) || props.colors[0]
  rules.push({name: `新分组${rules.length + 1}`, color: availableColor, mouseId: []})
  emitRules(rules)
}

const removeGroup = (index) => {
  const rules = cloneRules()
  rules.splice(index, 1)
  emitRules(rules)
}

const saving = () => {
  if (editingRules.value.some(group => !group.name)) {
    message.warning('请填写分组名称')
    return
  }
  emit('save-group')
}

const resetGroup = () => {
  emit('update:isSaving', false)
  const rules = cloneRules().map(group => ({ ...group, mouseId: [] }))
  emitRules(rules)
}
</script>

<style scoped>
.mouse-group-manager {
  width: 90%;
	max-width: 1200px;
  margin: 0 auto;
  background: var(--n-color);
  border-radius: 8px;
  box-shadow: 0 2px 10px color-mix(in srgb, var(--n-text-color) 10%, transparent);
  padding: 20px;
}

.section-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--n-border-color);
  color: var(--n-text-color-1);
}

.id-grouping-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 20px;
}

.candidate-mice, .grouping-section {
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  padding: 15px;
  background: var(--n-color-embedded);
  height: 600px;
  display: flex;
  flex-direction: column;
}

.candidate-mice h3, .grouping-section h3 {
  margin: 0 0 15px 0;
  color: var(--n-text-color-1);
  font-size: 1.1rem;
}

.selection-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px;
  background: var(--n-color);
  border-radius: 4px;
  border: 1px solid var(--n-border-color);
}

.selection-info {
  font-size: 14px;
  color: var(--n-text-color-1);
  font-weight: 500;
}

.selection-buttons {
  display: flex;
  gap: 10px;
}

.search-input {
  width: 100%;
}

.search-container {
  margin-bottom: 15px;
}

.mice-list {
	max-height: 300px;
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--n-border-color);
  border-radius: 4px;
  background: var(--n-color);
}

.mouse-item {
  display: flex;
  align-items: center;
  padding: 10px;
	gap: 10px;
  border-bottom: 1px solid var(--n-border-color);
  cursor: pointer;
  transition: background-color 0.2s;
}

.mouse-item:hover {
  background-color: var(--n-info-color-suppl);
}

.mouse-item.selected {
  background-color: color-mix(in srgb, var(--n-info-color) 22%, var(--n-color));
}

.mouse-info {
	font-size: 12px;
  color: var(--n-text-color-3);
	flex: 1;
	display: flex;
	gap: 10px;
	align-items: center;
}

.mouse-id {
  font-weight: 600;
  color: var(--n-text-color-1);
}

.mouse-details {
  font-size: 12px;
  color: var(--n-text-color-3);
  margin-top: 3px;
}

.groups-container {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--n-border-color);
  border-radius: 4px;
  background: var(--n-color);
  padding: 10px;
}

.group-item {
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
  margin-bottom: 15px;
  background: var(--n-color);
  box-shadow: 0 1px 3px color-mix(in srgb, var(--n-text-color) 10%, transparent);
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: var(--n-info-color-suppl);
  border-bottom: 1px solid var(--n-border-color);
  border-radius: 6px 6px 0 0;
}

.group-name {
  display: flex;
  align-items: center;
  gap: 10px;
}

.group-name-input {
  min-width: 180px;
}

.group-actions {
  display: flex;
  gap: 8px;
}

.group-mice {
  padding: 10px;
  min-height: 100px;
  max-height: 200px;
  overflow-y: auto;
}

.assigned-mouse {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  margin-bottom: 5px;
  background: var(--n-color-embedded);
  border-radius: 4px;
  border-left: 3px solid var(--n-primary-color);
}

.mouse-actions {
  display: flex;
  gap: 5px;
}

.empty-group {
  text-align: center;
  padding: 20px;
  color: var(--n-text-color-disabled);
  font-style: italic;
}

.grouping-actions {
  display: flex;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid var(--n-border-color);
}

.drag-over {
  background-color: var(--n-info-color-suppl);
  border: 2px dashed var(--n-primary-color);
}
</style>
