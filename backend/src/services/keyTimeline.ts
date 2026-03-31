/**
 * 货柜详情「关键日期」时间线指标（历时 / 倒计时 / 超期）
 * 与滞港费计算同源：由 buildKeyTimeline 基于 calculationDates + 状态机结论生成。
 *
 * 节点与展示规则对齐：
 * - frontend/src/views/shipments/components/KeyDatesTimeline.vue（事件列表、hasNextEffective）
 * - frontend/src/components/common/DurationDisplay.vue（displayType / 文案）
 *
 * @see frontend/public/docs/demurrage/14-TIMELINE_METRICS_MINIMAL_PLAN.md
 */

/** 与前端时间线里程碑一一对应（稳定键） */
export type KeyTimelineMilestoneKey =
  | 'shipment'
  | 'eta'
  | 'revised_eta'
  | 'ata'
  | 'discharge'
  | 'last_pickup'
  | 'pickup_actual'
  | 'last_return'
  | 'return_actual';

export type KeyTimelineDisplayMode = 'elapsed' | 'countdown' | 'overdue' | 'none';

export interface KeyTimelineNodeDto {
  milestoneKey: KeyTimelineMilestoneKey;
  date: string | null;
  hasNextEffective: boolean;
  nextMilestoneDate: string | null;
  prevMilestoneDate: string | null;
  displayMode: KeyTimelineDisplayMode;
  isKeyNode: boolean;
  standardHours: number;
  displayDays?: number;
  displayText?: string;
}

export interface KeyTimelineMetaDto {
  calculationMode: 'actual' | 'forecast';
  arrivedAtDestinationPort: boolean;
  warnings?: string[];
}

export interface KeyTimelineResult {
  nodes: KeyTimelineNodeDto[];
  meta: KeyTimelineMetaDto;
}

/** buildKeyTimeline 入参：与 DemurrageService 内 calculationDates（Date 层）对齐 */
export interface KeyTimelineBuildInput {
  containerNumber: string;
  calculationMode: 'actual' | 'forecast';
  arrivedAtDestinationPort: boolean;
  dateOrderWarnings?: string[];
  calculationDates: {
    today: Date;
    ataDestPort: Date | null;
    etaDestPort: Date | null;
    revisedEtaDestPort: Date | null;
    dischargeDate: Date | null;
    lastPickupDate: Date | null;
    plannedPickupDate: Date | null;
    lastPickupDateComputed?: Date | null;
    lastReturnDate?: Date | null;
    lastReturnDateComputed?: Date | null;
    pickupDateActual: Date | null;
    returnTime: Date | null;
    plannedReturnDate?: Date | null;
    /** 出运日（备货 actual_ship_date / 海运 shipment_date），可选 */
    shipmentDate?: Date | null;
  };
}

/** 与 KeyDatesTimeline STANDARD_DURATIONS 一致（小时） */
const STANDARD_LAST_PICKUP_HOURS = 24 * 7;
const STANDARD_LAST_RETURN_HOURS = 24 * 7;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

type TimelineLabel =
  | '出运'
  | 'ETA'
  | '修正ETA'
  | 'ATA'
  | '卸船'
  | '最晚提柜'
  | '实际提柜'
  | '最晚还箱'
  | '实际还箱';

interface WorkingEvent {
  label: TimelineLabel;
  milestoneKey: KeyTimelineMilestoneKey;
  date: Date;
  /** 与 KeyDatesTimeline：info 节点不展示历时条（卸船） */
  kind: 'primary' | 'danger' | 'success' | 'info';
}

