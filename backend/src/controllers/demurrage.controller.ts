/**
 * 滞港费控制器
 * Demurrage Controller
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import { ExtDemurrageStandard } from '../entities/ExtDemurrageStandard';
import { ExtDemurrageRecord } from '../entities/ExtDemurrageRecord';
import { snakeToCamel } from '../utils/snakeToCamel';
import { Container } from '../entities/Container';
import { PortOperation } from '../entities/PortOperation';
import { SeaFreight } from '../entities/SeaFreight';
import { TruckingTransport } from '../entities/TruckingTransport';
import { EmptyReturn } from '../entities/EmptyReturn';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { DemurrageService } from '../services/demurrage.service';
import { logger } from '../utils/logger';

const demurrageService = new DemurrageService(
  AppDataSource.getRepository(ExtDemurrageStandard),
  AppDataSource.getRepository(Container),
  AppDataSource.getRepository(PortOperation),
  AppDataSource.getRepository(SeaFreight),
  AppDataSource.getRepository(TruckingTransport),
  AppDataSource.getRepository(EmptyReturn),
  AppDataSource.getRepository(ReplenishmentOrder),
  AppDataSource.getRepository(ExtDemurrageRecord)
);

export class DemurrageController {
  /**
   * GET /api/v1/demurrage/standards
   * 获取滞港费标准列表（支持按目的港、船公司筛选）
   */
  getStandards = async (req: Request, res: Response): Promise<void> => {
    try {
      const { destination_port_code, shipping_company_code } = req.query;
      const repo = AppDataSource.getRepository(ExtDemurrageStandard);
      const qb = repo
        .createQueryBuilder('s')
        .orderBy('s.sequence_number', 'ASC')
        .addOrderBy('s.id', 'ASC');

      if (destination_port_code && typeof destination_port_code === 'string') {
        qb.andWhere('s.destination_port_code = :port', { port: destination_port_code });
      }
      if (shipping_company_code && typeof shipping_company_code === 'string') {
        qb.andWhere('s.shipping_company_code = :company', { company: shipping_company_code });
      }

      const standards = await qb.getMany();
      res.json({
        success: true,
        data: standards.map((s) => ({
          id: s.id,
          destinationPortCode: s.destinationPortCode,
          destinationPortName: s.destinationPortName,
          shippingCompanyCode: s.shippingCompanyCode,
          shippingCompanyName: s.shippingCompanyName,
          originForwarderCode: s.originForwarderCode,
          originForwarderName: s.originForwarderName,
          foreignCompanyCode: s.foreignCompanyCode,
          foreignCompanyName: s.foreignCompanyName,
          freeDays: s.freeDays,
          freeDaysBasis: s.freeDaysBasis,
          calculationBasis: s.calculationBasis,
          ratePerDay: s.ratePerDay != null ? Number(s.ratePerDay) : null,
          tiers: s.tiers,
          currency: s.currency,
          chargeName: s.chargeName,
          chargeTypeCode: s.chargeTypeCode,
          effectiveDate: s.effectiveDate,
          expiryDate: s.expiryDate
        }))
      });
    } catch (error) {
      logger.error('Failed to get demurrage standards', error);
      res.status(500).json({
        success: false,
        message: '获取滞港费标准失败',
        error: (error as Error).message
      });
    }
  };

  /**
   * GET /api/v1/demurrage/diagnose/:containerNumber
   * 诊断滞港费匹配失败原因
   */
  diagnoseMatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const containerNumber = decodeURIComponent(req.params.containerNumber);
      if (!containerNumber) {
        res.status(400).json({ success: false, message: '缺少柜号' });
        return;
      }
      const result = await demurrageService.diagnoseMatch(containerNumber);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Failed to diagnose demurrage match', error);
      res.status(500).json({
        success: false,
        message: '诊断失败',
        error: (error as Error).message
      });
    }
  };

  /**
   * POST /api/v1/demurrage/standards
   * 新建滞港费标准（口径统一：四项使用字典编码）
   */
  createStandard = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = snakeToCamel(req.body);
      const repo = AppDataSource.getRepository(ExtDemurrageStandard);
      const entity = repo.create({
        foreignCompanyCode: body.foreignCompanyCode ?? null,
        foreignCompanyName: body.foreignCompanyName ?? null,
        effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : null,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        destinationPortCode: body.destinationPortCode ?? null,
        destinationPortName: body.destinationPortName ?? null,
        shippingCompanyCode: body.shippingCompanyCode ?? null,
        shippingCompanyName: body.shippingCompanyName ?? null,
        terminal: body.terminal ?? null,
        originForwarderCode: body.originForwarderCode ?? null,
        originForwarderName: body.originForwarderName ?? null,
        transportModeCode: body.transportModeCode ?? null,
        transportModeName: body.transportModeName ?? null,
        chargeTypeCode: body.chargeTypeCode ?? null,
        chargeName: body.chargeName ?? '滞港费',
        isChargeable: body.isChargeable ?? 'Y',
        sequenceNumber: body.sequenceNumber ?? null,
        portCondition: body.portCondition ?? null,
        freeDaysBasis: body.freeDaysBasis ?? '自然日',
        freeDays: body.freeDays ?? 0,
        calculationBasis: body.calculationBasis ?? '按卸船',
        ratePerDay: body.ratePerDay ?? null,
        tiers: body.tiers ?? null,
        currency: body.currency ?? 'USD',
        processStatus: body.processStatus ?? null
      } as Partial<ExtDemurrageStandard>);
      const saved = await repo.save(entity);
      res.json({ success: true, data: { id: saved.id } });
    } catch (error: any) {
      logger.error('Failed to create demurrage standard', error);
      res.status(500).json({
        success: false,
        message: '创建滞港费标准失败',
        error: error.message
      });
    }
  };

  /**
   * GET /api/v1/demurrage/calculate/:containerNumber
   * 计算单柜滞港费：匹配标准 → 逐项计算 → 汇总
   */
  calculateForContainer = async (req: Request, res: Response): Promise<void> => {
    try {
      const containerNumber = decodeURIComponent(req.params.containerNumber);
      if (!containerNumber) {
        res.status(400).json({ success: false, message: '缺少柜号' });
        return;
      }

      const { result, message, reason } = await demurrageService.calculateForContainer(containerNumber);
      if (!result) {
        res.json({
          success: true,
          data: null,
          message: message ?? '缺少起算日或截止日，无法计算',
          reason: reason ?? 'missing_dates'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          containerNumber: result.containerNumber,
          startDate: result.startDate,
          endDate: result.endDate,
          startDateSource: result.startDateSource,
          endDateSource: result.endDateSource,
          calculationDates: result.calculationDates,
          matchedStandards: result.matchedStandards,
          items: result.items,
          totalAmount: result.totalAmount,
          currency: result.currency
        }
      });
    } catch (error) {
      logger.error('Failed to calculate demurrage', error);
      res.status(500).json({
        success: false,
        message: '滞港费计算失败',
        error: (error as Error).message
      });
    }
  };

  /**
   * GET /api/v1/demurrage/summary
   * 滞港费汇总统计：按出运日期范围
   */
  getSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, limit } = req.query;
      const result = await demurrageService.getSummary(
        startDate as string,
        endDate as string,
        limit ? Number(limit) : 500
      );
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Failed to get demurrage summary', error);
      res.status(500).json({
        success: false,
        message: '获取滞港费汇总失败',
        error: (error as Error).message
      });
    }
  };

  /**
   * GET /api/v1/demurrage/top-containers
   * 高费用货柜 Top N
   */
  getTopContainers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, topN } = req.query;
      const result = await demurrageService.getTopContainers(
        startDate as string,
        endDate as string,
        topN ? Number(topN) : 10
      );
      res.json({ success: true, data: result });
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to get top demurrage containers', { message: err.message, stack: err.stack });
      res.status(500).json({
        success: false,
        message: '获取高费用货柜失败',
        error: err.message
      });
    }
  };

  /**
   * POST /api/v1/demurrage/batch-compute-records
   * 批量预计算并写入 ext_demurrage_records（每日定时任务或手动触发）
   */
  batchComputeRecords = async (req: Request, res: Response): Promise<void> => {
    try {
      const { shipmentStartDate, shipmentEndDate, limit } = req.body || {};
      const result = await demurrageService.batchComputeAndSaveRecords({
        shipmentStartDate: shipmentStartDate as string,
        shipmentEndDate: shipmentEndDate as string,
        limit: limit ? Number(limit) : 1000
      });
      res.json({
        success: true,
        data: result,
        message: `预计算完成：处理 ${result.computed} 柜，写入 ${result.saved} 条记录，永久化 ${result.finalized} 条`
      });
    } catch (error) {
      logger.error('Failed to batch compute demurrage records', error);
      res.status(500).json({
        success: false,
        message: '批量预计算失败',
        error: (error as Error).message
      });
    }
  };

  /**
   * POST /api/v1/demurrage/batch-write-back
   * 批量写回最晚提柜日/最晚还箱日（供定时任务或手动触发）
   */
  batchWriteBack = async (req: Request, res: Response): Promise<void> => {
    try {
      const limitLastFree = req.body?.limit_last_free ?? 100;
      const limitLastReturn = req.body?.limit_last_return ?? 100;

      const result = await demurrageService.batchWriteBackComputedDates({
        limitLastFree: Number(limitLastFree),
        limitLastReturn: Number(limitLastReturn)
      });

      res.json({
        success: true,
        data: result,
        message: `批量写回完成：最晚提柜日 ${result.lastFreeWritten}/${result.lastFreeProcessed}，最晚还箱日 ${result.lastReturnWritten}/${result.lastReturnProcessed}`
      });
    } catch (error) {
      logger.error('Failed to batch write back demurrage dates', error);
      res.status(500).json({
        success: false,
        message: '批量写回失败',
        error: (error as Error).message
      });
    }
  };
}
