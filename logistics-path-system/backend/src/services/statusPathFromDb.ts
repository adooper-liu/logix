/**
 * 从主库生成 StatusPath
 * 数据来源：ext_container_status_events（优先）+ process_port_operations / process_trucking_transport / process_empty_return（补充）
 * 完整路径：未出运 → 提空箱 → 进港 → 装船 → 离港 → 航行 → 抵港 → 卸船 → 可提货 → 提柜 → 还箱
 * 缺数据节点标「无数据」；超期（last_free_date < 今天）时标记预警
 */

import { FEITUO_STATUS_MAP, FEITUO_WARNING_MAP } from "../constants/statusMappings.js";
import { isDatabaseConfigured, query } from "../db/index.js";
import { LocationType, NodeStatus, PathStatus, StandardStatus, StatusNode, StatusPath } from "../types/index.js";
import { processStatusPath, validateStatusPath } from "../utils/pathValidator.js";

interface DbEvent {
  id: number;
  container_number: string;
  status_code: string | null;
  status_name: string | null;
  occurred_at: Date | null;
  location: string | null;
  description: string | null;
  data_source: string | null;
  raw_data: Record<string, unknown> | null;
  is_estimated: boolean | null; // 是否为预计状态
}

interface LastFreeRow {
  last_free_date: Date | null;
}

/** 流程表补充数据：抵港/卸船/可提货/提柜/还箱 */
interface ProcessSupplement {
  ata: Date | null;
  dest_port_unload_date: Date | null;
  available_time: Date | null;
  gate_out_time: Date | null;
  pickup_date: Date | null;
  return_time: Date | null;
}

/** 完整路径阶段模板：未出运 → 还箱 */
/**
 * 运输模式枚举
 */
export enum TransportMode {
  /** 纯海运：起运港 -> 海运 -> 目的港 -> 提柜 */
  STANDARD = "STANDARD",
  /** 海铁联运：海运到目的港后，铁路转运到内陆点（美加线） */
  SEA_RAIL = "SEA_RAIL",
  /** 驳船联运：驳船从支线港到枢纽港，再海运 */
  FEEDER = "FEEDER",
}

/**
 * 纯海运模式模板
 * 起运 -> 装船 -> 离港 -> 海运 -> 抵港 -> 靠泊 -> 卸船 -> 可提 -> 提柜 -> 交货 -> 还箱
 */
const STANDARD_MODE_TEMPLATE: { order: number; status: StandardStatus; label: string; statuses: StandardStatus[] }[] = [
  { order: 1, status: StandardStatus.NOT_SHIPPED, label: "未出运", statuses: [StandardStatus.NOT_SHIPPED] },
  { order: 2, status: StandardStatus.EMPTY_PICKED_UP, label: "提空箱", statuses: [StandardStatus.EMPTY_PICKED_UP] },
  {
    order: 3,
    status: StandardStatus.GATE_IN,
    label: "进港",
    statuses: [StandardStatus.GATE_IN, StandardStatus.CONTAINER_STUFFED],
  },
  {
    order: 4,
    status: StandardStatus.LOADED,
    label: "装船",
    statuses: [StandardStatus.LOADED],
  },
  {
    order: 5,
    status: StandardStatus.DEPARTED,
    label: "离港",
    statuses: [StandardStatus.DEPARTED],
  },
  {
    order: 6,
    status: StandardStatus.SAILING,
    label: "海运",
    statuses: [StandardStatus.SAILING],
  },
  {
    order: 7,
    status: StandardStatus.ARRIVED,
    label: "抵港",
    statuses: [
      StandardStatus.ARRIVED, // BDAR 抵港
      StandardStatus.BERTHED, // POCA 靠泊
      StandardStatus.DELIVERY_ARRIVED, // FETA 交货地抵达
    ],
  },
  { order: 8, status: StandardStatus.DISCHARGED, label: "卸船", statuses: [StandardStatus.DISCHARGED] },
  {
    order: 9,
    status: StandardStatus.AVAILABLE,
    label: "可提",
    statuses: [
      StandardStatus.AVAILABLE, // PCAB 可提货
      StandardStatus.IN_TRANSIT_TO_DEST, // STCS 提柜后运输中
    ],
  },
  {
    order: 10,
    status: StandardStatus.GATE_OUT,
    label: "提柜",
    statuses: [
      StandardStatus.GATE_OUT, // GTOT 提柜
      StandardStatus.STRIPPED, // STRP 拆箱
    ],
  },
  {
    order: 11,
    status: StandardStatus.RETURNED_EMPTY,
    label: "还箱",
    statuses: [StandardStatus.RETURNED_EMPTY, StandardStatus.COMPLETED],
  },
];

