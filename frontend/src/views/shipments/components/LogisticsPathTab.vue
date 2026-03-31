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
      <!-- 超期预警（仅阶段分组视图显示） -->
      <el-alert
        v-if="variant === 'grouped' && path.isOverdue"
        type="error"
        :title="t('container.logisticsPath.overdueAlert.title')"
        :description="overdueAlertText"
        show-icon
        class="overdue-alert"
      />

      <!-- 路径验证（仅阶段分组视图显示，纯文本，无卡片） -->
      <div v-if="variant === 'grouped' && validationResult" class="validation-inline-plain">
        <span :class="['validation-badge', validationResult.isValid ? 'valid' : 'invalid']">
          {{
            validationResult.isValid
              ? t('container.logisticsPath.validation.passed')
              : t('container.logisticsPath.validation.failed')
          }}
        </span>
        <template v-if="validationResult.errors?.length">
          <span class="validation-label"
            >{{ t('container.logisticsPath.validation.errors') }}：</span
          >
          <span class="validation-text validation-errors">{{
            validationResult.errors.join('；')
          }}</span>
        </template>
        <template v-if="validationResult.warnings?.length">
          <span class="validation-label"
            >{{ t('container.logisticsPath.validation.warnings') }}：</span
          >
          <span class="validation-text validation-warnings">{{
            validationResult.warnings.join('；')
          }}</span>
        </template>
        <el-tooltip placement="top" :show-after="300">
          <template #content>
            <div class="validation-tooltip">
              <p>
                <strong>{{ t('container.logisticsPath.validation.checks') }}：</strong>
              </p>
              <ul>
                <li>
                  <strong>{{ t('container.logisticsPath.validation.passed') }}</strong
                  >：{{ t('container.logisticsPath.validation.passedDescription') }}
                </li>
                <li>
                  <strong>{{ t('container.logisticsPath.validation.failed') }}</strong
                  >：{{ t('container.logisticsPath.validation.failedDescription') }}
                </li>
              </ul>
              <p>{{ t('container.logisticsPath.validation.purpose') }}</p>
            </div>
          </template>
          <el-icon class="validation-help-icon"><QuestionFilled /></el-icon>
        </el-tooltip>
      </div>

      <!-- 阶段分组：一行多列 -->
      <div v-if="variant === 'grouped'" class="path-grouped">
        <div v-if="!(path.nodes || []).length" class="path-timeline-empty">
          {{ t('container.logisticsPath.noNodes') }}
        </div>
        <div v-else class="stage-grid">
          <div v-for="group in nodesByStage" :key="group.stage" class="stage-col">
            <div class="stage-header">
              <span class="stage-name">{{ group.label }}</span>
              <span class="stage-count"
                >{{ group.nodes.length }} {{ t('container.logisticsPath.nodesCount') }}</span
              >
            </div>
            <div class="stage-nodes">
              <div
                v-for="item in group.nodes"
                :key="item.node.id"
                class="stage-node"
                :class="{
                  'stage-node-no-data': isNoDataNode(item.node),
                  'stage-node-alert': item.node.isAlert,
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
                    <span class="stage-node-time">{{
                      isNoDataNode(item.node) ? '—' : formatDateTime(item.node.timestamp)
                    }}</span>
                    <span v-if="item.node.location" class="stage-node-loc"
                      >{{ item.node.location.name }} ({{ item.node.location.code }})</span
                    >
                    <!-- 使用 NodeDurationDisplay 组件显示节点时长 -->
                    <NodeDurationDisplay
                      :timestamp="item.node.timestamp"
                      :prev-timestamp="
                        item.globalIndex > 0 ? path.nodes[item.globalIndex - 1]?.timestamp : null
                      "
                      :next-timestamp="
                        item.globalIndex < (path.nodes?.length ?? 0) - 1
                          ? path.nodes[item.globalIndex + 1]?.timestamp
                          : null
                      "
                      :index="item.globalIndex"
                      :total-count="path.nodes?.length ?? 0"
                      :node-status="item.node.status"
                      :standard-hours="STANDARD_DURATIONS[item.node.status] ?? 0"
                      :is-in-progress="isCurrentNode(item.node, item.globalIndex)"
                      :is-no-data="isNoDataNode(item.node)"
                    />
                  </div>
                  <el-tag
                    v-if="getNodeDataSource(item.node)"
                    :type="getNodeDataSourceTagType(getNodeDataSource(item.node))"
                    size="small"
                    class="stage-ds-tag"
                  >
                    {{ getNodeDataSourceLabel(getNodeDataSource(item.node)) }}
                  </el-tag>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 地图路径视图（Leaflet，独立 Tab 时 variant=map） -->
      <div v-if="variant === 'map'" class="path-map">
        <div ref="mapContainerRef" class="map-container"></div>
        <div v-if="mapPoints.length === 0" class="map-empty">
          <div>
            {{
              mapLocationCandidatesCount > 0
                ? t('container.logisticsPath.noPortCoordinates')
                : t('container.logisticsPath.noPortLocationData')
            }}
          </div>
          <div v-if="unmatchedMapEntries.length" class="map-empty-unmatched">
            <div class="map-empty-unmatched-title">本柜未命中的 code/name：</div>
            <div class="map-empty-unmatched-list">
              {{ unmatchedMapEntries.join('，') }}
            </div>
          </div>
        </div>
        <div class="map-debug-panel">
          <el-collapse>
            <el-collapse-item title="地图匹配调试信息（当前货柜）" name="map-debug">
              <el-table :data="mapDebugRows" size="small" border max-height="280">
                <el-table-column prop="nodeStatus" label="节点" min-width="140" />
                <el-table-column prop="code" label="提取 code" min-width="140" />
                <el-table-column prop="name" label="提取 name" min-width="160" />
                <el-table-column label="匹配来源" width="140">
                  <template #default="{ row }">
                    <el-tag :type="getMapMatchTagType(row.matchSource)" size="small">
                      {{ row.matchSourceLabel }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="matchedWith" label="命中值" min-width="160" />
              </el-table>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>

      <!-- 8. 多柜对比（仅阶段分组 Tab；需传入 billOfLadingNumber） -->
      <div v-if="variant === 'grouped' && props.billOfLadingNumber" class="multi-container-section">
        <el-collapse>
          <el-collapse-item
            :title="t('container.logisticsPath.sameBillOfLading.title')"
            name="compare"
          >
            <div class="compare-header">
              <div class="compare-hint">
                {{
                  t('container.logisticsPath.sameBillOfLading.currentContainer', {
                    containerNumber: props.containerNumber,
                    billOfLadingNumber: props.billOfLadingNumber,
                  })
                }}
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
                <el-table-column
                  prop="containerNumber"
                  :label="t('container.logisticsPath.sameBillOfLading.columns.containerNumber')"
                  width="120"
                >
                  <template #default="{ row }">
                    <router-link :to="`/shipments/${row.containerNumber}`" class="container-link">
                      {{ row.containerNumber }}
                    </router-link>
                  </template>
                </el-table-column>
                <el-table-column
                  prop="logisticsStatus"
                  :label="t('container.logisticsPath.sameBillOfLading.columns.logisticsStatus')"
                  width="120"
                />
                <el-table-column
                  prop="actualShipDate"
                  :label="t('container.logisticsPath.sameBillOfLading.columns.actualShipDate')"
                  width="120"
                />
                <el-table-column
                  prop="etaDestPort"
                  :label="t('container.logisticsPath.sameBillOfLading.columns.etaDestPort')"
                  width="120"
                />
                <el-table-column
                  prop="ataDestPort"
                  :label="t('container.logisticsPath.sameBillOfLading.columns.ataDestPort')"
                  width="120"
                />
                <el-table-column
                  prop="location"
                  :label="t('container.logisticsPath.sameBillOfLading.columns.location')"
                />
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
            <el-tag
              v-if="isNoDataNode(selectedNode)"
              type="info"
              size="small"
              class="detail-no-data-tag"
            >
              {{ getNoDataNodeLabel(selectedNode) }}
            </el-tag>
          </div>
          <div class="detail-item">
            <span class="label">{{ t('container.logisticsPath.nodeDetail.time') }}：</span>
            <span class="value">{{
              isNoDataNode(selectedNode) ? '—' : formatDateTime(selectedNode.timestamp)
            }}</span>
          </div>
          <div class="detail-item" v-if="selectedNode.location">
            <span class="label">{{ t('container.logisticsPath.nodeDetail.location') }}：</span>
            <span class="value"
              >{{ selectedNode.location.name }} ({{ selectedNode.location.code }})</span
            >
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
            <span class="value">{{
              selectedNode.isAlert
                ? t('container.logisticsPath.nodeDetail.yes')
                : t('container.logisticsPath.nodeDetail.no')
            }}</span>
          </div>
          <div v-if="getNodeDataSource(selectedNode)" class="detail-item">
            <span class="label">{{ t('container.logisticsPath.nodeDetail.dataSource') }}：</span>
            <el-tag :type="getNodeDataSourceTagType(getNodeDataSource(selectedNode))" size="small">
              {{ getNodeDataSourceLabel(getNodeDataSource(selectedNode)) }}
            </el-tag>
          </div>
          <div
            v-if="selectedNode.rawData && Object.keys(selectedNode.rawData).length > 0"
            class="raw-data-section"
          >
            <div class="label">{{ t('container.logisticsPath.nodeDetail.rawData') }}</div>
            <pre class="raw-data">{{ JSON.stringify(selectedNode.rawData, null, 2) }}</pre>
          </div>
        </div>
      </el-drawer>
    </div>
    <el-empty v-else :description="t('container.logisticsPath.noPathData')" class="path-empty" />
  </div>
</template>

<script setup lang="ts">
import NodeDurationDisplay from '@/components/common/NodeDurationDisplay.vue'
import { containerService } from '@/services/container'
import { dictService } from '@/services/dict'
import { logisticsPathService, type StatusNode, type StatusPath } from '@/services/logisticsPath'
import type { ContainerListItem } from '@/types/container'
import { Loading, QuestionFilled } from '@element-plus/icons-vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    containerNumber: string
    billOfLadingNumber?: string
    /** grouped=阶段分组；map=仅地图（由父级货柜详情独立 Tab 使用） */
    variant?: 'grouped' | 'map'
  }>(),
  { variant: 'grouped' }
)
const loading = ref(false)
const error = ref('')
const path = ref<StatusPath | null>(null)
const selectedNode = ref<StatusNode | null>(null)
const validationResult = ref<{ isValid: boolean; errors: string[]; warnings: string[] } | null>(
  null
)
const mapContainerRef = ref<HTMLElement | null>(null)
let leafletMap: L.Map | null = null
let mapResizeObserver: ResizeObserver | null = null

