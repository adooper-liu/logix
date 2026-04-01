/**
 * 飞驼Excel导入规范
 * 定义飞驼Excel导入的表结构、字段映射和验证规则
 *
 * @规范版本 v1.0
 * @最后更新 2026-03-18
 * @作者 LogiX Team
 */

/**
 * 飞驼Excel表一（主数据表）字段映射
 * 对应 ext_feituo_import_table1
 */
export const FEITUO_TABLE1_SPEC = {
  tableName: 'ext_feituo_import_table1',
  description: '飞驼导入主数据表（订舱、海运、费用信息）',
  fields: [
    // 基础信息
    {
      field: 'container_number',
      excelColumn: '集装箱号',
      type: 'string',
      required: true,
      primaryKey: true
    },
    { field: 'bill_of_lading_number', excelColumn: '提单号', type: 'string', required: true },
    { field: 'booking_number', excelColumn: '订舱号', type: 'string', required: false },

    // 船公司信息
    { field: 'shipping_company', excelColumn: '船公司', type: 'string', required: true },
    { field: 'shipping_company_name', excelColumn: '船公司全称', type: 'string', required: false },

    // 港口信息
    { field: 'origin_port', excelColumn: '起运港', type: 'string', required: true },
    { field: 'destination_port', excelColumn: '目的港', type: 'string', required: true },
    { field: 'transit_port', excelColumn: '中转港', type: 'string', required: false },

    // 时间节点
    { field: 'shipment_date', excelColumn: '开船日', type: 'date', required: false },
    { field: 'eta', excelColumn: '预计到港日', type: 'date', required: false },
    { field: 'ata', excelColumn: '实际到港日', type: 'date', required: false },

    // 集装箱信息
    { field: 'container_type', excelColumn: '箱型', type: 'string', required: true },
    { field: 'container_size', excelColumn: '箱尺寸', type: 'string', required: false },
    { field: 'seal_number', excelColumn: '封号', type: 'string', required: false },

    // 货物信息
    { field: 'cargo_description', excelColumn: '货名', type: 'string', required: false },
    { field: 'total_packages', excelColumn: '件数', type: 'number', required: false },
    { field: 'package_type', excelColumn: '包装', type: 'string', required: false },
    { field: 'total_weight', excelColumn: '总重', type: 'decimal', required: false },
    { field: 'total_volume', excelColumn: '体积', type: 'decimal', required: false },

    // 费用信息
    { field: 'ocean_freight', excelColumn: '海运费', type: 'decimal', required: false },
    { field: 'baf', excelColumn: 'BAF', type: 'decimal', required: false },
    { field: 'caf', excelColumn: 'CAF', type: 'decimal', required: false },
    { field: 'thc_origin', excelColumn: '起运港THC', type: 'decimal', required: false },
    { field: 'thc_destination', excelColumn: '目的港THC', type: 'decimal', required: false },

    // 其他信息
    { field: 'remark', excelColumn: '备注', type: 'string', required: false },
    {
      field: 'data_source',
      excelColumn: '数据来源',
      type: 'string',
      required: false,
      default: 'Excel'
    }
  ]
};

/**
 * 飞驼Excel表二（状态事件表）字段映射
 * 对应 ext_feituo_import_table2
 */
export const FEITUO_TABLE2_SPEC = {
  tableName: 'ext_feituo_import_table2',
  description: '飞驼导入状态事件表（时间节点、状态变更）',
  fields: [
    // 基础信息
    {
      field: 'container_number',
      excelColumn: '集装箱号',
      type: 'string',
      required: true,
      primaryKey: true
    },
    { field: 'bill_of_lading_number', excelColumn: '提单号', type: 'string', required: true },

    // 事件信息
    { field: 'event_code', excelColumn: '状态码', type: 'string', required: true },
    { field: 'event_name', excelColumn: '状态名称', type: 'string', required: false },
    { field: 'event_time', excelColumn: '状态时间', type: 'date', required: true },

    // 地点信息
    { field: 'location_code', excelColumn: '地点代码', type: 'string', required: false },
    { field: 'location_name', excelColumn: '地点名称', type: 'string', required: false },
    { field: 'location_type', excelColumn: '地点类型', type: 'string', required: false },

    // 操作信息
    { field: 'operation_type', excelColumn: '操作类型', type: 'string', required: false },
    { field: 'transport_mode', excelColumn: '运输方式', type: 'string', required: false },

    // 其他信息
    { field: 'remark', excelColumn: '备注', type: 'string', required: false },
    {
      field: 'data_source',
      excelColumn: '数据来源',
      type: 'string',
      required: false,
      default: 'Excel'
    }
  ]
};

