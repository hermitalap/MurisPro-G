<template>
  <n-modal
    :show="show"
    @update:show="v => $emit('update:show', v)"
    preset="card"
    style="width: 94%; max-width: 920px;"
    :title="isEdit ? '编辑繁配计划' : '新建繁配计划'"
    :mask-closable="false"
    closable
  >
    <n-form :model="form" label-placement="top" size="medium" class="plan-form">
      <!-- 策略选择 -->
      <div class="strategy-bar">
        <div class="section-heading strategy-heading">
          <div>
            <div class="section-title">繁配策略</div>
            <div class="section-caption">选择目标基因型的生成方式</div>
          </div>
          <n-radio-group v-model:value="form.strategy" size="small" @update:value="onStrategyChange">
            <n-radio-button value="global_ko">
              <n-icon :size="14"><SkullOutline /></n-icon>
              全身敲除 Global KO
            </n-radio-button>
            <n-radio-button value="cko">
              <n-icon :size="14"><LayersOutline /></n-icon>
              条件性敲除 cKO
            </n-radio-button>
            <n-radio-button value="custom">
              <n-icon :size="14"><BuildOutline /></n-icon>
              自定义
            </n-radio-button>
          </n-radio-group>
        </div>

        <div class="strategy-hint">
          <n-icon :size="15"><BulbOutline /></n-icon>
          <span v-if="form.strategy === 'global_ko'">
            全敲除 = 目标基因两拷贝都被破坏（-/-）。基因可能致死；常用策略 Het × Het → 25% 纯合。
          </span>
          <span v-else-if="form.strategy === 'cko'">
            条件性敲除 = flox 位点 + 组织特异性 Cre driver。目标：f/f (或 f/-) ; Cre/+ 。注意 Cre driver 的生殖系活性。
          </span>
          <span v-else>
            自定义任意目标基因型组合，适合多位点复杂策略。
          </span>
        </div>
      </div>

      <!-- 基本信息 -->
      <div class="form-section plan-info-section">
        <div class="section-heading">
          <div>
            <div class="section-title">计划信息</div>
            <div class="section-caption">命名、数量和筛选条件</div>
          </div>
        </div>
        <div class="form-grid">
          <n-form-item label="计划名称" :show-feedback="false" required class="name-field">
            <n-input v-model:value="form.name" placeholder="例如 Nlrp3 KO 纯合 F2 种子鼠" maxlength="60" show-count />
          </n-form-item>
          <n-form-item label="目标数量" :show-feedback="false" required class="count-field">
            <n-input-number
              v-model:value="form.targetCount"
              :min="1"
              :max="500"
              style="width: 100%;"
            />
          </n-form-item>
          <n-form-item label="目标性别" :show-feedback="false" class="sex-field">
            <n-radio-group v-model:value="form.sex">
              <n-radio-button value="any">不限</n-radio-button>
              <n-radio-button value="M">♂ 雄</n-radio-button>
              <n-radio-button value="F">♀ 雌</n-radio-button>
            </n-radio-group>
          </n-form-item>
          <n-form-item label="品系（可选）" :show-feedback="false" class="strain-field">
            <n-input v-model:value="form.strain" placeholder="如 C57BL/6J（留空不限）" />
          </n-form-item>
          <n-form-item label="截止日期（可选）" :show-feedback="false" class="deadline-field">
            <n-date-picker
              type="date"
              value-format="yyyy-MM-dd"
              v-model:formatted-value="form.deadline"
              clearable
              style="width: 100%;"
            />
          </n-form-item>
        </div>
      </div>

      <div class="form-section">
        <div class="section-heading target-heading">
          <div>
            <div class="section-title">目标基因型</div>
            <div class="section-caption">指定符合计划要求的位点组合</div>
          </div>
          <n-button size="small" dashed @click="addTarget" :disabled="!canAddTarget">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            添加目标位点
          </n-button>
        </div>

        <!-- 快速模板（cKO） -->
        <div class="quick-template" v-if="form.strategy === 'cko' && cKOTemplates.length">
          <span class="qt-label">快速模板</span>
          <div class="qt-chip-list">
            <n-tag
              v-for="t in cKOTemplates"
              :key="t.key"
              size="small"
              type="info"
              :bordered="false"
              class="qt-chip"
              @click="applyCkoTemplate(t)"
            >
              <template #icon><n-icon><FlashOutline /></n-icon></template>
              {{ t.label }}
            </n-tag>
          </div>
        </div>

        <!-- 目标位点列表 -->
        <div class="targets-block">
          <div v-if="!form.targets.length" class="target-empty">
            <n-icon :size="20"><AddOutline /></n-icon>
            <span>点击右上角添加目标位点</span>
          </div>
          <div v-for="(t, i) in form.targets" :key="i" class="target-row">
            <div class="target-idx">{{ i + 1 }}</div>
            <GenotypePicker
              :model-value="t"
              :genotypes="geneStore.genotypes"
              :exclude-loci="otherLoci(i)"
              @update:model-value="v => setTarget(i, v)"
            />
            <n-button quaternary circle size="small" @click="removeTarget(i)" class="target-del">
              <template #icon><n-icon><CloseOutline /></n-icon></template>
            </n-button>
          </div>
        </div>

        <!-- 综合预览 -->
        <div class="full-preview" v-if="fullPreview">
          <n-icon><EyeOutline /></n-icon>
          <span class="fp-label">综合基因型</span>
          <GenotypeLabel :symbol="fullPreview" />
        </div>
      </div>

      <!-- 校验提示 -->
      <div v-if="issues.length" class="issues">
        <n-alert :type="hasError ? 'error' : 'warning'" size="small" :show-icon="true" class="issue-row">
          <template #icon>
            <n-icon><AlertCircleOutline v-if="hasError" /><WarningOutline v-else /></n-icon>
          </template>
          <div class="issue-list">
            <span v-for="(ix, idx) in issues" :key="idx">{{ ix.message }}</span>
          </div>
        </n-alert>
      </div>

      <!-- 繁配建议 -->
      <n-collapse v-if="recommendations.length" class="recommendation-collapse">
        <n-collapse-item title="繁配方案建议" name="rec">
          <template #header-extra>
            <n-tag size="tiny" type="success" :bordered="false">{{ recommendations.length }} 条</n-tag>
          </template>
          <div
            v-for="(r, i) in recommendations"
            :key="i"
            class="rec-card"
          >
            <div class="rec-title">
              <n-icon><BulbOutline /></n-icon>
              {{ r.title }}
            </div>
            <div class="rec-scheme">{{ r.scheme }}</div>
            <div class="rec-expected">预期：{{ r.expected }}</div>
            <div v-if="r.caveat" class="rec-caveat">
              <n-icon :size="13"><WarningOutline /></n-icon>
              {{ r.caveat }}
            </div>
          </div>
        </n-collapse-item>
      </n-collapse>

      <!-- 备注 -->
      <div class="form-section note-section">
        <n-form-item label="备注" :show-feedback="false">
          <n-input
            v-model:value="form.note"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="例如：F1 自交，后代同笼饲养至 6 周..."
            maxlength="500"
            show-count
          />
        </n-form-item>
      </div>
    </n-form>

    <template #footer>
      <div class="footer-bar">
        <div class="footer-status">
          <span v-if="hasError" class="status-error">
            <n-icon><CloseCircleOutline /></n-icon>
            请先修正标红项
          </span>
          <span v-else-if="hasWarn" class="status-warn">
            <n-icon><WarningOutline /></n-icon>
            存在提醒，但可保存
          </span>
          <span v-else-if="canSubmit" class="status-ok">
            <n-icon><CheckmarkCircleOutline /></n-icon>
            检查通过
          </span>
        </div>
        <n-space>
          <n-button @click="$emit('update:show', false)">取消</n-button>
          <n-button type="primary" :disabled="!canSubmit" @click="onSubmit">
            {{ isEdit ? '保存修改' : '创建计划' }}
          </n-button>
        </n-space>
      </div>
    </template>
  </n-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import {
  NModal, NForm, NFormItem, NInput, NInputNumber, NDatePicker,
  NRadioGroup, NRadioButton, NButton, NSpace,
  NIcon, NTag, NAlert, NCollapse, NCollapseItem
} from 'naive-ui'
import {
  AddOutline, CloseOutline, EyeOutline, BulbOutline, FlashOutline,
  SkullOutline, LayersOutline, BuildOutline,
  AlertCircleOutline, WarningOutline, CloseCircleOutline, CheckmarkCircleOutline
} from '@vicons/ionicons5'
import GenotypeLabel from '@/components/GenotypeLabel.vue'
import GenotypePicker from '@/components/GenotypePicker.vue'
import { useGeneStore, useBreedingPlanStore } from '@/stores'
import {
  detectLocusKind,
  findAlleleOfKind,
  ALLELE_KIND,
  validatePlan,
  buildBreedingRecommendation,
  generatePresets
} from '@/utils/genotypePresets'

