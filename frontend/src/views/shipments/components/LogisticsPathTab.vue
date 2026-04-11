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
      <!-- 运输模式标识 -->
      <div v-if="path.transportMode" class="transport-mode-badge">
        <el-tag :type="getTransportModeTagType(path.transportMode)" size="normal" effect="plain">
          {{ getTransportModeLabel(path.transportMode) }}
        </el-tag>
      </div>

      <!-- 异常面板（超期预警、路径验证） -->
      <PathExceptionPanel
        v-if="variant === 'grouped'"
        :is-overdue="!!path.isOverdue"
        :overdue-text="overdueAlertText"
        :validation-result="validationResult"
      />

      <!-- 阶段分组：一行多列 -->
      <PathTimeline v-if="variant === 'grouped'" :path="path" @node-click="selectedNode = $event" />

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

      <!-- 多柜对比（仅阶段分组 Tab；需传入 billOfLadingNumber） -->
      <PathStatusPanel
        v-if="variant === 'grouped' && props.billOfLadingNumber"
        :container-number="props.containerNumber"
        :bill-of-lading-number="props.billOfLadingNumber"
        :containers="containersWithSameBillOfLading"
        :loading="loadingSameBillOfLading"
        :error="errorSameBillOfLading"
        @load-same-bill="loadContainersWithSameBillOfLading"
      />

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
            <el-tag
              v-if="isEstimatedNode(selectedNode)"
              type="warning"
              size="small"
              class="detail-estimated-tag"
            >
              预计
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
import { containerService } from '@/services/container'
import { dictService } from '@/services/dict'
import { logisticsPathService, type StatusNode, type StatusPath } from '@/services/logisticsPath'
import type { ContainerListItem } from '@/types/container'
import { Loading } from '@element-plus/icons-vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PathExceptionPanel from './PathExceptionPanel.vue'
import PathStatusPanel from './PathStatusPanel.vue'
import PathTimeline from './PathTimeline.vue'

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
    const err = e as Error
    let msg = err instanceof Error ? err.message : t('container.logisticsPath.errors.requestFailed')
    if (/unhealthy|不可用/i.test(msg)) {
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

/** 判断是否为预计节点（isEstimated=true） */
const isEstimatedNode = (node: StatusNode): boolean => {
  return !!(node.rawData as { isEstimated?: boolean })?.isEstimated
}

/** 获取运输模式标签类型 */
const getTransportModeTagType = (mode: string) => {
  switch (mode) {
    case 'STANDARD':
      return 'success' // 绿色 - 纯海运
    case 'SEA_RAIL':
      return 'warning' // 橙色 - 海铁联运
    case 'FEEDER':
      return '' // 蓝色 - 驳船联运
    default:
      return 'info'
  }
}

/** 获取运输模式显示文本 */
const getTransportModeLabel = (mode: string) => {
  switch (mode) {
    case 'STANDARD':
      return t('container.logisticsPath.transportMode.standard') || '纯海运'
    case 'SEA_RAIL':
      return t('container.logisticsPath.transportMode.seaRail') || '海铁联运'
    case 'FEEDER':
      return t('container.logisticsPath.transportMode.feeder') || '驳船联运'
    default:
      return mode
  }
}

/** 无数据节点的展示文案：显示具体缺数据的节点名（如「进港 缺数据」） */
const getNoDataNodeLabel = (node: StatusNode | null): string => {
  if (!node || !isNoDataNode(node)) return ''
  const label = (node.rawData as { noDataStageLabel?: string })?.noDataStageLabel
  return label ? `${label} 缺数据` : node.description || '无数据'
}

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

/* 运输模式标识 */
.transport-mode-badge {
  margin-bottom: $spacing-md;
}

/* 地图 */
.transport-mode-badge {
  margin-bottom: $spacing-md;
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

/* 详情面板中的预计标签 */
.detail-estimated-tag {
  margin-left: 4px;
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
