/**
 * 飞驼API places 数据结构接口
 * 用于处理飞驼API返回的 places 数组数据
 *
 * @文档 https://doc.freightower.com/
 * @作者 LogiX Team
 * @日期 2026-03-18
 */

/**
 * 地点类型枚举
 * PRE: 收货地
 * POL: 起运港
 * POD: 目的港
 * PDE: 交货地
 */
export type PlaceType = 'PRE' | 'POL' | 'POD' | 'PDE';

/**
 * 地点状态枚举
 * 描述地点在物流链中的状态
 */
export type PlaceStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

/**
 * 飞驼API单个地点信息
 * 包含港口/地点的详细信息和时间节点
 */
export interface FeituoPlace {
  /** 地点类型 (PRE/POL/POD/PDE) */
  type: PlaceType;

  /** 地点代码（如港口代码 CNSHA） */
  locationCode: string;

  /** 地点英文名称 */
  locationNameEn?: string;

  /** 地点中文名称 */
  locationNameCn?: string;

  /** 预计到达时间 (ETA) */
  eta?: string;

  /** 实际到达时间 (ATA) */
  ata?: string;

  /** 预计离港时间 (ETD) */
  etd?: string;

  /** 实际离港时间 (ATD) */
  atd?: string;

  /** 地点状态 */
  status?: PlaceStatus;

  /** 地点顺序（在物流链中的位置） */
  sequence?: number;

  /** 操作类型（装货/卸货/中转） */
  operationType?: 'LOAD' | 'DISCHARGE' | 'TRANSSHIPMENT';

  /** 运输模式（大船/驳船/铁路/卡车） */
  transportMode?: string;

  /** 承运人代码 */
  carrierCode?: string;

  /** 承运人名称 */
  carrierName?: string;

  /** 航次号 */
  voyageNumber?: string;

  /** 备注信息 */
  remark?: string;

  /** 原始数据（保留所有飞驼返回的字段） */
  rawData?: Record<string, any>;
}

/**
 * 飞驼API places 数组响应
 * 一个完整的物流路径可能包含多个地点
 */
export interface FeituoPlacesResponse {
  /** 提单号 */
  billNo: string;

  /** 集装箱号 */
  containerNo: string;

  /** 地点列表（按sequence排序） */
  places: FeituoPlace[];

  /** 总地点数量 */
  totalPlaces: number;

  /** 响应时间戳 */
  timestamp: string;
}

/**
 * 飞驼API完整响应（包含trackingEvents和places）
 */
export interface FeituoCompleteResponse {
  /** 查询参数 */
  query: {
    param: any;
    actualParam: any;
    method: string;
  };

  /** 业务数据 */
  result: {
    /** 跟踪事件（已有） */
    trackingEvents: any[];

    /** 地点信息（新增） */
    places: FeituoPlace[];

    /** 其他字段 */
    [key: string]: any;
  };

  /** 响应状态 */
  code: number;

  /** 响应消息 */
  message: string;
}

/**
 * places数据到港口操作记录的映射配置
 */
export interface PlaceToPortOperationMapping {
  /** 地点类型对应的港口类型 */
  placeTypeToPortType: {
    PRE: 'origin' | null;
    POL: 'origin';
    POD: 'destination';
    PDE: 'destination' | null;
  };

  /** 操作类型对应的状态码 */
  operationToStatusCode: {
    LOAD: string[];    // 装船状态码
    DISCHARGE: string[]; // 卸船状态码
    TRANSSHIPMENT: string[]; // 中转状态码
  };

  /** 默认状态码 */
  defaultStatusCodes: {
    origin: string[];
    transit: string[];
    destination: string[];
  };
}

/**
 * places数据处理结果
 */
export interface PlaceProcessingResult {
  /** 成功处理的地点数量 */
  successCount: number;

  /** 失败的地点数量 */
  failedCount: number;

  /** 生成的港口操作记录 */
  portOperations: any[];

  /** 生成的状态事件 */
  statusEvents: any[];

  /** 错误信息 */
  errors: string[];

  /** 处理时间（毫秒） */
  processingTime: number;
}