/** dict_ports 经纬度缓存（全量只拉一次，供物流地图匹配） */
type DictPortCoordMaps = {
  byCode: Record<string, [number, number]>
  byNameNorm: Record<string, [number, number]>
}
let cachedDictPortCoords: DictPortCoordMaps | null = null
let dictPortCoordsInflight: Promise<DictPortCoordMaps> | null = null

function normalizePortNameKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '')
}

/** 与 dict_ports / 内置表 不一致时的五字码别名（飞驼等常用 CNNBO，字典多为 CNNGB） */
const PORT_CODE_ALIASES: Record<string, string> = {
  CNNBO: 'CNNGB',
  CNZOS: 'CNNGB',
  CNZHE: 'CNNGB',
  CNSHA: 'CNSHG',
  CNSHP: 'CNSHG',
  CNQIN: 'CNQNG',
  CNQDO: 'CNTAO',
}

/** 生成用于匹配 dict 港口名称的若干 key（如「宁波港」→「宁波」） */
function portNameLookupKeys(displayName: string): string[] {
  const base = normalizePortNameKey(displayName)
  if (!base) return []
  const keys = new Set<string>([base])
  const noSuffix = base.replace(/(国际)?港口?$|港$|码头$|湾$|港区$/u, '').trim()
  if (noSuffix && noSuffix !== base) keys.add(noSuffix)
  return [...keys]
}