const props = defineProps({
  show: { type: Boolean, default: false },
  plan: { type: Object, default: null }
})
const emit = defineEmits(['update:show', 'saved'])

const geneStore = useGeneStore()
const planStore = useBreedingPlanStore()

const isEdit = computed(() => !!props.plan?.id)

const form = reactive({
  name: '',
  strategy: 'global_ko',
  targetCount: 10,
  sex: 'any',
  strain: '',
  deadline: null,
  note: '',
  targets: []
})

watch(() => props.show, (v) => {
  if (!v) return
  if (props.plan) {
    Object.assign(form, {
      name: props.plan.name,
      strategy: props.plan.strategy || 'custom',
      targetCount: props.plan.targetCount,
      sex: props.plan.sex || 'any',
      strain: props.plan.strain || '',
      deadline: props.plan.deadline || null,
      note: props.plan.note || '',
      targets: (props.plan.targets || []).map(t => ({ ...t }))
    })
  } else {
    Object.assign(form, {
      name: '',
      strategy: 'global_ko',
      targetCount: 10,
      sex: 'any',
      strain: '',
      deadline: null,
      note: '',
      targets: []
    })
    // 新建时：若只有一个 KO 位点，自动预填以减少点击
    autofillDefault()
  }
})

// ===== 目标位点 CRUD =====

