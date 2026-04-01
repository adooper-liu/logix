/**
 * 权限管理器
 * Permission Manager
 *
 * 管理用户权限和限制敏感操作
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

/**
 * 权限级别
 */
export enum PermissionLevel {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin'
}

/**
 * 操作类型
 */
export enum OperationType {
  SQL_EXECUTION = 'sql_execution',
  AI_CHAT = 'ai_chat',
  SCHEDULING = 'scheduling',
  DATA_ACCESS = 'data_access',
  SYSTEM_MANAGEMENT = 'system_management'
}

/**
 * 权限配置
 */
export interface PermissionConfig {
  [operation: string]: PermissionLevel;
}

/**
 * 默认权限配置
 */
export const DEFAULT_PERMISSIONS: PermissionConfig = {
  [OperationType.SQL_EXECUTION]: PermissionLevel.WRITE,
  [OperationType.AI_CHAT]: PermissionLevel.READ,
  [OperationType.SCHEDULING]: PermissionLevel.WRITE,
  [OperationType.DATA_ACCESS]: PermissionLevel.READ,
  [OperationType.SYSTEM_MANAGEMENT]: PermissionLevel.ADMIN
};

/**
 * 权限管理器类
 */
export class PermissionManager {
  private permissions: PermissionConfig;

  constructor(permissions?: PermissionConfig) {
    this.permissions = permissions || DEFAULT_PERMISSIONS;
  }

  /**
   * 检查用户是否有权限执行操作
   */
  hasPermission(userLevel: PermissionLevel, operation: OperationType): boolean {
    const requiredLevel = this.permissions[operation];
    if (!requiredLevel) {
      return true; // 默认为允许
    }

    // 权限级别从低到高：READ < WRITE < ADMIN
    const levelOrder = [PermissionLevel.READ, PermissionLevel.WRITE, PermissionLevel.ADMIN];
    const userIndex = levelOrder.indexOf(userLevel);
    const requiredIndex = levelOrder.indexOf(requiredLevel);

    return userIndex >= requiredIndex;
  }

  /**
   * 从请求中获取用户权限级别
   */
  getUserPermissionLevel(req: Request): PermissionLevel {
    // 从请求中获取用户信息（这里需要根据实际的认证系统进行调整）
    // 暂时使用默认权限级别，实际项目中应该从 JWT token 或 session 中获取
    const user = (req as any).user;
    if (user && user.permissionLevel) {
      return user.permissionLevel;
    }

    // 默认权限级别
    return PermissionLevel.READ;
  }

  /**
   * 权限检查中间件
   */
  checkPermission(operation: OperationType) {
    return (req: Request, res: Response, next: NextFunction) => {
      const userLevel = this.getUserPermissionLevel(req);

      if (this.hasPermission(userLevel, operation)) {
        next();
      } else {
        logger.warn(
          `[PermissionManager] Permission denied for user with level ${userLevel} to perform ${operation}`
        );
        res.status(403).json({
          success: false,
          error:
            'Permission denied. You do not have sufficient permissions to perform this operation.'
        });
      }
    };
  }

  /**
   * 检查 SQL 操作权限
   */
  checkSqlPermission(req: Request, res: Response, next: NextFunction) {
    return this.checkPermission(OperationType.SQL_EXECUTION)(req, res, next);
  }

  /**
   * 检查排产操作权限
   */
  checkSchedulingPermission(req: Request, res: Response, next: NextFunction) {
    return this.checkPermission(OperationType.SCHEDULING)(req, res, next);
  }

  /**
   * 检查系统管理权限
   */
  checkSystemManagementPermission(req: Request, res: Response, next: NextFunction) {
    return this.checkPermission(OperationType.SYSTEM_MANAGEMENT)(req, res, next);
  }
}

/**
 * 默认权限管理器实例
 */
export const permissionManager = new PermissionManager();
