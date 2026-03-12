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
    return response.data;
  }

  /**
   * 更新货柜
   * Update container
   */
  async updateContainer(id: string, container: Partial<Container>): Promise<{ success: boolean; data: Container }> {
    const response = await this.api.put(`/containers/${id}`, camelToSnake(container as Record<string, any>));
    return response.data;
  }

  /**
   * 删除货柜
   * Delete container
   */
  async deleteContainer(id: string): Promise<{ success: boolean }> {
    const response = await this.api.delete(`/containers/${id}`);
    return response.data;
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
    endDate?: string
  ): Promise<{
    success: boolean;
    items: any[];
    count: number;
  }> {
    const params: any = { filterCondition };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await this.api.get('/containers/by-filter', { params });
    return response.data;
  }
}

export const containerService = new ContainerService();
