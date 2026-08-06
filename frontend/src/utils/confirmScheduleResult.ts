/**
 * Confirm-schedule response summarizer.
 *
 * Backend may return success:true with per-container failures (e.g. capacity).
 * Callers must surface those failures and keep failed rows actionable.
 */

export type ConfirmScheduleItemResult = {
  containerNumber: string
  success: boolean
  message?: string
}

export type ConfirmScheduleApiResult = {
  success: boolean
  savedCount: number
  total?: number
  results?: ConfirmScheduleItemResult[]
  message?: string
}

export type ConfirmScheduleUiOutcome = {
  kind: 'all_failed' | 'all_succeeded' | 'partial'
  savedCount: number
  failedCount: number
  total: number
  succeededNumbers: string[]
  failedItems: ConfirmScheduleItemResult[]
  toastType: 'success' | 'warning' | 'error'
  toastMessage: string
  logMessage: string
  logLevel: 'success' | 'warning' | 'error'
  /** Exit preview only when every requested container was saved */
  clearPreview: boolean
}

function failureSummary(failedItems: ConfirmScheduleItemResult[], maxItems = 3): string {
  if (failedItems.length === 0) return ''
  const parts = failedItems.slice(0, maxItems).map(item => {
    const reason = item.message?.trim()
    return reason ? `${item.containerNumber}（${reason}）` : item.containerNumber
  })
  const more = failedItems.length > maxItems ? ` 等 ${failedItems.length} 个` : ''
  return `${parts.join('、')}${more}`
}

/**
 * Derive UI-facing outcome from confirm API payload.
 * Prefers per-item `results` over top-level savedCount when both are present.
 */
export function summarizeConfirmScheduleResult(
  apiResult: ConfirmScheduleApiResult,
  requestedContainerNumbers: string[]
): ConfirmScheduleUiOutcome {
  const requested = Array.from(new Set(requestedContainerNumbers.filter(Boolean)))
  const itemResults = Array.isArray(apiResult.results) ? apiResult.results : []

  let succeededNumbers: string[]
  let failedItems: ConfirmScheduleItemResult[]

  if (itemResults.length > 0) {
    succeededNumbers = itemResults
      .filter(r => r.success && r.containerNumber)
      .map(r => r.containerNumber)
    failedItems = itemResults.filter(r => !r.success && r.containerNumber)

    // Containers requested but missing from results are treated as failed
    const reported = new Set(itemResults.map(r => r.containerNumber))
    for (const containerNumber of requested) {
      if (!reported.has(containerNumber)) {
        failedItems.push({
          containerNumber,
          success: false,
          message: '未返回保存结果',
        })
      }
    }
  } else if (apiResult.success && apiResult.savedCount > 0) {
    // Legacy / incomplete payload: trust savedCount only when no item results
    succeededNumbers = requested.slice(0, apiResult.savedCount)
    failedItems = requested.slice(apiResult.savedCount).map(containerNumber => ({
      containerNumber,
      success: false,
      message: '未返回保存结果',
    }))
  } else {
    succeededNumbers = []
    failedItems = requested.map(containerNumber => ({
      containerNumber,
      success: false,
      message: apiResult.message || '保存失败',
    }))
  }

  const savedCount = succeededNumbers.length
  const failedCount = failedItems.length
  const total = Math.max(requested.length, savedCount + failedCount, apiResult.total ?? 0)

  if (savedCount === 0) {
    const detail = failureSummary(failedItems)
    return {
      kind: 'all_failed',
      savedCount: 0,
      failedCount,
      total,
      succeededNumbers,
      failedItems,
      toastType: 'error',
      toastMessage: detail ? `保存失败：${detail}` : '保存失败',
      logMessage: detail ? `确认保存失败：${detail}` : '确认保存失败',
      logLevel: 'error',
      clearPreview: false,
    }
  }

  if (failedCount === 0) {
    return {
      kind: 'all_succeeded',
      savedCount,
      failedCount: 0,
      total,
      succeededNumbers,
      failedItems: [],
      toastType: 'success',
      toastMessage: `成功保存 ${savedCount} 个货柜`,
      logMessage: `确认保存完成：成功 ${savedCount} 个`,
      logLevel: 'success',
      clearPreview: true,
    }
  }

  const detail = failureSummary(failedItems)
  return {
    kind: 'partial',
    savedCount,
    failedCount,
    total,
    succeededNumbers,
    failedItems,
    toastType: 'warning',
    toastMessage: `部分保存成功：成功 ${savedCount}，失败 ${failedCount}。失败：${detail}`,
    logMessage: `确认保存部分成功：成功 ${savedCount}，失败 ${failedCount}。失败：${detail}`,
    logLevel: 'warning',
    clearPreview: false,
  }
}

/**
 * Keep failed preview rows (annotated with API messages) and drop successes.
 */
export function retainFailedPreviewResults<T extends { containerNumber: string; success?: boolean; message?: string }>(
  previewResults: T[],
  outcome: ConfirmScheduleUiOutcome
): T[] {
  const failedByNumber = new Map(
    outcome.failedItems.map(item => [item.containerNumber, item] as const)
  )
  const succeeded = new Set(outcome.succeededNumbers)

  return previewResults
    .filter(row => !succeeded.has(row.containerNumber))
    .map(row => {
      const failure = failedByNumber.get(row.containerNumber)
      if (!failure) return row
      return {
        ...row,
        success: false,
        message: failure.message || row.message || '保存失败',
      }
    })
}
