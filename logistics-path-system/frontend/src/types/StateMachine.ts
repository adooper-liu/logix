/**
 * 状态机转换规则
 * State Machine Transition Rules
 */

import { StandardStatus } from './Logistics';

// 状态流转规则：定义哪些状态可以从当前状态转换到目标状态
export const STATUS_TRANSITIONS: Record<StandardStatus, StandardStatus[]> = {
  // 初始/计划状态
  [StandardStatus.NOT_SHIPPED]: [
    StandardStatus.PLANNED,
    StandardStatus.EMPTY_PICKED_UP,
    StandardStatus.CONTAINER_STUFFED,
    StandardStatus.GATE_IN
  ],

  [StandardStatus.PLANNED]: [
    StandardStatus.EMPTY_PICKED_UP,
    StandardStatus.CONTAINER_STUFFED,
    StandardStatus.GATE_IN
  ],

  // 起运地操作
  [StandardStatus.EMPTY_PICKED_UP]: [
    StandardStatus.CONTAINER_STUFFED,
    StandardStatus.GATE_IN,
    StandardStatus.RAIL_LOADED,
    StandardStatus.FEEDER_LOADED,
    StandardStatus.HOLD
  ],

  [StandardStatus.CONTAINER_STUFFED]: [
    StandardStatus.GATE_IN,
    StandardStatus.RAIL_LOADED,
    StandardStatus.FEEDER_LOADED,
    StandardStatus.LOADED,
    StandardStatus.HOLD
  ],

  [StandardStatus.GATE_IN]: [
    StandardStatus.RAIL_LOADED,
    StandardStatus.FEEDER_LOADED,
    StandardStatus.LOADED,
    StandardStatus.HOLD
  ],

  // 铁路运输
  [StandardStatus.RAIL_LOADED]: [
    StandardStatus.RAIL_DEPARTED,
    StandardStatus.HOLD
  ],

  [StandardStatus.RAIL_DEPARTED]: [
    StandardStatus.RAIL_ARRIVED,
    StandardStatus.DELAYED,
    StandardStatus.HOLD
  ],

  [StandardStatus.RAIL_ARRIVED]: [
    StandardStatus.RAIL_DISCHARGED,
    StandardStatus.LOADED,
    StandardStatus.DELAYED,
    StandardStatus.HOLD
  ],

  [StandardStatus.RAIL_DISCHARGED]: [
    StandardStatus.GATE_IN,
    StandardStatus.LOADED,
    StandardStatus.HOLD
  ],

  // 驳船运输
  [StandardStatus.FEEDER_LOADED]: [
    StandardStatus.FEEDER_DEPARTED,
    StandardStatus.HOLD
  ],

  [StandardStatus.FEEDER_DEPARTED]: [
    StandardStatus.FEEDER_ARRIVED,
    StandardStatus.DELAYED,
    StandardStatus.HOLD
  ],

  [StandardStatus.FEEDER_ARRIVED]: [
    StandardStatus.FEEDER_DISCHARGED,
    StandardStatus.LOADED,
    StandardStatus.DELAYED,
    StandardStatus.HOLD
  ],

  [StandardStatus.FEEDER_DISCHARGED]: [
    StandardStatus.GATE_IN,
    StandardStatus.LOADED,
    StandardStatus.HOLD
  ],

  // 海运
  [StandardStatus.LOADED]: [
    StandardStatus.DEPARTED,
    StandardStatus.HOLD
  ],

  [StandardStatus.DEPARTED]: [
    StandardStatus.SAILING,
    StandardStatus.TRANSIT_ARRIVED,
    StandardStatus.ARRIVED,
    StandardStatus.DELAYED,
    StandardStatus.HOLD
  ],

  [StandardStatus.SAILING]: [
    StandardStatus.TRANSIT_ARRIVED,
    StandardStatus.ARRIVED,
    StandardStatus.BERTHED,
    StandardStatus.DELAYED,
    StandardStatus.CONGESTION,
    StandardStatus.HOLD
  ],

  // 中转
  [StandardStatus.TRANSIT_ARRIVED]: [
    StandardStatus.TRANSIT_BERTHED,
    StandardStatus.TRANSIT_DISCHARGED,
    StandardStatus.ARRIVED,
    StandardStatus.DELAYED,
    StandardStatus.HOLD
  ],

  [StandardStatus.TRANSIT_BERTHED]: [
    StandardStatus.TRANSIT_DISCHARGED,
    StandardStatus.TRANSIT_LOADED,
    StandardStatus.HOLD
  ],

  [StandardStatus.TRANSIT_DISCHARGED]: [
    StandardStatus.TRANSIT_LOADED,
    StandardStatus.HOLD
  ],

  [StandardStatus.TRANSIT_LOADED]: [
    StandardStatus.TRANSIT_DEPARTED,
    StandardStatus.HOLD
  ],

  [StandardStatus.TRANSIT_DEPARTED]: [
    StandardStatus.ARRIVED,
    StandardStatus.DELAYED,
    StandardStatus.HOLD
  ],

  // 到港
  [StandardStatus.ARRIVED]: [
    StandardStatus.BERTHED,
    StandardStatus.DISCHARGED,
    StandardStatus.AVAILABLE,
    StandardStatus.DELAYED,
    StandardStatus.HOLD
  ],

  [StandardStatus.BERTHED]: [
    StandardStatus.DISCHARGED,
    StandardStatus.HOLD
  ],

  [StandardStatus.DISCHARGED]: [
    StandardStatus.AVAILABLE,
    StandardStatus.GATE_OUT,
    StandardStatus.CUSTOMS_HOLD,
    StandardStatus.CARRIER_HOLD,
    StandardStatus.TERMINAL_HOLD,
    StandardStatus.HOLD
  ],

  [StandardStatus.AVAILABLE]: [
    StandardStatus.IN_TRANSIT_TO_DEST,
    StandardStatus.GATE_OUT,
    StandardStatus.CUSTOMS_HOLD,
    StandardStatus.CARRIER_HOLD,
    StandardStatus.TERMINAL_HOLD,
    StandardStatus.CHARGES_HOLD,
    StandardStatus.DETENTION,
    StandardStatus.HOLD
  ],

  // 提柜/陆运
  [StandardStatus.IN_TRANSIT_TO_DEST]: [
    StandardStatus.DELIVERY_ARRIVED,
    StandardStatus.STRIPPED,
    StandardStatus.DELAYED,
    StandardStatus.HOLD
  ],

  [StandardStatus.GATE_OUT]: [
    StandardStatus.IN_TRANSIT_TO_DEST,
    StandardStatus.DELIVERY_ARRIVED,
    StandardStatus.STRIPPED,
    StandardStatus.DELAYED,
    StandardStatus.HOLD
  ],

  [StandardStatus.DELIVERY_ARRIVED]: [
    StandardStatus.STRIPPED,
    StandardStatus.RETURNED_EMPTY,
    StandardStatus.HOLD
  ],

  [StandardStatus.STRIPPED]: [
    StandardStatus.RETURNED_EMPTY,
    StandardStatus.COMPLETED
  ],

  [StandardStatus.RETURNED_EMPTY]: [
    StandardStatus.COMPLETED
  ],

  [StandardStatus.COMPLETED]: [], // 终态，不可转换

  // 扣留/滞留状态
  [StandardStatus.CUSTOMS_HOLD]: [
    StandardStatus.AVAILABLE,
    StandardStatus.GATE_OUT,
    StandardStatus.DUMPED
  ],

  [StandardStatus.CARRIER_HOLD]: [
    StandardStatus.AVAILABLE,
    StandardStatus.GATE_OUT,
    StandardStatus.DUMPED
  ],

  [StandardStatus.TERMINAL_HOLD]: [
    StandardStatus.AVAILABLE,
    StandardStatus.GATE_OUT,
    StandardStatus.DUMPED
  ],

  [StandardStatus.CHARGES_HOLD]: [
    StandardStatus.AVAILABLE,
    StandardStatus.GATE_OUT,
    StandardStatus.DUMPED
  ],

  [StandardStatus.HOLD]: [
    StandardStatus.GATE_IN,
    StandardStatus.RAIL_LOADED,
    StandardStatus.FEEDER_LOADED,
    StandardStatus.LOADED,
    StandardStatus.DEPARTED,
    StandardStatus.ARRIVED,
    StandardStatus.AVAILABLE,
    StandardStatus.GATE_OUT,
    StandardStatus.DUMPED
  ],

  // 异常状态
  [StandardStatus.DUMPED]: [
    StandardStatus.RAIL_LOADED,
    StandardStatus.FEEDER_LOADED,
    StandardStatus.LOADED,
    StandardStatus.GATE_OUT,
    StandardStatus.RETURNED_EMPTY,
    StandardStatus.COMPLETED
  ],

  // 预警状态
  [StandardStatus.DELAYED]: [
    StandardStatus.RAIL_ARRIVED,
    StandardStatus.FEEDER_ARRIVED,
    StandardStatus.ARRIVED,
    StandardStatus.BERTHED,
    StandardStatus.DISCHARGED,
    StandardStatus.AVAILABLE,
    StandardStatus.GATE_OUT,
    StandardStatus.DELIVERY_ARRIVED
  ],

  [StandardStatus.DETENTION]: [
    StandardStatus.GATE_OUT,
    StandardStatus.RETURNED_EMPTY
  ],

  [StandardStatus.OVERDUE]: [
    StandardStatus.RETURNED_EMPTY,
    StandardStatus.COMPLETED
  ],

  [StandardStatus.CONGESTION]: [
    StandardStatus.ARRIVED,
    StandardStatus.BERTHED,
    StandardStatus.DELAYED
  ],

  // 未知状态
  [StandardStatus.UNKNOWN]: [
    StandardStatus.NOT_SHIPPED,
    StandardStatus.EMPTY_PICKED_UP,
    StandardStatus.GATE_IN,
    StandardStatus.LOADED,
    StandardStatus.DEPARTED
  ]
};

