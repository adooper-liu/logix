/**
 * 飞驼API适配器实现
 * FeiTuo API Adapter Implementation
 *
 * 对接飞驼官方 API：订阅+查询（POST /application/v1/query）
 * Token 留空时返回友好错误，兼容 Excel 导入；补入 Token 后即可运行
 *
 * 参考: https://doc.freightower.com/ | 09-飞驼节点状态码解读与接入整合方案.md
 */

import axios, { AxiosInstance } from 'axios';
import { log } from '../utils/logger.js';
import { config } from '../config/index.js';
import {
  IExternalDataAdapter,
  AdapterResponse,
  ExternalDataSource,
  ContainerStatusNode,
  ContainerLoadingData,
  ContainerHoldData,
  ContainerChargeData,
} from './ExternalDataAdapter.interface.js';

/** 飞驼查询可选参数（从 process_sea_freight 等获取） */
export interface FeiTuoQueryOptions {
  billNo?: string;
  carrierCode?: string;
  portCode?: string;
  isExport?: 'E' | 'I';
  billCategory?: 'BL' | 'BK';
}

/** 飞驼 Token 接口响应 */
interface FeiTuoTokenResponse {
  statusCode?: string;
  message?: string;
  access_token?: string;
  token_type?: string;
  expires_in?: number;
}

/** 飞驼 status 节点（containers[].status[]） */
interface FeiTuoStatusNode {
  eventCode?: string;
  eventTime?: string;
  isEsti?: 'Y' | 'N';
  eventPlace?: string;
  descriptionCn?: string;
  descriptionEn?: string;
  [key: string]: unknown;
}

/** 飞驼 containers 项 */
interface FeiTuoContainerItem {
  containerNo?: string;
  status?: FeiTuoStatusNode[];
  [key: string]: unknown;
}

/** 飞驼 query 接口响应 */
interface FeiTuoQueryResponse {
  statusCode?: string;
  message?: string;
  data?: {
    result?: {
      containers?: FeiTuoContainerItem[];
    };
  };
}

export class FeiTuoAdapter implements IExternalDataAdapter {
  readonly name = 'FeiTuo Adapter';
  readonly sourceType = ExternalDataSource.FEITUO;
  readonly enabled = true;

  private axiosInstance: AxiosInstance;
  private apiBaseUrl: string;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor() {
    const cfg = config.feituo || {};
    this.apiBaseUrl = (cfg as { apiBaseUrl?: string }).apiBaseUrl || 'https://openapi.freightower.com';
    this.axiosInstance = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: (cfg as { timeout?: number }).timeout || 30000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /** 是否已配置 Token（可直接用或可获取） */
  isConfigured(): boolean {
    const cfg = config.feituo as { accessToken?: string; clientId?: string; clientSecret?: string };
    return !!(cfg?.accessToken || (cfg?.clientId && cfg?.clientSecret));
  }

  /** 获取 Token：优先用 accessToken，否则 clientId+secret 换取 */
  private async getToken(): Promise<string> {
    const cfg = config.feituo as {
      accessToken?: string;
      clientId?: string;
      clientSecret?: string;
    };
    if (cfg?.accessToken?.trim()) {
      return cfg.accessToken.trim();
    }
    if (!cfg?.clientId?.trim() || !cfg?.clientSecret?.trim()) {
      throw new Error(
        '飞驼 Token 未配置。请在 .env 中配置 FEITUO_CLIENT_ID、FEITUO_CLIENT_SECRET，或直接配置 FEITUO_ACCESS_TOKEN。前期可继续使用 Excel 导入。'
      );
    }
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 60000) {
      return this.tokenCache.token;
    }
    const res = await this.axiosInstance.post<FeiTuoTokenResponse>('/auth/api/token', {
      clientId: cfg.clientId.trim(),
      secret: cfg.clientSecret.trim(),
    });
    const token = res.data?.access_token;
    if (!token) {
      throw new Error(res.data?.message || '获取飞驼 Token 失败');
    }
    const expiresIn = (res.data?.expires_in ?? 7200) * 1000;
    this.tokenCache = { token, expiresAt: Date.now() + expiresIn };
    log.info('FeiTuo Token 获取成功');
    return token;
  }

