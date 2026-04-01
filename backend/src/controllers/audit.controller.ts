/**
 * 数据变更日志控制器
 * Audit Log Controller
 */

import { Request, Response } from 'express';
import { auditLogService } from '../services/auditLog.service';
import { logger } from '../utils/logger';

export class AuditController {
  /**
   * 查询变更日志
   * GET /api/v1/audit/changes
   * Query: containerNumber, entityType, entityId, sourceType, startDate, endDate, limit, offset
   */
  getChanges = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        containerNumber,
        entityType,
        entityId,
        sourceType,
        startDate,
        endDate,
        limit,
        offset
      } = req.query;

      const params: Parameters<typeof auditLogService.queryChanges>[0] = {};
      if (containerNumber && typeof containerNumber === 'string')
        params.containerNumber = containerNumber;
      if (entityType && typeof entityType === 'string') params.entityType = entityType;
      if (entityId && typeof entityId === 'string') params.entityId = entityId;
      if (sourceType && typeof sourceType === 'string') params.sourceType = sourceType as any;
      if (startDate && typeof startDate === 'string') params.startDate = new Date(startDate);
      if (endDate && typeof endDate === 'string') params.endDate = new Date(endDate);
      if (limit) params.limit = parseInt(String(limit), 10);
      if (offset) params.offset = parseInt(String(offset), 10);

      const { rows, total } = await auditLogService.queryChanges(params);

      res.json({
        success: true,
        data: {
          rows,
          total
        }
      });
    } catch (error) {
      logger.error('[Audit] getChanges failed:', error);
      res.status(500).json({
        success: false,
        message: '查询变更日志失败'
      });
    }
  };

  /**
   * 按货柜号查询变更日志
   * GET /api/v1/audit/changes/container/:containerNumber
   */
  getChangesByContainer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { containerNumber } = req.params;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;

      const rows = await auditLogService.getChangesByContainer(containerNumber, limit);

      res.json({
        success: true,
        data: rows
      });
    } catch (error) {
      logger.error('[Audit] getChangesByContainer failed:', error);
      res.status(500).json({
        success: false,
        message: '查询货柜变更日志失败'
      });
    }
  };
}
