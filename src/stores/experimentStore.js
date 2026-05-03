import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api'

export const useExperimentStore = defineStore('experiment', () => {

    const loadInitialData = async () => {
        await Promise.all([
            fetchExperiments(),
            fetchExperimentPresets(),
            fetchPredefinedGroups()
        ])
    }

    const experiments = ref([])
    const showedExperiments = computed(() => {
        return experiments.value.filter(expr => expr.is_show)
    })
    const experimentPresets = ref({})
    
    // 实验类型相关方法
    const fetchExperiments = async () => {
        try {
            const response = await api.get('/experiment-types')
            experiments.value = response.data
        } catch (error) {
            console.error('获取实验类型列表失败:', error)
        }
    }

    const fetchExperimentPresets = async () => {
        try {
            const response = await api.get('/experiment-types/presets')
            experimentPresets.value = response.data && !Array.isArray(response.data) ? response.data : {}
            } catch (error) {
            console.error('获取实验预设失败:', error)
        }
    }

    const selectedPredefinedGroupId = ref(null)
    const predefinedGroups = ref([])
    const showChartType = ref('pred')

    const fetchPredefinedGroups = async () => {
        try {
            const response = await api.get('/groups/predefined')
            predefinedGroups.value = response.data
        } catch (error) {
            console.error('获取分组失败:', error);
        }
    } 

    const getPredefinedGroups = async () => {
        // 筛选符合分组条件的小鼠
        const response = await api.get(`/groups/predefined/${selectedPredefinedGroupId.value}/mice`)
        return response.data
    }

    return {
        experiments,
        showedExperiments,
        experimentPresets,
        selectedPredefinedGroupId,
        predefinedGroups,
        showChartType,

        fetchExperiments,
        loadInitialData,
        getPredefinedGroups,
        fetchPredefinedGroups
    }
})