/**
 * 海铁联运模式模板（美加线）
 * 起运 -> 装船 -> 离港 -> 海运 -> 抵港 -> 靠泊 -> 卸船 -> 铁路装车 -> 铁路运输 -> 铁路卸箱 -> 提柜 -> 交货 -> 还箱
 */
const SEA_RAIL_MODE_TEMPLATE: { order: number; status: StandardStatus; label: string; statuses: StandardStatus[] }[] = [
  { order: 1, status: StandardStatus.NOT_SHIPPED, label: "未出运", statuses: [StandardStatus.NOT_SHIPPED] },
  { order: 2, status: StandardStatus.EMPTY_PICKED_UP, label: "提空箱", statuses: [StandardStatus.EMPTY_PICKED_UP] },
  {
    order: 3,
    status: StandardStatus.GATE_IN,
    label: "进港",
    statuses: [StandardStatus.GATE_IN, StandardStatus.CONTAINER_STUFFED],
  },
  {
    order: 4,
    status: StandardStatus.LOADED,
    label: "装船",
    statuses: [StandardStatus.LOADED],
  },
  {
    order: 5,
    status: StandardStatus.DEPARTED,
    label: "离港",
    statuses: [StandardStatus.DEPARTED],
  },
  {
    order: 6,
    status: StandardStatus.SAILING,
    label: "海运",
    statuses: [StandardStatus.SAILING],
  },
  {
    order: 7,
    status: StandardStatus.ARRIVED,
    label: "抵港",
    statuses: [
      StandardStatus.ARRIVED, // BDAR 抵港
      StandardStatus.BERTHED, // POCA 靠泊
      StandardStatus.DELIVERY_ARRIVED, // FETA 交货地抵达
    ],
  },
  { order: 8, status: StandardStatus.DISCHARGED, label: "卸船", statuses: [StandardStatus.DISCHARGED] },
  // 铁路运输段（卸船后，提柜前）
  { order: 9, status: StandardStatus.RAIL_LOADED, label: "铁路装车", statuses: [StandardStatus.RAIL_LOADED] },
  { order: 10, status: StandardStatus.RAIL_DEPARTED, label: "铁路运输", statuses: [StandardStatus.RAIL_DEPARTED] },
  { order: 11, status: StandardStatus.RAIL_ARRIVED, label: "铁路到达", statuses: [StandardStatus.RAIL_ARRIVED] },
  { order: 12, status: StandardStatus.RAIL_DISCHARGED, label: "铁路卸箱", statuses: [StandardStatus.RAIL_DISCHARGED] },
  // 提柜交货段
  {
    order: 13,
    status: StandardStatus.GATE_OUT,
    label: "提柜",
    statuses: [
      StandardStatus.GATE_OUT,
      StandardStatus.IN_TRANSIT_TO_DEST,
      StandardStatus.DELIVERY_ARRIVED,
      StandardStatus.STRIPPED,
    ],
  },
  {
    order: 14,
    status: StandardStatus.RETURNED_EMPTY,
    label: "还箱",
    statuses: [StandardStatus.RETURNED_EMPTY, StandardStatus.COMPLETED],
  },
];

