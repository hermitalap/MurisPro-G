/**
 * 基因型预设与繁配推理工具
 *
 * 职责：
 *  - classifyAllele(allele): 根据 symbol / is_wildtype 分类为 WT / NULL / FLOX / CRE / OTHER
 *  - detectLocusKind(locus): 推断位点类型 (global_ko / cko_flox / cre_driver / custom)
 *  - generatePresets(locus): 为该位点生成"常用组合"预设（带语义标签）
 *  - predictCross(fatherGenes, motherGenes): 单交预测，返回 {locus -> [{key, allele1, allele2, prob, label}]}
 *  - predictCombinedYield(parents, targets): 按目标组合估算预期后代占比
 *  - validatePlan(plan, genotypes): 返回 [{level:'error'|'warn', message}]
 *  - buildBreedingRecommendation(plan, genotypes): 给出策略建议
 */

import { pairKey } from '@/utils/allele'

// ---------- 等位基因分类 ----------

export const ALLELE_KIND = {
  WT: 'WT',
  NULL: 'NULL',
  FLOX: 'FLOX',
  CRE: 'CRE',
  OTHER: 'OTHER'
}

const RE_NULL = /^(ko|null|neo|lacz|del|ki|-)$/i
const RE_FLOX = /(^f$|^fl$|flox)/i
const RE_CRE = /(^cre$|cre[-_]?\w*|ert2?|dre)/i

export function classifyAllele(allele) {
  if (!allele) return ALLELE_KIND.OTHER
  if (allele.is_wildtype || allele.symbol === '+') return ALLELE_KIND.WT
  const s = (allele.symbol || '').trim()
  if (RE_NULL.test(s)) return ALLELE_KIND.NULL
  if (RE_FLOX.test(s)) return ALLELE_KIND.FLOX
  if (RE_CRE.test(s)) return ALLELE_KIND.CRE
  return ALLELE_KIND.OTHER
}

function classifyAlleleForLocus(locus, allele) {
  const kind = classifyAllele(allele)
  if (kind !== ALLELE_KIND.OTHER) return kind
  const locusSymbol = (locus?.symbol || '').toLowerCase()
  if (locusSymbol.includes('cre') && !allele?.is_wildtype && allele?.symbol) {
    return ALLELE_KIND.CRE
  }
  return kind
}

/** 从位点 alleles 快速找到某类 allele（返回第一个） */
export function findAlleleOfKind(locus, kind) {
  return (locus?.alleles || []).find(a => classifyAlleleForLocus(locus, a) === kind)
}

// ---------- 位点类型识别 ----------

/**
 * 位点类型：
 *   'global_ko'   有 WT + NULL，无 FLOX
 *   'cko_flox'    有 FLOX（通常还有 WT，可能还有 NULL）
 *   'cre_driver'  有 CRE（通常搭配 WT）
 *   'point_mut'   无 NULL/FLOX/CRE，但有 OTHER（点突变/敲入）
 *   'custom'      其他
 */
export function detectLocusKind(locus) {
  if (!locus || !Array.isArray(locus.alleles)) return 'custom'
  const kinds = new Set(locus.alleles.map(a => classifyAlleleForLocus(locus, a)))
  if (kinds.has(ALLELE_KIND.CRE)) return 'cre_driver'
  if (kinds.has(ALLELE_KIND.FLOX)) return 'cko_flox'
  if (kinds.has(ALLELE_KIND.NULL) && kinds.has(ALLELE_KIND.WT)) return 'global_ko'
  if (kinds.has(ALLELE_KIND.OTHER)) return 'point_mut'
  return 'custom'
}

// ---------- 预设组合 ----------

/**
 * 为某位点生成"常用组合"预设：
 *   [{ key, allele1, allele2, label, tag, kind }]
 *   - label: UI 中文字
 *   - tag:   简短标识，如 "WT" / "Het" / "Homo KO"
 *   - kind:  'wt' | 'het' | 'homo_ko' | 'het_ko' | 'flox_homo' | 'flox_het' | 'flox_null' | 'cre_hemi' | 'cre_homo' | 'no_cre' | 'custom'
 */
