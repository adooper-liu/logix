/**
 * 虚拟滚动组合式函数
 * 用于优化大列表渲染性能
 */
import { computed, ref, watch, onMounted, onBeforeUnmount, type Ref } from 'vue'

export interface VirtualScrollOptions {
  itemHeight: number // 单项高度（固定高度）
  containerHeight?: number // 容器高度，默认自动获取
  overscan?: number // 预渲染项数，默认5
}

export interface VirtualScrollResult<T = any> {
  visibleData: T[] // 可见数据
  offsetY: number // Y轴偏移量
  containerHeight: number // 容器高度
  scrollTop: number // 滚动位置
  totalHeight: number // 总高度
  startIndex: number // 起始索引
  endIndex: number // 结束索引
  visibleCount: number // 可见项数
  containerRef: Ref<HTMLElement | undefined> // 容器引用
  scrollToIndex: (index: number) => void // 滚动到指定索引
  refresh: () => void // 刷新滚动
}

export function useVirtualScroll<T = any>(
  data: Ref<T[]>,
  options: VirtualScrollOptions
): VirtualScrollResult<T> {
  const { itemHeight, containerHeight: fixedContainerHeight, overscan = 5 } = options

  const containerRef = ref<HTMLElement>()
  const containerHeight = ref(fixedContainerHeight || 600)
  const scrollTop = ref(0)

  // 计算总高度
  const totalHeight = computed(() => data.value.length * itemHeight)

  // 计算可见项数
  const visibleCount = computed(() => Math.ceil(containerHeight.value / itemHeight))

  // 计算起始索引（考虑预渲染）
  const startIndex = computed(() => {
    const index = Math.floor(scrollTop.value / itemHeight)
    return Math.max(0, index - overscan)
  })

  // 计算结束索引（考虑缓冲区）
  const endIndex = computed(() => {
    const index = startIndex.value + visibleCount.value + overscan * 2
    return Math.min(data.value.length - 1, index)
  })

  // 计算可见数据
  const visibleData = computed(() => {
    return data.value.slice(startIndex.value, endIndex.value + 1)
  })

  // 计算Y轴偏移量
  const offsetY = computed(() => startIndex.value * itemHeight)

  // 更新容器高度
  const updateContainerHeight = () => {
    if (containerRef.value && !fixedContainerHeight) {
      containerHeight.value = containerRef.value.clientHeight
    }
  }

  // 处理滚动事件
  const handleScroll = () => {
    if (containerRef.value) {
      scrollTop.value = containerRef.value.scrollTop
    }
  }

  // 滚动到指定索引
  const scrollToIndex = (index: number) => {
    if (!containerRef.value) return

    const safeIndex = Math.max(0, Math.min(index, data.value.length - 1))
    const targetScrollTop = safeIndex * itemHeight

    containerRef.value.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth',
    })
  }

  // 刷新滚动
  const refresh = () => {
    updateContainerHeight()
    handleScroll()
  }

  // 监听数据变化
  watch(
    data,
    () => {
      refresh()
    },
    { deep: true }
  )

  // 监听滚动事件
  onMounted(() => {
    updateContainerHeight()
    if (containerRef.value) {
      containerRef.value.addEventListener('scroll', handleScroll)
    }
  })

  onBeforeUnmount(() => {
    if (containerRef.value) {
      containerRef.value.removeEventListener('scroll', handleScroll)
    }
  })

  return {
    visibleData: visibleData.value,
    offsetY: offsetY.value,
    containerHeight: containerHeight.value,
    scrollTop: scrollTop.value,
    totalHeight: totalHeight.value,
    startIndex: startIndex.value,
    endIndex: endIndex.value,
    visibleCount: visibleCount.value,
    containerRef,
    scrollToIndex,
    refresh,
  }
}

/**
 * 动态高度虚拟滚动组合式函数
 * 用于高度不固定的列表
 */
export interface DynamicVirtualScrollOptions {
  estimatedItemHeight: number // 预估单项高度
  containerHeight?: number // 容器高度
  overscan?: number // 预渲染项数
}