/**
 * 驳船联运模式模板
 * 起运 -> 驳船装船 -> 驳船离港 -> 驳船抵达 -> 驳船卸船 -> 海运装船 -> 海运离港 -> 海运 -> 抵港 -> 靠泊 -> 卸船 -> 可提 -> 提柜 -> 交货 -> 还箱
 */
const FEEDER_MODE_TEMPLATE: { order: number; status: StandardStatus; label: string; statuses: StandardStatus[] }[] = [
  { order: 1, status: StandardStatus.NOT_SHIPPED, label: "未出运", statuses: [StandardStatus.NOT_SHIPPED] },
  { order: 2, status: StandardStatus.EMPTY_PICKED_UP, label: "提空箱", statuses: [StandardStatus.EMPTY_PICKED_UP] },
  {
    order: 3,
    status: StandardStatus.GATE_IN,
    label: "进港",
    statuses: [StandardStatus.GATE_IN, StandardStatus.CONTAINER_STUFFED],
  },
  // 驳船运输段（海运前）
  { order: 4, status: StandardStatus.FEEDER_LOADED, label: "驳船装船", statuses: [StandardStatus.FEEDER_LOADED] },
  { order: 5, status: StandardStatus.FEEDER_DEPARTED, label: "驳船离港", statuses: [StandardStatus.FEEDER_DEPARTED] },
  { order: 6, status: StandardStatus.FEEDER_ARRIVED, label: "驳船抵达", statuses: [StandardStatus.FEEDER_ARRIVED] },
  {
    order: 7,
    status: StandardStatus.FEEDER_DISCHARGED,
    label: "驳船卸船",
    statuses: [StandardStatus.FEEDER_DISCHARGED],
  },
  // 海运段
  {
    order: 8,
    status: StandardStatus.LOADED,
    label: "海运装船",
    statuses: [StandardStatus.LOADED],
  },
  {
    order: 9,
    status: StandardStatus.DEPARTED,
    label: "海运离港",
    statuses: [StandardStatus.DEPARTED],
  },
  {
    order: 10,
    status: StandardStatus.SAILING,
    label: "海运",
    statuses: [StandardStatus.SAILING],
  },
  {
    order: 11,
    status: StandardStatus.ARRIVED,
    label: "抵港",
    statuses: [
      StandardStatus.ARRIVED, // BDAR 抵港
      StandardStatus.BERTHED, // POCA 靠泊
      StandardStatus.DELIVERY_ARRIVED, // FETA 交货地抵达
    ],
  },
  { order: 12, status: StandardStatus.DISCHARGED, label: "卸船", statuses: [StandardStatus.DISCHARGED] },
  {
    order: 13,
    status: StandardStatus.AVAILABLE,
    label: "可提",
    statuses: [
      StandardStatus.AVAILABLE, // PCAB 可提货
      StandardStatus.IN_TRANSIT_TO_DEST, // STCS 提柜后运输中
    ],
  },
  {
    order: 14,
    status: StandardStatus.GATE_OUT,
    label: "提柜",
    statuses: [
      StandardStatus.GATE_OUT, // GTOT 提柜
      StandardStatus.STRIPPED, // STRP 拆箱
    ],
  },
  {
    order: 15,
    status: StandardStatus.RETURNED_EMPTY,
    label: "还箱",
    statuses: [StandardStatus.RETURNED_EMPTY, StandardStatus.COMPLETED],
  },
];

/** 状态码优先展示的中文描述（与图片 description_cn 一致） */
const STATUS_CODE_DISPLAY: Record<string, string> = {
  STSP: "提空箱",
  GITM: "进场",
  GTIN: "卡车进场",
  LOBD: "装船",
  DLPT: "离港",
  BDAR: "抵港",
  FETA: "交货地抵达",
  POCA: "靠泊",
  DSCH: "卸船",
  STCS: "提柜 (货)",
  GTOT: "已提柜",
  GATE_OUT: "已提柜",
  RCVE: "还空箱",
  RTNE: "还空箱",
  PCAB: "可提货",
  CUIP: "海关滞留",
  PASS: "海关放行",
};

