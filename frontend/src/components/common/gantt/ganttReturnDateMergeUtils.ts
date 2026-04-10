import type { Container } from '@/types/container'
import { calculatePlannedReturnDateBasic } from '@shared/returnDateCalculator'
import dayjs from 'dayjs'

/** 当本次 PATCH 含 plannedUnloadDate 时写入 plannedReturnDate */
export function mergeReturnDateIntoUpdateData(
  container: Container,
  updateData: Record<string, string>,
  unloadMode: string | undefined
): void {
  if (!updateData.plannedUnloadDate) {
    console.log('[mergeReturnDateIntoUpdateData] 跳过：updateData 中没有 plannedUnloadDate')
    return
  }

  console.log('[mergeReturnDateIntoUpdateData] 开始计算还箱日:', {
    newUnloadDate: updateData.plannedUnloadDate,
    unloadMode,
  })

  const empty = container.emptyReturns?.[0]
  const existingReturn = empty?.plannedReturnDate || null
  const oldUnload = container.warehouseOperations?.[0]?.plannedUnloadDate || null

  console.log('[mergeReturnDateIntoUpdateData] 现有还箱日:', existingReturn)
  console.log('[mergeReturnDateIntoUpdateData] 原有卸柜日:', oldUnload)

  // 使用共享基础函数计算还箱日
  const result = calculatePlannedReturnDateBasic({
    unloadDate: updateData.plannedUnloadDate,
    unloadMode: (unloadMode || 'Live load') as 'Live load' | 'Drop off',
    existingReturnDate: existingReturn,
    oldUnloadDate: oldUnload,
  })

  updateData.plannedReturnDate = result.returnDate.toISOString().split('T')[0]
  console.log(
    '[mergeReturnDateIntoUpdateData]',
    result.explanation,
    '->',
    updateData.plannedReturnDate
  )
}

/**
 * Drop off 下仅改提柜日（送/卸未进 PATCH）时，按提柜「小→大」偏移同步计划还箱日，避免还箱条不随提柜拖动。
 * 下限不低于基础规则计算的还箱日。
 */
export function mergeReturnDateWhenPickupOnlyForward(
  container: Container,
  updateData: Record<string, string>,
  unloadMode: string | undefined
): void {
  if (updateData.plannedUnloadDate) return
  if (!updateData.plannedPickupDate) return

  const trucking = container.truckingTransports?.[0]
  const oldPickup = trucking?.plannedPickupDate || null
  if (!oldPickup) return

  const newPickup = updateData.plannedPickupDate
  const deltaDays = dayjs(newPickup).diff(dayjs(oldPickup), 'day')
  if (deltaDays <= 0) return

  const wh = container.warehouseOperations?.[0]?.plannedUnloadDate
  if (!wh) return

  const empty = container.emptyReturns?.[0]
  const existingReturn = empty?.plannedReturnDate || null
  if (!existingReturn) return

  // 使用共享基础函数计算基准还箱日
  const baseResult = calculatePlannedReturnDateBasic({
    unloadDate: dayjs(wh).format('YYYY-MM-DD'),
    unloadMode: (unloadMode || 'Live load') as 'Live load' | 'Drop off',
    existingReturnDate: existingReturn,
  })

  // 按提柜偏移量同步还箱日
  const shiftedReturn = dayjs(existingReturn).add(deltaDays, 'day').toDate()

  // 取较大值，确保不低于基础规则
  updateData.plannedReturnDate = dayjs(shiftedReturn).isBefore(dayjs(baseResult.returnDate), 'day')
    ? baseResult.returnDate.toISOString().split('T')[0]
    : shiftedReturn.toISOString().split('T')[0]
}
