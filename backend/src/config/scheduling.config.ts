/**
 * 智能排产配置常量
 * Intelligent Scheduling Configuration
 *
 * 集中管理所有排产相关的配置项，避免魔法数字
 */

/**
 * 并发控制配置
 */
export const CONCURRENCY_CONFIG = {
  /**
   * 批量操作最大并发数
   * 默认值：5（基于生产环境性能调优）
   * 调整依据：数据库连接池大小、内存使用率
   */
  BATCH_OPERATIONS: 5,

  /**
   * API 请求并发限制
   * 默认值：10
   */
  API_REQUESTS: 10
} as const;

/**
 * 日期计算配置
 */
export const DATE_CALCULATION_CONFIG = {
  /**
   * 默认预估场站天数
   * 用途：当无法获取实际数据时的估算值
   * 单位：天
   */
  DEFAULT_ESTIMATED_YARD_DAYS: 2,

  /**
   * 免费期计算基准
   * 'calendar' - 自然日（默认）
   * 'business' - 工作日
   */
  FREE_PERIOD_BASIS: 'calendar' as const,

  /**
   * 最小免费天数
   * 根据合同约定，最少提供 X 天免费期
   */
  MIN_FREE_DAYS: 3
} as const;

/**
 * 成本优化配置
 */
export const COST_OPTIMIZATION_CONFIG = {
  /**
   * 基础服务质量分
   * 用途：评估车队/仓库服务质量的基准分
   * 范围：0-10
   */
  BASE_SERVICE_QUALITY_SCORE: 5,

  /**
   * 服务质量加分上限
   * 优秀服务可获得的额外加分
   */
  SERVICE_QUALITY_BONUS_MAX: 5,

  /**
   * 滞港费标准费率（美元/天）
   * 注意：实际费率应从数据库 dict_demurrage_standards 读取
   * 这里仅作为默认值和 fallback
   */
  DEMURRAGE_STANDARD_RATE: 150,

  /**
   * 滞箱费标准费率（美元/天）
   */
  DETENTION_STANDARD_RATE: 100,

  /**
   * 堆存费标准费率（美元/天）
   */
  STORAGE_STANDARD_RATE: 80,

  /**
   * 属性类型优先级默认值（当未配置时）
   * 用于仓库排序：自营仓 < 平台仓 < 第三方仓
   * 数值越小优先级越高
   */
  DEFAULT_PROPERTY_PRIORITY: 999
} as const;

/**
 * 档期管理配置
 */
export const OCCUPANCY_CONFIG = {
  /**
   * 仓库档期预警阈值
   * 当占用率超过此值时触发预警
   * 范围：0-1（0.8 = 80%）
   */
  WAREHOUSE_WARNING_THRESHOLD: 0.8,

  /**
   * 车队档期预警阈值
   */
  TRUCKING_WARNING_THRESHOLD: 0.8,

  /**
   * 最大允许超订比例
   * 用于应对临时取消等异常情况
   */
  MAX_OVERBOOKING_RATIO: 0.1,

  /**
   * 仓库默认日卸柜能力（当数据库未配置时）
   * 单位：货柜数/天
   */
  DEFAULT_WAREHOUSE_DAILY_CAPACITY: 10,

  /**
   * 车队默认日操作能力（当数据库未配置时）
   * 单位：货柜数/天
   */
  DEFAULT_TRUCKING_DAILY_CAPACITY: 20,

  /**
   * 车队默认日还箱能力（当数据库未配置时）
   * 优先级：dailyReturnCapacity > dailyCapacity > 此默认值
   */
  DEFAULT_TRUCKING_RETURN_CAPACITY: 20
} as const;

/**
 * 距离矩阵配置（示例数据）
 * TODO: 实际项目应从数据库或配置服务读取
 * 数据来源：物流团队提供的港口 - 仓库距离表
 */
export const DISTANCE_MATRIX: Record<string, Record<string, number>> = {
  USLAX: {
    // 洛杉矶港 → 各仓库距离（英里）
    WH001: 25,
    WH002: 35,
    WH003: 45,
    WH004: 30,
    WH005: 40
  },
  USLGB: {
    // 长滩港 → 各仓库距离（英里）
    WH001: 30,
    WH002: 40,
    WH003: 50,
    WH004: 35,
    WH005: 45
  },
  USOAK: {
    // 奥克兰港 → 各仓库距离（英里）
    WH001: 50,
    WH002: 60,
    WH003: 70
  }
} as const;

/**
 * 导出所有配置（方便统一导入）
 */
export const SCHEDULING_CONFIG = {
  CONCURRENCY_CONFIG,
  DATE_CALCULATION_CONFIG,
  COST_OPTIMIZATION_CONFIG,
  OCCUPANCY_CONFIG,
  DISTANCE_MATRIX
} as const;

/**
 * 配置验证函数（用于启动时检查配置有效性）
 */