/**
 * 字段类型验证规则
 */
export const FIELD_VALIDATION_RULES = {
  string: {
    validator: (value: any) => typeof value === 'string',
    errorMsg: (field: string) => `${field} 必须是字符串`
  },
  number: {
    validator: (value: any) => typeof value === 'number' && !isNaN(value),
    errorMsg: (field: string) => `${field} 必须是数字`
  },
  decimal: {
    validator: (value: any) => {
      const num = parseFloat(value);
      return typeof num === 'number' && !isNaN(num);
    },
    errorMsg: (field: string) => `${field} 必须是有效的数字`
  },
  date: {
    validator: (value: any) => {
      if (!value) return true; // 日期字段可以为空
      const date = new Date(value);
      return date instanceof Date && !isNaN(date.getTime());
    },
    errorMsg: (field: string) => `${field} 必须是有效的日期`
  },
  boolean: {
    validator: (value: any) => typeof value === 'boolean',
    errorMsg: (field: string) => `${field} 必须是布尔值`
  }
};

/**
 * 飞驼状态码映射配置
 * 用于验证和映射飞驼的状态码
 */
export const FEITUO_STATUS_CODE_CONFIG = {
  // 运输事件（2个）
  transport: ['DEPA', 'ARRI'],

  // 集装箱事件（5个）
  equipment: ['GTOT', 'GTIN', 'LOAD', 'DISC', 'AVLE'],

  // 码头操作（5个）
  terminal: ['LOBD', 'DLPT', 'BDAR', 'POCA', 'DSCH'],

  // 闸口操作（2个）
  gate: ['GITM', 'STCS'],

  // 中转操作（2个）
  transit: ['TSBA', 'TSDP'],

  // 还箱操作（1个）
  return: ['RCVE'],

  // 驳船专用（4个）- 多式联运关键
  barge: ['FDDP', 'FDLB', 'FDBA', 'STSP'],

  // 所有有效的状态码
  get allValidCodes(): string[] {
    return [
      ...this.transport,
      ...this.equipment,
      ...this.terminal,
      ...this.gate,
      ...this.transit,
      ...this.return,
      ...this.barge
    ];
  },

  // 验证状态码是否有效
  isValidCode: (code: string): boolean => {
    return FEITUO_STATUS_CODE_CONFIG.allValidCodes.includes(code);
  },

  // 获取状态码类型
  getCodeType: (code: string): string | null => {
    if (FEITUO_STATUS_CODE_CONFIG.transport.includes(code)) return 'transport';
    if (FEITUO_STATUS_CODE_CONFIG.equipment.includes(code)) return 'equipment';
    if (FEITUO_STATUS_CODE_CONFIG.terminal.includes(code)) return 'terminal';
    if (FEITUO_STATUS_CODE_CONFIG.gate.includes(code)) return 'gate';
    if (FEITUO_STATUS_CODE_CONFIG.transit.includes(code)) return 'transit';
    if (FEITUO_STATUS_CODE_CONFIG.return.includes(code)) return 'return';
    if (FEITUO_STATUS_CODE_CONFIG.barge.includes(code)) return 'barge';
    return null;
  }
};

/**
 * 港口类型映射
 * 根据地点代码或名称判断港口类型
 */
export const PORT_TYPE_MAPPING = {
  // 中国主要港口
  china: ['CNSHA', 'CNNGB', 'CNTAO', 'CNTXG', 'CNXMN', 'CNDLC', 'CNYTN', 'CNZZH'],

  // 欧洲主要港口
  europe: ['FRLEH', 'DEBRV', 'DEHAM', 'NLRTM', 'GBFXT', 'GBSOU', 'GBLGP', 'GBLIV'],

  // 美国主要港口
  usa: ['USSAV', 'USLGB', 'USLAX', 'USSEA', 'USNYC', 'USCHS', 'USORF', 'USJAX'],

  // 判断是否为标准港口代码（5位大写字母）
  isStandardPortCode: (code: string): boolean => {
    return /^[A-Z]{2}[A-Z]{3}$/.test(code);
  }
};

/**
 * 导入错误代码定义
 */
