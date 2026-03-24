/**
 * 错误管理器
 * Error Manager
 *
 * 管理错误分类、处理策略和日志记录
 */

import { logger } from '../../utils/logger';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  // 安全相关错误
  SQL_INJECTION = 'sql_injection',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',

  // 输入验证错误
  VALIDATION = 'validation',
  MISSING_PARAMS = 'missing_params',
  INVALID_FORMAT = 'invalid_format',

  // SQL相关错误
  SQL_ERROR = 'sql_error',
  DATABASE_CONNECTION = 'database_connection',
  QUERY_TIMEOUT = 'query_timeout',

  // AI相关错误
  AI_MODEL_ERROR = 'ai_model_error',
  INTENT_DETECTION = 'intent_detection',
  PROMPT_ERROR = 'prompt_error',

  // 系统错误
  INTERNAL = 'internal',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  NETWORK_ERROR = 'network_error',

  // 业务逻辑错误
  BUSINESS_RULE = 'business_rule',
  RESOURCE_NOT_FOUND = 'resource_not_found',
  DUPLICATE_RESOURCE = 'duplicate_resource'
}

/**
 * 错误严重程度
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 错误接口
 */
export interface AppError {
  type: ErrorType;
  message: string;
  severity: ErrorSeverity;
  statusCode: number;
  details?: any;
  stack?: string;
  timestamp: Date;
}

/**
 * 错误配置
 */
const ERROR_CONFIG = {
  [ErrorType.SQL_INJECTION]: {
    statusCode: 400,
    severity: ErrorSeverity.HIGH,
    defaultMessage: 'SQL注入尝试被阻止'
  },
  [ErrorType.UNAUTHORIZED]: {
    statusCode: 401,
    severity: ErrorSeverity.MEDIUM,
    defaultMessage: '未授权访问'
  },
  [ErrorType.FORBIDDEN]: {
    statusCode: 403,
    severity: ErrorSeverity.MEDIUM,
    defaultMessage: '禁止访问'
  },
  [ErrorType.VALIDATION]: {
    statusCode: 400,
    severity: ErrorSeverity.LOW,
    defaultMessage: '输入验证失败'
  },
  [ErrorType.MISSING_PARAMS]: {
    statusCode: 400,
    severity: ErrorSeverity.LOW,
    defaultMessage: '缺少必要参数'
  },
  [ErrorType.INVALID_FORMAT]: {
    statusCode: 400,
    severity: ErrorSeverity.LOW,
    defaultMessage: '无效的格式'
  },
  [ErrorType.SQL_ERROR]: {
    statusCode: 500,
    severity: ErrorSeverity.MEDIUM,
    defaultMessage: 'SQL执行错误'
  },
  [ErrorType.DATABASE_CONNECTION]: {
    statusCode: 503,
    severity: ErrorSeverity.CRITICAL,
    defaultMessage: '数据库连接失败'
  },
  [ErrorType.QUERY_TIMEOUT]: {
    statusCode: 504,
    severity: ErrorSeverity.MEDIUM,
    defaultMessage: '查询超时'
  },
  [ErrorType.AI_MODEL_ERROR]: {
    statusCode: 500,
    severity: ErrorSeverity.MEDIUM,
    defaultMessage: 'AI模型错误'
  },
  [ErrorType.INTENT_DETECTION]: {
    statusCode: 400,
    severity: ErrorSeverity.LOW,
    defaultMessage: '意图检测失败'
  },
  [ErrorType.PROMPT_ERROR]: {
    statusCode: 400,
    severity: ErrorSeverity.LOW,
    defaultMessage: '提示词错误'
  },
  [ErrorType.INTERNAL]: {
    statusCode: 500,
    severity: ErrorSeverity.HIGH,
    defaultMessage: '内部服务器错误'
  },
  [ErrorType.SERVICE_UNAVAILABLE]: {
    statusCode: 503,
    severity: ErrorSeverity.HIGH,
    defaultMessage: '服务不可用'
  },
  [ErrorType.NETWORK_ERROR]: {
    statusCode: 503,
    severity: ErrorSeverity.MEDIUM,
    defaultMessage: '网络错误'
  },
  [ErrorType.BUSINESS_RULE]: {
    statusCode: 400,
    severity: ErrorSeverity.LOW,
    defaultMessage: '业务规则错误'
  },
  [ErrorType.RESOURCE_NOT_FOUND]: {
    statusCode: 404,
    severity: ErrorSeverity.LOW,
    defaultMessage: '资源不存在'
  },
  [ErrorType.DUPLICATE_RESOURCE]: {
    statusCode: 409,
    severity: ErrorSeverity.LOW,
    defaultMessage: '资源重复'
  }
};

