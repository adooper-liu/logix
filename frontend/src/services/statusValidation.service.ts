/**
 * 状态验证服务
 * 负责验证货柜状态的一致性和合理性
 */

import { SimplifiedStatus } from '@/utils/logisticsStatusMachine'
import { parseLocalDate, daysBetween } from '@/utils/dateTimeUtils'

/**
 * 状态验证结果接口
 */
export interface StatusValidationResult {
  isValid: boolean
  anomalies: string[]
  suggestions: string[]
  severity: 'low' | 'medium' | 'high'
}

/**
 * 验证货柜状态
 * @param container 货柜数据
 * @returns 验证结果
 */
export const validateContainerStatus = (container: any): StatusValidationResult => {
  const anomalies: string[] = []
  const suggestions: string[] = []
  let severity: 'low' | 'medium' | 'high' = 'low'

  // 1. 时间顺序验证
  validateTimeSequence(container, anomalies, suggestions)

  // 2. 状态一致性验证
  validateStatusConsistency(container, anomalies, suggestions)

  // 3. 数据完整性验证
  validateDataIntegrity(container, anomalies, suggestions)

  // 4. 计算严重程度
  severity = calculateSeverity(anomalies)

  return {
    isValid: anomalies.length === 0,
    anomalies,
    suggestions,
    severity,
  }
}

/**
 * 验证时间顺序
 */
const validateTimeSequence = (container: any, anomalies: string[], suggestions: string[]) => {
  const dates: Record<string, Date | null> = {
    eta: container.etaDestPort ? parseLocalDate(container.etaDestPort) : null,
    ata: container.ataDestPort ? parseLocalDate(container.ataDestPort) : null,
    pickup: container.pickupDate ? parseLocalDate(container.pickupDate) : null,
    delivery: container.deliveryDate ? parseLocalDate(container.deliveryDate) : null,
    unload: container.unloadDate ? parseLocalDate(container.unloadDate) : null,
    return: container.emptyReturn?.returnTime
      ? parseLocalDate(container.emptyReturn.returnTime)
      : null,
  }

  // 验证到港时间与提柜时间
  if (dates.ata && dates.pickup && dates.pickup < dates.ata) {
    anomalies.push('提柜时间早于到港时间')
    suggestions.push('请检查提柜时间是否正确')
  }

  // 验证提柜时间与送达时间
  if (dates.pickup && dates.delivery && dates.delivery < dates.pickup) {
    anomalies.push('送达时间早于提柜时间')
    suggestions.push('请检查送达时间是否正确')
  }

  // 验证送达时间与卸柜时间
  if (dates.delivery && dates.unload && dates.unload < dates.delivery) {
    anomalies.push('卸柜时间早于送达时间')
    suggestions.push('请检查卸柜时间是否正确')
  }

  // 验证卸柜时间与还箱时间
  if (dates.unload && dates.return && dates.return < dates.unload) {
    anomalies.push('还箱时间早于卸柜时间')
    suggestions.push('请检查还箱时间是否正确')
  }

  // 验证ETA与ATA
  if (dates.eta && dates.ata && dates.ata < dates.eta) {
    anomalies.push('实际到港时间早于预计到港时间')
    suggestions.push('请确认到港时间是否正确')
  }
}

/**
 * 验证状态一致性
 */
const validateStatusConsistency = (container: any, anomalies: string[], suggestions: string[]) => {
  const status = container.logisticsStatus

  switch (status) {
    case SimplifiedStatus.AT_PORT:
      if (!container.ataDestPort) {
        anomalies.push('状态为已到目的港，但缺少实际到港时间')
        suggestions.push('请补充实际到港时间')
      }
      break

    case SimplifiedStatus.PICKED_UP:
      if (!container.pickupDate) {
        anomalies.push('状态为已提柜，但缺少提柜时间')
        suggestions.push('请补充提柜时间')
      }
      break

    case SimplifiedStatus.UNLOADED:
      if (!container.unloadDate) {
        anomalies.push('状态为已卸柜，但缺少卸柜时间')
        suggestions.push('请补充卸柜时间')
      }
      break

    case SimplifiedStatus.RETURNED_EMPTY:
      if (!container.emptyReturn?.returnTime) {
        anomalies.push('状态为已还箱，但缺少还箱时间')
        suggestions.push('请补充还箱时间')
      }
      break
  }

  // 验证状态与时间的一致性
  const now = new Date()
  const ata = container.ataDestPort ? parseLocalDate(container.ataDestPort) : null
  const pickup = container.pickupDate ? parseLocalDate(container.pickupDate) : null
  const returnTime = container.emptyReturn?.returnTime
    ? parseLocalDate(container.emptyReturn.returnTime)
    : null

  if (status === SimplifiedStatus.AT_PORT && pickup) {
    anomalies.push('状态为已到目的港，但有提柜时间')
    suggestions.push('请更新状态为已提柜')
  }

  if (status === SimplifiedStatus.PICKED_UP && returnTime) {
    anomalies.push('状态为已提柜，但有还箱时间')
    suggestions.push('请更新状态为已还箱')
  }
}

/**
 * 验证数据完整性
 */
const validateDataIntegrity = (container: any, anomalies: string[], suggestions: string[]) => {
  // 检查必要字段
  const requiredFields = [
    { field: 'containerNumber', label: '柜号' },
    { field: 'destinationPort', label: '目的港' },
  ]

  requiredFields.forEach(({ field, label }) => {
    if (!container[field]) {
      anomalies.push(`${label}不能为空`)
      suggestions.push(`请补充${label}信息`)
    }
  })

  // 检查日期格式
  const dateFields = ['etaDestPort', 'ataDestPort', 'pickupDate', 'deliveryDate', 'unloadDate']

  dateFields.forEach(field => {
    if (container[field]) {
      try {
        const date = parseLocalDate(container[field])
        if (isNaN(date.getTime())) {
          anomalies.push(`${field}日期格式不正确`)
          suggestions.push(`请检查${field}的日期格式`)
        }
      } catch (error) {
        anomalies.push(`${field}日期格式不正确`)
        suggestions.push(`请检查${field}的日期格式`)
      }
    }
  })
}

/**
 * 计算严重程度
 */
const calculateSeverity = (anomalies: string[]): 'low' | 'medium' | 'high' => {
  if (anomalies.length === 0) return 'low'
  if (anomalies.length >= 3) return 'high'
  return 'medium'
}

/**
 * 检测状态异常
 * @param containers 货柜列表
 * @returns 异常货柜列表
 */
export const detectStatusAnomalies = (containers: any[]): any[] => {
  return containers.filter(container => {
    const validation = validateContainerStatus(container)
    return !validation.isValid
  })
}

/**
 * 生成状态修复建议
 * @param container 货柜数据
 * @returns 修复建议
 */
export const generateFixSuggestions = (container: any): string[] => {
  const validation = validateContainerStatus(container)
  return validation.suggestions
}

export default {
  validateContainerStatus,
  detectStatusAnomalies,
  generateFixSuggestions,
}