export function generatePresets(locus) {
  if (!locus) return []
  const wt = findAlleleOfKind(locus, ALLELE_KIND.WT)
  const nul = findAlleleOfKind(locus, ALLELE_KIND.NULL)
  const flx = findAlleleOfKind(locus, ALLELE_KIND.FLOX)
  const cre = findAlleleOfKind(locus, ALLELE_KIND.CRE)
  const muts = (locus.alleles || []).filter(a => classifyAllele(a) === ALLELE_KIND.OTHER)
  const kind = detectLocusKind(locus)
  const presets = []
  const push = (a1, a2, label, tag, k) => {
    if (!a1 || !a2) return
    presets.push({
      key: pairKey(a1.id, a2.id),
      allele1: a1.id,
      allele2: a2.id,
      sym1: a1.symbol,
      sym2: a2.symbol,
      label,
      tag,
      kind: k
    })
  }

  if (kind === 'global_ko') {
    push(wt, wt, 'WT 野生型', '+/+', 'wt')
    push(wt, nul, 'Het 杂合', `+/${nul.symbol}`, 'het')
    push(nul, nul, 'Homo KO 纯合敲除', `${nul.symbol}/${nul.symbol}`, 'homo_ko')
  } else if (kind === 'cko_flox') {
    if (wt) push(wt, wt, 'WT 野生型', '+/+', 'wt')
    if (wt && flx) push(wt, flx, 'Flox 杂合', `${flx.symbol}/+`, 'flox_het')
    if (flx) push(flx, flx, 'Flox 纯合', `${flx.symbol}/${flx.symbol}`, 'flox_homo')
    if (flx && nul) push(flx, nul, 'Flox/KO 复合', `${flx.symbol}/${nul.symbol}`, 'flox_null')
    if (wt && nul) push(wt, nul, 'KO 杂合', `+/${nul.symbol}`, 'het_ko')
    if (nul) push(nul, nul, 'KO 纯合', `${nul.symbol}/${nul.symbol}`, 'homo_ko')
  } else if (kind === 'cre_driver') {
    if (wt) push(wt, wt, '无 Cre', '+/+', 'no_cre')
    if (cre && wt) push(cre, wt, 'Cre 半合子（推荐）', `${cre.symbol}/+`, 'cre_hemi')
    if (cre) push(cre, cre, 'Cre 纯合', `${cre.symbol}/${cre.symbol}`, 'cre_homo')
  } else if (kind === 'point_mut') {
    if (wt) push(wt, wt, 'WT', '+/+', 'wt')
    for (const m of muts) {
      if (wt) push(wt, m, `${m.symbol}/+ 杂合`, `${m.symbol}/+`, 'het')
      push(m, m, `${m.symbol}/${m.symbol} 纯合`, `${m.symbol}/${m.symbol}`, 'homo_ko')
    }
  } else {
    // 生成所有唯一组合
    const seen = new Set()
    const alleles = locus.alleles || []
    for (const a of alleles) {
      for (const b of alleles) {
        const k = pairKey(a.id, b.id)
        if (seen.has(k)) continue
        seen.add(k)
        presets.push({
          key: k,
          allele1: Math.min(a.id, b.id),
          allele2: Math.max(a.id, b.id),
          sym1: a.symbol,
          sym2: b.symbol,
          label: `${a.symbol}/${b.symbol}`,
          tag: `${a.symbol}/${b.symbol}`,
          kind: 'custom'
        })
      }
    }
  }
  return presets
}

// ---------- 杂交预测 ----------

/**
 * 单位点杂交预测：返回 [{key, allele1, allele2, prob, sym1, sym2, label}]
 */
