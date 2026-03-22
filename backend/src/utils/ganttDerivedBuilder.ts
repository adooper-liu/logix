/**
 * 甘特图「阶段 / 主任务 / 节点完成态」单一真相构建器
 * 与前端原 getContainerStage / getNodeTaskType / isNodeCompleted 规则对齐（gantt-v1）
 */

import type { EmptyReturn } from '../entities/EmptyReturn';
import type { PortOperation } from '../entities/PortOperation';
import type { TruckingTransport } from '../entities/TruckingTransport';
import type { WarehouseOperation } from '../entities/WarehouseOperation';

/** 规则版本，变更时请 bump，便于前后端与落库对照 */
export const GANTT_RULE_VERSION = 'gantt-v2';

export type GanttNodeKey = 'customs' | 'pickup' | 'unload' | 'return';

export interface GanttDerivedNode {
  key: GanttNodeKey;
  taskRole: 'main' | 'dashed' | 'none';
  completed: boolean;
  /** 甘特展示用计划日期（YYYY-MM-DD），与流程表字段一致 */
  plannedDate?: string | null;
  /** 甘特展示用实际日期（YYYY-MM-DD） */
  actualDate?: string | null;
}

export interface GanttDerivedPayload {
  phase: 1 | 2 | 3 | 4 | 5;
  phaseLabel: string;
  primaryNode: GanttNodeKey | null;
  nodes: GanttDerivedNode[];
  ruleVersion: string;
  derivedAt: string;
}

const PHASE_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '清关阶段',
  2: '提柜阶段',
  3: '卸柜阶段',
  4: '还箱阶段',
  5: '流程结束'
};

const NODE_ORDER: GanttNodeKey[] = ['customs', 'pickup', 'unload', 'return'];

function toIsoDateString(d: Date | undefined | null): string | null {
  if (!d) return null;
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  return x.toISOString().slice(0, 10);
}

function getDestinationPortOp(portOperations: PortOperation[] | undefined): PortOperation | undefined {
  return portOperations?.find((op) => op.portType === 'destination');
}

/**
 * 各节点在甘特上展示的 plan/actual 日期（与前端 calculateNodeStatus 优先级对齐）
 */
function getNodeDisplayDates(
  key: GanttNodeKey,
  portOperations: PortOperation[] | undefined,
  trucking: TruckingTransport | undefined | null,
  warehouse: WarehouseOperation | undefined | null,
  emptyReturn: EmptyReturn | undefined | null
): { plannedDate: string | null; actualDate: string | null } {
  const dest = getDestinationPortOp(portOperations);

  switch (key) {
    case 'customs': {
      if (!dest) return { plannedDate: null, actualDate: null };
      if (dest.actualCustomsDate) {
        return {
          actualDate: toIsoDateString(dest.actualCustomsDate),
          plannedDate:
            toIsoDateString(dest.plannedCustomsDate) ??
            toIsoDateString(dest.ata) ??
            toIsoDateString(dest.eta)
        };
      }
      if (dest.plannedCustomsDate) {
        return { plannedDate: toIsoDateString(dest.plannedCustomsDate), actualDate: null };
      }
      if (dest.ata) return { plannedDate: toIsoDateString(dest.ata), actualDate: null };
      if (dest.eta) return { plannedDate: toIsoDateString(dest.eta), actualDate: null };
      return { plannedDate: null, actualDate: null };
    }
    case 'pickup': {
      const t = trucking;
      if (!t) return { plannedDate: null, actualDate: null };
      if (t.deliveryDate) {
        return {
          actualDate: toIsoDateString(t.deliveryDate),
          plannedDate:
            toIsoDateString(t.plannedDeliveryDate) ??
            toIsoDateString(t.plannedPickupDate) ??
            null
        };
      }
      if (t.plannedDeliveryDate) {
        return { plannedDate: toIsoDateString(t.plannedDeliveryDate), actualDate: null };
      }
      if (t.pickupDate) {
        return {
          actualDate: toIsoDateString(t.pickupDate),
          plannedDate: toIsoDateString(t.plannedPickupDate) ?? null
        };
      }
      if (t.plannedPickupDate) {
        return { plannedDate: toIsoDateString(t.plannedPickupDate), actualDate: null };
      }
      return { plannedDate: null, actualDate: null };
    }
    case 'unload': {
      const w = warehouse;
      if (!w) return { plannedDate: null, actualDate: null };
      if (w.unloadDate) {
        return {
          actualDate: toIsoDateString(w.unloadDate),
          plannedDate: toIsoDateString(w.plannedUnloadDate)
        };
      }
      if (w.plannedUnloadDate) {
        return { plannedDate: toIsoDateString(w.plannedUnloadDate), actualDate: null };
      }
      return { plannedDate: null, actualDate: null };
    }
    case 'return': {
      const e = emptyReturn;
      if (!e) return { plannedDate: null, actualDate: null };
      if (e.returnTime) {
        return {
          actualDate: toIsoDateString(e.returnTime),
          plannedDate: toIsoDateString(e.lastReturnDate)
        };
      }
      if (e.lastReturnDate) {
        return { plannedDate: toIsoDateString(e.lastReturnDate), actualDate: null };
      }
      return { plannedDate: null, actualDate: null };
    }
    default:
      return { plannedDate: null, actualDate: null };
  }
}