export interface PositionMap {
  [key: number]: {
    top: number
    bottom: number
    height: number
  }
}

export function useDynamicVirtualScroll<T = any>(
  data: Ref<T[]>,
  options: DynamicVirtualScrollOptions
) {
  const { estimatedItemHeight, containerHeight: fixedContainerHeight, overscan = 5 } = options

  const containerRef = ref<HTMLElement>()
  const containerHeight = ref(fixedContainerHeight || 600)
  const scrollTop = ref(0)

  // 位置映射表
  const positionMap = ref<PositionMap>({})

  // 计算每个项的位置
  const calculatePositions = () => {
    let currentTop = 0
    const positions: PositionMap = {}

    data.value.forEach((_, index) => {
      const height = positionMap.value[index]?.height || estimatedItemHeight
      positions[index] = {
        top: currentTop,
        bottom: currentTop + height,
        height,
      }
      currentTop += height
    })

    positionMap.value = positions
  }

  // 计算总高度
  const totalHeight = computed(() => {
    const lastItem = positionMap.value[data.value.length - 1]
    return lastItem ? lastItem.bottom : 0
  })

  // 更新项的高度（用于动态更新）
  const updateItemHeight = (index: number, height: number) => {
    if (positionMap.value[index]) {
      positionMap.value[index].height = height
      calculatePositions()
    }
  }

  // 计算起始索引
  const startIndex = computed(() => {
    let low = 0
    let high = data.value.length - 1

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      const position = positionMap.value[mid]

      if (!position) return 0

      if (position.bottom <= scrollTop.value) {
        low = mid + 1
      } else if (position.top > scrollTop.value) {
        high = mid - 1
      } else {
        return Math.max(0, mid - overscan)
      }
    }

    return 0
  })

  // 计算结束索引
  const endIndex = computed(() => {
    const viewportBottom = scrollTop.value + containerHeight.value
    let index = startIndex.value

    while (index < data.value.length && positionMap.value[index]?.top < viewportBottom) {
      index++
    }

    return Math.min(data.value.length - 1, index + overscan)
  })

  // 计算可见数据
  const visibleData = computed(() => {
    return data.value.slice(startIndex.value, endIndex.value + 1)
  })

  // 计算Y轴偏移量
  const offsetY = computed(() => {
    const startPosition = positionMap.value[startIndex.value]
    return startPosition?.top || 0
  })

  // 处理滚动事件
  const handleScroll = () => {
    if (containerRef.value) {
      scrollTop.value = containerRef.value.scrollTop
    }
  }

  // 滚动到指定索引
  const scrollToIndex = (index: number) => {
    if (!containerRef.value) return

    const safeIndex = Math.max(0, Math.min(index, data.value.length - 1))
    const position = positionMap.value[safeIndex]

    if (position) {
      containerRef.value.scrollTo({
        top: position.top,
        behavior: 'smooth',
      })
    }
  }

  // 监听数据变化
  watch(data, () => {
    calculatePositions()
  })

  // 初始化
  onMounted(() => {
    calculatePositions()
    if (containerRef.value) {
      if (!fixedContainerHeight) {
        containerHeight.value = containerRef.value.clientHeight
      }
      containerRef.value.addEventListener('scroll', handleScroll)
    }
  })

  onBeforeUnmount(() => {
    if (containerRef.value) {
      containerRef.value.removeEventListener('scroll', handleScroll)
    }
  })

  return {
    visibleData,
    offsetY,
    containerHeight: containerHeight as Ref<number>,
    scrollTop,
    totalHeight,
    startIndex,
    endIndex,
    positionMap,
    containerRef,
    scrollToIndex,
    updateItemHeight,
    refresh: calculatePositions,
  }
}

/**
 * 虚拟滚动组件Props
 */
export interface VirtualScrollProps {
  data: any[]
  itemHeight: number
  containerHeight?: number
  overscan?: number
}
