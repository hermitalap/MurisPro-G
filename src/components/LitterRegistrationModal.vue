<template>
  <n-modal
    :show="show"
    @update:show="v => $emit('update:show', v)"
    preset="card"
    style="width: 90%; max-width: 780px;"
    title="登记新生仔"
    :mask-closable="false"
    closable
  >
    <template v-if="cage">
      <div class="form-grid">
        <n-form-item label="所在笼位" label-placement="top" :show-feedback="false">
          <n-input :value="`${cage.section}-${cage.cage_id}`" readonly />
        </n-form-item>
        <n-form-item label="品系" label-placement="top" :show-feedback="false">
          <n-input v-model:value="form.strain" placeholder="例如 C57BL/6J" />
        </n-form-item>
        <n-form-item label="出生日期" label-placement="top" :show-feedback="false">
          <n-date-picker
            type="date"
            value-format="yyyy-MM-dd"
            v-model:formatted-value="form.birth_date"
            style="width: 100%;"
          />
        </n-form-item>
        <n-form-item label="标记策略" label-placement="top" :show-feedback="false">
          <n-radio-group v-model:value="form.id_strategy">
            <n-radio-button value="ear_tag">耳标</n-radio-button>
            <n-radio-button value="toe_clip">剪趾</n-radio-button>
          </n-radio-group>
        </n-form-item>

        <n-form-item label="父鼠" label-placement="top" :show-feedback="false">
          <n-select
            v-model:value="form.father_ids"
            :options="fatherOptions"
            multiple
            placeholder="选择父鼠（可多选）"
          />
        </n-form-item>
        <n-form-item label="母鼠" label-placement="top" :show-feedback="false">
          <n-select
            v-model:value="form.mother_ids"
            :options="motherOptions"
            multiple
            placeholder="选择母鼠（可多选）"
          />
        </n-form-item>
      </div>

      <!-- 耳标策略：前缀 + 起始号 -->
      <div class="strategy-config" v-if="form.id_strategy === 'ear_tag'">
        <n-space align="center" :size="12">
          <n-form-item label="前缀字母" label-placement="left" :show-feedback="false">
            <n-input
              v-model:value="form.ear_prefix"
              maxlength="1"
              style="width: 80px;"
              placeholder="A"
              @update:value="onPrefixChange"
            />
          </n-form-item>
          <n-form-item label="起始号" label-placement="left" :show-feedback="false">
            <n-input-number
              v-model:value="form.ear_start"
              :min="1"
              style="width: 120px;"
            />
          </n-form-item>
          <n-form-item label="数量" label-placement="left" :show-feedback="false">
            <n-input-number
              v-model:value="form.count"
              :min="1"
              :max="30"
              style="width: 100px;"
            />
          </n-form-item>
        </n-space>
      </div>

      <div class="strategy-config" v-else>
        <n-space align="center" :size="12">
          <n-form-item label="ID 前缀（只读）" label-placement="left" :show-feedback="false">
            <n-input :value="toeClipPrefix(cage.cage_id, form.birth_date)" readonly style="width: 240px;" />
          </n-form-item>
          <n-form-item label="数量" label-placement="left" :show-feedback="false">
            <n-input-number
              v-model:value="form.count"
              :min="1"
              :max="30"
              style="width: 100px;"
            />
          </n-form-item>
        </n-space>
        <div class="tip">
          脚趾号规则：面朝自己时，后肢左→右 1–10，前肢左→右 20–90。
        </div>
      </div>

      <!-- ID 预览/编辑表 -->
      <n-data-table
        :columns="columns"
        :data="rows"
        size="small"
        :bordered="true"
        :max-height="280"
        style="margin-top: 12px;"
      />
    </template>

    <template #footer>
      <n-space justify="end">
        <n-button @click="$emit('update:show', false)">取消</n-button>
        <n-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="onSubmit">
          提交登记
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup>
import { computed, h, reactive, ref, watch } from 'vue'
import {
  NModal, NInput, NInputNumber, NSelect, NDatePicker, NRadioGroup, NRadioButton,
  NFormItem, NSpace, NButton, NDataTable, useMessage
} from 'naive-ui'
import { useBreedingStore, useGeneStore } from '@/stores'
import { buildEarTagIds, nextEarTagNumber, buildToeClipId, toeClipPrefix } from '@/utils/idGenerator'

const props = defineProps({
  show: { type: Boolean, default: false },
  cage: { type: Object, default: null }
})
const emit = defineEmits(['update:show', 'submitted'])

const breedingStore = useBreedingStore()
const geneStore = useGeneStore()
const message = useMessage()
const submitting = ref(false)

const form = reactive({
  strain: '',
  birth_date: '',
  id_strategy: 'ear_tag',
  father_ids: [],
  mother_ids: [],
  ear_prefix: 'A',
  ear_start: 1,
  count: 4,
  // 每行一条，用户可编辑 sex / toe_mark / id（耳标可由生成覆盖）
  pups: []
})

const fatherOptions = computed(() => {
  if (!props.cage) return []
  const { fathers } = breedingStore.parentCandidates(props.cage.id)
  return fathers.map(m => ({
    label: `${m.id}  ${stripTags(m.genotype?.symbol || '')}`,
    value: m.tid
  }))
})
const motherOptions = computed(() => {
  if (!props.cage) return []
  const { mothers } = breedingStore.parentCandidates(props.cage.id)
  return mothers.map(m => ({
    label: `${m.id}  ${stripTags(m.genotype?.symbol || '')}`,
    value: m.tid
  }))
})

