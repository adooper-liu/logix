/**
 * GraphQL Resolvers
 * 物流状态可视化 GraphQL 解析器
 */

import { StatusPath, StatusNode, StandardStatus, PathStatus, NodeStatus, LocationType } from '../types';
import {
  processStatusPath,
  validateStatusPath,
  calculateDelayDays
} from '../utils/pathValidator';

// 模拟数据库（实际应该使用数据库）
const mockDatabase: Map<string, StatusPath> = new Map();

// 模拟数据生成器
const generateMockPath = (containerNumber: string): StatusPath => {
  const now = new Date();
  const nodes: StatusNode[] = [
    {
      id: `node-${containerNumber}-1`,
      status: StandardStatus.NOT_SHIPPED,
      description: '未出运',
      timestamp: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      location: {
        id: 'loc-1',
        name: '深圳港',
        code: 'SZX',
        type: 'PORT',
        country: '中国'
      },
      nodeStatus: NodeStatus.COMPLETED,
      isAlert: false,
      rawData: { eventCode: 'BOOKING' }
    },
    {
      id: `node-${containerNumber}-2`,
      status: StandardStatus.EMPTY_PICKED_UP,
      description: '已提空箱',
      timestamp: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      location: {
        id: 'loc-2',
        name: '深圳堆场',
        code: 'SZX-YD',
        type: 'TERMINAL'
      },
      nodeStatus: NodeStatus.COMPLETED,
      isAlert: false,
      rawData: { eventCode: 'STSP' }
    },
    {
      id: `node-${containerNumber}-3`,
      status: StandardStatus.GATE_IN,
      description: '已进港',
      timestamp: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000),
      location: {
        id: 'loc-1',
        name: '深圳港',
        code: 'SZX',
        type: 'PORT',
        country: '中国'
      },
      nodeStatus: NodeStatus.COMPLETED,
      isAlert: false,
      rawData: { eventCode: 'GTIN' }
    },
    {
      id: `node-${containerNumber}-4`,
      status: StandardStatus.LOADED,
      description: '已装船',
      timestamp: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
      location: {
        id: 'loc-1',
        name: '深圳港',
        code: 'SZX',
        type: 'PORT',
        country: '中国'
      },
      nodeStatus: NodeStatus.COMPLETED,
      isAlert: false,
      rawData: { eventCode: 'LOBD' }
    },
    {
      id: `node-${containerNumber}-5`,
      status: StandardStatus.DEPARTED,
      description: '已离港',
      timestamp: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000),
      location: {
        id: 'loc-1',
        name: '深圳港',
        code: 'SZX',
        type: 'PORT',
        country: '中国'
      },
      nodeStatus: NodeStatus.COMPLETED,
      isAlert: false,
      rawData: { eventCode: 'DLPT' }
    },
    {
      id: `node-${containerNumber}-6`,
      status: StandardStatus.SAILING,
      description: '航行中',
      timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      location: {
        id: 'loc-3',
        name: '太平洋',
        code: 'PACIFIC',
        type: 'PORT'
      },
      nodeStatus: NodeStatus.COMPLETED,
      isAlert: false,
      rawData: { eventCode: 'RDSI' }
    },
    {
      id: `node-${containerNumber}-7`,
      status: StandardStatus.ARRIVED,
      description: '已抵港',
      timestamp: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      location: {
        id: 'loc-4',
        name: '洛杉矶港',
        code: 'LAX',
        type: 'PORT',
        country: '美国'
      },
      nodeStatus: NodeStatus.IN_PROGRESS,
      isAlert: false,
      rawData: { eventCode: 'ARVD' }
    }
  ];

  return {
    id: `path-${containerNumber}-${Date.now()}`,
    containerNumber,
    ...processStatusPath({
      nodes,
      overallStatus: PathStatus.ON_TIME,
      eta: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      startedAt: null,
      completedAt: null
    }),
    createdAt: now,
    updatedAt: now
  };
};

