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
} from '@/types';

class ContainerService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',
      timeout: 30000
    });

    // 请求拦截器
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
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
    const response = await this.api.post('/containers', container);
    return response.data;
  }

  /**
   * 更新货柜
   * Update container
   */
  async updateContainer(id: string, container: Partial<Container>): Promise<{ success: boolean; data: Container }> {
    const response = await this.api.put(`/containers/${id}`, container);
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
}

export const containerService = new ContainerService();