function mapStatusCodeToStandard(code: string | null): StandardStatus {
  if (!code) return StandardStatus.UNKNOWN;
  const upper = String(code).trim().toUpperCase();
  const fromWarning = FEITUO_WARNING_MAP[upper];
  if (fromWarning) return fromWarning;
  const fromMain = FEITUO_STATUS_MAP[upper];
  if (fromMain) return fromMain;
  return StandardStatus.UNKNOWN;
}

function eventToNode(e: DbEvent): StatusNode {
  const now = new Date();
  const occurredAt = e.occurred_at ? new Date(e.occurred_at) : now;
  const status = mapStatusCodeToStandard(e.status_code);
  const codeUpper = e.status_code ? String(e.status_code).trim().toUpperCase() : "";
  const description = STATUS_CODE_DISPLAY[codeUpper] || e.status_name || e.description || e.status_code || status;

  return {
    id: `evt-${e.id}`,
    status,
    description,
    timestamp: occurredAt,
    location: e.location
      ? {
          id: `loc-${e.id}`,
          name: e.location,
          code: e.location,
          type: LocationType.PORT,
        }
      : undefined,
    nodeStatus: NodeStatus.COMPLETED,
    isAlert: false,
    rawData: {
      eventCode: e.status_code,
      eventId: e.id,
      dataSource: e.data_source,
      isEstimated: e.is_estimated ?? false, // 预计状态标识
      ...(e.raw_data || {}),
    },
  };
}

/** 根据运输模式获取对应的阶段模板 */
function getTemplateByMode(mode: TransportMode) {
  switch (mode) {
    case TransportMode.SEA_RAIL:
      return SEA_RAIL_MODE_TEMPLATE;
    case TransportMode.FEEDER:
      return FEEDER_MODE_TEMPLATE;
    default:
      return STANDARD_MODE_TEMPLATE;
  }
}

/**
 * 识别运输模式
 * 基于实际发生的事件来判断
 */
function identifyTransportMode(events: DbEvent[]): TransportMode {
  const statusCodes = events.map((e) => e.status_code).filter(Boolean) as string[];

  // 检查铁路事件（海铁联运：海运后铁路转运）
  const hasRailEvents = statusCodes.some((code) => ["IRLB", "IRDP", "IRAR", "IRDS"].includes(code));

  // 检查驳船事件（驳船联运：海运前驳船集疏）
  const hasFeederEvents = statusCodes.some((code) => ["FDLB", "FDDP", "FDBA", "FDDC"].includes(code));

  // 优先级：海铁联运 > 驳船联运 > 纯海运
  if (hasRailEvents) {
    return TransportMode.SEA_RAIL;
  }

  if (hasFeederEvents) {
    return TransportMode.FEEDER;
  }

  return TransportMode.STANDARD;
}

function createPlaceholderNode(
  stageOrder: number,
  template: { order: number; status: StandardStatus; label: string; statuses: StandardStatus[] },
  refTimestamp: Date,
  orderOffset: number,
): StatusNode {
  const ts = new Date(refTimestamp.getTime() + orderOffset * 60000);
  return {
    id: `placeholder-${stageOrder}`,
    status: template.status,
    description: `${template.label} 缺数据`,
    timestamp: ts,
    nodeStatus: NodeStatus.PENDING,
    isAlert: false,
    rawData: { noData: true, stageOrder, noDataStageLabel: template.label },
  };
}

/** 流程表补充节点的展示文案 */
const SUPPLEMENT_DISPLAY: Record<number, string> = {
  7: "已抵港",
  8: "已卸船",
  9: "可提货",
  10: "已提柜",
  11: "已还空箱",
};

