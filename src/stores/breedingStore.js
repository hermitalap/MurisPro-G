import { defineStore } from 'pinia'
import { computed } from 'vue'
import api from '@/utils/api'
import { useCageStore } from './cageStore'
import { useGeneStore } from './geneStore'

export const useBreedingStore = defineStore('breeding', () => {
  const cageStore = useCageStore()
  const geneStore = useGeneStore()

  /** 所有繁殖笼（cage_type === 'breeding'） */
  const breedingCages = computed(() =>
    cageStore.cages.filter(c => c.cage_type === 'breeding')
  )

  /** 返回某笼位内的"窝"分组：按母亲 tid + 出生日期 聚合 */
  function littersOfCage(cageId) {
    const mice = geneStore.mice.filter(
      m => m.cage_id === cageId && m.birth_date
    )
    const groups = new Map()
    for (const m of mice) {
      const motherKey = Array.isArray(m.mother) && m.mother.length ? m.mother[0] : 'unknown'
      const key = `${motherKey}__${m.birth_date}`
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          mother_tid: motherKey === 'unknown' ? null : motherKey,
          birth_date: m.birth_date,
          mice: []
        })
      }
      groups.get(key).mice.push(m)
    }
    // 按出生日期倒序
    return Array.from(groups.values()).sort((a, b) =>
      (b.birth_date || '').localeCompare(a.birth_date || '')
    )
  }

  /** 笼位内未鉴定仔鼠数（用于显示待鉴定角标） */
  function pendingPupsCount(cageId) {
    return geneStore.mice.filter(
      m => m.cage_id === cageId && m.live_status === 1 && m.genotype_confirmed === false
    ).length
  }

  /** 取某笼位中可能的父母候选（存活的成年小鼠） */
  function parentCandidates(cageId) {
    const inCage = geneStore.mice.filter(
      m => m.cage_id === cageId && m.live_status === 1 && m.genotype_confirmed !== false
    )
    return {
      fathers: inCage.filter(m => m.sex === 'M'),
      mothers: inCage.filter(m => m.sex === 'F')
    }
  }

  // ===== API 调用 =====

  async function setBreedingStatus(cageId, status, date) {
    const body = { status }
    if (date) body.date = date
    const resp = await api.put(`/cages/${cageId}/breeding-status`, body)
    // 本地同步更新
    const cage = cageStore.cages.find(c => c.id === cageId)
    if (cage) {
      cage.breeding_status = resp.data.breeding_status
      cage.breeding_status_date = resp.data.breeding_status_date
      cage.mice_birth_date = resp.data.mice_birth_date
    }
    return resp.data
  }

  async function registerLitter(payload) {
    const resp = await api.post('/mice/litter', payload)
    // 新仔登记后需要刷新 mice 与 cages（小鼠变化会影响动态统计）
    await Promise.all([geneStore.loadMice(), cageStore.fetchCages()])
    return resp.data
  }

  async function batchGenotype(items) {
    const resp = await api.put('/mice/batch-genotype', { items })
    await Promise.all([geneStore.loadMice(), cageStore.fetchCages()])
    return resp.data
  }

  return {
    breedingCages,
    littersOfCage,
    pendingPupsCount,
    parentCandidates,
    setBreedingStatus,
    registerLitter,
    batchGenotype
  }
})
