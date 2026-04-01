/**
 * 用户输入验证器
 * User Input Validator
 *
 * 验证和清理用户输入，防止恶意输入和注入攻击
 */

/**
 * 输入验证结果
 */
export interface InputValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: any;
}

/**
 * 输入验证器类
 */
export class InputValidator {
  /**
   * 验证字符串输入
   */
  validateString(
    input: any,
    options?: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      pattern?: RegExp;
      trim?: boolean;
    }
  ): InputValidationResult {
    const {
      required = false,
      minLength = 0,
      maxLength = 1000,
      pattern,
      trim = true
    } = options || {};

    // 检查是否为字符串
    if (typeof input !== 'string') {
      if (required) {
        return {
          isValid: false,
          error: 'Input must be a string'
        };
      }
      return {
        isValid: true,
        sanitized: null
      };
    }

    // 清理字符串
    let sanitized = trim ? input.trim() : input;

    // 检查是否为空
    if (required && sanitized.length === 0) {
      return {
        isValid: false,
        error: 'Input cannot be empty'
      };
    }

    // 检查长度
    if (sanitized.length < minLength) {
      return {
        isValid: false,
        error: `Input must be at least ${minLength} characters long`
      };
    }

    if (sanitized.length > maxLength) {
      return {
        isValid: false,
        error: `Input cannot exceed ${maxLength} characters`
      };
    }

    // 检查模式
    if (pattern && !pattern.test(sanitized)) {
      return {
        isValid: false,
        error: 'Input does not match required pattern'
      };
    }

    // 清理危险字符
    sanitized = this.sanitizeString(sanitized);

    return {
      isValid: true,
      sanitized
    };
  }

  /**
   * 验证数字输入
   */
  validateNumber(
    input: any,
    options?: {
      required?: boolean;
      min?: number;
      max?: number;
      integer?: boolean;
    }
  ): InputValidationResult {
    const { required = false, min, max, integer = false } = options || {};

    // 检查是否为数字
    const num = Number(input);
    if (isNaN(num)) {
      if (required) {
        return {
          isValid: false,
          error: 'Input must be a number'
        };
      }
      return {
        isValid: true,
        sanitized: null
      };
    }

    // 检查是否为整数
    if (integer && !Number.isInteger(num)) {
      return {
        isValid: false,
        error: 'Input must be an integer'
      };
    }

    // 检查范围
    if (min !== undefined && num < min) {
      return {
        isValid: false,
        error: `Input must be at least ${min}`
      };
    }

    if (max !== undefined && num > max) {
      return {
        isValid: false,
        error: `Input cannot exceed ${max}`
      };
    }

    return {
      isValid: true,
      sanitized: num
    };
  }

  /**
   * 验证数组输入
   */
  validateArray(
    input: any,
    options?: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      elementValidator?: (element: any) => InputValidationResult;
    }
  ): InputValidationResult {
    const { required = false, minLength = 0, maxLength = 100, elementValidator } = options || {};

    // 检查是否为数组
    if (!Array.isArray(input)) {
      if (required) {
        return {
          isValid: false,
          error: 'Input must be an array'
        };
      }
      return {
        isValid: true,
        sanitized: null
      };
    }

    // 检查长度
    if (input.length < minLength) {
      return {
        isValid: false,
        error: `Array must contain at least ${minLength} elements`
      };
    }

    if (input.length > maxLength) {
      return {
        isValid: false,
        error: `Array cannot contain more than ${maxLength} elements`
      };
    }

    // 验证每个元素
    if (elementValidator) {
      const sanitizedArray: any[] = [];
      for (const element of input) {
        const validation = elementValidator(element);
        if (!validation.isValid) {
          return validation;
        }
        sanitizedArray.push(validation.sanitized);
      }
      return {
        isValid: true,
        sanitized: sanitizedArray
      };
    }

    return {
      isValid: true,
      sanitized: input
    };
  }

  /**
   * 验证对象输入
   */
  validateObject(
    input: any,
    schema?: Record<string, (value: any) => InputValidationResult>
  ): InputValidationResult {
    // 检查是否为对象
    if (input === null || typeof input !== 'object') {
      return {
        isValid: false,
        error: 'Input must be an object'
      };
    }

    // 验证 schema
    if (schema) {
      const sanitizedObject: Record<string, any> = {};
      for (const [key, validator] of Object.entries(schema)) {
        const validation = validator(input[key]);
        if (!validation.isValid) {
          return {
            isValid: false,
            error: `Invalid value for ${key}: ${validation.error}`
          };
        }
        sanitizedObject[key] = validation.sanitized;
      }
      return {
        isValid: true,
        sanitized: sanitizedObject
      };
    }

    return {
      isValid: true,
      sanitized: input
    };
  }

  /**
   * 验证日期输入
   */
  validateDate(
    input: any,
    options?: {
      required?: boolean;
      min?: Date;
      max?: Date;
    }
  ): InputValidationResult {
    const { required = false, min, max } = options || {};

    // 检查是否为日期
    const date = new Date(input);
    if (isNaN(date.getTime())) {
      if (required) {
        return {
          isValid: false,
          error: 'Input must be a valid date'
        };
      }
      return {
        isValid: true,
        sanitized: null
      };
    }

    // 检查范围
    if (min && date < min) {
      return {
        isValid: false,
        error: `Date must be after ${min.toISOString()}`
      };
    }

    if (max && date > max) {
      return {
        isValid: false,
        error: `Date must be before ${max.toISOString()}`
      };
    }

    return {
      isValid: true,
      sanitized: date
    };
  }

  /**
   * 清理字符串
   */
  sanitizeString(input: string): string {
    // 移除危险字符
    let sanitized = input
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // 移除脚本标签
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // 移除 iframe 标签
      .replace(/<object[^>]*>.*?<\/object>/gi, '') // 移除 object 标签
      .replace(/<embed[^>]*>.*?<\/embed>/gi, '') // 移除 embed 标签
      .replace(/javascript:/gi, '') // 移除 javascript: 协议
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, ''); // 移除事件处理器

    // 转义 HTML 特殊字符
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    return sanitized;
  }

  /**
   * 验证 SQL 查询输入
   */
  validateSqlQuery(input: string): InputValidationResult {
    const validation = this.validateString(input, {
      required: true,
      maxLength: 5000
    });

    if (!validation.isValid) {
      return validation;
    }

    // 检查危险的 SQL 模式
    const dangerousPatterns = [
      /'\s*OR\s+'1'\s*=\s*'1/i,
      /'\s*OR\s+1\s*=\s*1/i,
      /'\s*;\s*DROP/i,
      /'\s*;\s*DELETE/i,
      /'\s*;\s*UPDATE/i,
      /'\s*;\s*INSERT/i,
      /UNION\s+ALL\s+SELECT/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(validation.sanitized!)) {
        return {
          isValid: false,
          error: 'Potential SQL injection detected'
        };
      }
    }

    return validation;
  }

  /**
   * 验证用户消息输入
   */
  validateUserMessage(input: string): InputValidationResult {
    const validation = this.validateString(input, {
      required: true,
      minLength: 1,
      maxLength: 2000
    });

    if (!validation.isValid) {
      return validation;
    }

    // 检查是否包含危险内容
    const dangerousContent = [
      '<script',
      '</script>',
      'javascript:',
      'onerror=',
      'onload=',
      'onclick='
    ];

    for (const content of dangerousContent) {
      if (validation.sanitized!.toLowerCase().includes(content)) {
        return {
          isValid: false,
          error: 'Message contains potentially dangerous content'
        };
      }
    }

    return validation;
  }
}

/**
 * 默认输入验证器实例
 */
export const inputValidator = new InputValidator();