export function validateSchedulingConfig(): void {
  const errors: string[] = [];

  // ========== 并发控制配置验证 ==========
  if (CONCURRENCY_CONFIG.BATCH_OPERATIONS < 1) {
    errors.push('BATCH_OPERATIONS 必须大于 0');
  }
  if (CONCURRENCY_CONFIG.BATCH_OPERATIONS > 20) {
    errors.push('BATCH_OPERATIONS 过大可能导致资源耗尽（建议 5-10）');
  }

  // ========== 日期计算配置验证 ==========
  if (DATE_CALCULATION_CONFIG.DEFAULT_ESTIMATED_YARD_DAYS < 1) {
    errors.push('DEFAULT_ESTIMATED_YARD_DAYS 必须 >= 1');
  }
  if (DATE_CALCULATION_CONFIG.MIN_FREE_DAYS < 3) {
    errors.push('MIN_FREE_DAYS 不能少于 3 天（合同约定）');
  }

  // ========== 成本优化配置验证 ==========
  if (COST_OPTIMIZATION_CONFIG.DEMURRAGE_STANDARD_RATE <= 0) {
    errors.push('DEMURRAGE_STANDARD_RATE 必须大于 0');
  }
  if (
    COST_OPTIMIZATION_CONFIG.BASE_SERVICE_QUALITY_SCORE < 0 ||
    COST_OPTIMIZATION_CONFIG.BASE_SERVICE_QUALITY_SCORE > 10
  ) {
    errors.push('BASE_SERVICE_QUALITY_SCORE 必须在 0-10 范围内');
  }

  // 新增：优先级合理性验证
  const defaultPriority = COST_OPTIMIZATION_CONFIG.DEFAULT_PROPERTY_PRIORITY;
  if (defaultPriority < 100) {
    errors.push(`DEFAULT_PROPERTY_PRIORITY (${defaultPriority}) 应该大于已配置的优先级（1, 2, 3）`);
  }
  if (defaultPriority > 9999) {
    errors.push(`DEFAULT_PROPERTY_PRIORITY (${defaultPriority}) 过大，可能配置错误`);
  }

  // ========== 档期管理配置验证 ==========
  if (
    OCCUPANCY_CONFIG.WAREHOUSE_WARNING_THRESHOLD <= 0 ||
    OCCUPANCY_CONFIG.WAREHOUSE_WARNING_THRESHOLD > 1
  ) {
    errors.push('WAREHOUSE_WARNING_THRESHOLD 必须在 (0, 1] 范围内');
  }
  if (
    OCCUPANCY_CONFIG.TRUCKING_WARNING_THRESHOLD <= 0 ||
    OCCUPANCY_CONFIG.TRUCKING_WARNING_THRESHOLD > 1
  ) {
    errors.push('TRUCKING_WARNING_THRESHOLD 必须在 (0, 1] 范围内');
  }
  if (OCCUPANCY_CONFIG.MAX_OVERBOOKING_RATIO < 0 || OCCUPANCY_CONFIG.MAX_OVERBOOKING_RATIO >= 1) {
    errors.push('MAX_OVERBOOKING_RATIO 必须在 [0, 1) 范围内');
  }

  // 新增：能力值合理性验证
  const warehouseCapacity = OCCUPANCY_CONFIG.DEFAULT_WAREHOUSE_DAILY_CAPACITY;
  if (warehouseCapacity < 5 || warehouseCapacity > 50) {
    errors.push(`仓库默认能力 (${warehouseCapacity}) 应该在 5-50 范围内`);
  }

  const truckingCapacity = OCCUPANCY_CONFIG.DEFAULT_TRUCKING_DAILY_CAPACITY;
  if (truckingCapacity < 10 || truckingCapacity > 100) {
    errors.push(`车队默认操作能力 (${truckingCapacity}) 应该在 10-100 范围内`);
  }

  const returnCapacity = OCCUPANCY_CONFIG.DEFAULT_TRUCKING_RETURN_CAPACITY;
  if (returnCapacity < truckingCapacity) {
    errors.push(`车队还箱能力 (${returnCapacity}) 应该 >= 操作能力 (${truckingCapacity})`);
  }

  // ========== 距离矩阵验证 ==========
  const ports = Object.keys(DISTANCE_MATRIX);
  if (ports.length === 0) {
    errors.push('DISTANCE_MATRIX 不能为空');
  }

  ports.forEach((port) => {
    const warehouses = DISTANCE_MATRIX[port];
    if (!warehouses || Object.keys(warehouses).length === 0) {
      errors.push(`港口 ${port} 的仓库距离配置缺失`);
    }

    Object.entries(warehouses).forEach(([wh, distance]) => {
      if (distance <= 0) {
        errors.push(`${port} → ${wh} 的距离 (${distance}) 必须 > 0`);
      }
      if (distance > 500) {
        errors.push(`${port} → ${wh} 的距离 (${distance}) 过远（超过 500 英里）`);
      }
    });
  });

  // ========== 抛出异常 ==========
  if (errors.length > 0) {
    console.error('[SchedulingConfig] 配置验证失败 ❌');
    errors.forEach((err) => console.error(`  - ${err}`));
    throw new Error(`排产配置验证失败:\n${errors.join('\n')}`);
  }

  console.log('[SchedulingConfig] 配置验证通过 ✅');
}