// 验证状态转换是否合法
export const isValidTransition = (
  fromStatus: StandardStatus,
  toStatus: StandardStatus
): boolean => {
  const validTargets = STATUS_TRANSITIONS[fromStatus] || [];
  return validTargets.includes(toStatus);
};

// 获取状态的中文名称
export const getStatusLabel = (status: StandardStatus): string => {
  const LABELS: Record<StandardStatus, string> = {
    // 初始/计划状态
    [StandardStatus.NOT_SHIPPED]: '未出运',
    [StandardStatus.PLANNED]: '已计划',

    // 起运地操作
    [StandardStatus.EMPTY_PICKED_UP]: '已提空箱',
    [StandardStatus.CONTAINER_STUFFED]: '已装箱',
    [StandardStatus.GATE_IN]: '已进港',

    // 铁路运输
    [StandardStatus.RAIL_LOADED]: '铁路装箱',
    [StandardStatus.RAIL_DEPARTED]: '铁路离站',
    [StandardStatus.RAIL_ARRIVED]: '铁路到站',
    [StandardStatus.RAIL_DISCHARGED]: '铁路卸箱',

    // 驳船运输
    [StandardStatus.FEEDER_LOADED]: '驳船装船',
    [StandardStatus.FEEDER_DEPARTED]: '驳船离港',
    [StandardStatus.FEEDER_ARRIVED]: '驳船抵达',
    [StandardStatus.FEEDER_DISCHARGED]: '驳船卸船',

    // 海运
    [StandardStatus.LOADED]: '已装船',
    [StandardStatus.DEPARTED]: '已离港',
    [StandardStatus.SAILING]: '航行中',

    // 中转
    [StandardStatus.TRANSIT_ARRIVED]: '中转抵港',
    [StandardStatus.TRANSIT_BERTHED]: '中转停泊',
    [StandardStatus.TRANSIT_DISCHARGED]: '中转卸船',
    [StandardStatus.TRANSIT_LOADED]: '中转装船',
    [StandardStatus.TRANSIT_DEPARTED]: '中转离港',

    // 到港
    [StandardStatus.ARRIVED]: '已抵港',
    [StandardStatus.BERTHED]: '已停泊',
    [StandardStatus.DISCHARGED]: '已卸船',
    [StandardStatus.AVAILABLE]: '可提货',

    // 提柜/陆运
    [StandardStatus.IN_TRANSIT_TO_DEST]: '运输至目的地',
    [StandardStatus.GATE_OUT]: '已出港',
    [StandardStatus.DELIVERY_ARRIVED]: '已送达',
    [StandardStatus.STRIPPED]: '已拆箱',

    // 还空箱
    [StandardStatus.RETURNED_EMPTY]: '已还空箱',

    // 完成状态
    [StandardStatus.COMPLETED]: '已完成',

    // 扣留/滞留状态
    [StandardStatus.CUSTOMS_HOLD]: '海关滞留',
    [StandardStatus.CARRIER_HOLD]: '船公司滞留',
    [StandardStatus.TERMINAL_HOLD]: '码头滞留',
    [StandardStatus.CHARGES_HOLD]: '运费滞留',
    [StandardStatus.HOLD]: '扣留',

    // 异常状态
    [StandardStatus.DUMPED]: '已甩柜',

    // 预警状态
    [StandardStatus.DELAYED]: '延误',
    [StandardStatus.DETENTION]: '滞期',
    [StandardStatus.OVERDUE]: '超期',
    [StandardStatus.CONGESTION]: '拥堵',

    // 未知状态
    [StandardStatus.UNKNOWN]: '未知状态'
  };
  return LABELS[status] || status;
};