export function predictLocusCross(locus, father, mother) {
  if (!father || !mother) return []
  const fA = [father.allele1, father.allele2].filter(x => x != null)
  const mA = [mother.allele1, mother.allele2].filter(x => x != null)
  if (!fA.length || !mA.length) return []
  const counts = new Map()
  for (const a of fA) {
    for (const b of mA) {
      const k = pairKey(a, b)
      counts.set(k, (counts.get(k) || 0) + 1)
    }
  }
  const total = fA.length * mA.length
  const byAllele = new Map((locus.alleles || []).map(a => [a.id, a]))
  return Array.from(counts.entries()).map(([k, c]) => {
    const [lo, hi] = k.split('-').map(Number)
    const a1 = byAllele.get(lo)
    const a2 = byAllele.get(hi)
    return {
      key: k,
      allele1: lo,
      allele2: hi,
      prob: c / total,
      sym1: a1?.symbol,
      sym2: a2?.symbol,
      label: `${a1?.symbol}/${a2?.symbol}`
    }
  }).sort((a, b) => b.prob - a.prob)
}

/**
 * 多位点综合预测：返回匹配目标组合的整体概率
 * targets: [{locus, allele1, allele2}]
 * parents: { father: [{locus, allele1, allele2}], mother: [{locus, allele1, allele2}] }
 * genotypes: geneStore.genotypes
 */
export function predictCombinedYield(parents, targets, genotypes) {
  if (!targets?.length || !parents?.father || !parents?.mother) return 0
  let p = 1
  for (const t of targets) {
    const locus = genotypes.find(g => g.symbol === t.locus)
    if (!locus) return 0
    const fGene = parents.father.find(g => g.locus === t.locus)
    const mGene = parents.mother.find(g => g.locus === t.locus)
    if (!fGene || !mGene) return 0
    const preds = predictLocusCross(locus, fGene, mGene)
    const targetKey = pairKey(t.allele1, t.allele2)
    const hit = preds.find(pr => pr.key === targetKey)
    p *= hit ? hit.prob : 0
    if (p === 0) return 0
  }
  return p
}

// ---------- 计划校验 ----------

export function validatePlan(plan, genotypes) {
  const out = []
  if (!plan) return [{ level: 'error', message: '计划为空' }]
  if (!plan.name?.trim()) out.push({ level: 'error', message: '请填写计划名称' })
  if (!plan.targetCount || plan.targetCount < 1) out.push({ level: 'error', message: '目标数量应 ≥ 1' })
  if (!plan.targets?.length) {
    out.push({ level: 'error', message: '至少需要一个目标基因型' })
    return out
  }
  const seen = new Set()
  for (const t of plan.targets) {
    if (!t.locus) { out.push({ level: 'error', message: '存在未选位点的目标行' }); continue }
    if (seen.has(t.locus)) out.push({ level: 'error', message: `位点 ${t.locus} 重复` })
    seen.add(t.locus)
    if (!t.allele1 || !t.allele2) {
      out.push({ level: 'error', message: `位点 ${t.locus} 尚未选择等位基因` })
      continue
    }
    const locus = genotypes.find(g => g.symbol === t.locus)
    if (!locus) { out.push({ level: 'error', message: `位点 ${t.locus} 不在库中` }); continue }
    const ids = new Set(locus.alleles.map(a => a.id))
    if (!ids.has(t.allele1) || !ids.has(t.allele2)) {
      out.push({ level: 'error', message: `位点 ${t.locus} 等位基因不属于该位点` })
    }
  }
  // 策略一致性
  if (plan.strategy === 'cko') {
    const kinds = plan.targets.map(t => detectLocusKind(genotypes.find(g => g.symbol === t.locus)))
    const hasFlox = kinds.includes('cko_flox')
    const hasCre = kinds.includes('cre_driver')
    if (!hasFlox) out.push({ level: 'warn', message: 'cKO 策略通常需要一个 flox 位点' })
    if (!hasCre) out.push({ level: 'warn', message: 'cKO 策略通常需要一个 Cre driver 位点' })
  }
  if (plan.strategy === 'global_ko') {
    for (const t of plan.targets) {
      const locus = genotypes.find(g => g.symbol === t.locus)
      const kind = detectLocusKind(locus)
      if (kind !== 'global_ko' && kind !== 'cko_flox') {
        out.push({ level: 'warn', message: `位点 ${t.locus} 未检测到 KO 等位基因` })
      }
    }
  }
  return out
}

