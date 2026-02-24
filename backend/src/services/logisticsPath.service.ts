/**
 * 物流路径可视化微服务客户端
 * Logistics Path Visualization Microservice Client
 *
 * 通过 HTTP 请求调用 logistics-path-system 的 GraphQL API
 */

import axios, { AxiosInstance } from 'axios';
import { log } from '../utils/logger.js';
import { config } from '../config/index.js';

// GraphQL 响应类型
interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
}

interface GraphQLVariables {
  [key: string]: any;
}

/**
 * 物流路径服务类
 */
export class LogisticsPathService {
  private axiosInstance: AxiosInstance;
  private graphqlEndpoint: string;

  constructor() {
    this.graphqlEndpoint = `${config.logisticsPath.url}/graphql`;

    // 创建 axios 实例
    this.axiosInstance = axios.create({
      baseURL: config.logisticsPath.url,
      timeout: config.logisticsPath.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // 请求拦截器
    this.axiosInstance.interceptors.request.use(
      (requestConfig) => {
        if (config.logisticsPath?.token) {
          requestConfig.headers['Authorization'] = `Bearer ${config.logisticsPath.token}`;
        }
        return requestConfig;
      },
      (error) => {
        log.error('Logistics Path Service Request Error:', { error: error.message });
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          log.error('Logistics Path Service Response Error:', {
            status: error.response.status,
            data: error.response.data
          });
        } else if (error.request) {
          log.error('Logistics Path Service No Response:', { error: error.message });
        } else {
          log.error('Logistics Path Service Request Error:', { error: error.message });
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * 执行 GraphQL 查询
   */
  private async executeGraphQLQuery<T>(
    query: string,
    variables?: GraphQLVariables
  ): Promise<T> {
    try {
      const startTime = Date.now();
      const response = await this.axiosInstance.post<GraphQLResponse<T>>(
        this.graphqlEndpoint,
        { query, variables }
      );
      const duration = Date.now() - startTime;

      log.debug('GraphQL Query Executed:', {
        queryName: query.split('(')[0],
        duration,
        status: response.status
      });

      if (response.data.errors) {
        throw new Error(
          `GraphQL Error: ${response.data.errors.map((e) => e.message).join(', ')}`
        );
      }

      if (!response.data.data) {
        throw new Error('No data returned from GraphQL query');
      }

      return response.data.data;
    } catch (error) {
      log.error('GraphQL Query Failed:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // ============ GraphQL 查询方法 ============

  /**
   * 根据集装箱号获取物流路径
   */
  async getStatusPathByContainer(containerNumber: string) {
    const query = `
      query GetStatusPathByContainer($containerNumber: String!) {
        getStatusPathByContainer(containerNumber: $containerNumber) {
          id
          containerNumber
          nodes {
            id
            status
            description
            timestamp
            location {
              id
              name
              code
              type
              country
            }
            nodeStatus
            isAlert
          }
          overallStatus
          eta
          startedAt
          completedAt
          createdAt
          updatedAt
        }
      }
    `;

    const response = await this.executeGraphQLQuery(query, { containerNumber });
    return response.getStatusPathByContainer;
  }

  /**
   * 根据提单号获取物流路径
   */
  async getStatusPathByBL(billOfLadingNumber: string) {
    const query = `
      query GetStatusPathByBL($billOfLadingNumber: String!) {
        getStatusPathByBL(billOfLadingNumber: $billOfLadingNumber) {
          id
          containerNumber
          nodes {
            id
            status
            description
            timestamp
            location {
              name
              code
            }
            nodeStatus
            isAlert
          }
          overallStatus
          eta
          startedAt
          completedAt
        }
      }
    `;

    const response = await this.executeGraphQLQuery(query, { billOfLadingNumber });
    return response.getStatusPathByBL;
  }

  /**
   * 根据订舱号获取物流路径
   */
  async getStatusPathByBooking(bookingNumber: string) {
    const query = `
      query GetStatusPathByBooking($bookingNumber: String!) {
        getStatusPathByBooking(bookingNumber: $bookingNumber) {
          id
          containerNumber
          nodes {
            id
            status
            description
            timestamp
          }
          overallStatus
          eta
        }
      }
    `;

    const response = await this.executeGraphQLQuery(query, { bookingNumber });
    return response.getStatusPathByBooking;
  }

  /**
   * 获取物流路径列表（分页）
   */
  async getStatusPaths(options?: {
    first?: number;
    after?: string;
    filter?: {
      containerNumber?: string;
      overallStatus?: string;
      startDate?: Date;
      endDate?: Date;
    };
  }) {
    const query = `
      query GetStatusPaths($first: Int, $after: String, $filter: StatusPathFilter) {
        getStatusPaths(first: $first, after: $after, filter: $filter) {
          edges {
            node {
              id
              containerNumber
              nodes {
                id
                status
                description
                timestamp
              }
              overallStatus
              eta
            }
            cursor
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          totalCount
        }
      }
    `;

    const response = await this.executeGraphQLQuery(query, options);
    return response.getStatusPaths;
  }

  /**
   * 验证物流路径
   */
  async validateStatusPath(pathId: string) {
    const query = `
      query ValidateStatusPath($pathId: ID!) {
        validateStatusPath(pathId: $pathId) {
          isValid
          errors
          warnings
        }
      }
    `;

    const response = await this.executeGraphQLQuery(query, { pathId });
    return response.validateStatusPath;
  }

  /**
   * 同步外部数据
   */
  async syncExternalData(source: string, data: any, containerNumber: string) {
    const query = `
      mutation SyncExternalData($source: String!, $data: JSON!, $containerNumber: String!) {
        syncExternalData(source: $source, data: $data, containerNumber: $containerNumber) {
          id
          containerNumber
          overallStatus
          nodes {
            id
            status
            description
          }
        }
      }
    `;

    const response = await this.executeGraphQLQuery(query, {
      source,
      data,
      containerNumber
    });
    return response.syncExternalData;
  }

  /**
   * 批量同步外部数据
   */
  async batchSyncExternalData(source: string, dataList: any[]) {
    const query = `
      mutation BatchSyncExternalData($source: String!, $dataList: [JSON!]!) {
        batchSyncExternalData(source: $source, dataList: $dataList) {
          successCount
          failureCount
          results {
            containerNumber
            success
            message
            pathId
          }
        }
      }
    `;

    const response = await this.executeGraphQLQuery(query, { source, dataList });
    return response.batchSyncExternalData;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await this.axiosInstance.get('/health');
      return response.data;
    } catch (error) {
      throw new Error('Logistics Path service is unhealthy');
    }
  }
}

// 导出单例实例
export const logisticsPathService = new LogisticsPathService();
