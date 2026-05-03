/**
 * 基因型繁配进度 - 世代推断与目标基因型匹配工具
 *
 * - computeGenerations(mice): 基于 pedigree 迭代推断每只小鼠的世代 (F0/F1/F2 …)
 * - matchesTargets(mouse, targets): 判断小鼠基因型是否命中全部目标位点组合
 * - qualifyMice(mice, plan): 按计划筛选候选（活体 + 已鉴定 + 基因型命中 + 性别）
 */

import { pairKey } from '@/utils/allele'

/**
 * 根据 pedigree 计算每只小鼠的世代索引。
 * 规则：
 *  - 无任一在库父母 -> F0
 *  - 否则 = max(父世代, 母世代) + 1
 *  - 支持循环保护（不完整数据时保证收敛）
 *
 * @param {Array} mice geneStore.mice
 * @returns {Map<tid, number>} tid -> generation index
 */
export function computeGenerations(mice) {
  const byTid = new Map()
  for (const m of mice) byTid.set(m.tid, m)

  const gen = new Map()
  const MAX_ITER = 30

  // 初始：无父母的全部设为 0
  for (const m of mice) {
    const hasF = Array.isArray(m.father) && m.father.some(t => byTid.has(t))
    const hasM = Array.isArray(m.mother) && m.mother.some(t => byTid.has(t))
    if (!hasF && !hasM) gen.set(m.tid, 0)
  }

  // 迭代松弛
  for (let iter = 0; iter < MAX_ITER; iter++) {
    let changed = false
    for (const m of mice) {
      if (gen.has(m.tid)) continue
      const pa = [
        ...(Array.isArray(m.father) ? m.father : []),
        ...(Array.isArray(m.mother) ? m.mother : [])
      ].filter(t => byTid.has(t))
      if (!pa.length) {
        gen.set(m.tid, 0)
        changed = true
        continue
      }
      const known = pa.map(t => gen.get(t)).filter(x => x !== undefined)
      if (known.length === pa.length) {
        gen.set(m.tid, Math.max(...known) + 1)
        changed = true
      }
    }
    if (!changed) break
  }

  // 兜底：未确定的设 0
  for (const m of mice) {
    if (!gen.has(m.tid)) gen.set(m.tid, 0)
  }
  return gen
}

/**
 * 判断小鼠在所有目标位点上是否匹配
 * @param {Object} mouse
 * @param {Array<{locus:string, allele1:number, allele2:number}>} targets
 */
export function matchesTargets(mouse, targets) {
  if (!targets || !targets.length) return false
  const entities = mouse?.genotype?.geneEntity || []
  const byLocus = new Map(entities.map(g => [g.locus, g]))
  for (const t of targets) {
    const g = byLocus.get(t.locus)
    if (!g) return false
    const want = pairKey(t.allele1, t.allele2)
    const have = pairKey(g.allele1, g.allele2)
    if (!want || !have || want !== have) return false
  }
  return true
}

/**
 * 按计划筛选候选小鼠
 * @param {Array} mice
 * @param {Object} plan
 * @param {{requireAlive?:boolean, requireConfirmed?:boolean}} [opts]
 */
export function qualifyMice(mice, plan, opts = {}) {
  const { requireAlive = true, requireConfirmed = true } = opts
  return mice.filter(m => {
    if (requireAlive && m.live_status !== 1) return false
    if (requireConfirmed && m.genotype_confirmed === false) return false
    if (plan.sex && plan.sex !== 'any' && m.sex !== plan.sex) return false
    if (plan.strain && (m.strain || '') !== plan.strain) return false
    return matchesTargets(m, plan.targets)
  })
}

/**
 * 统计候选小鼠在各世代的分布
 * @returns {{ buckets: Map<number, Array>, maxGen: number }}
 */
export function bucketByGeneration(miceSubset, genMap) {
  const buckets = new Map()
  let maxGen = 0
  for (const m of miceSubset) {
    const g = genMap.get(m.tid) ?? 0
    if (!buckets.has(g)) buckets.set(g, [])
    buckets.get(g).push(m)
    if (g > maxGen) maxGen = g
  }
  return { buckets, maxGen }
}

/**
 * 将目标基因型渲染为可读字符串
 * "Nlrp3<sup>KO/KO</sup>; Cre<sup>Cre/+</sup>"
 */
export function renderTargetSymbol(targets, genotypes) {
  if (!targets || !targets.length) return ''
  return targets.map(t => {
    const locus = genotypes.find(g => g.symbol === t.locus)
    if (!locus) return t.locus
    const s1 = locus.alleles.find(a => a.id === t.allele1)?.symbol || '?'
    const s2 = locus.alleles.find(a => a.id === t.allele2)?.symbol || '?'
    const _ord = { f: 0, flox: 0, Tg: 1, '-': 3, KO: 3 }
    const sorted = [s1, s2].sort((a, b) => {
      const pa = _ord[a] ?? 2, pb = _ord[b] ?? 2
      return pa !== pb ? pa - pb : a.localeCompare(b)
    })
    return `${t.locus}<sup>${sorted[0]}/${sorted[1]}</sup>`
  }).join('; ')
}