function otherLoci(idx) {
  return form.targets.map((t, i) => (i !== idx ? t.locus : null)).filter(Boolean)
}

function setTarget(i, v) {
  form.targets[i] = v || { locus: '', allele1: null, allele2: null }
}
function addTarget() {
  form.targets.push({ locus: '', allele1: null, allele2: null })
}
function removeTarget(i) {
  form.targets.splice(i, 1)
}
const canAddTarget = computed(() => {
  const pool = geneStore.genotypes.filter(g => g.symbol !== 'WT').length
  return form.targets.length < pool
})

// ===== 策略切换 =====

function onStrategyChange(newVal) {
  // 清空不匹配策略的目标？仅在用户明显在新建场景时自动
  if (isEdit.value) return
  if (newVal === 'global_ko') autofillDefault()
  if (newVal === 'cko') {
    // 不清空现有目标；提供模板
    if (!form.targets.length && cKOTemplates.value.length) {
      applyCkoTemplate(cKOTemplates.value[0])
    }
  }
}

function autofillDefault() {
  if (form.targets.length) return
  // 找首个 global_ko 位点作为默认
  const locus = geneStore.genotypes.find(g => detectLocusKind(g) === 'global_ko')
  if (!locus) return
  const nul = findAlleleOfKind(locus, ALLELE_KIND.NULL)
  if (nul) {
    form.targets.push({ locus: locus.symbol, allele1: nul.id, allele2: nul.id })
  }
}

// ===== cKO 快速模板 =====

const cKOTemplates = computed(() => {
  const floxLoci = geneStore.genotypes.filter(g => detectLocusKind(g) === 'cko_flox')
  const creLoci = geneStore.genotypes.filter(g => detectLocusKind(g) === 'cre_driver')
  const templates = []
  for (const fl of floxLoci) {
    const flx = findAlleleOfKind(fl, ALLELE_KIND.FLOX)
    const nul = findAlleleOfKind(fl, ALLELE_KIND.NULL)
    const wt = findAlleleOfKind(fl, ALLELE_KIND.WT)
    for (const cl of creLoci) {
      const cre = findAlleleOfKind(cl, ALLELE_KIND.CRE)
      const cwt = findAlleleOfKind(cl, ALLELE_KIND.WT)
      if (!flx || !cre) continue
      // f/f; Cre/+
      templates.push({
        key: `ff_${fl.symbol}_cre_${cl.symbol}`,
        label: `${fl.symbol}^f/f ; ${cl.symbol}^Cre/+`,
        targets: [
          { locus: fl.symbol, allele1: flx.id, allele2: flx.id },
          { locus: cl.symbol, allele1: cre.id, allele2: (cwt?.id ?? cre.id) }
        ]
      })
      // f/- ; Cre/+（若存在 KO allele）
      if (nul) {
        templates.push({
          key: `fn_${fl.symbol}_cre_${cl.symbol}`,
          label: `${fl.symbol}^f/- ; ${cl.symbol}^Cre/+`,
          targets: [
            { locus: fl.symbol, allele1: flx.id, allele2: nul.id },
            { locus: cl.symbol, allele1: cre.id, allele2: (cwt?.id ?? cre.id) }
          ]
        })
      }
    }
    // 如果无 cre driver，给出 flox only 维持组合
    if (!creLoci.length && flx && wt) {
      templates.push({
        key: `maintain_${fl.symbol}`,
        label: `${fl.symbol}^f/f （维持株）`,
        targets: [{ locus: fl.symbol, allele1: flx.id, allele2: flx.id }]
      })
    }
  }
  return templates.slice(0, 6)
})

function applyCkoTemplate(t) {
  form.targets = t.targets.map(x => ({ ...x }))
}

// ===== 预览 & 校验 =====

