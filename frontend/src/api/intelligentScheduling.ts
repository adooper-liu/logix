/**
 * 智能排柜 API
 */

import { api } from '@/services/api';

export interface BatchOptimizeRequest {
  containerNumbers: string[];
  options?: {
    forceRefresh?: boolean;
  };
}

export interface BatchOptimizeResult {
  containerNumber: string;
  originalCost: number;
  optimizedCost: number;
  savings: number;
  suggestedPickupDate?: string;
  shouldOptimize: boolean;
}

export interface BatchOptimizePerformance {
  totalContainers: number;
  totalTimeMs: number;
  avgTimePerContainer: number;
}

export interface BatchOptimizeData {
  results: BatchOptimizeResult[];
  performance?: BatchOptimizePerformance;
}

export interface BatchOptimizeResponse {
  success: boolean;
  data: BatchOptimizeData;
  message?: string;
}

/**
 * 批量优化货柜
 */
export async function batchOptimizeContainers(
  containerNumbers: string[],
  options?: { forceRefresh?: boolean }
): Promise<BatchOptimizeResponse> {
  return api.post('/scheduling/batch-optimize', {
    containerNumbers,
    options
  } as BatchOptimizeRequest);
}

export const intelligentSchedulingApi = {
  batchOptimizeContainers
};
