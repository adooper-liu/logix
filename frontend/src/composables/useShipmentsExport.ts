import type { ContainerListItem } from '@/types/container'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { useLogisticsStatus } from './useLogisticsStatus'

/**
 * 货柜导出相关的组合式函数
 * Shipments export related composable function
 */
export function useShipmentsExport() {
  // 使用物流状态 composable
  const { getLogisticsStatusText } = useLogisticsStatus()

  // 清关状态映射
  const customsStatusMap: Record<
    string,
    { text: string; type: '' | 'success' | 'warning' | 'danger' | 'info' }
  > = {
    NOT_STARTED: { text: '未开始', type: 'info' },
    IN_PROGRESS: { text: '进行中', type: 'warning' },
    COMPLETED: { text: '已完成', type: 'success' },
    FAILED: { text: '失败', type: 'danger' },
  }

  // 格式化日期
  const formatDate = (date: string | Date): string => {
    if (!date) return '-'
    const d = new Date(date)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const formatShipmentDate = (date: string | Date): string => {
    if (!date) return '-'
    const d = new Date(date)
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  /**
   * 导出：将数据转为 CSV 并下载
   * @param rows 数据行
   * @param filename 文件名
   */
  const exportToCsv = (rows: ContainerListItem[], filename: string) => {
    const headers = [
      '集装箱号',
      '出运日期',
      '备货单号',
      '提单号',
      'MBL Number',
      '柜型',
      '物流状态',
      '查验',
      '开箱',
      '目的港',
      '当前位置',
      '预计到港',
      '实际到港',
      '清关状态',
      '计划提柜日',
      '最晚提柜日',
      '最晚还箱日',
      '实际还箱日',
      '货物描述',
      '最后更新',
    ]
    const escape = (v: any) => {
      const s = v == null ? '' : String(v)
      return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const line = (row: ContainerListItem) =>
      [
        row.containerNumber,
        formatShipmentDate(row.actualShipDate || row.createdAt),
        row.orderNumber,
        row.mblNumber || row.billOfLadingNumber, // 优先取 MBL Number，没有则用提单号
        row.mblNumber,
        row.containerTypeCode,
        getLogisticsStatusText(row),
        row.inspectionRequired ? '是' : '否',
        row.isUnboxing ? '是' : '否',
        row.destinationPort,
        row.location,
        row.etaDestPort ? formatDate(row.etaDestPort) : '',
        row.ataDestPort ? formatDate(row.ataDestPort) : '',
        row.customsStatus ? (customsStatusMap[row.customsStatus]?.text ?? row.customsStatus) : '',
        row.plannedPickupDate ? formatDate(row.plannedPickupDate) : '',
        row.lastFreeDate ? formatDate(row.lastFreeDate) : '',
        row.lastReturnDate ? formatDate(row.lastReturnDate) : '',
        row.returnTime ? formatDate(row.returnTime) : '',
        row.cargoDescription ?? '',
        row.lastUpdated ? formatDate(row.lastUpdated) : '',
      ]
        .map(escape)
        .join(',')
    const csv = '\uFEFF' + headers.map(escape).join(',') + '\n' + rows.map(line).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * 导出当前页
   * @param rows 当前页数据
   */
  const handleExportCurrentPage = (rows: ContainerListItem[]) => {
    if (rows.length === 0) {
      ElMessage.warning('当前页无数据可导出')
      return
    }
    exportToCsv(rows, `货柜列表-当前页-${dayjs().format('YYYY-MM-DD-HHmm')}.csv`)
    ElMessage.success('已导出当前页')
  }

  /**
   * 导出全部数据
   * @param rows 全部数据
   * @param filterType 过滤类型
   */
  const handleExportAll = (rows: ContainerListItem[], filterType: string) => {
    if (rows.length === 0) {
      ElMessage.warning('当前条件下无数据可导出')
      return
    }
    exportToCsv(rows, `货柜列表-${filterType}-${dayjs().format('YYYY-MM-DD-HHmm')}.csv`)
    ElMessage.success(`已导出全部 ${rows.length} 条`)
  }

  /**
   * 批量导出
   * @param selectedRows 选中的行
   */
  const handleBatchExport = (selectedRows: ContainerListItem[]) => {
    if (selectedRows.length === 0) {
      ElMessage.warning('请先勾选要导出的行')
      return
    }
    exportToCsv(
      selectedRows,
      `货柜列表-已选${selectedRows.length}条-${dayjs().format('YYYY-MM-DD-HHmm')}.csv`
    )
    ElMessage.success(`已导出 ${selectedRows.length} 条`)
  }

  return {
    exportToCsv,
    handleExportCurrentPage,
    handleExportAll,
    handleBatchExport,
    formatDate,
    formatShipmentDate,
    customsStatusMap
  }
}
