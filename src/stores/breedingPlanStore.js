import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGeneStore } from './geneStore'
import { useCageStore } from './cageStore'
import {
  computeGenerations,
  qualifyMice,
  matchesTargets,
  bucketByGeneration
} from '@/utils/pedigree'

/**
 * 繁配计划管理（客户端持久化到 localStorage）
 *
 * Plan schema:
 * {
 *   id: string,
 *   name: string,
 *   strategy: 'global_ko' | 'cko' | 'custom',
 *   targets: [{ locus: string, allele1: number, allele2: number }],
 *   targetCount: number,
 *   sex: 'any' | 'M' | 'F',
 *   strain: string | null,
 *   deadline: string | null,
 *   note: string,
 *   archived: boolean,
 *   createdAt: string
 * }
 */

const LS_KEY = 'murispro.breedingPlans.v1'

function loadFromLS() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function saveToLS(plans) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(plans))
  } catch (e) {
    console.error('保存繁配计划失败:', e)
  }
}

function makeId() {
  return 'bp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export const useBreedingPlanStore = defineStore('breedingPlan', () => {
  const geneStore = useGeneStore()
  const cageStore = useCageStore()

  const plans = ref(loadFromLS())

  /** 世代 Map —— 会随 geneStore.mice 变化重算 */
  const generations = computed(() => computeGenerations(geneStore.mice))

  /** 计算单个 plan 的进度指标 */
  function computeProgress(plan) {
    const mice = geneStore.mice
    const qualified = qualifyMice(mice, plan, {
      requireAlive: true,
      requireConfirmed: true
    })
    const pending = mice.filter(m =>
      m.genotype_confirmed === false &&
      m.live_status === 1 &&
      (!plan.sex || plan.sex === 'any' || m.sex === plan.sex) &&
      (!plan.strain || m.strain === plan.strain)
    )
    const { buckets, maxGen } = bucketByGeneration(qualified, generations.value)

    // 贡献笼位（仍存活的候选所在 cage）
    const cageIds = new Set(qualified.map(m => m.cage_id).filter(Boolean))
    const cages = cageStore.cages.filter(c => cageIds.has(c.id))

    const ratio = plan.targetCount > 0 ? qualified.length / plan.targetCount : 0
    return {
      qualified,
      pending,
      buckets,
      maxGen,
      cages,
      ratio: Math.min(1, ratio),
      percent: Math.min(100, Math.round(ratio * 100)),
      done: qualified.length >= plan.targetCount
    }
  }

  /** 所有活跃计划 */
  const activePlans = computed(() => plans.value.filter(p => !p.archived))
  const archivedPlans = computed(() => plans.value.filter(p => p.archived))

  // ===== CRUD =====

  function createPlan(payload) {
    const plan = {
      id: makeId(),
      name: (payload.name || '').trim() || '未命名计划',
      strategy: payload.strategy || 'custom',
      targets: payload.targets || [],
      targetCount: Number(payload.targetCount) || 1,
      sex: payload.sex || 'any',
      strain: payload.strain || null,
      deadline: payload.deadline || null,
      note: payload.note || '',
      archived: false,
      createdAt: new Date().toISOString().slice(0, 10)
    }
    plans.value = [plan, ...plans.value]
    saveToLS(plans.value)
    return plan
  }

  function updatePlan(id, patch) {
    const idx = plans.value.findIndex(p => p.id === id)
    if (idx === -1) return null
    plans.value[idx] = { ...plans.value[idx], ...patch }
    // 保证引用更新以触发 computed
    plans.value = [...plans.value]
    saveToLS(plans.value)
    return plans.value[idx]
  }

  function removePlan(id) {
    plans.value = plans.value.filter(p => p.id !== id)
    saveToLS(plans.value)
  }

  function archivePlan(id, archived = true) {
    updatePlan(id, { archived })
  }

  function duplicatePlan(id) {
    const src = plans.value.find(p => p.id === id)
    if (!src) return
    return createPlan({ ...src, name: src.name + ' (副本)' })
  }

  return {
    plans,
    activePlans,
    archivedPlans,
    generations,
    computeProgress,
    createPlan,
    updatePlan,
    removePlan,
    archivePlan,
    duplicatePlan
  }
})