/** 从流程表创建补充节点（抵港/卸船/可提货/提柜/还箱） */
function createSupplementNode(
  stageOrder: number,
  template: { order: number; status: StandardStatus; label: string; statuses: StandardStatus[] },
  occurredAt: Date,
  locationCode: string | null,
  locationName: string | null,
): StatusNode {
  return {
    id: `supplement-${stageOrder}`,
    status: template.status,
    description: SUPPLEMENT_DISPLAY[stageOrder] ?? template.label,
    timestamp: occurredAt,
    location:
      locationCode || locationName
        ? {
            id: `loc-supp-${stageOrder}`,
            name: locationName || locationCode || "",
            code: locationCode || locationName || "",
            type: LocationType.PORT,
          }
        : undefined,
    nodeStatus: NodeStatus.COMPLETED,
    isAlert: false,
    rawData: { dataSource: "ProcessTable", stageOrder },
  };
}

/** 将事件按阶段分组，支持三种运输模式；缺数据时用 process 表补充 */
function buildFullPathNodes(
  events: DbEvent[],
  supplement: ProcessSupplement | null,
  portName: string | null,
  portCode: string | null,
): StatusNode[] {
  // 1. 识别运输模式
  const mode = identifyTransportMode(events);

  // 2. 根据模式选择模板
  const template = getTemplateByMode(mode);

  const nodes: StatusNode[] = [];
  const eventNodes = events.map(eventToNode);
  const now = new Date();
  let lastTimestamp = new Date(0);
  let placeholderIndex = 0;

  const stageToSupplement: Record<number, { ts: Date; locCode: string | null; locName: string | null } | null> = {
    7: supplement?.ata ? { ts: new Date(supplement.ata), locCode: portCode, locName: portName } : null,
    8: supplement?.dest_port_unload_date
      ? { ts: new Date(supplement.dest_port_unload_date), locCode: portCode, locName: portName }
      : null,
    9: supplement?.available_time
      ? { ts: new Date(supplement.available_time), locCode: portCode, locName: portName }
      : null,
    10: supplement?.gate_out_time
      ? { ts: new Date(supplement.gate_out_time), locCode: portCode, locName: portName }
      : supplement?.pickup_date
        ? { ts: new Date(supplement.pickup_date), locCode: portCode, locName: portName }
        : null,
    11: supplement?.return_time ? { ts: new Date(supplement.return_time), locCode: portCode, locName: portName } : null,
  };

  for (const templateItem of template) {
    const matching = eventNodes.filter((n) => templateItem.statuses.includes(n.status));
    if (matching.length > 0) {
      // 按时间顺序排序，取最早的事件
      const sorted = matching.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const chosen = sorted[0];
      lastTimestamp = new Date(chosen.timestamp);
      nodes.push({
        ...chosen,
        rawData: { ...chosen.rawData, stageOrder: templateItem.order, transportMode: mode },
      });
    } else {
      const supp = stageToSupplement[templateItem.order as keyof typeof stageToSupplement];
      if (supp) {
        lastTimestamp = supp.ts;
        nodes.push(createSupplementNode(templateItem.order, templateItem, supp.ts, supp.locCode, supp.locName));
      } else {
        const refTs = lastTimestamp.getTime() > 0 ? lastTimestamp : now;
        nodes.push(createPlaceholderNode(templateItem.order, templateItem, refTs, placeholderIndex++));
      }
    }
  }

  return nodes;
}