const fullPreview = computed(() => {
  return form.targets
    .filter(t => t.locus && t.allele1 && t.allele2)
    .map(t => {
      const locus = geneStore.genotypes.find(g => g.symbol === t.locus)
      if (!locus) return t.locus
      const s1 = locus.alleles.find(a => a.id === t.allele1)?.symbol || '?'
      const s2 = locus.alleles.find(a => a.id === t.allele2)?.symbol || '?'
      const sorted = [s1, s2].sort()
      return `${t.locus}<sup>${sorted[0]}/${sorted[1]}</sup>`
    })
    .join('; ')
})

const issues = computed(() => validatePlan(form, geneStore.genotypes))
const hasError = computed(() => issues.value.some(i => i.level === 'error'))
const hasWarn = computed(() => issues.value.some(i => i.level === 'warn'))

const recommendations = computed(() => {
  if (hasError.value) return []
  return buildBreedingRecommendation(form, geneStore.genotypes)
})

const canSubmit = computed(() => !hasError.value)

function onSubmit() {
  if (!canSubmit.value) return
  const payload = {
    name: form.name.trim(),
    strategy: form.strategy,
    targetCount: form.targetCount,
    sex: form.sex,
    strain: form.strain?.trim() || null,
    deadline: form.deadline || null,
    note: form.note,
    targets: form.targets.map(t => ({
      locus: t.locus,
      allele1: t.allele1,
      allele2: t.allele2
    }))
  }
  const saved = isEdit.value
    ? planStore.updatePlan(props.plan.id, payload)
    : planStore.createPlan(payload)
  emit('saved', saved)
  emit('update:show', false)
}
</script>

<style scoped>
.plan-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.strategy-bar {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 12px 14px;
  background: color-mix(in srgb, var(--n-color) 84%, var(--n-color-embedded));
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.strategy-heading {
  align-items: center;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--n-text-color-1);
  line-height: 1.35;
}

.section-caption {
  margin-top: 2px;
  font-size: 12px;
  color: var(--n-text-color-3);
  line-height: 1.35;
}

.strategy-hint {
  font-size: 12px;
  color: var(--n-text-color-2);
  background: rgba(32, 128, 240, 0.08);
  border-left: 3px solid #2080f0;
  border-radius: 6px;
  padding: 7px 10px;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  line-height: 1.5;
}

.form-section {
  padding: 12px 14px;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  background: color-mix(in srgb, var(--n-color) 88%, var(--n-color-embedded));
}

.note-section :deep(.n-form-item) {
  margin-bottom: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 10px 14px;
  margin-top: 10px;
}

.name-field {
  grid-column: span 6;
}

.count-field {
  grid-column: span 3;
}

.sex-field {
  grid-column: span 3;
}

.strain-field {
  grid-column: span 5;
}

.deadline-field {
  grid-column: span 7;
}

.form-grid :deep(.n-form-item) {
  margin-bottom: 0;
}

.target-heading {
  align-items: center;
}

.quick-template {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 0 10px;
}

.qt-label {
  flex: 0 0 auto;
  padding-top: 2px;
  font-size: 12px;
  color: var(--n-text-color-3);
}

.qt-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.qt-chip {
  cursor: pointer;
}

.targets-block {
  background: var(--n-color-embedded, rgba(0, 0, 0, 0.025));
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.target-empty {
  min-height: 54px;
  border: 1px dashed var(--n-border-color);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--n-text-color-3);
  font-size: 12px;
}

.target-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border-radius: 6px;
  background: var(--n-color);
}

.target-idx {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  margin-top: 2px;
  background: var(--n-primary-color);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.target-del {
  margin-left: auto;
  flex: 0 0 auto;
}

.full-preview {
  margin-top: 10px;
  padding: 9px 12px;
  border: 1px dashed var(--n-border-color);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.fp-label {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.issues {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.issue-row :deep(.n-alert-body__content) {
  font-size: 12px;
}

.issue-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
}

.issue-list span {
  position: relative;
}

.issue-list span + span::before {
  position: absolute;
  left: -10px;
  color: currentColor;
  opacity: 0.55;
  content: "/";
}

.recommendation-collapse {
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  padding: 0 10px;
}

.rec-card {
  padding: 8px 10px;
  background: var(--n-color-embedded, rgba(0, 0, 0, 0.02));
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 12px;
}
.rec-title {
  font-weight: 600;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.rec-scheme { color: var(--n-text-color-2); }
.rec-expected {
  margin-top: 2px;
  color: var(--n-text-color-3);
}
.rec-caveat {
  margin-top: 4px;
  color: #d03050;
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

.footer-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.footer-status {
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 24px;
}

.status-error { color: #d03050; }
.status-warn { color: #f0a020; }
.status-ok { color: #18a058; }

@media (max-width: 760px) {
  .section-heading,
  .strategy-heading,
  .target-heading,
  .footer-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .name-field,
  .count-field,
  .sex-field,
  .strain-field,
  .deadline-field {
    grid-column: span 1;
  }
}
</style>
