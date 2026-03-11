/**
 * 数据变更日志服务
 * Audit Log Service
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../database';
import { SysDataChangeLog, SourceType, ActionType } from '../entities/SysDataChangeLog';
import { logger } from '../utils/logger';

export interface LogChangeParams {
  sourceType: SourceType;
  entityType: string;
  entityId?: string | null;
  action: ActionType;
  changedFields?: Record<string, { old?: unknown; new?: unknown }> | null;
  batchId?: string | null;
  operatorId?: string | null;
  operatorIp?: string | null;
  remark?: string | null;
}

export interface QueryChangesParams {
  containerNumber?: string;
  entityType?: string;
  entityId?: string;
  sourceType?: SourceType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class AuditLogService {
  private repo: Repository<SysDataChangeLog>;

  constructor() {
    this.repo = AppDataSource.getRepository(SysDataChangeLog);
  }

  /**
   * 记录数据变更
   */
  async logChange(params: LogChangeParams): Promise<SysDataChangeLog | null> {
    try {
      const log = this.repo.create({
        sourceType: params.sourceType,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        action: params.action,
        changedFields: params.changedFields ?? null,
        batchId: params.batchId ?? null,
        operatorId: params.operatorId ?? null,
        operatorIp: params.operatorIp ?? null,
        remark: params.remark ?? null
      });
      const saved = await this.repo.save(log);
      return saved;
    } catch (error) {
      logger.error('[AuditLog] logChange failed:', error);
      return null;
    }
  }

  /**
   * 查询变更日志
   */
  async queryChanges(params: QueryChangesParams): Promise<{ rows: SysDataChangeLog[]; total: number }> {
    const qb = this.repo.createQueryBuilder('log');
    const limit = Math.min(params.limit ?? 50, 200);
    const offset = params.offset ?? 0;

    if (params.containerNumber) {
      qb.andWhere('log.entity_id = :containerNumber', { containerNumber: params.containerNumber });
    }
    if (params.entityType) {
      qb.andWhere('log.entity_type = :entityType', { entityType: params.entityType });
    }
    if (params.entityId) {
      qb.andWhere('log.entity_id = :entityId', { entityId: params.entityId });
    }
    if (params.sourceType) {
      qb.andWhere('log.source_type = :sourceType', { sourceType: params.sourceType });
    }
    if (params.startDate) {
      qb.andWhere('log.created_at >= :startDate', { startDate: params.startDate });
    }
    if (params.endDate) {
      qb.andWhere('log.created_at <= :endDate', { endDate: params.endDate });
    }

    qb.orderBy('log.created_at', 'DESC');

    const [rows, total] = await qb
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { rows, total };
  }

  /**
   * 按货柜号查询（含 entity_id 或 changed_fields 中涉及该货柜的关联记录）
   */
  async getChangesByContainer(containerNumber: string, limit = 50): Promise<SysDataChangeLog[]> {
    const { rows } = await this.queryChanges({ containerNumber, limit });
    return rows;
  }
}

export const auditLogService = new AuditLogService();