// Query Resolvers
export const Query = {
  // 根据集装箱号获取物流路径
  getStatusPathByContainer: async (_: any, { containerNumber }: { containerNumber: string }) => {
    let path = mockDatabase.get(containerNumber);

    if (!path) {
      path = generateMockPath(containerNumber);
      mockDatabase.set(containerNumber, path);
    }

    return path;
  },

  // 根据提单号获取物流路径（模拟）
  getStatusPathByBL: async (_: any, { billOfLadingNumber }: { billOfLadingNumber: string }) => {
    const containerNumber = `BL-${billOfLadingNumber}`;
    let path = mockDatabase.get(containerNumber);

    if (!path) {
      path = generateMockPath(containerNumber);
      mockDatabase.set(containerNumber, path);
    }

    return path;
  },

  // 根据订舱号获取物流路径（模拟）
  getStatusPathByBooking: async (_: any, { bookingNumber }: { bookingNumber: string }) => {
    const containerNumber = `BK-${bookingNumber}`;
    let path = mockDatabase.get(containerNumber);

    if (!path) {
      path = generateMockPath(containerNumber);
      mockDatabase.set(containerNumber, path);
    }

    return path;
  },

  // 获取所有物流路径（分页）
  getStatusPaths: async (
    _: any,
    { first = 10, after, filter }: any
  ) => {
    const allPaths = Array.from(mockDatabase.values());
    let filteredPaths = allPaths;

    // 应用过滤器
    if (filter) {
      if (filter.containerNumber) {
        filteredPaths = filteredPaths.filter(p =>
          p.nodes[0]?.rawData?.containerNumber?.includes(filter.containerNumber)
        );
      }
      if (filter.overallStatus) {
        filteredPaths = filteredPaths.filter(p => p.overallStatus === filter.overallStatus);
      }
    }

    // 分页处理
    const startIndex = after ? parseInt(atob(after)) : 0;
    const endIndex = Math.min(startIndex + first, filteredPaths.length);
    const paginatedPaths = filteredPaths.slice(startIndex, endIndex);

    return {
      edges: paginatedPaths.map((path, index) => ({
        node: path,
        cursor: btoa((startIndex + index).toString())
      })),
      pageInfo: {
        hasNextPage: endIndex < filteredPaths.length,
        hasPreviousPage: startIndex > 0,
        startCursor: startIndex > 0 ? btoa(startIndex.toString()) : null,
        endCursor: paginatedPaths.length > 0 ? btoa((endIndex - 1).toString()) : null
      },
      totalCount: filteredPaths.length
    };
  },

  // 获取状态事件列表（模拟）
  getStatusEvents: async (
    _: any,
    { containerNumber, limit = 50, offset = 0 }: any
  ) => {
    const path = mockDatabase.get(containerNumber);
    if (!path) return [];

    return path.nodes.map(node => ({
      id: `event-${node.id}`,
      containerNumber,
      eventCode: node.rawData.eventCode,
      eventName: node.description,
      eventTime: node.timestamp,
      location: node.location,
      remarks: '',
      rawData: node.rawData,
      createdAt: new Date()
    }));
  },

  // 验证物流路径
  validateStatusPath: async (_: any, { pathId }: { pathId: string }) => {
    const path = Array.from(mockDatabase.values()).find(p => p.nodes[0]?.id.startsWith(pathId));

    if (!path) {
      return {
        isValid: false,
        errors: ['路径不存在'],
        warnings: []
      };
    }

    return validateStatusPath(path);
  }
};

// Mutation Resolvers
export const Mutation = {
  // 创建物流路径
  createStatusPath: async (_: any, { input }: { input: any }) => {
    const path = processStatusPath({
      nodes: input.nodes || [],
      overallStatus: PathStatus.ON_TIME,
      eta: input.eta || null,
      startedAt: null,
      completedAt: null
    });

    const containerNumber = input.containerNumber;
    // 保存到数据库（模拟）
    // mockDatabase.set(containerNumber, path);

    return { ...path, id: containerNumber };
  },

  // 更新物流路径
  updateStatusPath: async (_: any, { id, input }: { id: string; input: any }) => {
    const existingPath = mockDatabase.get(id);

    if (!existingPath) {
      throw new Error('路径不存在');
    }

    const updatedPath = processStatusPath({
      ...existingPath,
      nodes: input.nodes || existingPath.nodes,
      overallStatus: input.overallStatus || existingPath.overallStatus,
      eta: input.eta !== undefined ? input.eta : existingPath.eta
    });

    mockDatabase.set(id, updatedPath);

    return { ...updatedPath, id };
  },

  // 删除物流路径
  deleteStatusPath: async (_: any, { id }: { id: string }) => {
    return mockDatabase.delete(id);
  },

  // 添加状态节点
  addStatusNode: async (_: any, { pathId, input }: { pathId: string; input: any }) => {
    const path = mockDatabase.get(pathId);

    if (!path) {
      throw new Error('路径不存在');
    }

    const newNode: StatusNode = {
      id: `node-${Date.now()}`,
      status: input.status,
      description: input.description,
      timestamp: new Date(input.timestamp),
      location: null,
      nodeStatus: NodeStatus.COMPLETED,
      isAlert: false,
      rawData: input.rawData || {}
    };

    const updatedNodes = [...path.nodes, newNode];
    const updatedPath = processStatusPath({
      ...path,
      nodes: updatedNodes
    });

    mockDatabase.set(pathId, updatedPath);

    return updatedPath;
  },

  // 同步外部数据
  syncExternalData: async (
    _: any,
    { source, data, containerNumber }: { source: string; data: any; containerNumber: string }
  ) => {
    // 这里应该调用适配器层处理外部数据
    const path = generateMockPath(containerNumber);
    mockDatabase.set(containerNumber, path);

    return path;
  },

  // 批量同步外部数据
  batchSyncExternalData: async (
    _: any,
    { source, dataList }: { source: string; dataList: any[] }
  ) => {
    const results = [];

    for (const data of dataList) {
      try {
        const containerNumber = data.containerNumber || `AUTO-${Date.now()}`;
        const path = generateMockPath(containerNumber);
        mockDatabase.set(containerNumber, path);

        results.push({
          containerNumber,
          success: true,
          message: '同步成功',
          pathId: containerNumber
        });
      } catch (error) {
        results.push({
          containerNumber: data.containerNumber,
          success: false,
          message: error instanceof Error ? error.message : '同步失败',
          pathId: null
        });
      }
    }

    return {
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      results
    };
  }
};

// Subscription Resolvers（使用 PubSub）
export const Subscription = {
  pathUpdated: {
    subscribe: (_: any, { containerNumber }: { containerNumber: string }) => {
      // 实际应该使用 PubSub
      return null;
    }
  },
  statusNodeAdded: {
    subscribe: (_: any, { containerNumber }: { containerNumber: string }) => {
      // 实际应该使用 PubSub
      return null;
    }
  }
};

// 导出完整的 resolvers 对象
export const resolvers = {
  Query,
  Mutation,
  Subscription
};
