import dayjs from 'dayjs'

export type OptimalStrategy = 'Direct' | 'Drop off' | 'Expedited'

export type MinimalContainerForOptimization = {
  warehouseOperations?: Array<{ plannedUnloadDate?: string | Date | null }>
}

export function buildOptimalSolutionUpdateData(
  container: MinimalContainerForOptimization,
  suggestedPickupDate: string,
  suggestedStrategy: OptimalStrategy
): { updateData: Record<string, string>; effectiveUnloadMode: 'Drop off' | 'Live load' } {
  const updateData: Record<string, string> = {
    plannedPickupDate: suggestedPickupDate,
  }

  if (suggestedStrategy === 'Direct' || suggestedStrategy === 'Expedited') {
    updateData.plannedDeliveryDate = suggestedPickupDate
    updateData.plannedUnloadDate = suggestedPickupDate
    return { updateData, effectiveUnloadMode: 'Live load' }
  }

  const currentUnloadDate = container.warehouseOperations?.[0]?.plannedUnloadDate
    ? dayjs(container.warehouseOperations[0].plannedUnloadDate).format('YYYY-MM-DD')
    : null

  if (!currentUnloadDate || dayjs(suggestedPickupDate).isAfter(dayjs(currentUnloadDate), 'day')) {
    updateData.plannedDeliveryDate = suggestedPickupDate
    updateData.plannedUnloadDate = suggestedPickupDate
  }

  return { updateData, effectiveUnloadMode: 'Drop off' }
}