export async function getStatusPathByContainerFromDb(containerNumber: string): Promise<StatusPath | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    const [eventsResult, lastFreeResult, portResult, truckResult, returnResult] = await Promise.all([
      query<DbEvent>(
        `SELECT id, container_number, status_code, status_name, occurred_at, location, description, data_source, raw_data, is_estimated
         FROM ext_container_status_events
         WHERE container_number = $1
         ORDER BY occurred_at ASC NULLS LAST, id ASC
         LIMIT 100`,
        [containerNumber],
      ),
      query<LastFreeRow & { port_name: string | null; port_code: string | null }>(
        `SELECT last_free_date, port_name, port_code
         FROM process_port_operations
         WHERE container_number = $1 AND port_type = 'destination'
         ORDER BY port_sequence DESC
         LIMIT 1`,
        [containerNumber],
      ),
      query<{
        ata: Date | null;
        dest_port_unload_date: Date | null;
        available_time: Date | null;
        gate_out_time: Date | null;
      }>(
        `SELECT ata, dest_port_unload_date, available_time, gate_out_time
         FROM process_port_operations
         WHERE container_number = $1 AND port_type = 'destination'
         ORDER BY port_sequence DESC
         LIMIT 1`,
        [containerNumber],
      ),
      query<{ pickup_date: Date | null }>(
        `SELECT pickup_date FROM process_trucking_transport WHERE container_number = $1`,
        [containerNumber],
      ),
      query<{ return_time: Date | null; last_return_date: Date | null }>(
        `SELECT return_time, last_return_date FROM process_empty_return WHERE container_number = $1`,
        [containerNumber],
      ),
    ]);

    const events = eventsResult.rows;
    const lastFreeDate = lastFreeResult.rows[0]?.last_free_date
      ? new Date(lastFreeResult.rows[0].last_free_date)
      : null;
    const portRow = portResult.rows[0];
    const truckRow = truckResult.rows[0];
    const returnRow = returnResult.rows[0];

    // 还箱节点必须使用实际还箱时间，不能用最晚还箱日填充
    const returnTs = returnRow?.return_time ?? null;
    const supplement: ProcessSupplement | null =
      portRow || truckRow || returnRow
        ? {
            ata: portRow?.ata ?? null,
            dest_port_unload_date: portRow?.dest_port_unload_date ?? null,
            available_time: portRow?.available_time ?? null,
            gate_out_time: portRow?.gate_out_time ?? null,
            pickup_date: truckRow?.pickup_date ?? null,
            return_time: returnTs,
          }
        : null;

    const portName = lastFreeResult.rows[0]?.port_name ?? null;
    const portCode = lastFreeResult.rows[0]?.port_code ?? null;

    // 无事件且无补充数据时，用模板生成占位节点（根据实际事件识别模式）
    const mode = identifyTransportMode(events);
    const template = getTemplateByMode(mode);
    const nodes =
      events.length > 0 || supplement
        ? buildFullPathNodes(events, supplement, portName, portCode)
        : template.map((t, i) => createPlaceholderNode(t.order, t, new Date(), i));

    const processed = processStatusPath({
      nodes,
      overallStatus: PathStatus.ON_TIME,
      eta: undefined,
      startedAt: nodes[0]?.timestamp,
      completedAt: nodes[nodes.length - 1]?.timestamp,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue =
      lastFreeDate != null &&
      lastFreeDate < today &&
      !nodes.some(
        (n) =>
          (n.status === StandardStatus.RETURNED_EMPTY || n.status === StandardStatus.COMPLETED) &&
          !(n.rawData as { noData?: boolean })?.noData,
      );

    const path: StatusPath = {
      ...processed,
      id: `path-${containerNumber}-${Date.now()}`,
      containerNumber,
      transportMode: mode, // 运输模式
      createdAt: new Date(),
      updatedAt: new Date(),
      lastFreeDate: lastFreeDate ?? undefined,
      isOverdue,
      isMock: false,
    };

    return path;
  } catch (err) {
    console.error("[LogisticsPath] getStatusPathByContainerFromDb error:", err);
    return null;
  }
}

export async function validatePathFromDb(pathId: string): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
} | null> {
  const match = pathId.match(/path-(.+?)-\d+/);
  const containerNumber = match?.[1];
  if (!containerNumber) {
    return { isValid: false, errors: ["无效的 pathId"], warnings: [] };
  }

  const path = await getStatusPathByContainerFromDb(containerNumber);
  if (!path) {
    // 返回 null 让 resolver 回退到 mock 路径验证（当路径来自 mock 时）
    return null;
  }

  return validateStatusPath(path);
}