// ---------- 繁配策略建议 ----------

/**
 * 针对目标基因型，给出推荐的亲本组合
 * 返回 [{ fatherDesc, motherDesc, expectedRatio, caveat }]
 */
export function buildBreedingRecommendation(plan, genotypes) {
  if (!plan?.targets?.length) return []
  const recs = []
  // 简化：按每位点独立给建议，最后综合
  const perLocusRec = plan.targets.map(t => {
    const locus = genotypes.find(g => g.symbol === t.locus)
    const kind = detectLocusKind(locus)
    const targetHasFlox = kind === 'cko_flox' &&
      (classifyAllele(locus.alleles.find(a => a.id === t.allele1)) === ALLELE_KIND.FLOX ||
       classifyAllele(locus.alleles.find(a => a.id === t.allele2)) === ALLELE_KIND.FLOX)
    const symA = locus?.alleles.find(a => a.id === t.allele1)?.symbol
    const symB = locus?.alleles.find(a => a.id === t.allele2)?.symbol
    return { locus, kind, target: t, symA, symB, isFloxTarget: targetHasFlox }
  })

  // Global KO 路径
  for (const r of perLocusRec) {
    if (r.kind === 'global_ko') {
      const isHomoKO = r.symA !== '+' && r.symB !== '+' && r.symA === r.symB
      const isHet = (r.symA === '+') !== (r.symB === '+')
      if (isHomoKO) {
        recs.push({
          title: `${r.locus.symbol} 纯合敲除`,
          scheme: `建议：Het × Het（${r.locus.symbol}+/- × ${r.locus.symbol}+/-）`,
          expected: '每窝约 25% 达标',
          caveat: '纯合 KO 若可育，亦可 KO × KO 获 100%'
        })
      } else if (isHet) {
        recs.push({
          title: `${r.locus.symbol} 杂合`,
          scheme: `建议：Het × WT（${r.locus.symbol}+/- × ${r.locus.symbol}+/+）`,
          expected: '每窝约 50% 达标',
          caveat: null
        })
      }
    }
    if (r.kind === 'cko_flox' && r.isFloxTarget) {
      const isHomo = r.symA === r.symB
      recs.push({
        title: `${r.locus.symbol} flox ${isHomo ? '纯合' : '杂合'}`,
        scheme: isHomo
          ? `建议：f/f × f/f 维持；或 f/+ × f/f（50%）；或 f/f × f/- (50%)`
          : `建议：f/f × +/+ 或 f/f × WT`,
        expected: isHomo ? '维持株 100% / Het 交叉 50%' : '100% f/+',
        caveat: null
      })
    }
    if (r.kind === 'cre_driver') {
      recs.push({
        title: `${r.locus.symbol} Cre`,
        scheme: '建议：Cre/+ × +/+（保持半合子）',
        expected: '每窝约 50% 携带 Cre',
        caveat: 'Cre 一般不建议纯合，避免表达/毒性问题'
      })
    }
  }

  // cKO 综合
  if (plan.strategy === 'cko') {
    const flox = perLocusRec.find(r => r.kind === 'cko_flox' && r.isFloxTarget)
    const cre = perLocusRec.find(r => r.kind === 'cre_driver')
    if (flox && cre) {
      const floxHomo = flox.symA === flox.symB
      recs.unshift({
        title: '条件性敲除组合 (cKO)',
        scheme: floxHomo
          ? `推荐：[${flox.locus.symbol} f/+; ${cre.locus.symbol} Cre/+] × [${flox.locus.symbol} f/f] → 25% 目标`
          : `推荐：[${flox.locus.symbol} f/+; ${cre.locus.symbol} Cre/+] × [${flox.locus.symbol} f/+] → 12.5% 目标`,
        expected: floxHomo ? '约 25% 每窝达标' : '约 12.5% 每窝达标',
        caveat: `注意 Cre driver 组织特异性。若 Cre 在生殖系活跃（如 Stra8-Cre 雄性精原），Cre 必须通过**母本**传递，否则 flox 会在父本精子中被提前切除`
      })
    }
  }
  return recs
}
