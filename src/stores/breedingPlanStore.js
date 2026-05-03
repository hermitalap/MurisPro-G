import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGeneStore } from './geneStore'
import { useCageStore } from './cageStore'
import api from '@/utils/api'
import {
  computeGenerations,
  qualifyMice,
  bucketByGeneration
} from '@/utils/pedigree'

/**
 * 繁配计划管理（后端数据库持久化）
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

function loadLegacyPlansFromLS() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function clearLegacyPlansFromLS() {
  try {
    localStorage.removeItem(LS_KEY)
  } catch {
    // 忽略浏览器隐私模式等导致的清理失败
  }
}

export const useBreedingPlanStore = defineStore('breedingPlan', () => {
  const geneStore = useGeneStore()
  const cageStore = useCageStore()

  const plans = ref([])
  const loading = ref(false)

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

  async function migrateLegacyPlans() {
    const legacyPlans = loadLegacyPlansFromLS()
    if (!legacyPlans.length) return

    const knownIds = new Set(plans.value.map(p => p.id))
    const pending = legacyPlans.filter(p => p?.id && !knownIds.has(p.id))
    for (const plan of pending) {
      const response = await api.post('/breeding-plans', plan)
      plans.value = [response.data, ...plans.value]
      knownIds.add(response.data.id)
    }
    clearLegacyPlansFromLS()
  }

  async function loadInitialData() {
    loading.value = true
    try {
      const response = await api.get('/breeding-plans')
      plans.value = response.data
      await migrateLegacyPlans()
    } catch (error) {
      console.error('加载繁配计划失败:', error)
    } finally {
      loading.value = false
    }
  }

  // ===== CRUD =====

  async function createPlan(payload) {
    const response = await api.post('/breeding-plans', payload)
    const plan = response.data
    plans.value = [plan, ...plans.value]
    return plan
  }

  async function updatePlan(id, patch) {
    const idx = plans.value.findIndex(p => p.id === id)
    const response = await api.put(`/breeding-plans/${id}`, patch)
    const plan = response.data
    if (idx === -1) {
      plans.value = [plan, ...plans.value]
      return plan
    }
    plans.value[idx] = plan
    // 保证引用更新以触发 computed
    plans.value = [...plans.value]
    return plan
  }

  async function removePlan(id) {
    await api.delete(`/breeding-plans/${id}`)
    plans.value = plans.value.filter(p => p.id !== id)
  }

  async function archivePlan(id, archived = true) {
    return updatePlan(id, { archived })
  }

  async function duplicatePlan(id) {
    const src = plans.value.find(p => p.id === id)
    if (!src) return
    const { id: _id, createdAt: _createdAt, ...payload } = src
    return createPlan({ ...payload, name: src.name + ' (副本)' })
  }

  return {
    plans,
    loading,
    activePlans,
    archivedPlans,
    generations,
    computeProgress,
    loadInitialData,
    createPlan,
    updatePlan,
    removePlan,
    archivePlan,
    duplicatePlan
  }
})
