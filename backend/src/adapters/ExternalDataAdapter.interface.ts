/**
 * 外部数据适配器接口
 * External Data Adapter Interface
 *
 * 定义所有外部数据源的统一接口，方便替换不同的API提供商
 */

/**
 * 集装箱状态节点接口
 */
export interface ContainerStatusNode {
  statusCode: string;
  statusNameEn: string;
  statusNameCn: string;
  occurredAt: Date;
  locationCode: string;
  locationNameEn: string;
  locationNameCn: string;
  locationType: string;
  latitude?: number;
  longitude?: number;
  timezone?: number;
  dataSource: string;
  isFinal: boolean; // 是否为最终状态
  isEstimated?: boolean; // 是否为预计时间
}

/**
 * 集装箱装载记录接口
 */
export interface ContainerLoadingData {
  vesselName: string;
  voyageNumber: string;
  billOfLadingNumber: string;
  bookingNumber: string;
  originPortCode: string;
  destPortCode: string;
  etaOrigin: Date;
  ataOrigin: Date;
  etaDest: Date;
  ataDest: Date;
  loadingDate: Date;
  dischargeDate: Date;
  routeCode: string;
  carrierCode: string;
  carrierName: string;
  operator: string;
}

/**
 * 集装箱HOLD记录接口
 */
export interface ContainerHoldData {
  holdType: string; // HOLD类型
  holdReason: string; // HOLD原因
  holdDate: Date; // HOLD日期
  releaseDate?: Date; // 释放日期
  releaseReason?: string; // 释放原因
}

/**
 * 集装箱费用记录接口
 */
export interface ContainerChargeData {
  chargeType: string; // 费用类型
  chargeAmount: number; // 费用金额
  currency: string; // 币种
  chargeDate: Date; // 费用日期
  description: string; // 费用描述
  paymentStatus?: string; // 支付状态 (PAID/UNPAID/PARTIAL)
  paymentDate?: Date; // 支付日期
}

/**
 * 外部数据源类型
 */
export enum ExternalDataSource {
  FEITUO = 'feituo',
  LOGISTICS_PATH = 'logistics_path',
  CUSTOM_API = 'custom_api',
}

/**
 * 适配器响应结果
 */
export interface AdapterResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: ExternalDataSource;
  timestamp: Date;
}

/**
 * 外部数据适配器接口
 */
export interface IExternalDataAdapter {
  /**
   * 适配器名称
   */
  readonly name: string;

  /**
   * 数据源类型
   */
  readonly sourceType: ExternalDataSource;

  /**
   * 是否启用
   */
  readonly enabled: boolean;

  /**
   * 健康检查
   */
  healthCheck(): Promise<boolean>;

  /**
   * 根据集装箱号获取状态节点列表
   */
  getContainerStatusEvents(containerNumber: string): Promise<AdapterResponse<ContainerStatusNode[]>>;

  /**
   * 根据集装箱号获取装载记录
   */
  getContainerLoadingRecords(containerNumber: string): Promise<AdapterResponse<ContainerLoadingData[]>>;

  /**
   * 根据集装箱号获取HOLD记录
   */
  getContainerHoldRecords(containerNumber: string): Promise<AdapterResponse<ContainerHoldData[]>>;

  /**
   * 根据集装箱号获取费用记录
   */
  getContainerCharges(containerNumber: string): Promise<AdapterResponse<ContainerChargeData[]>>;

  /**
   * 同步数据到数据库
   */
  syncContainerData(containerNumber: string): Promise<AdapterResponse<boolean>>;

  /**
   * Webhook回调处理
   */
  handleWebhook(payload: any): Promise<AdapterResponse<boolean>>;
}