/** 与前端 useGanttLogic.getContainerStage 一致 */
export function computeGanttPhase(
  portOperations: PortOperation[] | undefined,
  trucking: TruckingTransport | undefined | null,
  warehouse: WarehouseOperation | undefined | null,
  emptyReturn: EmptyReturn | undefined | null
): 1 | 2 | 3 | 4 | 5 {
  if (emptyReturn?.returnTime) return 5;
  if (warehouse?.unloadDate) return 4;
  if (trucking?.deliveryDate) return 3;
  const dest = getDestinationPortOp(portOperations);
  if (dest?.actualCustomsDate) return 2;
  return 1;
}

function nodeCompleted(
  key: GanttNodeKey,
  portOperations: PortOperation[] | undefined,
  trucking: TruckingTransport | undefined | null,
  warehouse: WarehouseOperation | undefined | null,
  emptyReturn: EmptyReturn | undefined | null
): boolean {
  const dest = getDestinationPortOp(portOperations);
  switch (key) {
    case 'customs':
      return !!dest?.actualCustomsDate;
    case 'pickup':
      return !!trucking?.deliveryDate;
    case 'unload':
      return !!warehouse?.unloadDate;
    case 'return':
      return !!emptyReturn?.returnTime;
    default:
      return false;
  }
}

function buildNodes(
  stage: 1 | 2 | 3 | 4 | 5,
  portOperations: PortOperation[] | undefined,
  trucking: TruckingTransport | undefined | null,
  warehouse: WarehouseOperation | undefined | null,
  emptyReturn: EmptyReturn | undefined | null
): GanttDerivedNode[] {
  return NODE_ORDER.map((key, nodeIndex) => {
    let taskRole: GanttDerivedNode['taskRole'];
    if (stage === 5) {
      taskRole = 'none';
    } else if (nodeIndex >= stage) {
      taskRole = 'none';
    } else if (nodeIndex === stage - 1) {
      taskRole = 'main';
    } else {
      taskRole = 'dashed';
    }
    const dates = getNodeDisplayDates(key, portOperations, trucking, warehouse, emptyReturn);
    return {
      key,
      taskRole,
      completed: nodeCompleted(key, portOperations, trucking, warehouse, emptyReturn),
      plannedDate: dates.plannedDate,
      actualDate: dates.actualDate
    };
  });
}

/**
 * 根据流程表快照构建甘特派生数据（可落库 biz_containers.gantt_derived）
 */
export function buildGanttDerived(
  portOperations: PortOperation[] | undefined,
  trucking: TruckingTransport | undefined | null,
  warehouse: WarehouseOperation | undefined | null,
  emptyReturn: EmptyReturn | undefined | null
): GanttDerivedPayload {
  const phase = computeGanttPhase(portOperations, trucking, warehouse, emptyReturn);
  const primaryNode: GanttNodeKey | null = phase === 5 ? null : NODE_ORDER[phase - 1];
  return {
    phase,
    phaseLabel: PHASE_LABELS[phase],
    primaryNode,
    nodes: buildNodes(phase, portOperations, trucking, warehouse, emptyReturn),
    ruleVersion: GANTT_RULE_VERSION,
    derivedAt: new Date().toISOString()
  };
}

/** 用于判断是否需要写库（忽略 derivedAt 毫秒差异） */
export function ganttDerivedSemanticEqual(
  a: GanttDerivedPayload | null | undefined,
  b: GanttDerivedPayload
): boolean {
  if (!a) return false;
  return (
    a.phase === b.phase &&
    a.primaryNode === b.primaryNode &&
    a.ruleVersion === b.ruleVersion &&
    JSON.stringify(a.nodes) === JSON.stringify(b.nodes)
  );
}
