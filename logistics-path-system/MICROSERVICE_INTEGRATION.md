/**
 * 微服务配置
 * Microservices Configuration
 */

export const microserviceConfig = {
  // 物流路径可视化服务
  logisticsPath: {
    name: 'logistics-path',
    baseUrl: process.env.LOGISTICS_PATH_URL || 'http://localhost:4000',
    healthCheck: '/health',
    timeout: 30000,
    retryAttempts: 3
  }
};

// 微服务健康检查状态
export interface MicroserviceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  lastCheck: Date;
  responseTime: number;
  error?: string;
}

// 获取微服务状态
export const getMicroserviceHealth = async (
  serviceName: keyof typeof microserviceConfig
): Promise<MicroserviceHealth> => {
  const service = microserviceConfig[serviceName];
  const startTime = Date.now();

  try {
    const response = await fetch(`${service.baseUrl}${service.healthCheck}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(service.timeout)
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        name: serviceName,
        status: 'healthy',
        lastCheck: new Date(),
        responseTime
      };
    } else {
      return {
        name: serviceName,
        status: 'degraded',
        lastCheck: new Date(),
        responseTime,
        error: `HTTP ${response.status}`
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      name: serviceName,
      status: 'unhealthy',
      lastCheck: new Date(),
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// 获取所有微服务状态
export const getAllMicroservicesHealth = async (): Promise<MicroserviceHealth[]> => {
  const services = Object.keys(microserviceConfig) as Array<keyof typeof microserviceConfig>;
  const healthChecks = await Promise.all(
    services.map(service => getMicroserviceHealth(service))
  );
  return healthChecks;
};