/**
 * 错误管理器类
 */
export class ErrorManager {
  /**
   * 创建错误
   */
  createError(type: ErrorType, message?: string, details?: any): AppError {
    const config = ERROR_CONFIG[type];
    const error: AppError = {
      type,
      message: message || config.defaultMessage,
      severity: config.severity,
      statusCode: config.statusCode,
      details,
      timestamp: new Date()
    };

    return error;
  }

  /**
   * 处理错误
   */
  handleError(error: AppError | Error, context?: Record<string, any>): AppError {
    let appError: AppError;

    if ('type' in error) {
      // 已经是AppError
      appError = error;
    } else {
      // 普通Error，转换为AppError
      appError = this.createError(
        ErrorType.INTERNAL,
        error.message || '未知错误',
        { originalError: error.message }
      );
      appError.stack = error.stack;
    }

    // 记录错误
    this.logError(appError, context);

    return appError;
  }

  /**
   * 记录错误
   */
  logError(error: AppError, context?: Record<string, any>): void {
    const logData = {
      errorType: error.type,
      message: error.message,
      severity: error.severity,
      statusCode: error.statusCode,
      details: error.details,
      context,
      timestamp: error.timestamp
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        logger.error('Critical Error:', logData, error.stack);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn('Warning:', logData);
        break;
      case ErrorSeverity.LOW:
        logger.info('Info:', logData);
        break;
    }
  }

  /**
   * 获取友好的错误提示
   */
  getFriendlyMessage(error: AppError): string {
    const friendlyMessages: Record<ErrorType, string> = {
      [ErrorType.SQL_INJECTION]: '您的请求包含不安全的内容，请检查输入',
      [ErrorType.UNAUTHORIZED]: '请先登录后再进行操作',
      [ErrorType.FORBIDDEN]: '您没有权限执行此操作',
      [ErrorType.VALIDATION]: '请检查您的输入是否正确',
      [ErrorType.MISSING_PARAMS]: '请填写所有必填字段',
      [ErrorType.INVALID_FORMAT]: '输入格式不正确，请检查后重试',
      [ErrorType.SQL_ERROR]: '数据处理失败，请稍后重试',
      [ErrorType.DATABASE_CONNECTION]: '数据库连接失败，请稍后重试',
      [ErrorType.QUERY_TIMEOUT]: '查询超时，请尝试简化您的请求',
      [ErrorType.AI_MODEL_ERROR]: 'AI处理失败，请稍后重试',
      [ErrorType.INTENT_DETECTION]: '无法理解您的请求，请尝试重新表述',
      [ErrorType.PROMPT_ERROR]: '请求格式不正确，请检查后重试',
      [ErrorType.INTERNAL]: '系统内部错误，请稍后重试',
      [ErrorType.SERVICE_UNAVAILABLE]: '服务暂时不可用，请稍后重试',
      [ErrorType.NETWORK_ERROR]: '网络连接失败，请检查网络后重试',
      [ErrorType.BUSINESS_RULE]: '操作不符合业务规则，请检查后重试',
      [ErrorType.RESOURCE_NOT_FOUND]: '请求的资源不存在',
      [ErrorType.DUPLICATE_RESOURCE]: '资源已存在，请检查后重试'
    };

    return friendlyMessages[error.type] || error.message;
  }

  /**
   * 生成错误响应
   */
  generateErrorResponse(error: AppError): any {
    return {
      success: false,
      error: this.getFriendlyMessage(error),
      errorType: error.type,
      severity: error.severity,
      timestamp: error.timestamp.toISOString(),
      ...(process.env.NODE_ENV === 'development' && {
        details: error.details,
        stack: error.stack
      })
    };
  }

  /**
   * 处理HTTP错误
   */
  handleHttpError(error: AppError | Error, req: any, res: any): void {
    const appError = this.handleError(error, {
      path: req.path,
      method: req.method,
      query: req.query,
      body: req.body
    });

    res.status(appError.statusCode).json(this.generateErrorResponse(appError));
  }
}

/**
 * 默认错误管理器实例
 */
export const errorManager = new ErrorManager();