async function loadDictPortCoordsOnce(): Promise<DictPortCoordMaps> {
  if (cachedDictPortCoords) return cachedDictPortCoords
  if (!dictPortCoordsInflight) {
    dictPortCoordsInflight = (async () => {
      try {
        const res = await dictService.getPorts()
        const byCode: Record<string, [number, number]> = {}
        const byNameNorm: Record<string, [number, number]> = {}
        if (res.success && res.data?.length) {
          for (const p of res.data) {
            const lat = p.latitude
            const lng = p.longitude
            if (lat == null || lng == null) continue
            const latN = Number(lat)
            const lngN = Number(lng)
            if (Number.isNaN(latN) || Number.isNaN(lngN)) continue
            const pair: [number, number] = [lngN, latN]
            const pc = (p.code || '').toUpperCase().replace(/\s/g, '')
            if (pc) byCode[pc] = pair
            const n1 = normalizePortNameKey(p.name || '')
            if (n1) byNameNorm[n1] = pair
            const n2 = normalizePortNameKey(p.nameEn || '')
            if (n2) byNameNorm[n2] = pair
            for (const k of portNameLookupKeys(p.name || '')) {
              if (k) byNameNorm[k] = pair
            }
          }
        }
        cachedDictPortCoords = { byCode, byNameNorm }
      } catch {
        cachedDictPortCoords = { byCode: {}, byNameNorm: {} }
      }
      return cachedDictPortCoords!
    })().finally(() => {
      dictPortCoordsInflight = null
    })
  }
  return dictPortCoordsInflight
}

