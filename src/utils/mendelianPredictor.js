/**
 * 孟德尔遗传推断
 *
 * 输入：两只亲本在同一位点上的基因型（每方的 allele1/allele2），
 * 输出：该位点后代可能出现的所有等位基因组合（去重、不区分顺序）。
 *
 * 使用场景：在"批量鉴定"弹窗中，为每只未鉴定仔鼠的基因型下拉提供"本窝可能组合"高亮。
 */

import { pairKey } from '@/utils/allele'

/**
 * 对单一位点预测后代可能的等位基因对
 * @param {{allele1: number, allele2: number}} father
 * @param {{allele1: number, allele2: number}} mother
 * @returns {Array<{allele1:number, allele2:number, key:string}>}
 */
export function predictLocusOffspring(father, mother) {
  if (!father || !mother) return []
  const fAlleles = [father.allele1, father.allele2].filter(a => a != null)
  const mAlleles = [mother.allele1, mother.allele2].filter(a => a != null)
  if (!fAlleles.length || !mAlleles.length) return []

  const seen = new Map()
  for (const fa of fAlleles) {
    for (const ma of mAlleles) {
      const key = pairKey(fa, ma)
      if (!seen.has(key)) {
        const [lo, hi] = [fa, ma].sort((x, y) => x - y)
        seen.set(key, { allele1: lo, allele2: hi, key })
      }
    }
  }
  return Array.from(seen.values())
}

/**
 * 根据父母的完整基因型（多位点）推断后代在各位点上的可能组合
 * @param {Array<{locus:string, allele1:number, allele2:number}>} fatherGenes
 * @param {Array<{locus:string, allele1:number, allele2:number}>} motherGenes
 * @returns {Object<string, Array<{allele1:number, allele2:number, key:string}>>}
 *   以 locus symbol 为键，值为该位点可能组合数组
 */
export function predictOffspringGenotypes(fatherGenes, motherGenes) {
  const result = {}
  const fByLocus = new Map((fatherGenes || []).map(g => [g.locus, g]))
  const mByLocus = new Map((motherGenes || []).map(g => [g.locus, g]))
  const loci = new Set([...fByLocus.keys(), ...mByLocus.keys()])
  for (const locus of loci) {
    const f = fByLocus.get(locus)
    const m = mByLocus.get(locus)
    if (!f || !m) continue
    result[locus] = predictLocusOffspring(f, m)
  }
  return result
}

/**
 * 判断某组合是否在预测列表中
 */
export function isPredicted(predictions, allele1, allele2) {
  if (!predictions || !predictions.length) return false
  const key = pairKey(allele1, allele2)
  return predictions.some(p => p.key === key)
}
