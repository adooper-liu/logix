import type { ContainerListItem, Container } from '@/types/container'
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

  // 统一按 UTC 日期展示，避免本地时区导致 +1/-1 天
  const formatUtcDate = (input: string | Date | null | undefined): string => {
    if (!input) return '-'
    const d = new Date(input)
    if (isNaN(d.getTime())) return '-'
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${y}/${m}/${day}`
  }

  // 格式化日期（UTC）
  const formatDate = (date: string | Date | null | undefined): string => {
    return formatUtcDate(date)
  }

  const formatShipmentDate = (date: string | Date | null | undefined): string => {
    return formatUtcDate(date)
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

  /**
   * 导出单个货柜详情
   * @param container 货柜详情数据
   */
  const handleExportContainerDetail = (container: Container) => {
    if (!container) {
      ElMessage.warning('货柜数据不存在')
      return
    }

    // 准备导出数据
    const rows = [
      ['字段', '值'],
      ['集装箱号', container.containerNumber],
      ['备货单号', container.orderNumber],
      ['柜型', container.containerTypeCode],
      ['物流状态', getLogisticsStatusText(container)],
      ['查验', container.inspectionRequired ? '是' : '否'],
      ['开箱', container.isUnboxing ? '是' : '否'],
      ['货物描述', container.cargoDescription || '-'],
      ['毛重', container.grossWeight ? `${container.grossWeight} KG` : '-'],
      ['净重', container.netWeight ? `${container.netWeight} KG` : '-'],
      ['体积', container.cbm ? `${container.cbm} CBM` : '-'],
      ['箱数', container.packages ? container.packages : '-'],
      ['封条号', container.sealNumber || '-'],
      ['创建时间', formatDate(container.createdAt)],
      ['最后更新', formatDate(container.updatedAt)],
      ['\n', '\n'],
      ['海运信息', ''],
      ['提单号', container.seaFreight?.billOfLadingNumber || '-'],
      ['MBL Number', container.seaFreight?.mblNumber || '-'],
      ['船名', container.seaFreight?.vesselName || '-'],
      ['航次', container.seaFreight?.voyageNumber || '-'],
      ['装货港', container.seaFreight?.portOfLoading || '-'],
      ['卸货港', container.seaFreight?.portOfDischarge || '-'],
      ['出运日期', formatDate(container.seaFreight?.shipmentDate || container.actualShipDate)],
      ['预计到港', formatDate(container.etaDestPort || container.seaFreight?.eta)],
      ['实际到港', formatDate(container.ataDestPort)],
      ['\n', '\n'],
      ['港口操作', ''],
      [
        '清关状态',
        container.customsStatus
          ? (customsStatusMap[container.customsStatus]?.text ?? container.customsStatus)
          : '-',
      ],
      [
        '最晚提柜日',
        formatDate(
          container.portOperations?.find(po => po.portType === 'destination')?.lastFreeDate
        ),
      ],
      ['\n', '\n'],
      ['拖卡运输', ''],
      ['计划提柜日', formatDate(container.truckingTransports?.[0]?.plannedPickupDate)],
      ['实际提柜日', formatDate(container.truckingTransports?.[0]?.pickupDate)],
      ['计划送达日', formatDate(container.truckingTransports?.[0]?.plannedDeliveryDate)],
      ['实际送达日', formatDate(container.truckingTransports?.[0]?.deliveryDate)],
      ['\n', '\n'],
      ['仓库操作', ''],
      ['计划卸柜日', formatDate(container.warehouseOperations?.[0]?.plannedUnloadDate)],
      ['实际卸柜日', formatDate(container.warehouseOperations?.[0]?.unloadDate)],
      ['\n', '\n'],
      ['还空箱', ''],
      ['计划还箱日', formatDate(container.emptyReturns?.[0]?.plannedReturnDate)],
      ['实际还箱日', formatDate(container.emptyReturns?.[0]?.returnTime)],
    ]

    // 转换为 CSV
    const csv =
      '\uFEFF' +
      rows
        .map(row =>
          row
            .map(cell => {
              const s = cell == null ? '' : String(cell)
              return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
            })
            .join(',')
        )
        .join('\n')

    // 下载文件
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `货柜详情-${container.containerNumber}-${dayjs().format('YYYY-MM-DD-HHmm')}.csv`
    a.click()
    URL.revokeObjectURL(url)

    ElMessage.success('已导出货柜详情')
  }

  return {
    exportToCsv,
    handleExportCurrentPage,
    handleExportAll,
    handleBatchExport,
    handleExportContainerDetail,
    formatDate,
    formatShipmentDate,
    customsStatusMap,
  }
}
