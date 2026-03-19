<template>
  <div class="logistics-path-tab">
    <div v-if="loading" class="path-loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>{{ t('container.logisticsPath.loading') }}</span>
    </div>
    <div v-else-if="error" class="path-error">
      <el-alert type="warning" :title="error" show-icon />
    </div>
    <div v-else-if="path" class="path-content">
      <!-- 视图切换 + 刷新 -->
      <div class="view-mode-row">
        <div class="view-mode-bar">
          <el-radio-group v-model="viewMode" size="small">
            <el-radio-button value="grouped">{{ t('container.logisticsPath.viewModes.grouped') }}</el-radio-button>
            <el-radio-button value="map">{{ t('container.logisticsPath.viewModes.map') }}</el-radio-button>
          </el-radio-group>
        </div>
        <div class="view-mode-actions">
          <router-link
            :to="{
              path: '/docs/help/时间概念说明-历时倒计时超期.md',
              query: { from: router.currentRoute.value.fullPath }
            }"
            class="help-link"
          >
            <el-icon><QuestionFilled /></el-icon>
            <span>{{ t('container.logisticsPath.durationExplanation') }}</span>
          </router-link>
          <el-button type="primary" link size="small" class="refresh-btn" @click="loadPath">
            {{ t('container.logisticsPath.refresh') }}
          </el-button>
        </div>
      </div>

      <!-- 超期预警 -->
      <el-alert
        v-if="path.isOverdue"
        type="error"
        :title="t('container.logisticsPath.overdueAlert.title')"
        :description="overdueAlertText"
        show-icon
        class="overdue-alert"
      />

      <!-- 路径验证（纯文本，无卡片） -->
      <div v-if="validationResult" class="validation-inline-plain">
            <span
              :class="['validation-badge', validationResult.isValid ? 'valid' : 'invalid']"
            >
              {{ validationResult.isValid ? t('container.logisticsPath.validation.passed') : t('container.logisticsPath.validation.failed') }}
            </span>
            <template v-if="validationResult.errors?.length">
              <span class="validation-label">{{ t('container.logisticsPath.validation.errors') }}：</span>
              <span class="validation-text validation-errors">{{ validationResult.errors.join('；') }}</span>
            </template>
            <template v-if="validationResult.warnings?.length">
              <span class="validation-label">{{ t('container.logisticsPath.validation.warnings') }}：</span>
              <span class="validation-text validation-warnings">{{ validationResult.warnings.join('；') }}</span>
            </template>
            <el-tooltip placement="top" :show-after="300">
              <template #content>
                <div class="validation-tooltip">
                  <p><strong>{{ t('container.logisticsPath.validation.checks') }}：</strong></p>
                  <ul>
                    <li><strong>{{ t('container.logisticsPath.validation.passed') }}</strong>：{{ t('container.logisticsPath.validation.passedDescription') }}</li>
                    <li><strong>{{ t('container.logisticsPath.validation.failed') }}</strong>：{{ t('container.logisticsPath.validation.failedDescription') }}</li>
                  </ul>
                  <p>{{ t('container.logisticsPath.validation.purpose') }}</p>
                </div>
              </template>
              <el-icon class="validation-help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
      </div>

      <!-- 阶段分组：一行多列 -->
      <div v-show="viewMode === 'grouped'" class="path-grouped">
        <div v-if="!(path.nodes || []).length" class="path-timeline-empty">{{ t('container.logisticsPath.noNodes') }}</div>
        <div v-else class="stage-grid">
          <div
            v-for="group in nodesByStage"
            :key="group.stage"
            class="stage-col"
          >
            <div class="stage-header">
              <span class="stage-name">{{ group.label }}</span>
              <span class="stage-count">{{ group.nodes.length }} {{ t('container.logisticsPath.nodesCount') }}</span>
            </div>
            <div class="stage-nodes">
              <div
                v-for="item in group.nodes"
                :key="item.node.id"
                class="stage-node"
                :class="{
                  'stage-node-no-data': isNoDataNode(item.node),
                  'stage-node-alert': item.node.isAlert
                }"
                @click="selectedNode = item.node"
              >
                <span class="stage-node-icon">{{ getStatusIcon(item.node.status) }}</span>
                <div class="stage-node-body">
                  <div class="stage-node-desc-row">
                    <span class="stage-node-desc">{{ item.node.description }}</span>
                    <span v-if="item.node.isAlert" class="alert-badge">异常</span>
                  </div>
                  <div class="stage-node-meta">
                    <span class="stage-node-time">{{ isNoDataNode(item.node) ? '—' : formatDateTime(item.node.timestamp) }}</span>
                    <span v-if="item.node.location" class="stage-node-loc">{{ item.node.location.name }} ({{ item.node.location.code }})</span>
                    <!-- 使用 NodeDurationDisplay 组件显示节点时长 -->
                    <NodeDurationDisplay
                      :timestamp="item.node.timestamp"
                      :prev-timestamp="item.globalIndex > 0 ? path.nodes[item.globalIndex - 1]?.timestamp : null"
                      :next-timestamp="item.globalIndex < (path.nodes?.length ?? 0) - 1 ? path.nodes[item.globalIndex + 1]?.timestamp : null"
                      :index="item.globalIndex"
                      :total-count="path.nodes?.length ?? 0"
                      :standard-hours="STANDARD_DURATIONS[item.node.status] ?? 0"
                      :is-in-progress="isCurrentNode(item.node, item.globalIndex)"
                      :is-no-data="isNoDataNode(item.node)"
                    />
                  </div>
                  <el-tag v-if="getNodeDataSource(item.node)" :type="getNodeDataSourceTagType(getNodeDataSource(item.node))" size="small" class="stage-ds-tag">
                    {{ getNodeDataSourceLabel(getNodeDataSource(item.node)) }}
                  </el-tag>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 地图路径视图（Leaflet + OpenStreetMap） -->
      <div v-show="viewMode === 'map'" class="path-map">
        <div ref="mapContainerRef" class="map-container"></div>
        <div v-if="mapPoints.length === 0" class="map-empty">{{ t('container.logisticsPath.noPortCoordinates') }}</div>
      </div>

      <!-- 8. 多柜对比（需传入 billOfLadingNumber） -->
      <div v-if="props.billOfLadingNumber" class="multi-container-section">
        <el-collapse>
          <el-collapse-item :title="t('container.logisticsPath.sameBillOfLading.title')" name="compare">
            <div class="compare-header">
              <div class="compare-hint">
                {{ t('container.logisticsPath.sameBillOfLading.currentContainer', { containerNumber: props.containerNumber, billOfLadingNumber: props.billOfLadingNumber }) }}
              </div>
              <el-button 
                type="primary" 
                size="small" 
                @click="loadContainersWithSameBillOfLading"
                :loading="loadingSameBillOfLading"
              >
                {{ t('container.logisticsPath.sameBillOfLading.loadButton') }}
              </el-button>
            </div>
            
            <div v-if="errorSameBillOfLading" class="compare-error">
              {{ errorSameBillOfLading }}
            </div>
            
            <div v-else-if="containersWithSameBillOfLading.length > 0" class="compare-list">
              <el-table :data="containersWithSameBillOfLading" border style="width: 100%">
                <el-table-column prop="containerNumber" :label="t('container.logisticsPath.sameBillOfLading.columns.containerNumber')" width="120">
                  <template #default="{ row }">
                    <router-link :to="`/shipments/${row.containerNumber}`" class="container-link">
                      {{ row.containerNumber }}
                    </router-link>
                  </template>
                </el-table-column>
                <el-table-column prop="logisticsStatus" :label="t('container.logisticsPath.sameBillOfLading.columns.logisticsStatus')" width="120" />
                <el-table-column prop="actualShipDate" :label="t('container.logisticsPath.sameBillOfLading.columns.actualShipDate')" width="120" />
                <el-table-column prop="etaDestPort" :label="t('container.logisticsPath.sameBillOfLading.columns.etaDestPort')" width="120" />
                <el-table-column prop="ataDestPort" :label="t('container.logisticsPath.sameBillOfLading.columns.ataDestPort')" width="120" />
                <el-table-column prop="location" :label="t('container.logisticsPath.sameBillOfLading.columns.location')" />
              </el-table>
            </div>
            
            <div v-else-if="!loadingSameBillOfLading" class="compare-empty">
              {{ t('container.logisticsPath.sameBillOfLading.emptyState') }}
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>

      <!-- 2. 节点详情面板 -->
      <el-drawer
        v-model="showNodeDetail"
        :title="t('container.logisticsPath.nodeDetail.title')"
        direction="rtl"
        size="360px"
        :with-header="true"
      >
        <div v-if="selectedNode" class="node-detail-content">
          <div class="detail-item">
            <span class="label">{{ t('container.logisticsPath.nodeDetail.status') }}：</span>
            <span class="value">{{ selectedNode.description }}</span>
            <el-tag v-if="isNoDataNode(selectedNode)" type="info" size="small" class="detail-no-data-tag">
              {{ getNoDataNodeLabel(selectedNode) }}
            </el-tag>
          </div>
          <div class="detail-item">
            <span class="label">{{ t('container.logisticsPath.nodeDetail.time') }}：</span>
            <span class="value">{{ isNoDataNode(selectedNode) ? '—' : formatDateTime(selectedNode.timestamp) }}</span>
          </div>
          <div class="detail-item" v-if="selectedNode.location">
            <span class="label">{{ t('container.logisticsPath.nodeDetail.location') }}：</span>
            <span class="value">{{ selectedNode.location.name }} ({{ selectedNode.location.code }})</span>
          </div>
          <div class="detail-item">
            <span class="label">{{ t('container.logisticsPath.nodeDetail.statusCode') }}：</span>
            <span class="value">{{ selectedNode.status }}</span>
          </div>
          <div class="detail-item">
            <span class="label">{{ t('container.logisticsPath.nodeDetail.nodeStatus') }}：</span>
            <span class="value">{{ getNodeStatusLabel(selectedNode.nodeStatus) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">{{ t('container.logisticsPath.nodeDetail.alert') }}：</span>
            <span class="value">{{ selectedNode.isAlert ? t('container.logisticsPath.nodeDetail.yes') : t('container.logisticsPath.nodeDetail.no') }}</span>
          </div>
          <div v-if="getNodeDataSource(selectedNode)" class="detail-item">
            <span class="label">{{ t('container.logisticsPath.nodeDetail.dataSource') }}：</span>
            <el-tag :type="getNodeDataSourceTagType(getNodeDataSource(selectedNode))" size="small">
              {{ getNodeDataSourceLabel(getNodeDataSource(selectedNode)) }}
            </el-tag>
          </div>
          <div v-if="selectedNode.rawData && Object.keys(selectedNode.rawData).length > 0" class="raw-data-section">
            <div class="label">{{ t('container.logisticsPath.nodeDetail.rawData') }}</div>
            <pre class="raw-data">{{ JSON.stringify(selectedNode.rawData, null, 2) }}</pre>
          </div>
        </div>
      </el-drawer>
    </div>
    <el-empty :description="t('container.logisticsPath.noPathData')" class="path-empty" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Loading, QuestionFilled } from '@element-plus/icons-vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { logisticsPathService, type StatusPath, type StatusNode } from '@/services/logisticsPath'
import { containerService } from '@/services/container'
import NodeDurationDisplay from '@/components/common/NodeDurationDisplay.vue'
import type { ContainerListItem } from '@/types/container'

const router = useRouter()
const { t } = useI18n()

const props = defineProps<{
  containerNumber: string
  billOfLadingNumber?: string
}>()

const viewMode = ref<'grouped' | 'map'>('grouped')
const loading = ref(false)
const error = ref('')
const path = ref<StatusPath | null>(null)
const selectedNode = ref<StatusNode | null>(null)
const validationResult = ref<{ isValid: boolean; errors: string[]; warnings: string[] } | null>(null)
const mapContainerRef = ref<HTMLElement | null>(null)
let leafletMap: L.Map | null = null

// 同提单货柜对比相关
const loadingSameBillOfLading = ref(false)
const errorSameBillOfLading = ref('')
const containersWithSameBillOfLading = ref<ContainerListItem[]>([])

const showNodeDetail = computed({
  get: () => !!selectedNode.value,
  set: (v) => { if (!v) selectedNode.value = null }
})

const loadPath = async () => {
  if (!props.containerNumber?.trim()) return
  loading.value = true
  error.value = ''
  path.value = null
  validationResult.value = null
  try {
    const res = await logisticsPathService.getPathByContainer(props.containerNumber)
    if (res.success && res.data) {
      path.value = res.data
      await loadValidation(res.data.id)
    } else {
      error.value = res.message || t('container.logisticsPath.errors.loadFailed')
    }
  } catch (e: unknown) {
    const err = e as { response?: { status?: number }; message?: string }
    let msg = err instanceof Error ? err.message : t('container.logisticsPath.errors.requestFailed')
    if (err.response?.status === 503 || /unhealthy|不可用/i.test(msg)) {
      msg = t('container.logisticsPath.errors.serviceUnavailable')
    }
    error.value = msg
  } finally {
    loading.value = false
  }
}

const loadValidation = async (pathId: string) => {
  try {
    const res = await logisticsPathService.validatePath(pathId)
    if (res.success && res.data) {
      validationResult.value = res.data
    }
  } catch {
    validationResult.value = null
  }
}

// 加载同提单货柜列表
const loadContainersWithSameBillOfLading = async () => {
  if (!props.billOfLadingNumber) return
  
  loadingSameBillOfLading.value = true
  errorSameBillOfLading.value = ''
  
  try {
    const response = await containerService.getContainers({
      page: 1,
      pageSize: 50,
      search: props.billOfLadingNumber
    })
    
    if (response.success && response.items) {
      // 过滤掉当前货柜，只显示其他同提单的货柜
      containersWithSameBillOfLading.value = response.items.filter(
        (container: ContainerListItem) => container.containerNumber !== props.containerNumber
      )
    }
  } catch (error) {
    console.error('Failed to load containers with same bill of lading:', error)
    errorSameBillOfLading.value = t('container.logisticsPath.sameBillOfLading.errors.loadFailed')
  } finally {
    loadingSameBillOfLading.value = false
  }
}

watch(
  () => props.containerNumber,
  (val) => {
    if (val) loadPath()
  },
  { immediate: true }
)

defineExpose({ load: loadPath })

/** 超期预警文案 */
const overdueAlertText = computed(() => {
  if (!path.value?.isOverdue) return ''

  // 判断货柜是否实际到港
  // 有数据来源（FeituoAPI/Feituo/ProcessTable）= 真正到港
  // dataSource=null = 占位节点（未真正到港）
  const hasActualArrivalEvent = path.value.nodes?.some(
    (n) =>
      (n.status === 'ARRIVED' ||
        n.status === 'BERTHED' ||
        n.status === 'DISCHARGED' ||
        n.status === 'AVAILABLE') &&
      getNodeDataSource(n) !== null
  )

  const lfd = path.value.lastFreeDate
  const d = lfd ? new Date(lfd).toLocaleDateString('zh-CN') : ''

  // 如果未实际到港（只有占位节点），提示ETA超期
  if (!hasActualArrivalEvent) {
    const eta = path.value.eta
    const etaStr = eta ? new Date(eta).toLocaleDateString('zh-CN') : ''
    return `ETA已超期未到港${etaStr ? `（${etaStr}）` : ''}，请关注货柜状态。`
  }

  // 如果已实际到港，提示最晚提柜日已过
  return `最晚提柜日${d ? `（${d}）` : ''}已过，货柜尚未还箱，请尽快安排提柜与还箱。`
})

const isNoDataNode = (node: StatusNode): boolean =>
  !!(node.rawData as { noData?: boolean })?.noData

/** 无数据节点的展示文案：显示具体缺数据的节点名（如「进港 缺数据」） */
const getNoDataNodeLabel = (node: StatusNode | null): string => {
  if (!node || !isNoDataNode(node)) return ''
  const label = (node.rawData as { noDataStageLabel?: string })?.noDataStageLabel
  return label ? `${label} 缺数据` : node.description || '无数据'
}

const durationDays = computed(() => {
  if (!path.value?.startedAt || !path.value?.nodes?.length) return null
  const firstNode = path.value.nodes[0]
  const lastCompleted = [...path.value.nodes]
    .reverse()
    .find((n) => n.nodeStatus === 'COMPLETED')
  const endTime = lastCompleted
    ? new Date(lastCompleted.timestamp)
    : new Date()
  const startTime = new Date(firstNode.timestamp)
  const diff = Math.abs(endTime.getTime() - startTime.getTime())
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
})

/** 1. 进度条：运输进度百分比 */
const pathProgress = computed(() => {
  if (!path.value?.nodes?.length) return 0
  const completed = path.value.nodes.filter((n) => n.nodeStatus === 'COMPLETED')
  const inProgress = path.value.nodes.some((n) => n.nodeStatus === 'IN_PROGRESS')
  let p = (completed.length / path.value.nodes.length) * 100
  if (inProgress) p += 5
  return Math.min(p, 100)
})

/** 4. 阶段分组：状态 -> 阶段 */
const STAGE_MAP: Record<string, { stage: string; label: string; order: number }> = {
  NOT_SHIPPED: { stage: 'origin', label: '起运', order: 1 },
  EMPTY_PICKED_UP: { stage: 'origin', label: '起运', order: 1 },
  CONTAINER_STUFFED: { stage: 'origin', label: '起运', order: 1 },
  GATE_IN: { stage: 'origin', label: '起运', order: 1 },
  LOADED: { stage: 'origin', label: '起运', order: 1 },
  DEPARTED: { stage: 'origin', label: '起运', order: 1 },
  RAIL_LOADED: { stage: 'origin', label: '起运', order: 1 },
  RAIL_DEPARTED: { stage: 'origin', label: '起运', order: 1 },
  FEEDER_LOADED: { stage: 'origin', label: '起运', order: 1 },
  FEEDER_DEPARTED: { stage: 'origin', label: '起运', order: 1 },
  SAILING: { stage: 'sea', label: '海运', order: 2 },
  TRANSIT_ARRIVED: { stage: 'transit', label: '中转', order: 3 },
  TRANSIT_BERTHED: { stage: 'transit', label: '中转', order: 3 },
  TRANSIT_DISCHARGED: { stage: 'transit', label: '中转', order: 3 },
  TRANSIT_LOADED: { stage: 'transit', label: '中转', order: 3 },
  TRANSIT_DEPARTED: { stage: 'transit', label: '中转', order: 3 },
  ARRIVED: { stage: 'arrival', label: '到港', order: 4 },
  BERTHED: { stage: 'arrival', label: '到港', order: 4 },
  DISCHARGED: { stage: 'arrival', label: '到港', order: 4 },
  AVAILABLE: { stage: 'arrival', label: '到港', order: 4 },
  GATE_OUT: { stage: 'pickup', label: '提柜', order: 5 },
  IN_TRANSIT_TO_DEST: { stage: 'pickup', label: '提柜', order: 5 },
  DELIVERY_ARRIVED: { stage: 'pickup', label: '提柜', order: 5 },
  STRIPPED: { stage: 'pickup', label: '提柜', order: 5 },
  RETURNED_EMPTY: { stage: 'return', label: '还箱', order: 6 },
  COMPLETED: { stage: 'return', label: '还箱', order: 6 }
}

const nodesByStage = computed(() => {
  if (!path.value?.nodes?.length) return []
  const groups: Record<string, { stage: string; label: string; order: number; nodes: { node: StatusNode; globalIndex: number }[] }> = {}
  path.value!.nodes.forEach((node, globalIndex) => {
    const info = STAGE_MAP[node.status] || { stage: 'other', label: '其他', order: 99 }
    const key = info.stage
    if (!groups[key]) groups[key] = { stage: key, label: info.label, order: info.order, nodes: [] }
    groups[key].nodes.push({ node, globalIndex })
  })
  return Object.values(groups).sort((a, b) => a.order - b.order)
})

/** 路径数据来源汇总（用于头部展示） */
const pathDataSourceSummary = computed(() => {
  if (!path.value?.nodes?.length) return []
  const counts: Record<string, number> = {}
  for (const node of path.value!.nodes) {
    const ds = getNodeDataSource(node)
    if (ds) {
      counts[ds] = (counts[ds] || 0) + 1
    }
  }
  return Object.entries(counts).map(([source, count]) => ({ source, count }))
})

/** 地图：常用港口坐标（dict_ports 部分） */
const PORT_COORDS: Record<string, [number, number]> = {
  CNSHG: [121.47, 31.23], CNSZX: [114.06, 22.54], CNNGB: [121.54, 29.87], CNYTN: [114.27, 22.56],
  CNQNG: [120.38, 36.07], CNTAO: [117.20, 39.08], CNDLC: [121.61, 38.91], CNXMN: [118.09, 24.48],
  CNGZU: [113.26, 23.13], USLAX: [-118.27, 33.74], USLGB: [-118.19, 33.75], USOAK: [-122.27, 37.80],
  USSEA: [-122.33, 47.61], USSAV: [-81.09, 32.08], USNYC: [-74.01, 40.71], USCHI: [-87.63, 41.88],
  SGSIN: [103.85, 1.29], JPTYO: [139.69, 35.69], KRPUS: [129.04, 35.10], HKHKG: [114.17, 22.32],
  NLRTM: [4.48, 51.92], DEHAM: [9.93, 53.55], GBSOU: [-1.40, 50.90], BEANR: [4.42, 51.22]
}

const mapPoints = computed(() => {
  if (!path.value?.nodes?.length) return []
  const pts: { name: string; value: [number, number]; node: StatusNode }[] = []
  const seen = new Set<string>()
  for (const node of path.value!.nodes) {
    const raw = (node.location?.code || node.location?.name || node.rawData?.location || node.rawData?.portCode || '').toString().trim()
    if (!raw) continue
    const code = raw.toUpperCase().replace(/\s/g, '')
    const match = PORT_COORDS[code] ?? Object.entries(PORT_COORDS).find(([k]) => code.includes(k) || k.includes(code) || code.endsWith(k) || k.endsWith(code))?.[1]
    if (match && !seen.has(code)) {
      pts.push({ name: node.location?.name || raw, value: [...match], node })
      seen.add(code)
    }
  }
  return pts
})

/** 创建路径点标记（纯 CSS，避免默认图标加载失败出现灰色块） */
const createRouteMarkerIcon = (index: number) =>
  L.divIcon({
    className: 'route-point-marker',
    html: `<div class="route-point-dot">${index + 1}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  })

const initLeafletMap = () => {
  if (!mapContainerRef.value || !path.value || viewMode.value !== 'map') return
  const pts = mapPoints.value
  if (pts.length === 0) return

  if (leafletMap) {
    leafletMap.remove()
    leafletMap = null
  }

  const latlngs: L.LatLngExpression[] = pts.map(p => [p.value[1], p.value[0]] as L.LatLngExpression)
  const center = latlngs.length === 1 ? latlngs[0] : latlngs[Math.floor(latlngs.length / 2)]
  const bounds = L.latLngBounds(latlngs)

  leafletMap = L.map(mapContainerRef.value, { attributionControl: true }).setView(center as [number, number], 3)

  // 底图：CartoDB Voyager（基于 OSM，兼容性更好）备选：OpenStreetMap
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(leafletMap)

  L.polyline(latlngs, { color: '#5470c6', weight: 3, opacity: 0.8 }).addTo(leafletMap)

  const lastIdx = pts.length - 1
  pts.forEach((p, i) => {
    const isCurrent = i === lastIdx
    if (isCurrent) {
      const currentIcon = L.divIcon({
        className: 'current-position-marker',
        html: `<div class="current-position-pin"><span class="current-label">当前位置</span></div>`,
        iconSize: [60, 50],
        iconAnchor: [30, 48]
      })
      const marker = L.marker([p.value[1], p.value[0]], { icon: currentIcon })
      marker.bindTooltip(`当前位置：${p.name}`, { permanent: false, direction: 'top' })
      marker.addTo(leafletMap!)
    } else {
      const marker = L.marker([p.value[1], p.value[0]], { icon: createRouteMarkerIcon(i) })
      marker.bindTooltip(`${i + 1}. ${p.name}`, { permanent: false, direction: 'top' })
      marker.addTo(leafletMap!)
    }
  })

  if (latlngs.length > 1) {
    leafletMap.fitBounds(bounds.pad(0.2))
  }
  // 确保地图在 v-show 显示后正确计算尺寸并加载瓦片
  setTimeout(() => leafletMap?.invalidateSize(), 50)
}

const destroyLeafletMap = () => {
  if (leafletMap) {
    leafletMap.remove()
    leafletMap = null
  }
}

watch([() => path.value, viewMode], () => {
  nextTick(() => {
    if (viewMode.value === 'map') {
      // 延迟初始化，确保 v-show 显示后容器已有尺寸，底图能正确加载
      setTimeout(initLeafletMap, 150)
    } else {
      destroyLeafletMap()
    }
  })
})

onBeforeUnmount(destroyLeafletMap)

/** 节点标准耗时配置（小时）- 用于计算超期时间
 * TODO: 后续可从后端配置或字典表读取
 */
const STANDARD_DURATIONS: Record<string, number> = {
  // 起运阶段（标准：24小时内完成）
  EMPTY_PICKED_UP: 24,
  CONTAINER_STUFFED: 24,
  GATE_IN: 24,
  LOADED: 24,
  DEPARTED: 12,

  // 铁路运输（标准：6-12小时）
  RAIL_LOADED: 6,
  RAIL_DEPARTED: 12,
  RAIL_ARRIVED: 6,
  RAIL_DISCHARGED: 6,

  // 驳船运输（标准：6-12小时）
  FEEDER_LOADED: 6,
  FEEDER_DEPARTED: 12,
  FEEDER_ARRIVED: 6,
  FEEDER_DISCHARGED: 6,

  // 海运（标准：2小时内完成操作）
  SAILING: 0, // 航行不计超期
  TRANSIT_ARRIVED: 4,
  TRANSIT_BERTHED: 6,
  TRANSIT_DISCHARGED: 6,
  TRANSIT_LOADED: 6,
  TRANSIT_DEPARTED: 12,

  // 到港阶段（标准：24小时内完成卸船）
  ARRIVED: 4,
  BERTHED: 6,
  DISCHARGED: 12,
  AVAILABLE: 24,

  // 提柜阶段（标准：48小时内完成）
  GATE_OUT: 12,
  IN_TRANSIT_TO_DEST: 24,
  DELIVERY_ARRIVED: 12,
  STRIPPED: 24,

  // 还箱阶段（标准：24小时内完成）
  RETURNED_EMPTY: 24,
  COMPLETED: 0
}

/** 判断是否为当前正在进行的节点 */
const isCurrentNode = (node: StatusNode, index: number): boolean => {
  // 节点状态为进行中 或 是最后一个节点
  return node.nodeStatus === 'IN_PROGRESS' || index === path.value.nodes.length - 1
}


const getPathStatusLabel = (status?: string): string => {
  const LABELS: Record<string, string> = {
    ON_TIME: '准点',
    DELAYED: '延误',
    HOLD: '扣留',
    COMPLETED: '已完成'
  }
  return LABELS[status || ''] || status || '未知'
}

const getNodeStatusLabel = (status?: string): string => {
  const LABELS: Record<string, string> = {
    COMPLETED: '已完成',
    IN_PROGRESS: '进行中',
    PENDING: '未开始'
  }
  return LABELS[status || ''] || status || '未知'
}

const formatDateTime = (date: string | Date): string => {
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const STATUS_ICONS: Record<string, string> = {
  NOT_SHIPPED: '📦',
  EMPTY_PICKED_UP: '🚚',
  CONTAINER_STUFFED: '📦',
  GATE_IN: '🚪',
  LOADED: '⛴️',
  DEPARTED: '🛳️',
  SAILING: '🌊',
  TRANSIT_ARRIVED: '📍',
  TRANSIT_BERTHED: '⚓',
  TRANSIT_DISCHARGED: '📤',
  TRANSIT_LOADED: '📥',
  TRANSIT_DEPARTED: '🚀',
  ARRIVED: '🏁',
  BERTHED: '⚓',
  DISCHARGED: '📤',
  AVAILABLE: '✅',
  IN_TRANSIT_TO_DEST: '🚛',
  GATE_OUT: '🚛',
  DELIVERY_ARRIVED: '🏠',
  STRIPPED: '📋',
  RETURNED_EMPTY: '↩️',
  COMPLETED: '✨',
  CUSTOMS_HOLD: '⚠️',
  CARRIER_HOLD: '🔒',
  TERMINAL_HOLD: '🚧',
  CHARGES_HOLD: '💰',
  DUMPED: '🗑️',
  DELAYED: '⏰',
  DETENTION: '📅',
  OVERDUE: '🚨',
  CONGESTION: '🚦',
  HOLD: '⛔',
  UNKNOWN: '❓'
}

const getStatusIcon = (status: string): string => STATUS_ICONS[status] || '📍'

/** 数据来源：从 rawData.dataSource 获取，FeituoAPI=API 同步，Feituo=Excel 导入 */
const getNodeDataSource = (node: StatusNode | null): string | null => {
  if (!node?.rawData) return null
  const ds = (node.rawData as { dataSource?: string })?.dataSource
  return ds && String(ds).trim() ? String(ds).trim() : null
}
/** 数据来源业务文案：避免表名，用业务语言 */
const getNodeDataSourceLabel = (ds: string | null): string => {
  if (!ds) return ''
  const LABELS: Record<string, string> = {
    FeituoAPI: '飞驼API',
    Feituo: 'Excel导入',
    ProcessTable: '业务系统'
  }
  return LABELS[ds] ?? ds
}
const getNodeDataSourceTagType = (ds: string | null): 'primary' | 'success' | 'info' => {
  if (ds === 'FeituoAPI') return 'primary'
  if (ds === 'Feituo') return 'success'
  return 'info'
}
</script>

<style scoped lang="scss">
@use "sass:color";
@use '@/assets/styles/variables' as *;

.logistics-path-tab {
  padding: $spacing-lg;
  min-height: 200px;
  background: linear-gradient(180deg, var(--el-bg-color-page, #f5f7fa) 0%, var(--el-bg-color) 100%);
  border-radius: $radius-large;
}

.path-loading {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  color: var(--el-text-color-secondary);
  padding: $spacing-xl;
}

.path-empty {
  padding: $spacing-xxl;
}

.path-error {
  margin-bottom: $spacing-md;
}

.path-content {
  max-width: 100%;
  margin: 0 auto;
}

/* 视图切换 + 刷新 */
.view-mode-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-lg;
  gap: $spacing-md;
}

.view-mode-bar {
  padding: 4px;
  background: var(--el-fill-color-lighter);
  border-radius: 999px;
  display: inline-flex;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);

  :deep(.el-radio-button__inner) {
    border: none;
    border-radius: 999px;
    padding: 8px 20px;
    font-weight: 500;
    transition: $transition-base;
  }
  :deep(.el-radio-group) {
    display: flex;
    gap: 4px;
  }
  :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
    background: var(--el-color-primary);
    color: #fff;
    box-shadow: $shadow-light;
  }
  :deep(.el-radio-button:not(.is-active) .el-radio-button__inner:hover) {
    background: rgba(255, 255, 255, 0.8);
  }
}

.view-mode-actions {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.help-link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--el-color-primary);
  text-decoration: none;
  font-size: $font-size-sm;
  transition: all $transition-base;
  padding: 6px 12px;
  border-radius: $radius-base;
  background: rgba(var(--el-color-primary-rgb), 0.04);

  &:hover {
    color: color.adjust($primary-color, $lightness: 10%);
    text-decoration: none;
    background: rgba(var(--el-color-primary-rgb), 0.08);
  }

  span {
    font-size: 12px;
    font-weight: 500;
  }
}

.refresh-btn {
  flex-shrink: 0;
}

/* 阶段分组：一行多列 */
.path-grouped {
  margin-top: $spacing-md;
}

.stage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: $spacing-lg;
}

.stage-col {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: $radius-large;
  overflow: hidden;
  box-shadow: $shadow-light;
  transition: $transition-base;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--el-bg-color);

  &:hover {
    box-shadow: $shadow-base;
    border-color: var(--el-border-color-light);
  }
}

.stage-header {
  padding: $spacing-md $spacing-lg;
  background: linear-gradient(135deg, rgba($primary-color, 0.08) 0%, rgba($primary-color, 0.04) 100%);
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  border-bottom: 1px solid var(--el-border-color-extra-light);
}

.stage-name {
  color: var(--el-text-color-primary);
  font-size: $font-size-base;
  letter-spacing: 0.02em;
}

.stage-count {
  font-size: $font-size-xs;
  color: var(--el-color-primary);
  background: rgba($primary-color, 0.1);
  padding: 3px 10px;
  border-radius: 999px;
  font-weight: 500;
}

.stage-nodes {
  padding: $spacing-sm;
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-height: 0;
  background: var(--el-bg-color);
}

.stage-node {
  display: flex;
  align-items: flex-start;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-base;
  cursor: pointer;
  font-size: $font-size-sm;
  transition: $transition-base;
  border-left: 3px solid transparent;

  &:hover {
    background: var(--el-fill-color-light);
  }

  &:active {
    background: var(--el-fill-color);
  }

  &.stage-node-alert {
    border-left-color: var(--el-color-danger);
    background: rgba($danger-color, 0.04);
  }

  &.stage-node-delay {
    border-left-color: var(--el-color-warning);
    background: rgba($warning-color, 0.04);
  }
}

.stage-node-icon {
  font-size: 18px;
  flex-shrink: 0;
  line-height: 1.2;
}

.stage-node-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stage-node-desc-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.stage-node-desc {
  color: var(--el-text-color-primary);
  font-weight: 500;
  word-break: break-word;
  line-height: 1.4;
}

.stage-node-meta {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
  font-size: $font-size-xs;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

.stage-node-time {
  color: var(--el-text-color-placeholder);
}

.stage-node-loc {
  color: var(--el-text-color-secondary);
}

/* 历时标签 - 中性指标（用于分析） */
.stage-node-elapsed-tag {
  color: var(--el-color-info-dark-2);
  background: rgba($info-color, 0.12);
  padding: 2px 8px;
  border-radius: $radius-base;
  font-size: 11px;
  font-weight: 500;
}

/* 超期标签 - 负面指标（用于干预） */
.stage-node-overdue-tag {
  color: var(--el-color-danger-dark-2);
  background: rgba($danger-color, 0.12);
  padding: 2px 8px;
  border-radius: $radius-base;
  font-size: 11px;
  font-weight: 600;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* 保留旧样式名用于兼容 */
.stage-node-delay-tag {
  @extend .stage-node-elapsed-tag;
}

.stage-node-no-data .stage-node-desc {
  color: var(--el-text-color-placeholder);
  font-style: italic;
}

.stage-ds-tag {
  margin-top: 2px;
  align-self: flex-start;
}

.alert-badge {
  background: var(--el-color-danger);
  color: white;
  padding: 2px 6px;
  border-radius: $radius-base;
  font-size: 11px;
  font-weight: 600;
}

/* 模拟数据提示 */
.mock-alert {
  margin-bottom: $spacing-lg;
}

/* 超期预警 */
.overdue-alert {
  margin-bottom: $spacing-lg;
}

/* 地图 */
.path-map {
  margin-top: $spacing-md;
  position: relative;
  padding: $spacing-lg;
  background: linear-gradient(180deg, var(--el-fill-color-lighter) 0%, var(--el-bg-color) 100%);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: $radius-large;
  box-shadow: $shadow-light;
  overflow: hidden;
}

.path-map .map-container {
  border-radius: $radius-base;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
}

.map-container {
  width: 100%;
  height: 360px;
  border-radius: $radius-base;
  z-index: 0;

  :deep(.route-point-marker) {
    background: none;
    border: none;
  }

  :deep(.route-point-dot) {
    width: 24px;
    height: 24px;
    background: var(--el-color-primary);
    border: 3px solid #fff;
    border-radius: 50%;
    box-shadow: $shadow-base;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    color: #fff;
  }

  :deep(.current-position-marker) {
    background: none;
    border: none;
  }

  :deep(.current-position-pin) {
    position: relative;
    width: 28px;
    height: 28px;
    background: var(--el-color-success);
    border: 3px solid #fff;
    border-radius: 50%;
    box-shadow: $shadow-base;
    animation: current-pulse 1.5s ease-in-out infinite;
  }

  :deep(.current-label) {
    position: absolute;
    top: -24px;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    font-size: 11px;
    font-weight: 600;
    color: var(--el-color-success);
    background: #fff;
    padding: 3px 8px;
    border-radius: $radius-base;
    box-shadow: $shadow-light;
  }
}

@keyframes current-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.95; }
}

.map-empty {
  padding: $spacing-xl;
  text-align: center;
  color: var(--el-text-color-placeholder);
  font-size: $font-size-sm;
  background: var(--el-fill-color-lighter);
  border-radius: $radius-base;
  border: 1px dashed var(--el-border-color-lighter);
}

/* 8. 多柜对比 */
.multi-container-section {
  margin-top: $spacing-lg;
  padding: $spacing-md;
  background: var(--el-bg-color);
  border-radius: $radius-large;
  box-shadow: $shadow-light;
}

.compare-hint {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.compare-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-md;
  flex-wrap: wrap;
  gap: $spacing-sm;
}

.compare-error {
  color: var(--el-color-danger);
  font-size: 13px;
  margin: $spacing-sm 0;
}

.compare-list {
  margin-top: $spacing-sm;
}

.compare-empty {
  text-align: center;
  padding: $spacing-lg;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
  background: var(--el-fill-color-lighter);
  border-radius: $radius-base;
  margin-top: $spacing-sm;
}

.container-link {
  color: var(--el-color-primary);
  text-decoration: none;
  transition: color $transition-base;
  
  &:hover {
    color: color.adjust($primary-color, $lightness: 10%);
    text-decoration: underline;
  }
}

/* 路径验证：纯文本一行，无卡片 */
.validation-inline-plain {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: $spacing-md;

  .validation-badge {
    font-weight: 600;

    &.valid {
      color: var(--el-color-success);
    }
    &.invalid {
      color: var(--el-color-danger);
    }
  }

  .validation-label {
    font-weight: 600;
    color: var(--el-text-color-secondary);
  }

  .validation-text {
    &.validation-errors {
      color: var(--el-color-danger);
    }
    &.validation-warnings {
      color: var(--el-color-warning);
    }
  }

  .validation-help-icon {
    font-size: 14px;
    color: var(--el-text-color-secondary);
    cursor: help;
    margin-left: 4px;
  }
}

.path-data-sources {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: $spacing-xs;
  margin-top: 4px;

  .ds-label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .ds-tag {
    margin-right: 0;
  }
}

.status-badge {
  padding: 8px 16px;
  border-radius: $radius-large;
  font-weight: 600;
  font-size: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);

  &.on_time {
    background: linear-gradient(135deg, var(--el-color-success-light-9), var(--el-color-success-light-8));
    color: var(--el-color-success-dark-2);
  }
  &.delayed {
    background: linear-gradient(135deg, var(--el-color-warning-light-9), var(--el-color-warning-light-8));
    color: var(--el-color-warning-dark-2);
  }
  &.hold {
    background: linear-gradient(135deg, var(--el-color-danger-light-9), var(--el-color-danger-light-8));
    color: var(--el-color-danger-dark-2);
  }
  &.completed {
    background: linear-gradient(135deg, var(--el-color-info-light-9), var(--el-color-info-light-8));
    color: var(--el-color-info-dark-2);
  }
}

.path-grouped .path-timeline-empty {
  padding: $spacing-xl;
  text-align: center;
  color: var(--el-text-color-placeholder);
  font-size: 14px;
  margin-top: $spacing-md;
}

/* 节点详情 */
.node-detail-content {
  padding: 0 $spacing-md;
}

.detail-item {
  margin-bottom: $spacing-md;
  padding-bottom: $spacing-md;
  font-size: 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-of-type {
    border-bottom: none;
  }

  .label {
    display: block;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    margin-bottom: 2px;
  }

  .value {
    color: var(--el-text-color-primary);
  }
}

.raw-data-section {
  margin-top: $spacing-lg;
  padding-top: $spacing-md;
  border-top: 1px solid var(--el-border-color-lighter);

  .label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-bottom: 4px;
  }

  .raw-data {
    font-size: 11px;
    background: var(--el-fill-color-lighter);
    padding: $spacing-md;
    border-radius: $radius-base;
    overflow-x: auto;
    max-height: 200px;
    overflow-y: auto;
  }
}
</style>