function formatIsoDate(d: Date | null): string | null {
  if (!d || isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function safeDate(d: Date | null | undefined): Date | null {
  if (!d) return null;
  return isNaN(d.getTime()) ? null : d;
}

/** 与 DurationDisplay.getElapsedText 一致 */
function buildElapsedText(nodeDate: Date, nextDate: Date | null, prevDate: Date | null): string {
  if (nextDate) {
    const diffDays = Math.floor((nextDate.getTime() - nodeDate.getTime()) / MS_PER_DAY);
    if (diffDays <= 0) return '';
    if (diffDays === 1) return '历时1天';
    return `历时${diffDays}天`;
  }
  if (prevDate) {
    const diffDays = Math.floor((nodeDate.getTime() - prevDate.getTime()) / MS_PER_DAY);
    if (diffDays <= 0) return '';
    if (diffDays === 1) return '历时1天';
    return `历时${diffDays}天`;
  }
  return '';
}

/** 与 DurationDisplay.getCountdownText */
function buildCountdownText(nodeDate: Date, now: Date): string {
  const diffDays = Math.ceil((nodeDate.getTime() - now.getTime()) / MS_PER_DAY);
  if (diffDays <= 0) return '今天到期';
  if (diffDays === 1) return '倒计时1天';
  return `倒计时${diffDays}天`;
}

/** 与 DurationDisplay.getOverdueText（overdueDays） */
function buildOverdueText(nodeDate: Date, now: Date): string {
  const time = now.getTime() - nodeDate.getTime();
  const diffDays = Math.floor(time / MS_PER_DAY);
  if (diffDays <= 0) return '';
  if (diffDays === 1) return '已超 1 天';
  return `已超${diffDays}天`;
}

/**
 * 是否存在「有效」下一业务环节（对齐 KeyDatesTimeline.getEffectiveHasNextNode，不含「当前」节点）
 */
function getEffectiveHasNextNode(
  label: TimelineLabel,
  index: number,
  events: WorkingEvent[],
  pickupActual: Date | null,
  returnTime: Date | null,
  now: Date
): boolean {
  if (label === '最晚提柜') {
    if (!pickupActual || isNaN(pickupActual.getTime())) return false;
    return pickupActual.getTime() < now.getTime();
  }
  if (label === '最晚还箱') {
    if (!returnTime || isNaN(returnTime.getTime())) return false;
    return returnTime.getTime() < now.getTime();
  }
  for (let j = index + 1; j < events.length; j++) {
    const nextEvent = events[j];
    if (nextEvent.date.getTime() < now.getTime()) {
      return true;
    }
  }
  return false;
}

/** 下一业务里程碑日期（对齐 getNextBusinessNodeDate，列表中无「当前」时即为下一项） */
function getNextMilestoneDate(index: number, events: WorkingEvent[]): Date | null {
  if (index + 1 >= events.length) return null;
  return events[index + 1]?.date ?? null;
}

function getPrevMilestoneDate(index: number, events: WorkingEvent[]): Date | null {
  if (index <= 0) return null;
  return events[index - 1]?.date ?? null;
}

/**
 * 与 DurationDisplay displayType（mode=auto, isCurrentNode=false）一致
 */
function computeDisplayMode(params: {
  hasNextNode: boolean;
  isKeyNode: boolean;
  standardHours: number;
  nodeDate: Date;
  now: Date;
  milestoneKey: KeyTimelineMilestoneKey;
  prevMilestone: Date | null;
}): KeyTimelineDisplayMode {
  const { hasNextNode, isKeyNode, nodeDate, now, milestoneKey, prevMilestone } = params;
  if (hasNextNode) {
    return 'elapsed';
  }
  /** 实际还箱为业务闭环终点：历时 = 本节点 - 上一节点，非相对今天的超期 */
  if (milestoneKey === 'return_actual' && prevMilestone) {
    return 'elapsed';
  }
  const time = now.getTime() - nodeDate.getTime();
  if (time < 0) {
    return 'countdown';
  }
  if (isKeyNode) {
    return 'overdue';
  }
  return 'elapsed';
}

/**
 * 与 DurationDisplay displayText（mode=auto, isCurrentNode=false）一致
 */
function computeDisplayText(params: {
  hasNextNode: boolean;
  isKeyNode: boolean;
  nodeDate: Date;
  nextDate: Date | null;
  prevDate: Date | null;
  now: Date;
  milestoneKey: KeyTimelineMilestoneKey;
}): string {
  const { hasNextNode, nodeDate, nextDate, prevDate, now, milestoneKey } = params;
  if (hasNextNode) {
    return buildElapsedText(nodeDate, nextDate, prevDate);
  }
  if (milestoneKey === 'return_actual' && prevDate) {
    return buildElapsedText(nodeDate, null, prevDate);
  }
  const time = now.getTime() - nodeDate.getTime();
  if (time < 0) {
    return buildCountdownText(nodeDate, now);
  }
  return buildOverdueText(nodeDate, now);
}

function computeDisplayDays(
  displayMode: KeyTimelineDisplayMode,
  nodeDate: Date,
  now: Date
): number | undefined {
  const time = now.getTime() - nodeDate.getTime();
  if (displayMode === 'countdown') {
    return Math.ceil((nodeDate.getTime() - now.getTime()) / MS_PER_DAY);
  }
  if (displayMode === 'overdue') {
    const d = Math.floor(time / MS_PER_DAY);
    return d > 0 ? d : undefined;
  }
  return undefined;
}

/**
 * 构建关键日期时间线指标。
 */
export function buildKeyTimeline(input: KeyTimelineBuildInput): KeyTimelineResult {
  const now = new Date();
  const cd = input.calculationDates;

  const lastPickup = cd.lastPickupDateComputed ?? cd.lastPickupDate ?? null;
  const lastReturn = cd.lastReturnDateComputed ?? cd.lastReturnDate ?? null;

  const raw: Array<WorkingEvent | null> = [
    safeDate(cd.shipmentDate)
      ? {
          label: '出运',
          milestoneKey: 'shipment',
          date: safeDate(cd.shipmentDate)!,
          kind: 'primary'
        }
      : null,
    safeDate(cd.etaDestPort)
      ? { label: 'ETA', milestoneKey: 'eta', date: safeDate(cd.etaDestPort)!, kind: 'primary' }
      : null,
    safeDate(cd.revisedEtaDestPort)
      ? {
          label: '修正ETA',
          milestoneKey: 'revised_eta',
          date: safeDate(cd.revisedEtaDestPort)!,
          kind: 'primary'
        }
      : null,
    safeDate(cd.ataDestPort)
      ? { label: 'ATA', milestoneKey: 'ata', date: safeDate(cd.ataDestPort)!, kind: 'primary' }
      : null,
    safeDate(cd.dischargeDate)
      ? {
          label: '卸船',
          milestoneKey: 'discharge',
          date: safeDate(cd.dischargeDate)!,
          kind: 'info'
        }
      : null,
    safeDate(lastPickup)
      ? {
          label: '最晚提柜',
          milestoneKey: 'last_pickup',
          date: safeDate(lastPickup)!,
          kind: 'danger'
        }
      : null,
    safeDate(cd.pickupDateActual)
      ? {
          label: '实际提柜',
          milestoneKey: 'pickup_actual',
          date: safeDate(cd.pickupDateActual)!,
          kind: 'success'
        }
      : null,
    safeDate(lastReturn)
      ? {
          label: '最晚还箱',
          milestoneKey: 'last_return',
          date: safeDate(lastReturn)!,
          kind: 'danger'
        }
      : null,
    safeDate(cd.returnTime)
      ? {
          label: '实际还箱',
          milestoneKey: 'return_actual',
          date: safeDate(cd.returnTime)!,
          kind: 'success'
        }
      : null
  ];

  const events: WorkingEvent[] = raw.filter((e): e is WorkingEvent => e !== null);
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  const pickupActual = safeDate(cd.pickupDateActual);
  const returnTime = safeDate(cd.returnTime);

  const nodes: KeyTimelineNodeDto[] = [];

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const nextMilestone = getNextMilestoneDate(i, events);
    const prevMilestone = getPrevMilestoneDate(i, events);

    const hasNextEffective = getEffectiveHasNextNode(
      ev.label,
      i,
      events,
      pickupActual,
      returnTime,
      now
    );

    if (ev.kind === 'info') {
      nodes.push({
        milestoneKey: ev.milestoneKey,
        date: formatIsoDate(ev.date),
        hasNextEffective,
        nextMilestoneDate: formatIsoDate(nextMilestone),
        prevMilestoneDate: formatIsoDate(prevMilestone),
        displayMode: 'none',
        isKeyNode: false,
        standardHours: 0,
        displayText: ''
      });
      continue;
    }

    const isKeyNode = ev.label === '最晚提柜' || ev.label === '最晚还箱';
    const standardHours =
      ev.label === '最晚提柜'
        ? STANDARD_LAST_PICKUP_HOURS
        : ev.label === '最晚还箱'
          ? STANDARD_LAST_RETURN_HOURS
          : 0;

    const displayMode = computeDisplayMode({
      hasNextNode: hasNextEffective,
      isKeyNode,
      standardHours,
      nodeDate: ev.date,
      now,
      milestoneKey: ev.milestoneKey,
      prevMilestone
    });

    const displayText = computeDisplayText({
      hasNextNode: hasNextEffective,
      isKeyNode,
      nodeDate: ev.date,
      nextDate: nextMilestone,
      prevDate: prevMilestone,
      now,
      milestoneKey: ev.milestoneKey
    });

    const displayDays =
      displayMode === 'elapsed' && ev.milestoneKey === 'return_actual' && prevMilestone
        ? Math.max(0, Math.floor((ev.date.getTime() - prevMilestone.getTime()) / MS_PER_DAY))
        : computeDisplayDays(displayMode, ev.date, now);

    nodes.push({
      milestoneKey: ev.milestoneKey,
      date: formatIsoDate(ev.date),
      hasNextEffective,
      nextMilestoneDate: formatIsoDate(nextMilestone),
      prevMilestoneDate: formatIsoDate(prevMilestone),
      displayMode,
      isKeyNode,
      standardHours,
      displayDays,
      displayText
    });
  }

  return {
    nodes,
    meta: {
      calculationMode: input.calculationMode,
      arrivedAtDestinationPort: input.arrivedAtDestinationPort,
      warnings: input.dateOrderWarnings
    }
  };
}
