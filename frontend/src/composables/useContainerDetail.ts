import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { containerService } from '@/services/container'
import { demurrageService, type CalculationDates } from '@/services/demurrage'
import type { Container, ContainerListItem, PortOperation } from '@/types/container'

export function useContainerDetail() {
  const route = useRoute()
  const router = useRouter()
  const { t } = useI18n()
  
  // 货柜列表相关
  const containerList = ref<ContainerListItem[]>([])
  const loadingContainerList = ref(false)
  
  // 路由 param 已解码；若需兼容编码柜号则 decodeURIComponent
  const containerNumber = computed(() => {
    const p = route.params.containerNumber as string
    return p ? decodeURIComponent(p) : ''
  })

  // 数据加载
  const loading = ref(false)
  const containerData = ref<Container | null>(null)
  
  // 滞港费相关
  const calculationDates = ref<CalculationDates | null>(null)
  const demurrageCalculation = ref<any>(null) // 滞港费计算结果

  // 加载货柜列表（按需加载，只在需要导航时调用）
  const loadContainerList = async (retries = 2) => {
    // 仅在需要导航时加载，避免每次都加载1000个货柜
    if (containerList.value.length === 0) {
      loadingContainerList.value = true
      try {
        // 获取所有货柜列表，但使用合理的分页大小
        const response = await containerService.getContainers({ page: 1, pageSize: 200 })
        if (response.success && response.items) {
          containerList.value = response.items.sort((a: ContainerListItem, b: ContainerListItem) => {
            return a.containerNumber.localeCompare(b.containerNumber)
          })
        }
      } catch (error) {
        console.error('Failed to load container list:', error)
        if (retries > 0) {
          console.log(`Retrying to load container list... ${retries} attempts left`)
          await new Promise(resolve => setTimeout(resolve, 1000))
          return loadContainerList(retries - 1)
        }
      } finally {
        loadingContainerList.value = false
      }
    }
  }

  // 加载货柜详情
  const loadContainerDetail = async (retries = 2) => {
    if (!containerNumber.value?.trim()) {
      ElMessage.error(t('container.detail.noContainerNumber'))
      return
    }
    loading.value = true
    try {
      const response = await containerService.getContainerById(containerNumber.value)
      if (response.success) {
        containerData.value = response.data
        // 加载相关数据
        await loadDemurrageDates()
      } else {
        ElMessage.error((response as { message?: string }).message || t('container.detail.failedToLoad'))
      }
    } catch (error: any) {
      console.error('Failed to load container details:', error)
      if (retries > 0) {
        console.log(`Retrying to load container details... ${retries} attempts left`)
        await new Promise(resolve => setTimeout(resolve, 1000))
        return loadContainerDetail(retries - 1)
      }
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        (error?.response?.status === 404 ? t('container.detail.containerNotFound') : t('container.detail.failedToLoad'))
      ElMessage.error(msg)
    } finally {
      loading.value = false
    }
  }

  const loadDemurrageDates = async (retries = 2) => {
    if (!containerNumber.value?.trim()) return
    try {
      const res = await demurrageService.calculateForContainer(containerNumber.value)
      console.log('[ContainerDetail] Demurrage API response:', res)

      // 即使没有完整计算结果，只要有items就保存
      if (res.success && (res.data || res.reason)) {
        calculationDates.value = res.data?.calculationDates || null
        demurrageCalculation.value = res.data || { items: [], totalAmount: 0, currency: 'USD' }
      } else {
        calculationDates.value = null
        demurrageCalculation.value = null
      }
    } catch (error) {
      console.error('[ContainerDetail] Failed to load demurrage dates:', error)
      if (retries > 0) {
        console.log(`Retrying to load demurrage dates... ${retries} attempts left`)
        await new Promise(resolve => setTimeout(resolve, 1000))
        return loadDemurrageDates(retries - 1)
      }
      calculationDates.value = null
      demurrageCalculation.value = null
    }
  }

  // 计算当前货柜在列表中的索引
  const currentContainerIndex = computed(() => {
    return containerList.value.findIndex(item => item.containerNumber === containerNumber.value)
  })

  // 导航到上一个货柜
  const navigateToPrevious = async () => {
    // 确保货柜列表已加载
    await loadContainerList()
    if (currentContainerIndex.value > 0) {
      const previousContainer = containerList.value[currentContainerIndex.value - 1]
      router.push(`/shipments/${previousContainer.containerNumber}`)
    } else {
      ElMessage.info(t('container.detail.alreadyFirst'))
    }
  }

  // 导航到下一个货柜
  const navigateToNext = async () => {
    // 确保货柜列表已加载
    await loadContainerList()
    if (currentContainerIndex.value < containerList.value.length - 1) {
      const nextContainer = containerList.value[currentContainerIndex.value + 1]
      router.push(`/shipments/${nextContainer.containerNumber}`)
    } else {
      ElMessage.info(t('container.detail.alreadyLast'))
    }
  }

  // 物流状态标签：中文文案 + 类型
  const LOGISTICS_STATUS_MAP: Record<
    string,
    { text: string; type: 'success' | 'warning' | 'danger' | 'info' }
  > = {
    not_shipped: { text: '未出运', type: 'info' },
    shipped: { text: '已装船', type: 'success' },
    in_transit: { text: '在途', type: 'success' },
    at_port: { text: '已到目的港', type: 'success' },
    arrived_at_transit_port: { text: '已到中转港', type: 'success' },
    picked_up: { text: '已提柜', type: 'warning' },
    unloaded: { text: '已卸柜', type: 'warning' },
    returned_empty: { text: '已还箱', type: 'success' },
    cancelled: { text: '已取消', type: 'danger' },
    hold: { text: '扣留', type: 'danger' },
    completed: { text: '已完成', type: 'success' },
  }
  const logisticsStatusDisplay = computed(() => {
    const s = containerData.value?.logisticsStatus
    return LOGISTICS_STATUS_MAP[s] || { text: s || '—', type: 'info' as const }
  })

  // 计算属性：目的港操作信息
  const destinationPortOperation = computed(() => {
    if (!containerData.value?.portOperations) return null
    return containerData.value.portOperations.find((po: PortOperation) => po.portType === 'destination')
  })

  // 监听路由参数变化，当货柜号变化时重新加载数据
  watch(
    () => containerNumber.value,
    () => {
      loadContainerDetail()
    }
  )

  return {
    containerNumber,
    containerData,
    loading,
    calculationDates,
    demurrageCalculation,
    containerList,
    loadingContainerList,
    currentContainerIndex,
    logisticsStatusDisplay,
    destinationPortOperation,
    loadContainerDetail,
    navigateToPrevious,
    navigateToNext
  }
}