  /**
   * 根据集装箱号获取状态节点列表
   * @param containerNumber 集装箱号
   * @param options 可选：billNo、carrierCode、portCode、isExport（从 process_sea_freight 获取）
   */
  async getContainerStatusEvents(
    containerNumber: string,
    options?: FeiTuoQueryOptions
  ): Promise<AdapterResponse<ContainerStatusNode[]>> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error:
            '飞驼 Token 未配置。请在 .env 中配置 FEITUO_CLIENT_ID、FEITUO_CLIENT_SECRET，或 FEITUO_ACCESS_TOKEN。前期可继续使用 Excel 导入。',
          source: this.sourceType,
          timestamp: new Date(),
        };
      }

      const token = await this.getToken();
      const body: Record<string, string> = {
        containerNo: containerNumber,
      };
      if (options?.billNo) body.billNo = options.billNo;
      if (options?.carrierCode) body.carrierCode = options.carrierCode;
      if (options?.portCode) body.portCode = options.portCode;
      if (options?.isExport) body.isExport = options.isExport;
      if (options?.billCategory) body.billCategory = options.billCategory;
      if (!body.carrierCode && !body.portCode && options?.carrierCode !== undefined) {
        body.carrierCode = options.carrierCode || 'AUTO';
      }

      const response = await this.axiosInstance.post<FeiTuoQueryResponse>(
        '/application/v1/query',
        body,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = response.data?.data?.result;
      const containers = data?.containers || [];
      const match = containers.find(
        (c) => (c.containerNo || '').toUpperCase() === containerNumber.toUpperCase()
      );
      const statusList = match?.status || [];

      const events: ContainerStatusNode[] = statusList.map((s) => {
        const eventTime = s.eventTime ? new Date(s.eventTime) : new Date();
        const isEsti = s.isEsti === 'Y';
        return {
          statusCode: s.eventCode || 'UNKNOWN',
          statusNameEn: s.descriptionEn || '',
          statusNameCn: s.descriptionCn || '',
          occurredAt: eventTime,
          locationCode: s.eventPlace || '',
          locationNameEn: s.eventPlace || '',
          locationNameCn: s.eventPlace || '',
          locationType: '',
          dataSource: 'FeituoAPI', // 飞驼 API 同步，与 Excel 导入的 Feituo 区分
          isFinal: !isEsti,
          isEstimated: isEsti,
        };
      });

      return {
        success: true,
        data: events,
        source: this.sourceType,
        timestamp: new Date(),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      log.error('FeiTuo getContainerStatusEvents failed:', { containerNumber, error: msg });
      return {
        success: false,
        error: msg,
        source: this.sourceType,
        timestamp: new Date(),
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      await this.getToken();
      return true;
    } catch {
      return false;
    }
  }

  async getContainerLoadingRecords(
    _containerNumber: string
  ): Promise<AdapterResponse<ContainerLoadingData[]>> {
    return {
      success: false,
      error: '飞驼适配器暂未实现装载记录接口',
      source: this.sourceType,
      timestamp: new Date(),
    };
  }

  /**
   * 获取货柜 HOLD 记录
   * 从飞驼状态事件中提取滞留/放行信息
   *
   * HOLD 类型映射:
   * - CUIP (海关滞留) -> CUSTOMS
   * - SRHD (船公司滞留) -> CARRIER
   * - TMHD (码头滞留) -> TERMINAL
   * - PASS (海关放行) -> 释放
   * - TMPS (码头放行) -> 释放
   */
  async getContainerHoldRecords(
    containerNumber: string
  ): Promise<AdapterResponse<ContainerHoldData[]>> {
    try {
      // 获取状态事件
      const statusResult = await this.getContainerStatusEvents(containerNumber);
      if (!statusResult.success || !statusResult.data) {
        return {
          success: false,
          error: statusResult.error || '获取状态事件失败',
          source: this.sourceType,
          timestamp: new Date(),
        };
      }

      const holds: ContainerHoldData[] = [];
      const events = statusResult.data;

      // HOLD 状态码映射
      const HOLD_STATUS_CODES: Record<string, { holdType: string; isHold: boolean }> = {
        CUIP: { holdType: 'CUSTOMS', isHold: true },   // 海关滞留
        SRHD: { holdType: 'CARRIER', isHold: true },  // 船公司滞留
        TMHD: { holdType: 'TERMINAL', isHold: true }, // 码头滞留
        PASS: { holdType: 'CUSTOMS', isHold: false }, // 海关放行
        TMPS: { holdType: 'TERMINAL', isHold: false }, // 码头放行
        SRRL: { holdType: 'CARRIER', isHold: false }, // 船公司放行
      };

      // 按时间排序事件
      const sortedEvents = [...events].sort(
        (a, b) => (a.occurredAt?.getTime() || 0) - (b.occurredAt?.getTime() || 0)
      );

      // 跟踪每个类型的 HOLD 状态
      const activeHolds: Map<string, ContainerHoldData> = new Map();

      for (const event of sortedEvents) {
        const mapping = HOLD_STATUS_CODES[event.statusCode];
        if (!mapping) continue;

        const key = mapping.holdType;

        if (mapping.isHold) {
          // 创建新的 HOLD 记录
          const hold: ContainerHoldData = {
            holdType: mapping.holdType,
            holdReason: event.statusNameCn || event.statusNameEn || getHoldReason(event.statusCode),
            holdDate: event.occurredAt || new Date(),
          };
          activeHolds.set(key, hold);
        } else {
          // 放行事件，找到对应的 HOLD 并更新释放信息
          const activeHold = activeHolds.get(key);
          if (activeHold) {
            activeHold.releaseDate = event.occurredAt;
            activeHold.releaseReason = event.statusNameCn || event.statusNameEn;
            holds.push(activeHold);
            activeHolds.delete(key);
          } else {
            // 没有对应的滞留记录，创建一条释放记录
            holds.push({
              holdType: mapping.holdType,
              holdReason: '',
              holdDate: new Date(0), // 未知滞留日期
              releaseDate: event.occurredAt,
              releaseReason: event.statusNameCn || event.statusNameEn,
            });
          }
        }
      }

      // 添加仍未释放的 HOLD 记录
      for (const [, hold] of activeHolds) {
        holds.push(hold);
      }

      return {
        success: true,
        data: holds,
        source: this.sourceType,
        timestamp: new Date(),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      log.error(`[FeiTuoAdapter] 获取 HOLD 记录失败: ${containerNumber}`, { error: msg });
      return {
        success: false,
        error: msg,
        source: this.sourceType,
        timestamp: new Date(),
      };
    }
  }

  async getContainerCharges(
    _containerNumber: string
  ): Promise<AdapterResponse<ContainerChargeData[]>> {
    return {
      success: false,
      error: '飞驼适配器暂未实现费用接口',
      source: this.sourceType,
      timestamp: new Date(),
    };
  }

  async syncContainerData(containerNumber: string): Promise<AdapterResponse<boolean>> {
    const res = await this.getContainerStatusEvents(containerNumber);
    return {
      success: res.success,
      data: res.success,
      error: res.error,
      source: this.sourceType,
      timestamp: new Date(),
    };
  }

  async handleWebhook(payload: unknown): Promise<AdapterResponse<boolean>> {
    log.info('FeiTuo Webhook Received:', { payload });
    return {
      success: true,
      data: true,
      source: this.sourceType,
      timestamp: new Date(),
    };
  }
}

/**
 * 根据状态码获取滞留原因描述
 */
function getHoldReason(statusCode: string): string {
  const reasons: Record<string, string> = {
    CUIP: '海关滞留 - 待清关检查',
    SRHD: '船公司滞留 - 待支付费用或文件',
    TMHD: '码头滞留 - 待支付码头费用',
  };
  return reasons[statusCode] || '未知原因';
}

export const feituoAdapter = new FeiTuoAdapter();