export const IMPORT_ERROR_CODES = {
  // 文件错误
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_FORMAT_INVALID: 'FILE_FORMAT_INVALID',
  FILE_SIZE_EXCEEDED: 'FILE_SIZE_EXCEEDED',

  // 数据错误
  DATA_REQUIRED_FIELD_MISSING: 'DATA_REQUIRED_FIELD_MISSING',
  DATA_TYPE_INVALID: 'DATA_TYPE_INVALID',
  DATA_DUPLICATE_KEY: 'DATA_DUPLICATE_KEY',

  // 映射错误
  MAPPING_NOT_FOUND: 'MAPPING_NOT_FOUND',
  MAPPING_INVALID: 'MAPPING_INVALID',

  // 数据库错误
  DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',
  DB_INSERT_ERROR: 'DB_INSERT_ERROR',

  // 业务错误
  BUSINESS_VALIDATION_FAILED: 'BUSINESS_VALIDATION_FAILED',
  BUSINESS_STATE_INVALID: 'BUSINESS_STATE_INVALID'
};

/**
 * 错误消息模板
 */
export const ERROR_MESSAGES = {
  [IMPORT_ERROR_CODES.FILE_NOT_FOUND]: '文件不存在: {filePath}',
  [IMPORT_ERROR_CODES.FILE_FORMAT_INVALID]: '文件格式不正确，请上传 .xlsx 或 .xls 文件',
  [IMPORT_ERROR_CODES.FILE_SIZE_EXCEEDED]: '文件大小超过限制: {size}MB (最大 {maxSize}MB)',
  [IMPORT_ERROR_CODES.DATA_REQUIRED_FIELD_MISSING]: '缺少必填字段: {field}',
  [IMPORT_ERROR_CODES.DATA_TYPE_INVALID]:
    '字段 {field} 类型错误: 期望 {expectedType}，实际 {actualType}',
  [IMPORT_ERROR_CODES.DATA_DUPLICATE_KEY]: '重复的主键: {key}',
  [IMPORT_ERROR_CODES.MAPPING_NOT_FOUND]: '找不到字段映射: {field}',
  [IMPORT_ERROR_CODES.MAPPING_INVALID]: '无效的映射配置: {reason}',
  [IMPORT_ERROR_CODES.DB_CONNECTION_ERROR]: '数据库连接失败: {error}',
  [IMPORT_ERROR_CODES.DB_INSERT_ERROR]: '数据插入失败: {error}',
  [IMPORT_ERROR_CODES.BUSINESS_VALIDATION_FAILED]: '业务验证失败: {reason}',
  [IMPORT_ERROR_CODES.BUSINESS_STATE_INVALID]: '无效的业务状态: {state}'
};

/**
 * 箱数解析规则
 * 用于解析类似 "3*20GP" 的箱数描述
 */
export const CONTAINER_COUNT_PARSER_RULES = {
  // 标准格式: 数量*箱型
  // 示例: "3*20GP", "2*40HQ", "1*20GP+1*40HQ"

  /**
   * 解析箱数描述
   * @param description 箱数描述字符串
   * @returns 解析结果 [{count, type, size}]
   */
  parse: (description: string): Array<{ count: number; type: string; size: string }> => {
    if (!description || typeof description !== 'string') {
      return [];
    }

    const results: Array<{ count: number; type: string; size: string }> = [];

    // 按加号分割多个箱型
    const parts = description.split('+').map((p) => p.trim());

    for (const part of parts) {
      // 按星号分割数量和箱型
      const match = part.match(/^(\d+)\*(.+)$/);
      if (match) {
        const count = parseInt(match[1], 10);
        const containerSpec = match[2].trim();

        // 提取尺寸和类型
        // 20GP -> size: 20, type: GP
        // 40HQ -> size: 40, type: HQ
        const sizeMatch = containerSpec.match(/^(\d{2})/);
        const size = sizeMatch ? sizeMatch[1] : '';
        const type = containerSpec.substring(size.length);

        results.push({
          count: isNaN(count) ? 0 : count,
          type: type || 'GP', // 默认GP
          size: size || '20' // 默认20尺
        });
      }
    }

    return results;
  },

  /**
   * 计算总箱数
   * @param description 箱数描述字符串
   * @returns 总箱数
   */
  calculateTotalCount: (description: string): number => {
    const parsed = CONTAINER_COUNT_PARSER_RULES.parse(description);
    return parsed.reduce((total, item) => total + item.count, 0);
  }
};

/**
 * 默认导入配置
 */
export const DEFAULT_IMPORT_CONFIG = {
  // 批量大小
  batchSize: 100,

  // 跳过的行数（表头）
  skipRows: 1,

  // 最大文件大小（MB）
  maxFileSize: 50,

  // 是否验证必填字段
  validateRequiredFields: true,

  // 是否验证数据类型
  validateDataTypes: true,

  // 是否验证状态码
  validateStatusCodes: true,

  // 出错时是否继续
  continueOnError: false,

  // 是否记录详细日志
  enableDetailedLogging: true
};