// 获取状态的优先级（数字越大优先级越高）
export const getStatusPriority = (status: StandardStatus): number => {
  const PRIORITIES: Record<StandardStatus, number> = {
    // 初始/计划状态
    [StandardStatus.NOT_SHIPPED]: 0,
    [StandardStatus.PLANNED]: 1,

    // 起运地操作
    [StandardStatus.EMPTY_PICKED_UP]: 2,
    [StandardStatus.CONTAINER_STUFFED]: 3,
    [StandardStatus.GATE_IN]: 12,

    // 铁路运输
    [StandardStatus.RAIL_LOADED]: 4,
    [StandardStatus.RAIL_DEPARTED]: 5,
    [StandardStatus.RAIL_ARRIVED]: 6,
    [StandardStatus.RAIL_DISCHARGED]: 7,

    // 驳船运输
    [StandardStatus.FEEDER_LOADED]: 8,
    [StandardStatus.FEEDER_DEPARTED]: 9,
    [StandardStatus.FEEDER_ARRIVED]: 10,
    [StandardStatus.FEEDER_DISCHARGED]: 11,

    // 海运
    [StandardStatus.LOADED]: 13,
    [StandardStatus.DEPARTED]: 14,
    [StandardStatus.SAILING]: 15,

    // 中转
    [StandardStatus.TRANSIT_ARRIVED]: 16,
    [StandardStatus.TRANSIT_BERTHED]: 17,
    [StandardStatus.TRANSIT_DISCHARGED]: 18,
    [StandardStatus.TRANSIT_LOADED]: 19,
    [StandardStatus.TRANSIT_DEPARTED]: 20,

    // 到港
    [StandardStatus.ARRIVED]: 21,
    [StandardStatus.BERTHED]: 22,
    [StandardStatus.DISCHARGED]: 23,
    [StandardStatus.AVAILABLE]: 24,

    // 提柜/陆运
    [StandardStatus.IN_TRANSIT_TO_DEST]: 26,
    [StandardStatus.GATE_OUT]: 25,
    [StandardStatus.DELIVERY_ARRIVED]: 28,
    [StandardStatus.STRIPPED]: 29,

    // 还空箱
    [StandardStatus.RETURNED_EMPTY]: 31,

    // 完成状态
    [StandardStatus.COMPLETED]: 32,

    // 扣留/滞留状态（高优先级）
    [StandardStatus.CUSTOMS_HOLD]: 200,
    [StandardStatus.CARRIER_HOLD]: 201,
    [StandardStatus.TERMINAL_HOLD]: 202,
    [StandardStatus.CHARGES_HOLD]: 203,
    [StandardStatus.HOLD]: 204,

    // 异常状态
    [StandardStatus.DUMPED]: 300,

    // 预警状态
    [StandardStatus.DELAYED]: 400,
    [StandardStatus.DETENTION]: 401,
    [StandardStatus.OVERDUE]: 402,
    [StandardStatus.CONGESTION]: 403,

    // 未知状态
    [StandardStatus.UNKNOWN]: 999
  };
  return PRIORITIES[status] || 0;
};

// 判断状态是否为异常状态
export const isAlertStatus = (status: StandardStatus): boolean => {
  const ALERT_STATUSES = [
    StandardStatus.CUSTOMS_HOLD,
    StandardStatus.CARRIER_HOLD,
    StandardStatus.TERMINAL_HOLD,
    StandardStatus.CHARGES_HOLD,
    StandardStatus.HOLD,
    StandardStatus.DUMPED,
    StandardStatus.DELAYED,
    StandardStatus.DETENTION,
    StandardStatus.OVERDUE,
    StandardStatus.CONGESTION
  ];
  return ALERT_STATUSES.includes(status);
};
