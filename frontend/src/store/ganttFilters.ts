import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export interface GanttFilterState {
  startDate: string
  endDate: string
  filterCondition: string
  filterLabel: string
  selectedContainers: string[]
  timeDimension: 'arrival' | 'pickup' | 'lastPickup' | 'return'
}

const STORAGE_KEY = 'logix_gantt_filters'

const getDefaultState = (): GanttFilterState => ({
  startDate: '',
  endDate: '',
  filterCondition: '',
  filterLabel: '',
  selectedContainers: [],
  timeDimension: 'arrival'
})

export const useGanttFilterStore = defineStore('ganttFilters', () => {
  // 从 localStorage 初始化状态
  const getInitialState = (): GanttFilterState => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return { ...getDefaultState(), ...parsed }
      }
    } catch (e) {
      console.warn('[GanttFilterStore] Failed to parse saved state:', e)
    }
    return getDefaultState()
  }

  const initialState = getInitialState()

  // 创建响应式状态
  const startDate = ref(initialState.startDate)
  const endDate = ref(initialState.endDate)
  const filterCondition = ref(initialState.filterCondition)
  const filterLabel = ref(initialState.filterLabel)
  const selectedContainers = ref<string[]>([...initialState.selectedContainers])
  const timeDimension = ref<'arrival' | 'pickup' | 'lastPickup' | 'return'>(
    initialState.timeDimension
  )

  /**
   * 持久化到 localStorage
   */
  function persist() {
    try {
      const currentState: GanttFilterState = {
        startDate: startDate.value,
        endDate: endDate.value,
        filterCondition: filterCondition.value,
        filterLabel: filterLabel.value,
        selectedContainers: [...selectedContainers.value],
        timeDimension: timeDimension.value
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState))
    } catch (e) {
      console.warn('[GanttFilterStore] Failed to persist state:', e)
    }
  }

  // 监听所有状态变化，自动持久化
  watch(
    [startDate, endDate, filterCondition, filterLabel, selectedContainers, timeDimension],
    () => {
      persist()
    },
    { deep: true }
  )

  /**
   * 设置筛选条件
   * @param filters - 部分或完整的筛选条件对象
   */
  function setFilters(filters: Partial<GanttFilterState>) {
    if (filters.startDate !== undefined) startDate.value = filters.startDate
    if (filters.endDate !== undefined) endDate.value = filters.endDate
    if (filters.filterCondition !== undefined) filterCondition.value = filters.filterCondition
    if (filters.filterLabel !== undefined) filterLabel.value = filters.filterLabel
    if (filters.selectedContainers !== undefined) {
      selectedContainers.value = [...filters.selectedContainers]
    }
    if (filters.timeDimension !== undefined) timeDimension.value = filters.timeDimension
  }

  /**
   * 清除所有筛选条件
   */
  function clearFilters() {
    const defaultState = getDefaultState()
    startDate.value = defaultState.startDate
    endDate.value = defaultState.endDate
    filterCondition.value = defaultState.filterCondition
    filterLabel.value = defaultState.filterLabel
    selectedContainers.value = [...defaultState.selectedContainers]
    timeDimension.value = defaultState.timeDimension
  }

  /**
   * 从 URL query 参数初始化
   * @param query - Vue Router 的 query 对象
   */
  function initFromQuery(query: Record<string, any>) {
    if (query.startDate) {
      startDate.value = String(query.startDate)
    }
    if (query.endDate) {
      endDate.value = String(query.endDate)
    }
    if (query.filterCondition) {
      filterCondition.value = String(query.filterCondition)
    }
    if (query.filterLabel) {
      filterLabel.value = String(query.filterLabel)
    }
    if (query.containers) {
      selectedContainers.value = String(query.containers)
        .split(',')
        .filter(Boolean)
    }
  }

  /**
   * 根据 filterCondition 推断 timeDimension
   */
  function inferTimeDimension(): 'arrival' | 'pickup' | 'lastPickup' | 'return' {
    const condition = filterCondition.value.toLowerCase()
    
    if (!condition) return 'arrival'
    if (condition.includes('arrival')) return 'arrival'
    if (condition.includes('pickup') && !condition.includes('last')) return 'pickup'
    if (condition.includes('last_pickup') || condition.includes('lastpickup')) return 'lastPickup'
    if (condition.includes('return')) return 'return'
    
    return 'arrival'
  }

  return {
    // State
    startDate,
    endDate,
    filterCondition,
    filterLabel,
    selectedContainers,
    timeDimension,
    // Actions
    setFilters,
    clearFilters,
    initFromQuery,
    inferTimeDimension
  }
})