function stripTags(html) {
  return (html || '').replace(/<[^>]+>/g, '')
}

// 打开弹窗时重置表单
watch(() => props.show, (v) => {
  if (!v || !props.cage) return
  const today = new Date().toISOString().slice(0, 10)
  const { fathers, mothers } = breedingStore.parentCandidates(props.cage.id)
  form.strain = props.cage.mice?.[0]?.strain || fathers[0]?.strain || mothers[0]?.strain || ''
  form.birth_date = props.cage.mice_birth_date || today
  form.id_strategy = 'ear_tag'
  form.father_ids = fathers.length === 1 ? [fathers[0].tid] : fathers.slice(0, 1).map(m => m.tid)
  form.mother_ids = mothers.length === 1 ? [mothers[0].tid] : mothers.slice(0, 1).map(m => m.tid)
  form.ear_prefix = 'A'
  form.ear_start = nextEarTagNumber('A', geneStore.mice.map(m => m.id))
  form.count = 4
  rebuildRows()
})

function onPrefixChange(prefix) {
  form.ear_prefix = (prefix || '').toUpperCase().slice(0, 1)
  form.ear_start = nextEarTagNumber(form.ear_prefix, geneStore.mice.map(m => m.id))
  rebuildRows()
}

// 重新构建 pups 行（ID 根据策略计算）
function rebuildRows() {
  const existingRows = [...form.pups]
  const newRows = []
  for (let i = 0; i < form.count; i++) {
    const prev = existingRows[i] || {}
    newRows.push({
      key: i,
      id: prev.id_custom ? prev.id : autoIdFor(i),
      id_custom: !!prev.id_custom,
      sex: prev.sex || null,
      toe_mark: prev.toe_mark || ''
    })
  }
  form.pups = newRows
}

function autoIdFor(i) {
  if (form.id_strategy === 'ear_tag') {
    return buildEarTagIds(form.ear_prefix, form.ear_start || 1, form.count)[i]
  }
  // toe_clip — 无法在用户输入 toe_mark 前生成完整 ID，先给前缀
  const row = form.pups[i]
  return buildToeClipId(props.cage?.cage_id, form.birth_date, row?.toe_mark || '')
}

watch(
  () => [form.count, form.id_strategy, form.ear_prefix, form.ear_start, form.birth_date],
  rebuildRows
)

// 剪趾策略下 toe_mark 变更会改 id
function onToeMarkChange(row) {
  row.id = buildToeClipId(props.cage?.cage_id, form.birth_date, row.toe_mark)
}

const columns = computed(() => [
  {
    title: '#',
    key: 'idx',
    width: 40,
    render: (_row, index) => index + 1
  },
  {
    title: 'ID',
    key: 'id',
    render: (row, index) => {
      if (form.id_strategy === 'toe_clip') {
        return row.id || toeClipPrefix(props.cage?.cage_id, form.birth_date)
      }
      return h(NInput, {
        value: row.id,
        size: 'small',
        'onUpdate:value': v => { row.id = v; row.id_custom = true }
      })
    }
  },
  {
    title: '性别',
    key: 'sex',
    width: 110,
    render: (row) =>
      h(NSelect, {
        value: row.sex,
        size: 'small',
        options: [
          { label: '♂ 雄', value: 'M' },
          { label: '♀ 雌', value: 'F' },
          { label: '未知', value: null }
        ],
        'onUpdate:value': v => (row.sex = v)
      })
  },
  ...(form.id_strategy === 'toe_clip'
    ? [
        {
          title: '脚趾号',
          key: 'toe_mark',
          width: 120,
          render: (row) =>
            h(NInput, {
              value: row.toe_mark,
              size: 'small',
              placeholder: '如 25',
              'onUpdate:value': v => {
                row.toe_mark = v
                onToeMarkChange(row)
              }
            })
        }
      ]
    : [])
])

const rows = computed(() => form.pups)

const canSubmit = computed(() => {
  if (!props.cage) return false
  if (!form.birth_date) return false
  if (!form.count || form.count < 1) return false
  if (form.id_strategy === 'toe_clip') {
    if (form.pups.some(p => !p.toe_mark)) return false
  }
  if (form.pups.some(p => !p.id)) return false
  return true
})

async function onSubmit() {
  submitting.value = true
  try {
    await breedingStore.registerLitter({
      cage_id: props.cage.id,
      father_ids: form.father_ids,
      mother_ids: form.mother_ids,
      birth_date: form.birth_date,
      strain: form.strain || null,
      id_strategy: form.id_strategy,
      pups: form.pups.map(p => ({
        id: p.id,
        sex: p.sex,
        toe_mark: form.id_strategy === 'toe_clip' ? p.toe_mark : null
      }))
    })
    emit('submitted')
  } catch (e) {
    message.error('登记失败: ' + (e.response?.data?.error || e.message))
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
  margin-bottom: 16px;
}
.strategy-config {
  padding: 10px 12px;
  background: var(--n-color-embedded, rgba(0, 0, 0, 0.03));
  border-radius: 6px;
  margin-bottom: 8px;
}
.tip {
  margin-top: 6px;
  font-size: 12px;
  color: var(--n-text-color-3);
}
</style>
