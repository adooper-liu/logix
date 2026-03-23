/**
 * 货柜服务
 * Container Service
 */

import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  Container,
  ContainerFilters,
  ContainerResponse,
  ContainerStats
} from '@/types/container';
import type { PaginationParams } from '@/types';
import { camelToSnake } from '@/utils/camelToSnake';
import { cacheManager } from '@/utils/cacheManager';
import { useAppStore } from '@/store/app';

class ContainerService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',
      timeout: 120000
    });

    // 请求拦截器
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        const appStore = useAppStore();
        if (appStore.scopedCountryCode) {
          config.headers['X-Country-Code'] = appStore.scopedCountryCode;
        }
        // 避免浏览器对 GET /containers、/statistics-detailed 等使用 304 空响应
        if (String(config.method || 'get').toLowerCase() === 'get') {
          config.headers['Cache-Control'] = 'no-cache';
          config.headers['Pragma'] = 'no-cache';
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * 获取货柜列表
   * Get containers list
   */
  async getContainers(filters: ContainerFilters): Promise<ContainerResponse> {
    const response = await this.api.get('/containers', {
      params: filters
    });
    return response.data;
  }

  /**
   * 获取带缓存的货柜列表
   * Get cached containers list
   */
  getContainersWithCache = cacheManager.createCachedFunction(
    'containers',
    this.getContainers.bind(this),
    (filters: ContainerFilters) => JSON.stringify(filters),
    30000 // 30秒缓存
  )

  /**
   * 获取货柜详情
   * Get container details
   */
  async getContainerById(id: string): Promise<{ success: boolean; data: Container }> {
    const response = await this.api.get(`/containers/${id}`);
    return response.data;
  }

  /**
   * 创建货柜
   * Create container
   */
  async createContainer(container: Partial<Container>): Promise<{ success: boolean; data: Container }> {
    const response = await this.api.post('/containers', camelToSnake(container as Record<string, any>));
    // 清除相关缓存
    cacheManager.clearContainersCache();
    cacheManager.clearStatisticsCache();
    return response.data;
  }

  /**
   * 更新货柜
   * Update container
   */
  async updateContainer(id: string, container: Partial<Container>): Promise<{ success: boolean; data: Container }> {
    const response = await this.api.put(`/containers/${id}`, camelToSnake(container as Record<string, any>));
    // 清除相关缓存
    cacheManager.clearContainersCache();
    cacheManager.clearStatisticsCache();
    return response.data;
  }

  /**
   * 删除货柜
   * Delete container
   */
  async deleteContainer(id: string): Promise<{ success: boolean }> {
    const response = await this.api.delete(`/containers/${id}`);
    // 清除相关缓存
    cacheManager.clearContainersCache();
    cacheManager.clearStatisticsCache();
    return response.data;
  }

  /**
   * 手工重算 gantt_derived（gantt-v2）及物流状态；全表或前 N 条
   * POST /api/v1/containers/rebuild-gantt-derived
   */
  async rebuildGanttDerivedSnapshot(params?: {
    maxContainers?: number
  }): Promise<{
    success: boolean
    processed: number
    updatedCount: number
    message?: string
  }> {
    const response = await this.api.post(
      '/containers/rebuild-gantt-derived',
      params?.maxContainers != null ? { maxContainers: params.maxContainers } : {},
      { timeout: 600000 }
    )
    cacheManager.clearContainersCache()
    cacheManager.clearStatisticsCache()
    return response.data
  }

  /**
   * 更新货柜计划（手工排柜）
   * PATCH /api/containers/:id/schedule
   */
  async updateSchedule(
    id: string,
    schedule: {
      plannedCustomsDate?: string;
      plannedPickupDate?: string;
      plannedDeliveryDate?: string;
      plannedUnloadDate?: string;
      plannedReturnDate?: string;
      truckingCompanyId?: string;
      customsBrokerCode?: string;
      warehouseId?: string;
      unloadModePlan?: string;
    }
  ): Promise<{ success: boolean; message?: string }> {
    const response = await this.api.patch(`/containers/${id}/schedule`, schedule);
    // 清除相关缓存
    cacheManager.clearContainersCache();
    cacheManager.clearStatisticsCache();
    return response.data;
  }

  /**
   * 批量排产（智能排柜）
   * POST /api/scheduling/batch-schedule
   */
  async batchSchedule(params: {
    country?: string
    startDate?: string
    endDate?: string
    forceSchedule?: boolean
    limit?: number
    skip?: number
  }): Promise<{
    success: boolean
    total: number
    successCount: number
    failedCount: number
    results: Array<{
      containerNumber: string
      success: boolean
      message?: string
      plannedData?: Record<string, string>
    }>
    hasMore?: boolean
  }> {
    const response = await this.api.post('/scheduling/batch-schedule', params, {
      timeout: 180000 // 3 分钟，排产可能较耗时
    })
    // 清除相关缓存
    cacheManager.clearContainersCache();
    cacheManager.clearStatisticsCache();
    cacheManager.clearSchedulingCache();
    return response.data
  }

  /**
   * 获取排产概览信息
   * GET /api/scheduling/overview
   */
  async getSchedulingOverview(params?: {
    startDate?: string
    endDate?: string
    country?: string
  }): Promise<{
    success: boolean
    data: {
      pendingCount: number
      initialCount: number
      issuedCount: number
      warehouses: Array<{
        code: string
        name: string
        country: string
        dailyCapacity: number
      }>
      truckings: Array<{
        code: string
        name: string
        country: string
        dailyCapacity: number
      }>
    }
  }> {
    const response = await this.api.get('/scheduling/overview', { params })
    return response.data
  }

  /**
   * 批量计算并写回滞港费日期（最晚提柜日/最晚还箱日）
   * POST /api/v1/demurrage/batch-write-back
   */
  async batchWriteBackDemurrageDates(params?: {
    limitLastFree?: number
    limitLastReturn?: number
  }): Promise<{
    success: boolean
    lastFreeWritten: number
    lastFreeProcessed: number
    lastReturnWritten: number
    lastReturnProcessed: number
    message?: string
  }> {
    const response = await this.api.post('/demurrage/batch-write-back', params || {})
    // 清除相关缓存
    cacheManager.clearContainersCache();
    cacheManager.clearStatisticsCache();
    return response.data
  }

  /**
   * 单柜写回免费日（最晚提柜日/最晚还箱日及拖卡 last_pickup_date 同步）
   * POST /api/v1/demurrage/write-back/:containerNumber
   */
  async writeBackDemurrageDatesForContainer(containerNumber: string): Promise<{
    success: boolean
    data?: {
      containerNumber: string
      updated: boolean
      hasResult: boolean
      message: string
    }
    message?: string
  }> {
    const response = await this.api.post(
      `/demurrage/write-back/${encodeURIComponent(containerNumber)}`
    )
    cacheManager.clearContainersCache()
    cacheManager.clearStatisticsCache()
    return response.data
  }

  /**
   * 手工维护最晚提柜日（LFD）
   * PATCH /api/v1/containers/:containerNumber/manual-lfd
   */
  async setManualLastFreeDate(containerNumber: string, lastFreeDate: string, remark?: string): Promise<{
    success: boolean
    message?: string
    data?: {
      containerNumber: string
      lastFreeDate: string
      source: 'manual'
      remark?: string
    }
  }> {
    const response = await this.api.patch(
      `/containers/${encodeURIComponent(containerNumber)}/manual-lfd`,
      { lastFreeDate, remark }
    )
    cacheManager.clearContainersCache()
    cacheManager.clearStatisticsCache()
    return response.data
  }

  /**
   * 清除手工LFD标记，恢复自动计算
   * DELETE /api/v1/containers/:containerNumber/manual-lfd
   */
  async resetManualLastFreeDate(containerNumber: string): Promise<{
    success: boolean
    message?: string
  }> {
    const response = await this.api.delete(
      `/containers/${encodeURIComponent(containerNumber)}/manual-lfd`
    )
    cacheManager.clearContainersCache()
    cacheManager.clearStatisticsCache()
    return response.data
  }

  /**
   * 获取货柜统计数据
   * Get container statistics
   */
  async getStatistics(): Promise<{ success: boolean; data: ContainerStats }> {
    const response = await this.api.get('/containers/statistics');
    return response.data;
  }

  /**
   * 获取货柜详细统计数据（用于倒计时卡片）
   * Get detailed container statistics for countdown cards
   */
  async getStatisticsDetailed(startDate?: string, endDate?: string): Promise<{
    success: boolean;
    /** 为 true 表示所选日期范围内无匹配，已回退为不按日期的统计 */
    dateFilterFallback?: boolean;
    data: {
      statusDistribution: Record<string, number>;
      arrivalDistribution: Record<string, number>;
      pickupDistribution: Record<string, number>;
      lastPickupDistribution: Record<string, number>;
      returnDistribution: Record<string, number>;
    };
  }> {
    const params: any = {}
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate

    const response = await this.api.get('/containers/statistics-detailed', { params })
    return response.data
  }

  /**
   * 获取带缓存的货柜详细统计数据
   * Get cached detailed container statistics for countdown cards
   */
  getStatisticsDetailedWithCache = cacheManager.createCachedFunction(
    'statistics',
    this.getStatisticsDetailed.bind(this),
    (startDate?: string, endDate?: string) => `${startDate}:${endDate}`,
    60000 // 60秒缓存
  )

  /**
   * 获取统计数据验证信息
   * Get statistics verification data
   */
  async getStatisticsVerification(startDate?: string, endDate?: string): Promise<{
    success: boolean;
    data: {
      totalContainers: number;
      totalInTransit: number;
      totalArrival: number;
      totalPickup: number;
      totalLastPickup: number;
      totalReturn: number;
      atPortTotal: number;
      pickedUpTotal: number;
      checks: Array<{
        name: string;
        status: 'PASS' | 'FAIL';
        expected: number | string;
        actual: number;
        diff: number;
      }>;
    };
  }> {
    const params: any = {}
    if (startDate) params.startDate = startDate
    if (endDate) params.endDate = endDate

    const response = await this.api.get('/containers/statistics-verify', { params })
    return response.data
  }

  /**
   * 获取年度出运量数据（近三年）
   * Get yearly shipment volume data (last 3 years)
   */
  async getYearlyShipmentVolume(): Promise<{
    success: boolean;
    data: Array<{
      year: number;
      volume: number;
      months: Array<{ month: number; volume: number }>;
    }>;
  }> {
    const response = await this.api.get('/containers/statistics-yearly-volume')
    return response.data
  }

  /**
   * 获取异常集装箱统计
   * Get abnormal containers statistics
   */
  async getAbnormalStatistics(): Promise<{
    success: boolean;
    data: {
      etaDelay: number;
      pickupOverdue: number;
      lastPickupExpired: number;
    };
  }> {
    const response = await this.api.get('/containers/statistics-abnormal');
    return response.data;
  }

  /**
   * 获取国别字典列表（用于全局国家选择器等）
   * Get country list from dict_countries
   */
  async getCountries(): Promise<{ success: boolean; data: Array<{ code: string; nameCn: string; nameEn: string }> }> {
    const response = await this.api.get('/countries');
    return response.data;
  }

  /**
   * 根据统计条件获取货柜列表（与统计查询使用相同逻辑）
   * Get containers by filter condition (same logic as statistics queries)
   */
  async getContainersByFilterCondition(
    filterCondition: string,
    startDate?: string,
    endDate?: string,
    page?: number,
    pageSize?: number
  ): Promise<{
    success: boolean;
    items: any[];
    count: number;
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
      totalPages?: number;
    };
  }> {
    const params: any = { filterCondition };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (page) params.page = page;
    if (pageSize) params.pageSize = pageSize;

    const response = await this.api.get('/containers/by-filter', { params });
    return response.data;
  }
}

export const containerService = new ContainerService();