const dictPortCoords = ref<DictPortCoordMaps | null>(null)

const teardownMapResizeObserver = () => {
  mapResizeObserver?.disconnect()
  mapResizeObserver = null
}

// 同提单货柜对比相关
const loadingSameBillOfLading = ref(false)
const errorSameBillOfLading = ref('')
const containersWithSameBillOfLading = ref<ContainerListItem[]>([])

const showNodeDetail = computed({
  get: () => !!selectedNode.value,
  set: v => {
    if (!v) selectedNode.value = null
  },
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
      search: props.billOfLadingNumber,
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
  val => {
    if (val) loadPath()
  },
  { immediate: true }
)

watch(
  () => props.containerNumber,
  val => {
    if (!val?.trim()) return
    loadDictPortCoordsOnce().then(m => {
      dictPortCoords.value = m
    })
  },
  { immediate: true }
)

const invalidateMap = () => {
  if (props.variant !== 'map' || !leafletMap) return
  leafletMap.invalidateSize({ animate: false })
  requestAnimationFrame(() => {
    leafletMap?.invalidateSize({ animate: false })
  })
}

defineExpose({ load: loadPath, invalidateMap })

/** 超期预警文案 */
const overdueAlertText = computed(() => {
  if (!path.value?.isOverdue) return ''

  // 判断货柜是否实际到港
  // 有数据来源（FeituoAPI/Feituo/ProcessTable）= 真正到港
  // dataSource=null = 占位节点（未真正到港）
  const hasActualArrivalEvent = path.value.nodes?.some(
    n =>
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

const isNoDataNode = (node: StatusNode): boolean => !!(node.rawData as { noData?: boolean })?.noData

/** 无数据节点的展示文案：显示具体缺数据的节点名（如「进港 缺数据」） */
const getNoDataNodeLabel = (node: StatusNode | null): string => {
  if (!node || !isNoDataNode(node)) return ''
  const label = (node.rawData as { noDataStageLabel?: string })?.noDataStageLabel
  return label ? `${label} 缺数据` : node.description || '无数据'
}

const durationDays = computed(() => {
  if (!path.value?.startedAt || !path.value?.nodes?.length) return null
  const firstNode = path.value.nodes[0]
  const lastCompleted = [...path.value.nodes].reverse().find(n => n.nodeStatus === 'COMPLETED')
  const endTime = lastCompleted ? new Date(lastCompleted.timestamp) : new Date()
  const startTime = new Date(firstNode.timestamp)
  const diff = Math.abs(endTime.getTime() - startTime.getTime())
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
})

/** 1. 进度条：运输进度百分比 */
const pathProgress = computed(() => {
  if (!path.value?.nodes?.length) return 0
  const completed = path.value.nodes.filter(n => n.nodeStatus === 'COMPLETED')
  const inProgress = path.value.nodes.some(n => n.nodeStatus === 'IN_PROGRESS')
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
  COMPLETED: { stage: 'return', label: '还箱', order: 6 },
}

const nodesByStage = computed(() => {
  if (!path.value?.nodes?.length) return []
  const groups: Record<
    string,
    {
      stage: string
      label: string
      order: number
      nodes: { node: StatusNode; globalIndex: number }[]
    }
  > = {}
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

/** 地图：内置兜底坐标（[lng, lat]）；优先使用 dict_ports 接口返回的经纬度 */
const PORT_COORDS: Record<string, [number, number]> = {
  CNSHG: [121.47, 31.23],
  CNSZX: [114.06, 22.54],
  CNNGB: [121.54, 29.87],
  CNYTN: [114.27, 22.56],
  CNQNG: [120.38, 36.07],
  CNTAO: [117.2, 39.08],
  CNDLC: [121.61, 38.91],
  CNXMN: [118.09, 24.48],
  CNGZU: [113.26, 23.13],
  USLAX: [-118.27, 33.74],
  USLGB: [-118.19, 33.75],
  USOAK: [-122.27, 37.8],
  USSEA: [-122.33, 47.61],
  USSAV: [-81.09, 32.08],
  USNYC: [-74.01, 40.71],
  USCHI: [-87.63, 41.88],
  SGSIN: [103.85, 1.29],
  JPTYO: [139.69, 35.69],
  KRPUS: [129.04, 35.1],
  HKHKG: [114.17, 22.32],
  NLRTM: [4.48, 51.92],
  DEHAM: [9.93, 53.55],
  GBSOU: [-1.4, 50.9],
  BEANR: [4.42, 51.22],
}

function resolveNodePortLngLat(
  code: string,
  displayName: string,
  dict: DictPortCoordMaps | null
): [number, number] | null {
  const compact = code.replace(/\s/g, '').toUpperCase()
  const aliased = PORT_CODE_ALIASES[compact] || compact
  const tryCodes = [aliased, compact].filter((c, i, a) => c && a.indexOf(c) === i)

  for (const c of tryCodes) {
    if (dict?.byCode[c]) return dict.byCode[c]
  }
  for (const c of tryCodes) {
    if (PORT_COORDS[c]) return [...PORT_COORDS[c]] as [number, number]
  }
  for (const c of tryCodes) {
    const fuzzy = Object.entries(PORT_COORDS).find(
      ([k]) => c.includes(k) || k.includes(c) || c.endsWith(k) || k.endsWith(c)
    )?.[1]
    if (fuzzy) return [...fuzzy] as [number, number]
  }
  for (const nk of portNameLookupKeys(displayName)) {
    if (dict && nk && dict.byNameNorm[nk]) return dict.byNameNorm[nk]
  }
  return null
}

type MapMatchSource = 'dict' | 'builtin' | 'raw' | 'none'

function resolveNodePortLngLatWithSource(
  code: string,
  displayName: string,
  dict: DictPortCoordMaps | null
): { coord: [number, number] | null; source: MapMatchSource; matchedWith?: string } {
  const compact = code.replace(/\s/g, '').toUpperCase()
  const aliased = PORT_CODE_ALIASES[compact] || compact
  const tryCodes = [aliased, compact].filter((c, i, a) => c && a.indexOf(c) === i)

  for (const c of tryCodes) {
    if (dict?.byCode[c]) return { coord: dict.byCode[c], source: 'dict', matchedWith: c }
  }
  for (const c of tryCodes) {
    if (PORT_COORDS[c])
      return { coord: [...PORT_COORDS[c]] as [number, number], source: 'builtin', matchedWith: c }
  }
  for (const c of tryCodes) {
    const fuzzy = Object.entries(PORT_COORDS).find(
      ([k]) => c.includes(k) || k.includes(c) || c.endsWith(k) || k.endsWith(c)
    )
    if (fuzzy)
      return {
        coord: [...fuzzy[1]] as [number, number],
        source: 'builtin',
        matchedWith: `${c}~${fuzzy[0]}`,
      }
  }
  for (const nk of portNameLookupKeys(displayName)) {
    if (dict && nk && dict.byNameNorm[nk]) {
      return { coord: dict.byNameNorm[nk], source: 'dict', matchedWith: `name:${nk}` }
    }
  }
  return { coord: null, source: 'none' }
}

function getRawDataLngLat(node: StatusNode): [number, number] | null {
  const raw = (node.rawData || {}) as Record<string, unknown>
  const pickNum = (...keys: string[]): number | null => {
    for (const k of keys) {
      const v = raw[k]
      if (v === null || v === undefined || v === '') continue
      const n = Number(String(v).trim())
      if (Number.isFinite(n)) return n
    }
    return null
  }
  const lat = pickNum('latitude', 'lat', '纬度', '发生地信息_纬度')
  const lng = pickNum('longitude', 'lng', 'lon', '经度', '发生地信息_经度')
  if (lat === null || lng === null) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return [lng, lat]
}

function extractNodePortCodeAndName(node: StatusNode): { code: string; name: string } | null {
  const rawData = (node.rawData || {}) as Record<string, unknown>
  const firstNonEmpty = (...vals: unknown[]): string => {
    for (const v of vals) {
      const s = (v ?? '').toString().trim()
      if (s) return s
    }
    return ''
  }

  // 匹配口径对齐 ext_feituo_status_events：
  // code 优先 port_code，其次 event_place_code，再回退到 location.code
  const code = firstNonEmpty(
    rawData.port_code,
    rawData.portCode,
    rawData.event_place_code,
    rawData.locationCode,
    rawData.location_code,
    rawData.eventPlaceCode,
    rawData['eventPlaceCode'],
    rawData['portCode'],
    rawData['地点CODE'],
    rawData['发生地信息_地点CODE'],
    node.location?.code
  )
  // name 优先 event_place / event_place_origin，其次 port_name，再回退到 location.name
  const name = firstNonEmpty(
    rawData.event_place,
    rawData.eventPlace,
    rawData.event_place_origin,
    rawData['event_place_origin'],
    rawData.port_name,
    rawData.portName,
    rawData.location,
    rawData.portName,
    rawData.port_name,
    rawData['发生地'],
    rawData['发生地信息_地点名称中文（标准）'],
    rawData['发生地信息_地点名称英文（标准）'],
    node.location?.name
  )

  if (!code && !name) return null
  return { code: code || name, name: name || code }
}

const mapPoints = computed(() => {
  if (!path.value?.nodes?.length) return []
  const dict = dictPortCoords.value
  const pts: { name: string; value: [number, number]; node: StatusNode }[] = []
  const seen = new Set<string>()
  for (const node of path.value!.nodes) {
    const extracted = extractNodePortCodeAndName(node)
    if (!extracted) continue
    const code = extracted.code.toUpperCase().replace(/\s/g, '')
    const displayName = extracted.name
    const match = resolveNodePortLngLat(code, displayName, dict) || getRawDataLngLat(node)
    if (match && !seen.has(code)) {
      pts.push({ name: displayName, value: match, node })
      seen.add(code)
    }
  }
  return pts
})

const mapDebugRows = computed(() => {
  if (!path.value?.nodes?.length)
    return [] as Array<{
      nodeStatus: string
      code: string
      name: string
      matchSource: MapMatchSource
      matchSourceLabel: string
      matchedWith: string
    }>

  const dict = dictPortCoords.value
  return path.value.nodes.map(node => {
    const extracted = extractNodePortCodeAndName(node)
    const rawCoord = getRawDataLngLat(node)

    if (!extracted && rawCoord) {
      return {
        nodeStatus: `${node.description} (${node.status})`,
        code: '-',
        name: '-',
        matchSource: 'raw' as MapMatchSource,
        matchSourceLabel: 'raw 经纬度命中',
        matchedWith: `[${rawCoord[0]}, ${rawCoord[1]}]`,
      }
    }

    if (!extracted) {
      return {
        nodeStatus: `${node.description} (${node.status})`,
        code: '-',
        name: '-',
        matchSource: 'none' as MapMatchSource,
        matchSourceLabel: '未命中',
        matchedWith: '-',
      }
    }

    const code = extracted.code.toUpperCase().replace(/\s/g, '')
    const name = extracted.name
    const resolved = resolveNodePortLngLatWithSource(code, name, dict)

    if (resolved.coord) {
      return {
        nodeStatus: `${node.description} (${node.status})`,
        code,
        name,
        matchSource: resolved.source,
        matchSourceLabel: resolved.source === 'dict' ? '字典命中' : '内置命中',
        matchedWith: resolved.matchedWith || '-',
      }
    }

    if (rawCoord) {
      return {
        nodeStatus: `${node.description} (${node.status})`,
        code,
        name,
        matchSource: 'raw' as MapMatchSource,
        matchSourceLabel: 'raw 经纬度命中',
        matchedWith: `[${rawCoord[0]}, ${rawCoord[1]}]`,
      }
    }

    return {
      nodeStatus: `${node.description} (${node.status})`,
      code,
      name,
      matchSource: 'none' as MapMatchSource,
      matchSourceLabel: '未命中',
      matchedWith: '-',
    }
  })
})

const mapLocationCandidatesCount = computed(() => {
  if (!path.value?.nodes?.length) return 0
  let count = 0
  for (const node of path.value.nodes) {
    if (extractNodePortCodeAndName(node) || getRawDataLngLat(node)) {
      count += 1
    }
  }
  return count
})

const getMapMatchTagType = (
  source: MapMatchSource
): 'success' | 'primary' | 'warning' | 'danger' => {
  if (source === 'dict') return 'success'
  if (source === 'builtin') return 'primary'
  if (source === 'raw') return 'warning'
  return 'danger'
}

const unmatchedMapEntries = computed(() => {
  if (!path.value?.nodes?.length) return [] as string[]
  const dict = dictPortCoords.value
  const misses = new Set<string>()
  for (const node of path.value.nodes) {
    const extracted = extractNodePortCodeAndName(node)
    if (!extracted) continue
    const code = extracted.code.toUpperCase().replace(/\s/g, '')
    const displayName = extracted.name
    const match = resolveNodePortLngLat(code, displayName, dict) || getRawDataLngLat(node)
    if (!match) {
      misses.add(`${code}${displayName && displayName !== code ? `(${displayName})` : ''}`)
    }
  }
  return Array.from(misses).slice(0, 20)
})

/** 创建路径点标记（纯 CSS，避免默认图标加载失败出现灰色块） */
const createRouteMarkerIcon = (index: number) =>
  L.divIcon({
    className: 'route-point-marker',
    html: `<div class="route-point-dot">${index + 1}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })

const initLeafletMap = () => {
  if (!mapContainerRef.value || !path.value || props.variant !== 'map') return
  const el = mapContainerRef.value
  if (el.offsetWidth < 8 || el.offsetHeight < 8) return

  const pts = mapPoints.value
  if (pts.length === 0) {
    if (leafletMap) {
      leafletMap.remove()
      leafletMap = null
    }
    return
  }

  if (leafletMap) {
    leafletMap.remove()
    leafletMap = null
  }

  const latlngs: L.LatLngExpression[] = pts.map(p => [p.value[1], p.value[0]] as L.LatLngExpression)
  const center = latlngs.length === 1 ? latlngs[0] : latlngs[Math.floor(latlngs.length / 2)]
  const bounds = L.latLngBounds(latlngs)

  leafletMap = L.map(mapContainerRef.value, { attributionControl: true }).setView(
    center as [number, number],
    3
  )

  // 底图：CartoDB Voyager（基于 OSM，兼容性更好）备选：OpenStreetMap
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
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
        iconAnchor: [30, 48],
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
  // Tab / 懒加载面板初次显示时需在布局稳定后再算尺寸，否则瓦片灰块
  requestAnimationFrame(() => {
    leafletMap?.invalidateSize({ animate: false })
    requestAnimationFrame(() => {
      leafletMap?.invalidateSize({ animate: false })
    })
  })
}

const setupMapResizeObserver = () => {
  teardownMapResizeObserver()
  if (props.variant !== 'map' || !mapContainerRef.value || mapPoints.value.length === 0) return

  mapResizeObserver = new ResizeObserver(() => {
    if (props.variant !== 'map') return
    const node = mapContainerRef.value
    if (!node || node.offsetWidth < 8 || node.offsetHeight < 8) return

    if (leafletMap) {
      leafletMap.invalidateSize({ animate: false })
      requestAnimationFrame(() => leafletMap?.invalidateSize({ animate: false }))
    } else if (path.value && mapPoints.value.length > 0) {
      initLeafletMap()
    }
  })
  mapResizeObserver.observe(mapContainerRef.value)
}

const destroyLeafletMap = () => {
  teardownMapResizeObserver()
  if (leafletMap) {
    leafletMap.remove()
    leafletMap = null
  }
}

const scheduleMapInit = () => {
  if (props.variant !== 'map') return
  nextTick(() => {
    // 懒加载 Tab 首次激活时多等一帧，避免容器仍为 0 宽高
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        initLeafletMap()
        setupMapResizeObserver()
      })
    })
  })
}

watch([() => path.value, () => props.variant, () => dictPortCoords.value], () => {
  nextTick(() => {
    if (props.variant === 'map') {
      setTimeout(scheduleMapInit, 120)
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
  COMPLETED: 0,
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
    COMPLETED: '已完成',
  }
  return LABELS[status || ''] || status || '未知'
}

const getNodeStatusLabel = (status?: string): string => {
  const LABELS: Record<string, string> = {
    COMPLETED: '已完成',
    IN_PROGRESS: '进行中',
    PENDING: '未开始',
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
    minute: '2-digit',
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
  UNKNOWN: '❓',
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
    ProcessTable: '业务系统',
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
@use 'sass:color';
@use '@/assets/styles/variables' as *;

.logistics-path-tab {
  padding: 0;
  min-height: 200px;
  background: transparent;
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
  background: linear-gradient(
    135deg,
    rgba($primary-color, 0.08) 0%,
    rgba($primary-color, 0.04) 100%
  );
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
  0%,
  100% {
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
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
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
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.95;
  }
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

.map-empty-unmatched {
  margin-top: $spacing-sm;
  text-align: left;
  max-width: 100%;
  padding: $spacing-sm;
  border-radius: $radius-base;
  background: rgba(255, 255, 255, 0.65);
}

.map-empty-unmatched-title {
  font-size: $font-size-xs;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.map-empty-unmatched-list {
  font-size: $font-size-xs;
  color: var(--el-text-color-secondary);
  word-break: break-all;
  line-height: 1.5;
}

.map-debug-panel {
  margin-top: $spacing-sm;
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
    background: linear-gradient(
      135deg,
      var(--el-color-success-light-9),
      var(--el-color-success-light-8)
    );
    color: var(--el-color-success-dark-2);
  }
  &.delayed {
    background: linear-gradient(
      135deg,
      var(--el-color-warning-light-9),
      var(--el-color-warning-light-8)
    );
    color: var(--el-color-warning-dark-2);
  }
  &.hold {
    background: linear-gradient(
      135deg,
      var(--el-color-danger-light-9),
      var(--el-color-danger-light-8)
    );
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
