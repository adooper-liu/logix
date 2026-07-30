export type GanttDateSaveInput = {
  field: string
  value: string
  containerNumber: string
  reason?: string
}

export type GanttDateSaveAction =
  | { kind: 'updateSchedule'; containerNumber: string; plannedPickupDate: string }
  | { kind: 'setManualLastFreeDate'; containerNumber: string; lastFreeDate: string; remark: string }
  | { kind: 'unsupported'; message: string }

/**
 * Map Gantt context-menu date edits to the correct persistence API.
 * ETA/ATA live on port_operations; PUT /containers only merges biz_containers and would silently no-op.
 */
export function resolveGanttDateSaveAction(data: GanttDateSaveInput): GanttDateSaveAction {
  const field = data.field
  const value = data.value
  const containerNumber = data.containerNumber
  const dateOnly = String(value).slice(0, 10)

  if (field === 'etaDestPort' || field === 'ataDestPort') {
    return {
      kind: 'unsupported',
      message: '预计/实际到港日请在货柜详情的港口操作中维护，甘特右键暂不支持直接改写',
    }
  }

  if (field === 'plannedPickupDate') {
    return { kind: 'updateSchedule', containerNumber, plannedPickupDate: dateOnly }
  }

  if (field === 'lastFreeDate') {
    return {
      kind: 'setManualLastFreeDate',
      containerNumber,
      lastFreeDate: dateOnly,
      remark: data.reason || 'gantt-右键调整日期',
    }
  }

  return { kind: 'unsupported', message: `不支持的日期类型: ${field}` }
}
