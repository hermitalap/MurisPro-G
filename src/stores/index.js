import { useGeneStore } from './geneStore'
import { useCageStore } from './cageStore'
import { useExperimentStore } from './experimentStore'
import { useSettingStore } from './settingStore'
import { useBreedingStore } from './breedingStore'
import { useBreedingPlanStore } from './breedingPlanStore'

// 统一导出所有 Store
export {
  useGeneStore,
  useCageStore,
  useExperimentStore,
  useSettingStore,
  useBreedingStore,
  useBreedingPlanStore
}

export async function initializeStores() {
  // 初始化所有 store 的预加载数据
  const stores = [
    useGeneStore,
    useCageStore,
    useExperimentStore,
    useSettingStore,
    useBreedingPlanStore
  ]

  const results = await Promise.allSettled(
    stores.map((Store) => Store().loadInitialData())
  )

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error('初始化 store 失败:', stores[index].name, result.reason)
    }
  })
}
