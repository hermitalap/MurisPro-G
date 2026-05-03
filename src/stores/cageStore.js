import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api'

export const useCageStore = defineStore('cage', () => {

    const loadInitialData = async () => {
        await fetchLocations()
        shouldSetDefaultSection.value = true
        await fetchCages()
    }

    // 位置相关方法
    const locations = ref([])
    
    const fetchLocations = async () => {
        try {
            const response = await api.get('/locations')
            locations.value = response.data
        } catch (error) {
            console.error('获取位置列表失败:', error)
        }
    }

    // 笼位相关方法
    const cages = ref([])
    const activeSection = ref('')
    const shouldSetDefaultSection = ref(false)
    // 计算属性 - 过滤笼位
    const filteredCages = computed(() => {
        if (!activeSection.value) return cages.value
        return cages.value.filter(cage => cage.section === activeSection.value)
    })
    
    // 获取所有笼位数据
    async function fetchCages() {
    try {
        const response = await api.get('/cages')
        cages.value = response.data
        
        // 设置默认选中的section为第一个
        if (shouldSetDefaultSection.value) {
            if (locations.value.length > 0) {
                activeSection.value = locations.value[0].identifier
                shouldSetDefaultSection.value = false
            } else {
                activeSection.value = ''
                shouldSetDefaultSection.value = false
            }
        }
    } catch (error) {
        console.error('获取笼位信息失败:', error)
    }
    }

    const calculateCages = (section) => {
        if (!section) return cages.value
        return cages.value.filter(cage => cage.section === section)
    }

    const updateCage = (id, patch) => {
        const idx = cages.value.findIndex(cage => cage.id === id)
        if (idx !== -1) {
            cages.value[idx] = { ...cages.value[idx], ...patch }
            cages.value = [...cages.value]
        }
    }

    return {
        locations,
        cages,
        filteredCages,
        activeSection,
        shouldSetDefaultSection,

        fetchLocations,
        fetchCages,
        calculateCages,
        updateCage,
        loadInitialData
    }
})
