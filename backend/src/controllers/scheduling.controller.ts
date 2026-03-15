/**
 * 智能排柜控制器
 * Intelligent Scheduling Controller
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import { Container } from '../entities/Container';
import { PortOperation } from '../entities/PortOperation';
import { Warehouse } from '../entities/Warehouse';
import { TruckingCompany } from '../entities/TruckingCompany';
import { intelligentSchedulingService } from '../services/intelligentScheduling.service';
import { containerService } from '../services/container.service';
import { logger } from '../utils/logger';

export class SchedulingController {
  /**
   * POST /api/v1/containers/batch-schedule
   * 批量排产
   * Body: { country?, startDate?, endDate?, forceSchedule? }
   */
  batchSchedule = async (req: Request, res: Response): Promise<void> => {
    try {
      const { country, startDate, endDate, forceSchedule, containerNumbers, limit, skip } = req.body;

      logger.info(`[Scheduling] Batch schedule request:`, { country, startDate, endDate, forceSchedule, containerNumbers, limit, skip });

      const result = await intelligentSchedulingService.batchSchedule({
        country: typeof country === 'string' ? country : undefined,
        startDate: typeof startDate === 'string' ? startDate : undefined,
        endDate: typeof endDate === 'string' ? endDate : undefined,
        forceSchedule: !!forceSchedule,
        containerNumbers: Array.isArray(containerNumbers) ? containerNumbers : undefined,
        limit: typeof limit === 'number' ? limit : undefined,
        skip: typeof skip === 'number' ? skip : undefined
      });

      res.json(result);
    } catch (error: any) {
      logger.error('[Scheduling] batchSchedule error:', error);
      res.status(500).json({ 
        success: false, 
        message: error?.message || '排产失败',
        total: 0,
        successCount: 0,
        failedCount: 0,
        results: []
      });
    }
  };

  /**
   * POST /api/v1/containers/:id/schedule-preview
   * 单柜模拟排产预览（不写库）
   */
  schedulePreview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id: containerNumber } = req.params;
      
      // 获取货柜信息（包含关联数据）
      const container = await containerService.getContainerByNumber(containerNumber);
      if (!container) {
        res.status(404).json({
          success: false,
          message: '货柜不存在'
        });
        return;
      }

      // 获取目的港操作记录
      const destPo = (container as any).portOperations?.find((po: any) => po.portType === 'destination');
      if (!destPo) {
        res.status(400).json({
          success: false,
          message: '无目的港操作记录'
        });
        return;
      }

      // 计算计划时间（复用智能排柜的逻辑）
      const clearanceDate = destPo.ataDestPort || destPo.etaDestPort;
      if (!clearanceDate) {
        res.status(400).json({
          success: false,
          message: '无到港日期（ATA/ETA），无法预览'
        });
        return;
      }

      const plannedCustomsDate = new Date(clearanceDate);
      const plannedPickupDate = new Date(plannedCustomsDate);
      plannedPickupDate.setDate(plannedPickupDate.getDate() + 1);
      if (destPo.lastFreeDate && plannedPickupDate > new Date(destPo.lastFreeDate)) {
        plannedPickupDate.setTime(new Date(destPo.lastFreeDate).getTime());
      }

      const plannedDeliveryDate = new Date(plannedPickupDate);
      plannedDeliveryDate.setDate(plannedDeliveryDate.getDate() - 1);

      const plannedUnloadDate = new Date(plannedPickupDate);
      plannedUnloadDate.setDate(plannedUnloadDate.getDate() + 1);

      const plannedReturnDate = new Date(plannedUnloadDate);
      plannedReturnDate.setDate(plannedReturnDate.getDate() + 1);
      if (destPo.lastFreeDate) {
        const lastReturn = new Date(destPo.lastFreeDate);
        lastReturn.setDate(lastReturn.getDate() + 7);
        if (plannedReturnDate > lastReturn) {
          plannedReturnDate.setTime(lastReturn.getTime());
        }
      }

      res.json({
        success: true,
        message: '预览成功',
        data: {
          containerNumber,
          plannedCustomsDate: plannedCustomsDate.toISOString().split('T')[0],
          plannedPickupDate: plannedPickupDate.toISOString().split('T')[0],
          plannedDeliveryDate: plannedDeliveryDate.toISOString().split('T')[0],
          plannedUnloadDate: plannedUnloadDate.toISOString().split('T')[0],
          plannedReturnDate: plannedReturnDate.toISOString().split('T')[0],
          lastFreeDate: destPo.lastFreeDate ? new Date(destPo.lastFreeDate).toISOString().split('T')[0] : null,
          eta: destPo.etaDestPort ? new Date(destPo.etaDestPort).toISOString().split('T')[0] : null,
          ata: destPo.ataDestPort ? new Date(destPo.ataDestPort).toISOString().split('T')[0] : null
        }
      });
    } catch (error: any) {
      logger.error('[Scheduling] schedulePreview error:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  };

  /**
   * GET /api/v1/containers/scheduling-overview
   * 获取排产概览信息（待排产数量、配置等）
   */
  getSchedulingOverview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate } = req.query;
      const hasDateRange = startDate && endDate;
      const dateCondition = hasDateRange
        ? `AND (COALESCE(po.ata_dest_port, po.eta_dest_port)::date >= $1::date AND COALESCE(po.ata_dest_port, po.eta_dest_port)::date <= $2::date)`
        : '';
      const ataEtaCondition = 'AND (po.ata_dest_port IS NOT NULL OR po.eta_dest_port IS NOT NULL)';

      // 查询待排产货柜数量（与 batchSchedule 口径一致：有目的港、ATA/ETA 非空、可选日期范围）
      const containerRepo = AppDataSource.getRepository(Container);
      const params = hasDateRange ? [String(startDate), String(endDate)] : [];
      const initialCountResult = await containerRepo.query(
        `SELECT COUNT(*) as count FROM biz_containers c
         WHERE c.schedule_status = 'initial'
         AND EXISTS (
           SELECT 1 FROM process_port_operations po
           WHERE po.container_number = c.container_number AND po.port_type = 'destination'
           ${ataEtaCondition}
           ${dateCondition}
         )`,
        params.length ? params : undefined
      );

      const issuedCountResult = await containerRepo.query(
        `SELECT COUNT(*) as count FROM biz_containers c
         WHERE c.schedule_status = 'issued'
         AND EXISTS (
           SELECT 1 FROM process_port_operations po
           WHERE po.container_number = c.container_number AND po.port_type = 'destination'
           ${ataEtaCondition}
           ${dateCondition}
         )`,
        params.length ? params : undefined
      );

      const initialCount = parseInt(initialCountResult[0]?.count || '0');
      const issuedCount = parseInt(issuedCountResult[0]?.count || '0');

      // 获取仓库产能信息
      const warehouseRepo = AppDataSource.getRepository(Warehouse);
      let warehouses: Warehouse[] = [];
      try {
        warehouses = await warehouseRepo.find({ 
          where: { status: 'ACTIVE' } as any,
          select: ['warehouseCode', 'warehouseName', 'country', 'dailyUnloadCapacity']
        });
        if (warehouses.length === 0) {
          warehouses = await warehouseRepo.find({ 
            select: ['warehouseCode', 'warehouseName', 'country', 'dailyUnloadCapacity']
          });
        }
      } catch (e) {
        logger.warn('[Scheduling] Query warehouse with status failed, retrying without filter:', e);
        warehouses = await warehouseRepo.find({ 
          select: ['warehouseCode', 'warehouseName', 'country', 'dailyUnloadCapacity']
        });
      }

      // 获取车队信息（status 可能为 NULL/非 ACTIVE，先试 ACTIVE，空则回退全量）
      const truckingRepo = AppDataSource.getRepository(TruckingCompany);
      let truckings: TruckingCompany[] = [];
      try {
        truckings = await truckingRepo.find({
          where: { status: 'ACTIVE' } as any,
          select: ['companyCode', 'companyName', 'country', 'dailyCapacity']
        });
        if (truckings.length === 0) {
          truckings = await truckingRepo.find({
            select: ['companyCode', 'companyName', 'country', 'dailyCapacity']
          });
        }
      } catch (e) {
        logger.warn('[Scheduling] Query trucking with status failed, retrying without filter:', e);
        truckings = await truckingRepo.find({
          select: ['companyCode', 'companyName', 'country']
        });
      }

      res.json({
        success: true,
        data: {
          pendingCount: initialCount + issuedCount,
          initialCount,
          issuedCount,
          warehouses: warehouses.map(w => ({
            code: w.warehouseCode,
            name: w.warehouseName,
            country: w.country,
            dailyCapacity: w.dailyUnloadCapacity ?? 10
          })),
          truckings: truckings.map(t => ({
            code: t.companyCode,
            name: t.companyName,
            country: t.country,
            dailyCapacity: t.dailyCapacity ?? 10
          }))
        }
      });
    } catch (error: any) {
      logger.error('[Scheduling] getSchedulingOverview error:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  };
}
