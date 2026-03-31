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
const FULL_PATH_TEMPLATE: { order: number; status: StandardStatus; label: string; statuses: StandardStatus[] }[] = [
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
    statuses: [StandardStatus.LOADED, StandardStatus.RAIL_LOADED, StandardStatus.FEEDER_LOADED],
  },
  {
    order: 5,
    status: StandardStatus.DEPARTED,
    label: "离港",
    statuses: [StandardStatus.DEPARTED, StandardStatus.RAIL_DEPARTED, StandardStatus.FEEDER_DEPARTED],
  },
  {
    order: 6,
    status: StandardStatus.SAILING,
    label: "航行",
    statuses: [
      StandardStatus.SAILING,
      StandardStatus.TRANSIT_ARRIVED,
      StandardStatus.TRANSIT_BERTHED,
      StandardStatus.TRANSIT_DISCHARGED,
      StandardStatus.TRANSIT_LOADED,
      StandardStatus.TRANSIT_DEPARTED,
      StandardStatus.FEEDER_ARRIVED,
      StandardStatus.FEEDER_DISCHARGED,
      StandardStatus.RAIL_ARRIVED,
      StandardStatus.RAIL_DISCHARGED,
    ],
  },
  {
    order: 7,
    status: StandardStatus.ARRIVED,
    label: "抵港",
    statuses: [StandardStatus.ARRIVED, StandardStatus.BERTHED],
  },
  { order: 8, status: StandardStatus.DISCHARGED, label: "卸船", statuses: [StandardStatus.DISCHARGED] },
  { order: 9, status: StandardStatus.AVAILABLE, label: "可提货", statuses: [StandardStatus.AVAILABLE] },
  {
    order: 10,
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
    order: 11,
    status: StandardStatus.RETURNED_EMPTY,
    label: "还箱",
    statuses: [StandardStatus.RETURNED_EMPTY, StandardStatus.COMPLETED],
  },
];

/** 状态码优先展示的中文描述 */
const STATUS_CODE_DISPLAY: Record<string, string> = {
  STCS: "已提柜",
  GTOT: "已提柜",
  GATE_OUT: "已提柜",
  PCAB: "可提货",
  DSCH: "卸船",
  BDAR: "抵港",
  LOBD: "装船",
  RCVE: "已还空箱",
  RTNE: "已还空箱",
  GITM: "进场",
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
      ...(e.raw_data || {}),
    },
  };
}

function createPlaceholderNode(
  stageOrder: number,
  template: (typeof FULL_PATH_TEMPLATE)[0],
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
  template: (typeof FULL_PATH_TEMPLATE)[0],
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

/** 将事件按阶段分组，每阶段取最早事件；缺数据时用 process 表补充 */
function buildFullPathNodes(
  events: DbEvent[],
  supplement: ProcessSupplement | null,
  portName: string | null,
  portCode: string | null,
): StatusNode[] {
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

  for (const template of FULL_PATH_TEMPLATE) {
    const matching = eventNodes.filter((n) => template.statuses.includes(n.status));
    if (matching.length > 0) {
      const sorted = matching.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const chosen = sorted[0];
      lastTimestamp = new Date(chosen.timestamp);
      nodes.push({
        ...chosen,
        rawData: { ...chosen.rawData, stageOrder: template.order },
      });
    } else {
      const supp = stageToSupplement[template.order as keyof typeof stageToSupplement];
      if (supp) {
        lastTimestamp = supp.ts;
        nodes.push(createSupplementNode(template.order, template, supp.ts, supp.locCode, supp.locName));
      } else {
        const refTs = lastTimestamp.getTime() > 0 ? lastTimestamp : now;
        nodes.push(createPlaceholderNode(template.order, template, refTs, placeholderIndex++));
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
        `SELECT id, container_number, status_code, status_name, occurred_at, location, description, data_source, raw_data
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

    const nodes =
      events.length > 0 || supplement
        ? buildFullPathNodes(events, supplement, portName, portCode)
        : FULL_PATH_TEMPLATE.map((t, i) => createPlaceholderNode(t.order, t, new Date(), i));

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
