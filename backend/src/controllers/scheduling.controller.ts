/**
 * 智能排柜控制器
 * Intelligent Scheduling Controller
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import { Container } from '../entities/Container';
import { TruckingCompany } from '../entities/TruckingCompany';
import { Warehouse } from '../entities/Warehouse';
import { Yard } from '../entities/Yard';
import { containerService } from '../services/container.service';
import { intelligentSchedulingService } from '../services/intelligentScheduling.service';
import { SchedulingCostOptimizerService } from '../services/schedulingCostOptimizer.service';
import { logger } from '../utils/logger';

export class SchedulingController {
  private costOptimizerService = new SchedulingCostOptimizerService();

  /**
   * POST /api/v1/containers/batch-schedule
   * 批量排产
   * Body: { country?, startDate?, endDate?, forceSchedule? }
   */
  batchSchedule = async (req: Request, res: Response): Promise<void> => {
    try {
      const { country, startDate, endDate, forceSchedule, containerNumbers, limit, skip, dryRun } =
        req.body;

      logger.info(`[Scheduling] Batch schedule request:`, {
        country,
        startDate,
        endDate,
        forceSchedule,
        containerNumbers,
        limit,
        skip,
        dryRun
      });

      const result = await intelligentSchedulingService.batchSchedule({
        country: typeof country === 'string' ? country : undefined,
        startDate: typeof startDate === 'string' ? startDate : undefined,
        endDate: typeof endDate === 'string' ? endDate : undefined,
        forceSchedule: !!forceSchedule,
        containerNumbers: Array.isArray(containerNumbers) ? containerNumbers : undefined,
        limit: typeof limit === 'number' ? limit : undefined,
        skip: typeof skip === 'number' ? skip : undefined,
        dryRun: !!dryRun
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
      const destPo = (container as any).portOperations?.find(
        (po: any) => po.portType === 'destination'
      );
      if (!destPo) {
        res.status(400).json({
          success: false,
          message: '无目的港操作记录'
        });
        return;
      }

      // 计算计划时间（复用智能排柜的逻辑）
      const clearanceDate = destPo.ata || destPo.eta;
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
          // ✅ 已删除 lastFreeDate：因免费天数来源不明确（滞港/滞箱可能不同），应以成本计算结果为准
          eta: destPo.eta ? new Date(destPo.eta).toISOString().split('T')[0] : null,
          ata: destPo.ata ? new Date(destPo.ata).toISOString().split('T')[0] : null
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
   * POST /api/v1/scheduling/confirm
   * 确认并保存排产结果（重新计算，不使用前端传回的数据）
   */
  confirmSchedule = async (req: Request, res: Response): Promise<void> => {
    try {
      const { containerNumbers } = req.body;

      // 验证参数
      if (!Array.isArray(containerNumbers) || containerNumbers.length === 0) {
        res.status(400).json({
          success: false,
          message: 'containerNumbers 不能为空'
        });
        return;
      }

      logger.info(`[Scheduling] Confirm schedule request:`, { containerNumbers });

      // 重新执行排产（正式模式，dryRun=false）
      const result = await intelligentSchedulingService.batchSchedule({
        containerNumbers,
        dryRun: false // 正式保存
      });

      logger.info(
        `[Scheduling] Confirmed ${result.successCount}/${containerNumbers.length} containers`
      );

      res.json({
        success: result.success,
        savedCount: result.successCount,
        total: containerNumbers.length,
        results: result.results.map((r) => ({
          containerNumber: r.containerNumber,
          success: r.success,
          message: r.message
        }))
      });
    } catch (error: any) {
      logger.error('[Scheduling] confirmSchedule error:', error);
      res.status(500).json({
        success: false,
        message: error.message || '确认保存失败',
        savedCount: 0
      });
    }
  };

  /**
   * GET /api/v1/scheduling/overview
   * 获取排产概览信息（待排产数量、配置等）
   */
  getSchedulingOverview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, country, portCode } = req.query;
      const hasDateRange = startDate && endDate;
      // 注意：日期范围是可选的过滤条件，用于限定统计的时间窗口
      // 如果提供了日期范围，则只统计该时间范围内的 ATA/ETA
      const dateCondition = hasDateRange
        ? `AND (COALESCE(po.ata, po.eta)::date >= $1::date AND COALESCE(po.ata, po.eta)::date <= $2::date)`
        : '';

      // 查询待排产货柜数量（与 batchSchedule 口径一致）
      const containerRepo = AppDataSource.getRepository(Container);
      let params: any[] = hasDateRange ? [String(startDate), String(endDate)] : [];
      let paramIndex = hasDateRange ? 3 : 1;

      // 构建国家过滤条件
      const countryCondition = country
        ? `AND EXISTS (
            SELECT 1 FROM biz_replenishment_orders ro
            JOIN biz_customers cu ON ro.customer_code = cu.customer_code
            WHERE ro.container_number = c.container_number AND cu.country = $${paramIndex}
          )`
        : '';

      if (country) {
        params.push(String(country));
        paramIndex++;
      }

      // ✅ 新增：构建港口过滤条件
      const portCondition = portCode
        ? `AND EXISTS (
            SELECT 1 FROM process_port_operations po
            WHERE po.container_number = c.container_number 
              AND po.port_code = $${paramIndex}
          )`
        : '';

      if (portCode) {
        params.push(String(portCode));
        paramIndex++;
      }

      // 遵循 SKILL：验证 SQL 查询条件的正确性
      // 问题 1: port_type = 'destination' 可能没有数据
      // 解决 1: 改为 port_type IN ('destination', 'transit') 或者不限制 port_type
      // 问题 2: 没有过滤已提柜的货柜（实际业务中只有未提柜的才能排产）
      // 解决 2: 添加 NOT EXISTS(pickup_date) 条件
      // 注意：不需要强制要求 ATA/ETA，因为未到港但有 ETA 的也可以排产（预测性排产）
      //       但如果用户指定了日期范围，则在该范围内过滤
      const initialCountResult = await containerRepo.query(
        `SELECT COUNT(*) as count FROM biz_containers c
         WHERE c.schedule_status = 'initial'
         ${countryCondition}
         ${portCondition}  -- ✅ 应用港口过滤
         AND (
           -- 有目的港操作记录（port_type 为空或为 destination/transit）
           EXISTS (
             SELECT 1 FROM process_port_operations po
             WHERE po.container_number = c.container_number 
               AND (po.port_type IS NULL OR po.port_type = 'destination' OR po.port_type = 'transit')
               ${dateCondition}  -- 如果有日期范围，则在此过滤
           )
         )
         -- 排除已提柜的货柜
         AND NOT EXISTS (
           SELECT 1 FROM process_trucking_transport tt
           WHERE tt.container_number = c.container_number
           AND tt.pickup_date IS NOT NULL
         )`,
        params.length ? params : undefined
      );

      const issuedCountResult = await containerRepo.query(
        `SELECT COUNT(*) as count FROM biz_containers c
         WHERE c.schedule_status = 'issued'
         ${countryCondition}
         ${portCondition}  -- ✅ 应用港口过滤
         AND (
           -- 有目的港操作记录（port_type 为空或为 destination/transit）
           EXISTS (
             SELECT 1 FROM process_port_operations po
             WHERE po.container_number = c.container_number 
               AND (po.port_type IS NULL OR po.port_type = 'destination' OR po.port_type = 'transit')
               ${dateCondition}  -- 如果有日期范围，则在此过滤
           )
         )
         -- 排除已提柜的货柜
         AND NOT EXISTS (
           SELECT 1 FROM process_trucking_transport tt
           WHERE tt.container_number = c.container_number
           AND tt.pickup_date IS NOT NULL
         )`,
        params.length ? params : undefined
      );

      const initialCount = parseInt(initialCountResult[0]?.count || '0');
      const issuedCount = parseInt(issuedCountResult[0]?.count || '0');

      // 导入映射实体
      const { WarehouseTruckingMapping } = require('../entities/WarehouseTruckingMapping');
      const { TruckingPortMapping } = require('../entities/TruckingPortMapping');

      // 获取映射关系（包含费用信息）
      const warehouseTruckingMappingRepo = AppDataSource.getRepository(WarehouseTruckingMapping);
      const truckingPortMappingRepo = AppDataSource.getRepository(TruckingPortMapping);

      const countryCode = country ? String(country).trim().toUpperCase() : '';
      const countryAliases = countryCode
        ? countryCode === 'GB'
          ? ['GB', 'UK']
          : countryCode === 'UK'
            ? ['UK', 'GB']
            : countryCode === 'BE'
              ? ['BE', 'BEL']
              : countryCode === 'BEL'
                ? ['BEL', 'BE']
                : [countryCode]
        : [];

      // 查询有效的仓库-车队映射（包含费用）
      const warehouseTruckingMappings = countryCode
        ? await AppDataSource.query(
            `SELECT
               warehouse_code AS "warehouseCode",
               trucking_company_id AS "truckingCompanyId",
               transport_fee AS "transportFee",
               is_default AS "isDefault"
             FROM dict_warehouse_trucking_mapping
             WHERE is_active = true
               AND (
                 UPPER(country) = ANY($1::text[])
                 OR UPPER(warehouse_code) LIKE ANY($2::text[])
               )`,
            [countryAliases, countryAliases.map((c) => `${c}%`)]
          )
        : await warehouseTruckingMappingRepo.find({
            where: { isActive: true },
            select: ['warehouseCode', 'truckingCompanyId', 'transportFee', 'isDefault']
          });

      // 查询有效的车队-港口映射（包含堆场字段）
      const truckingPortMappings = countryCode
        ? await AppDataSource.query(
            `SELECT
               trucking_company_id AS "truckingCompanyId",
               port_code AS "portCode",
               yard_capacity AS "yardCapacity",
               standard_rate AS "standardRate",
               unit,
               yard_operation_fee AS "yardOperationFee"
             FROM dict_trucking_port_mapping
             WHERE is_active = true
               AND (
                 UPPER(country) = ANY($1::text[])
                 OR UPPER(port_code) LIKE ANY($2::text[])
               )`,
            [countryAliases, countryAliases.map((c) => `${c}%`)]
          )
        : await truckingPortMappingRepo.find({
            where: { isActive: true },
            select: [
              'truckingCompanyId',
              'portCode',
              'yardCapacity',
              'standardRate',
              'unit',
              'yardOperationFee'
            ]
          });

      // 构建车队-堆场信息映射
      const truckingYardInfoMap = new Map<
        string,
        {
          yardCapacity: number;
          standardRate: number;
          unit: string;
          yardOperationFee: number;
        }
      >();
      for (const m of truckingPortMappings) {
        const existing = truckingYardInfoMap.get(m.truckingCompanyId);
        // 取第一个有效的堆场信息（或可以按业务规则选择最优的）
        if (!existing && (m.yardCapacity > 0 || m.standardRate > 0)) {
          truckingYardInfoMap.set(m.truckingCompanyId, {
            yardCapacity: Number(m.yardCapacity) || 0,
            standardRate: Number(m.standardRate) || 0,
            unit: m.unit || '',
            yardOperationFee: Number(m.yardOperationFee) || 0
          });
        }
      }

      // 提取映射中的仓库代码和车队代码
      const mappedWarehouseCodes = new Set(
        warehouseTruckingMappings.map((m: { warehouseCode: string }) => m.warehouseCode)
      );

      // 车队必须同时在两个映射表中存在（与智能排产服务逻辑一致）
      const warehouseTruckingIds = new Set(
        warehouseTruckingMappings.map((m: { truckingCompanyId: string }) => m.truckingCompanyId)
      );
      const truckingPortIds = new Set(
        truckingPortMappings.map((m: { truckingCompanyId: string }) => m.truckingCompanyId)
      );
      // 取交集，只有同时在两个映射表中存在的车队才有效
      const mappedTruckingCompanyIds = new Set(
        [...warehouseTruckingIds].filter((id) => truckingPortIds.has(id))
      );
      const countryAliasSet = new Set(countryAliases.map((c) => c.toUpperCase()));
      const matchCountryAlias = (value?: string) => {
        if (!countryCode) return true;
        const normalized = String(value || '')
          .trim()
          .toUpperCase();
        return normalized ? countryAliasSet.has(normalized) : false;
      };
      const matchCodePrefix = (value?: string) => {
        if (!countryCode) return true;
        const normalized = String(value || '')
          .trim()
          .toUpperCase();
        return normalized ? countryAliases.some((code) => normalized.startsWith(code)) : false;
      };

      // 获取仓库产能信息（只包含在映射表中的仓库）
      const warehouseRepo = AppDataSource.getRepository(Warehouse);
      let warehouses: Warehouse[] = [];
      try {
        const warehouseWhere: any = { status: 'ACTIVE' };
        warehouses = await warehouseRepo.find({
          where: warehouseWhere,
          select: ['warehouseCode', 'warehouseName', 'country', 'dailyUnloadCapacity']
        });
        // 过滤出在映射表中的仓库
        warehouses = warehouses.filter(
          (w) =>
            mappedWarehouseCodes.has(w.warehouseCode) &&
            (matchCountryAlias(w.country) || matchCodePrefix(w.warehouseCode))
        );

        if (warehouses.length === 0) {
          const warehouseWhereNoStatus: any = {};
          warehouses = await warehouseRepo.find({
            where: warehouseWhereNoStatus,
            select: ['warehouseCode', 'warehouseName', 'country', 'dailyUnloadCapacity']
          });
          // 过滤出在映射表中的仓库
          warehouses = warehouses.filter(
            (w) =>
              mappedWarehouseCodes.has(w.warehouseCode) &&
              (matchCountryAlias(w.country) || matchCodePrefix(w.warehouseCode))
          );
        }
      } catch (e) {
        logger.warn('[Scheduling] Query warehouse with status failed, retrying without filter:', e);
        const warehouseWhere: any = {};
        warehouses = await warehouseRepo.find({
          where: warehouseWhere,
          select: ['warehouseCode', 'warehouseName', 'country', 'dailyUnloadCapacity']
        });
        // 过滤出在映射表中的仓库
        warehouses = warehouses.filter(
          (w) =>
            mappedWarehouseCodes.has(w.warehouseCode) &&
            (matchCountryAlias(w.country) || matchCodePrefix(w.warehouseCode))
        );
      }

      // 获取车队信息（只包含在映射表中的车队）
      const truckingRepo = AppDataSource.getRepository(TruckingCompany);
      let truckings: TruckingCompany[] = [];
      try {
        const truckingWhere: any = { status: 'ACTIVE' };
        truckings = await truckingRepo.find({
          where: truckingWhere,
          select: ['companyCode', 'companyName', 'country', 'dailyCapacity']
        });
        // 过滤出在映射表中的车队
        truckings = truckings.filter(
          (t) =>
            mappedTruckingCompanyIds.has(t.companyCode) &&
            (matchCountryAlias(t.country) || matchCodePrefix(t.companyCode))
        );

        if (truckings.length === 0) {
          const truckingWhereNoStatus: any = {};
          truckings = await truckingRepo.find({
            where: truckingWhereNoStatus,
            select: ['companyCode', 'companyName', 'country', 'dailyCapacity']
          });
          // 过滤出在映射表中的车队
          truckings = truckings.filter(
            (t) =>
              mappedTruckingCompanyIds.has(t.companyCode) &&
              (matchCountryAlias(t.country) || matchCodePrefix(t.companyCode))
          );
        }
      } catch (e) {
        logger.warn('[Scheduling] Query trucking with status failed, retrying without filter:', e);
        const truckingWhere: any = {};
        truckings = await truckingRepo.find({
          where: truckingWhere,
          select: ['companyCode', 'companyName', 'country']
        });
        // 过滤出在映射表中的车队
        truckings = truckings.filter(
          (t) =>
            mappedTruckingCompanyIds.has(t.companyCode) &&
            (matchCountryAlias(t.country) || matchCodePrefix(t.companyCode))
        );
      }

      // 构建仓库-费用映射（获取每个仓库默认车队的拖卡费）
      const warehouseFeeMap = new Map<string, number>();
      const warehouseDefaultTrucking = new Map<string, string>();
      for (const m of warehouseTruckingMappings) {
        const existing = warehouseFeeMap.get(m.warehouseCode);
        // 优先使用默认仓库的费用
        if (m.isDefault || !existing) {
          warehouseFeeMap.set(m.warehouseCode, Number(m.transportFee) || 0);
          warehouseDefaultTrucking.set(m.warehouseCode, m.truckingCompanyId);
        }
      }

      // 构建车队 - 费用映射（获取每个车队默认仓库的拖卡费）
      const truckingFeeMap = new Map<string, number>();
      const truckingDefaultWarehouse = new Map<string, string>();
      for (const m of warehouseTruckingMappings) {
        const existing = truckingFeeMap.get(m.truckingCompanyId);
        if (m.isDefault || !existing) {
          truckingFeeMap.set(m.truckingCompanyId, Number(m.transportFee) || 0);
          truckingDefaultWarehouse.set(m.truckingCompanyId, m.warehouseCode);
        }
      }

      // ✅ 新增：获取港口分布统计（用于前端下拉选择器）
      const portStatsQuery = `
        SELECT po.port_code, po.port_name, COUNT(DISTINCT c.container_number) as count
        FROM biz_containers c
        JOIN process_port_operations po ON c.container_number = po.container_number
        WHERE c.schedule_status IN ('initial', 'issued')
          ${
            country
              ? `AND EXISTS (
            SELECT 1 FROM biz_replenishment_orders ro
            JOIN biz_customers cu ON ro.customer_code = cu.customer_code
            WHERE ro.container_number = c.container_number AND cu.country = $1
          )`
              : ''
          }
          AND (po.port_type IS NULL OR po.port_type = 'destination' OR po.port_type = 'transit')
          AND NOT EXISTS (
            SELECT 1 FROM process_trucking_transport tt
            WHERE tt.container_number = c.container_number AND tt.pickup_date IS NOT NULL
          )
        GROUP BY po.port_code, po.port_name
        ORDER BY count DESC
      `;

      const portStatsParams = country ? [String(country)] : [];
      const portsByCount = await containerRepo.query(portStatsQuery, portStatsParams);

      res.json({
        success: true,
        data: {
          pendingCount: initialCount + issuedCount,
          initialCount,
          issuedCount,
          warehouses: warehouses.map((w) => ({
            code: w.warehouseCode,
            name: w.warehouseName,
            country: w.country,
            dailyCapacity: w.dailyUnloadCapacity ?? 10,
            transportFee: warehouseFeeMap.get(w.warehouseCode) ?? 0,
            defaultTrucking: warehouseDefaultTrucking.get(w.warehouseCode) || null
          })),
          truckings: truckings.map((t) => {
            const yardInfo = truckingYardInfoMap.get(t.companyCode);
            return {
              code: t.companyCode,
              name: t.companyName,
              country: t.country,
              dailyCapacity: t.dailyCapacity ?? 10,
              dailyReturnCapacity: t.dailyReturnCapacity ?? t.dailyCapacity ?? 10,
              hasYard: t.hasYard ?? (yardInfo ? yardInfo.yardCapacity > 0 : false),
              yardCapacity: yardInfo?.yardCapacity ?? 0,
              standardRate: yardInfo?.standardRate ?? 0,
              unit: yardInfo?.unit ?? '',
              yardOperationFee: yardInfo?.yardOperationFee ?? 0,
              transportFee: truckingFeeMap.get(t.companyCode) ?? 0,
              defaultWarehouse: truckingDefaultWarehouse.get(t.companyCode) || null
            };
          }),
          ports: portsByCount // ✅ 新增：港口列表（带数量统计）
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

  /**
   * PUT /api/v1/scheduling/resources/warehouse/:code
   * 更新仓库日卸柜能力
   */
  updateWarehouseCapacity = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;
      const { dailyUnloadCapacity } = req.body;

      if (!code || dailyUnloadCapacity == null) {
        res.status(400).json({ success: false, message: '缺少必要参数' });
        return;
      }

      const warehouseRepo = AppDataSource.getRepository(Warehouse);
      const warehouse = await warehouseRepo.findOne({ where: { warehouseCode: code } });

      if (!warehouse) {
        res.status(404).json({ success: false, message: '仓库不存在' });
        return;
      }

      warehouse.dailyUnloadCapacity = dailyUnloadCapacity;
      await warehouseRepo.save(warehouse);

      res.json({ success: true, message: '仓库日卸柜能力更新成功', data: warehouse });
    } catch (error: any) {
      logger.error('[Scheduling] updateWarehouseCapacity error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/v1/scheduling/resources/overview
   * 获取资源概览（仓库列表和车队列表）
   */
  getResourcesOverview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { country } = req.query;

      const warehouseRepo = AppDataSource.getRepository(Warehouse);
      const truckingRepo = AppDataSource.getRepository(TruckingCompany);

      const warehouseWhere: any = {};
      const truckingWhere: any = {};
      if (country) {
        warehouseWhere.country = String(country);
        truckingWhere.country = String(country);
      }

      const warehouses = await warehouseRepo.find({
        where: warehouseWhere,
        select: [
          'warehouseCode',
          'warehouseName',
          'country',
          'dailyUnloadCapacity',
          'address',
          'status'
        ]
      });

      const truckings = await truckingRepo.find({
        where: truckingWhere,
        select: [
          'companyCode',
          'companyName',
          'country',
          'dailyCapacity',
          'dailyReturnCapacity',
          'hasYard',
          'status'
        ]
      });

      res.json({
        success: true,
        data: {
          warehouses: warehouses.map((w) => ({
            warehouseCode: w.warehouseCode,
            warehouseName: w.warehouseName,
            country: w.country,
            dailyUnloadCapacity: w.dailyUnloadCapacity ?? 10,
            dailyLoadCapacity: w.dailyUnloadCapacity ?? 10,
            address: w.address,
            status: w.status
          })),
          truckings: truckings.map((t) => ({
            companyCode: t.companyCode,
            companyName: t.companyName,
            country: t.country,
            dailyCapacity: t.dailyCapacity ?? 10,
            dailyReturnCapacity: t.dailyReturnCapacity ?? t.dailyCapacity ?? 10,
            hasYard: t.hasYard ?? false,
            status: t.status
          }))
        }
      });
    } catch (error: any) {
      logger.error('[Scheduling] getResourcesOverview error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/v1/scheduling/resources/mapped
   * 获取映射表中的仓库和车队（排产配置页面专用）
   * 只返回在映射表中有记录的仓库和车队
   */
  getMappedResources = async (req: Request, res: Response): Promise<void> => {
    try {
      const { country } = req.query;

      // 导入映射实体
      const { WarehouseTruckingMapping } = require('../entities/WarehouseTruckingMapping');
      const { TruckingPortMapping } = require('../entities/TruckingPortMapping');

      const warehouseTruckingMappingRepo = AppDataSource.getRepository(WarehouseTruckingMapping);
      const truckingPortMappingRepo = AppDataSource.getRepository(TruckingPortMapping);

      const countryCode = country ? String(country).trim().toUpperCase() : '';
      const countryAliases = countryCode
        ? countryCode === 'GB'
          ? ['GB', 'UK']
          : countryCode === 'UK'
            ? ['UK', 'GB']
            : countryCode === 'BE'
              ? ['BE', 'BEL']
              : countryCode === 'BEL'
                ? ['BEL', 'BE']
                : [countryCode]
        : [];

      // 查询有效的仓库-车队映射
      const warehouseTruckingMappings = countryCode
        ? await AppDataSource.query(
            `SELECT
               warehouse_code AS "warehouseCode",
               trucking_company_id AS "truckingCompanyId",
               transport_fee AS "transportFee",
               is_default AS "isDefault"
             FROM dict_warehouse_trucking_mapping
             WHERE is_active = true
               AND (
                 UPPER(country) = ANY($1::text[])
                 OR UPPER(warehouse_code) LIKE ANY($2::text[])
               )`,
            [countryAliases, countryAliases.map((c) => `${c}%`)]
          )
        : await warehouseTruckingMappingRepo.find({
            where: { isActive: true },
            select: ['warehouseCode', 'truckingCompanyId', 'transportFee', 'isDefault']
          });

      // 查询有效的车队-港口映射（包含 yardCapacity 用于判断是否有堆场）
      const truckingPortMappings = countryCode
        ? await AppDataSource.query(
            `SELECT
               trucking_company_id AS "truckingCompanyId",
               port_code AS "portCode",
               yard_capacity AS "yardCapacity"
             FROM dict_trucking_port_mapping
             WHERE is_active = true
               AND (
                 UPPER(country) = ANY($1::text[])
                 OR UPPER(port_code) LIKE ANY($2::text[])
               )`,
            [countryAliases, countryAliases.map((c) => `${c}%`)]
          )
        : await truckingPortMappingRepo.find({
            where: { isActive: true },
            select: ['truckingCompanyId', 'portCode', 'yardCapacity']
          });

      // 构建车队-堆场容量映射（yardCapacity > 0 表示有堆场）
      const truckingYardCapacityMap = new Map<string, number>();
      for (const m of truckingPortMappings) {
        const existing = truckingYardCapacityMap.get(m.truckingCompanyId);
        // 取最大值
        if (!existing || Number(m.yardCapacity) > existing) {
          truckingYardCapacityMap.set(m.truckingCompanyId, Number(m.yardCapacity) || 0);
        }
      }

      // 提取映射中的仓库代码
      const mappedWarehouseCodes = new Set(
        warehouseTruckingMappings.map((m: { warehouseCode: string }) => m.warehouseCode)
      );

      // 车队必须同时在两个映射表中存在
      const warehouseTruckingIds = new Set(
        warehouseTruckingMappings.map((m: { truckingCompanyId: string }) => m.truckingCompanyId)
      );
      const truckingPortIds = new Set(
        truckingPortMappings.map((m: { truckingCompanyId: string }) => m.truckingCompanyId)
      );
      const mappedTruckingCompanyIds = new Set(
        [...warehouseTruckingIds].filter((id) => truckingPortIds.has(id))
      );
      const countryAliasSet = new Set(countryAliases.map((c) => c.toUpperCase()));
      const matchCountryAlias = (value?: string) => {
        if (!countryCode) return true;
        const normalized = String(value || '')
          .trim()
          .toUpperCase();
        return normalized ? countryAliasSet.has(normalized) : false;
      };
      const matchCodePrefix = (value?: string) => {
        if (!countryCode) return true;
        const normalized = String(value || '')
          .trim()
          .toUpperCase();
        return normalized ? countryAliases.some((code) => normalized.startsWith(code)) : false;
      };

      // 获取仓库信息（只包含在映射表中的仓库）
      const warehouseRepo = AppDataSource.getRepository(Warehouse);
      let warehouses: Warehouse[] = [];
      try {
        const warehouseWhere: any = { status: 'ACTIVE' };
        warehouses = await warehouseRepo.find({
          where: warehouseWhere,
          select: ['warehouseCode', 'warehouseName', 'country', 'dailyUnloadCapacity']
        });
        warehouses = warehouses.filter(
          (w) =>
            mappedWarehouseCodes.has(w.warehouseCode) &&
            (matchCountryAlias(w.country) || matchCodePrefix(w.warehouseCode))
        );

        if (warehouses.length === 0) {
          const warehouseWhereNoStatus: any = {};
          warehouses = await warehouseRepo.find({
            where: warehouseWhereNoStatus,
            select: ['warehouseCode', 'warehouseName', 'country', 'dailyUnloadCapacity']
          });
          warehouses = warehouses.filter(
            (w) =>
              mappedWarehouseCodes.has(w.warehouseCode) &&
              (matchCountryAlias(w.country) || matchCodePrefix(w.warehouseCode))
          );
        }
      } catch (e) {
        logger.warn('[Scheduling] Query warehouse with status failed, retrying without filter:', e);
        const warehouseWhere: any = {};
        warehouses = await warehouseRepo.find({
          where: warehouseWhere,
          select: ['warehouseCode', 'warehouseName', 'country', 'dailyUnloadCapacity']
        });
        warehouses = warehouses.filter(
          (w) =>
            mappedWarehouseCodes.has(w.warehouseCode) &&
            (matchCountryAlias(w.country) || matchCodePrefix(w.warehouseCode))
        );
      }

      // 获取车队信息（只包含在映射表中的车队）
      const truckingRepo = AppDataSource.getRepository(TruckingCompany);
      let truckings: TruckingCompany[] = [];
      try {
        const truckingWhere: any = { status: 'ACTIVE' };
        truckings = await truckingRepo.find({
          where: truckingWhere,
          select: [
            'companyCode',
            'companyName',
            'country',
            'dailyCapacity',
            'dailyReturnCapacity',
            'hasYard'
          ]
        });
        truckings = truckings.filter(
          (t) =>
            mappedTruckingCompanyIds.has(t.companyCode) &&
            (matchCountryAlias(t.country) || matchCodePrefix(t.companyCode))
        );

        if (truckings.length === 0) {
          const truckingWhereNoStatus: any = {};
          truckings = await truckingRepo.find({
            where: truckingWhereNoStatus,
            select: [
              'companyCode',
              'companyName',
              'country',
              'dailyCapacity',
              'dailyReturnCapacity',
              'hasYard'
            ]
          });
          truckings = truckings.filter(
            (t) =>
              mappedTruckingCompanyIds.has(t.companyCode) &&
              (matchCountryAlias(t.country) || matchCodePrefix(t.companyCode))
          );
        }
      } catch (e) {
        logger.warn('[Scheduling] Query trucking with status failed, retrying without filter:', e);
        const truckingWhere: any = {};
        truckings = await truckingRepo.find({
          where: truckingWhere,
          select: ['companyCode', 'companyName', 'country']
        });
        truckings = truckings.filter(
          (t) =>
            mappedTruckingCompanyIds.has(t.companyCode) &&
            (matchCountryAlias(t.country) || matchCodePrefix(t.companyCode))
        );
      }

      // 构建仓库-费用映射（获取每个仓库默认车队的拖卡费）
      const warehouseFeeMap = new Map<string, number>();
      const warehouseDefaultTrucking = new Map<string, string>();
      for (const m of warehouseTruckingMappings) {
        const existing = warehouseFeeMap.get(m.warehouseCode);
        if (m.isDefault || !existing) {
          warehouseFeeMap.set(m.warehouseCode, Number(m.transportFee) || 0);
          warehouseDefaultTrucking.set(m.warehouseCode, m.truckingCompanyId);
        }
      }

      // 构建车队-费用映射（获取每个车队默认仓库的拖卡费）
      const truckingFeeMap = new Map<string, number>();
      const truckingDefaultWarehouse = new Map<string, string>();
      for (const m of warehouseTruckingMappings) {
        const existing = truckingFeeMap.get(m.truckingCompanyId);
        if (m.isDefault || !existing) {
          truckingFeeMap.set(m.truckingCompanyId, Number(m.transportFee) || 0);
          truckingDefaultWarehouse.set(m.truckingCompanyId, m.warehouseCode);
        }
      }

      res.json({
        success: true,
        data: {
          warehouses: warehouses.map((w) => ({
            warehouseCode: w.warehouseCode,
            warehouseName: w.warehouseName,
            country: w.country,
            dailyUnloadCapacity: w.dailyUnloadCapacity ?? 10,
            dailyLoadCapacity: w.dailyUnloadCapacity ?? 10,
            transportFee: warehouseFeeMap.get(w.warehouseCode) ?? 0,
            defaultTrucking: warehouseDefaultTrucking.get(w.warehouseCode) || null,
            isMapped: true
          })),
          truckings: truckings.map((t) => ({
            companyCode: t.companyCode,
            companyName: t.companyName,
            country: t.country,
            dailyCapacity: t.dailyCapacity ?? 10,
            dailyReturnCapacity: t.dailyReturnCapacity ?? t.dailyCapacity ?? 10,
            hasYard: (truckingYardCapacityMap.get(t.companyCode) ?? 0) > 0,
            yardCapacity: truckingYardCapacityMap.get(t.companyCode) ?? 0,
            transportFee: truckingFeeMap.get(t.companyCode) ?? 0,
            defaultWarehouse: truckingDefaultWarehouse.get(t.companyCode) || null,
            isMapped: true
          }))
        }
      });
    } catch (error: any) {
      logger.error('[Scheduling] getMappedResources error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/v1/scheduling/resources/warehouse/:code
   * 获取单个仓库
   */
  getWarehouse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;

      const warehouseRepo = AppDataSource.getRepository(Warehouse);
      const warehouse = await warehouseRepo.findOne({ where: { warehouseCode: code } });

      if (!warehouse) {
        res.status(404).json({ success: false, message: '仓库不存在' });
        return;
      }

      res.json({ success: true, data: warehouse });
    } catch (error: any) {
      logger.error('[Scheduling] getWarehouse error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/v1/scheduling/resources/warehouse
   * 创建仓库
   */
  createWarehouse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { warehouseCode, warehouseName, country, dailyUnloadCapacity, address } = req.body;

      if (!warehouseCode || !warehouseName) {
        res.status(400).json({ success: false, message: '缺少必要参数：仓库编码和名称' });
        return;
      }

      const warehouseRepo = AppDataSource.getRepository(Warehouse);
      const existing = await warehouseRepo.findOne({ where: { warehouseCode } });

      if (existing) {
        res.status(400).json({ success: false, message: '仓库编码已存在' });
        return;
      }

      const warehouse = warehouseRepo.create({
        warehouseCode,
        warehouseName,
        country: country || 'US',
        dailyUnloadCapacity: dailyUnloadCapacity ?? 10,
        address,
        status: 'ACTIVE',
        propertyType: '普通仓库'
      });

      await warehouseRepo.save(warehouse);

      res.json({ success: true, message: '仓库创建成功', data: warehouse });
    } catch (error: any) {
      logger.error('[Scheduling] createWarehouse error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * PUT /api/v1/scheduling/resources/warehouse/:code
   * 更新仓库
   */
  updateWarehouse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;
      const { warehouseName, country, dailyUnloadCapacity, address, status } = req.body;

      const warehouseRepo = AppDataSource.getRepository(Warehouse);
      const warehouse = await warehouseRepo.findOne({ where: { warehouseCode: code } });

      if (!warehouse) {
        res.status(404).json({ success: false, message: '仓库不存在' });
        return;
      }

      if (warehouseName) warehouse.warehouseName = warehouseName;
      if (country) warehouse.country = country;
      if (dailyUnloadCapacity != null) warehouse.dailyUnloadCapacity = dailyUnloadCapacity;
      if (address != null) warehouse.address = address;
      if (status) warehouse.status = status;

      await warehouseRepo.save(warehouse);

      res.json({ success: true, message: '仓库更新成功', data: warehouse });
    } catch (error: any) {
      logger.error('[Scheduling] updateWarehouse error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * DELETE /api/v1/scheduling/resources/warehouse/:code
   * 删除仓库
   */
  deleteWarehouse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;

      const warehouseRepo = AppDataSource.getRepository(Warehouse);
      const warehouse = await warehouseRepo.findOne({ where: { warehouseCode: code } });

      if (!warehouse) {
        res.status(404).json({ success: false, message: '仓库不存在' });
        return;
      }

      await warehouseRepo.remove(warehouse);

      res.json({ success: true, message: '仓库删除成功' });
    } catch (error: any) {
      logger.error('[Scheduling] deleteWarehouse error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/v1/scheduling/resources/trucking/:code
   * 获取单个车队
   */
  getTrucking = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;

      const truckingRepo = AppDataSource.getRepository(TruckingCompany);
      const trucking = await truckingRepo.findOne({ where: { companyCode: code } });

      if (!trucking) {
        res.status(404).json({ success: false, message: '车队不存在' });
        return;
      }

      res.json({ success: true, data: trucking });
    } catch (error: any) {
      logger.error('[Scheduling] getTrucking error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/v1/scheduling/resources/trucking
   * 创建车队
   */
  createTrucking = async (req: Request, res: Response): Promise<void> => {
    try {
      const { companyCode, companyName, country, dailyCapacity, dailyReturnCapacity, hasYard } =
        req.body;

      if (!companyCode || !companyName) {
        res.status(400).json({ success: false, message: '缺少必要参数：车队编码和名称' });
        return;
      }

      const truckingRepo = AppDataSource.getRepository(TruckingCompany);
      const existing = await truckingRepo.findOne({ where: { companyCode } });

      if (existing) {
        res.status(400).json({ success: false, message: '车队编码已存在' });
        return;
      }

      const trucking = truckingRepo.create({
        companyCode,
        companyName,
        country: country || 'US',
        dailyCapacity: dailyCapacity ?? 10,
        dailyReturnCapacity: dailyReturnCapacity ?? dailyCapacity ?? 10,
        hasYard: hasYard ?? false,
        status: 'ACTIVE'
      });

      await truckingRepo.save(trucking);

      res.json({ success: true, message: '车队创建成功', data: trucking });
    } catch (error: any) {
      logger.error('[Scheduling] createTrucking error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * PUT /api/v1/scheduling/resources/trucking/:code
   * 更新车队
   */
  updateTrucking = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;
      const { companyName, country, dailyCapacity, dailyReturnCapacity, hasYard, status } =
        req.body;

      const truckingRepo = AppDataSource.getRepository(TruckingCompany);
      const trucking = await truckingRepo.findOne({ where: { companyCode: code } });

      if (!trucking) {
        res.status(404).json({ success: false, message: '车队不存在' });
        return;
      }

      if (companyName) trucking.companyName = companyName;
      if (country) trucking.country = country;
      if (dailyCapacity != null) trucking.dailyCapacity = dailyCapacity;
      if (dailyReturnCapacity != null) trucking.dailyReturnCapacity = dailyReturnCapacity;
      if (hasYard != null) trucking.hasYard = hasYard;
      if (status) trucking.status = status;

      await truckingRepo.save(trucking);

      res.json({ success: true, message: '车队更新成功', data: trucking });
    } catch (error: any) {
      logger.error('[Scheduling] updateTrucking error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * DELETE /api/v1/scheduling/resources/trucking/:code
   * 删除车队
   */
  deleteTrucking = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;

      const truckingRepo = AppDataSource.getRepository(TruckingCompany);
      const trucking = await truckingRepo.findOne({ where: { companyCode: code } });

      if (!trucking) {
        res.status(404).json({ success: false, message: '车队不存在' });
        return;
      }

      await truckingRepo.remove(trucking);

      res.json({ success: true, message: '车队删除成功' });
    } catch (error: any) {
      logger.error('[Scheduling] deleteTrucking error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * PUT /api/v1/scheduling/resources/trucking/:code
   * 更新车队日容量
   */
  updateTruckingCapacity = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;
      const { dailyCapacity } = req.body;

      if (!code || dailyCapacity == null) {
        res.status(400).json({ success: false, message: '缺少必要参数' });
        return;
      }

      const truckingRepo = AppDataSource.getRepository(TruckingCompany);
      const trucking = await truckingRepo.findOne({ where: { companyCode: code } });

      if (!trucking) {
        res.status(404).json({ success: false, message: '车队不存在' });
        return;
      }

      trucking.dailyCapacity = dailyCapacity;
      await truckingRepo.save(trucking);

      res.json({ success: true, message: '车队日容量更新成功', data: trucking });
    } catch (error: any) {
      logger.error('[Scheduling] updateTruckingCapacity error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/v1/scheduling/resources/yards
   * 获取堆场列表
   */
  getYards = async (req: Request, res: Response): Promise<void> => {
    try {
      const yardRepo = AppDataSource.getRepository(Yard);
      const yards = await yardRepo.find();

      res.json({ success: true, data: yards });
    } catch (error: any) {
      logger.error('[Scheduling] getYards error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/v1/scheduling/resources/yards
   * 新增堆场
   */
  createYard = async (req: Request, res: Response): Promise<void> => {
    try {
      const { yardCode, yardName, portCode, dailyCapacity, feePerDay, address, contactPhone } =
        req.body;

      if (!yardCode || !yardName) {
        res.status(400).json({ success: false, message: '缺少必要参数' });
        return;
      }

      const yardRepo = AppDataSource.getRepository(Yard);
      const existingYard = await yardRepo.findOne({ where: { yardCode } });

      if (existingYard) {
        res.status(400).json({ success: false, message: '堆场编码已存在' });
        return;
      }

      const newYard = yardRepo.create({
        yardCode,
        yardName,
        portCode,
        dailyCapacity: dailyCapacity || 100,
        feePerDay: feePerDay || 0,
        address,
        contactPhone
      });

      await yardRepo.save(newYard);

      res.json({ success: true, message: '堆场创建成功', data: newYard });
    } catch (error: any) {
      logger.error('[Scheduling] createYard error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * PUT /api/v1/scheduling/resources/yards/:code
   * 更新堆场信息
   */
  updateYard = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;
      const { yardName, portCode, dailyCapacity, feePerDay, address, contactPhone, status } =
        req.body;

      const yardRepo = AppDataSource.getRepository(Yard);
      const yard = await yardRepo.findOne({ where: { yardCode: code } });

      if (!yard) {
        res.status(404).json({ success: false, message: '堆场不存在' });
        return;
      }

      if (yardName) yard.yardName = yardName;
      if (portCode) yard.portCode = portCode;
      if (dailyCapacity != null) yard.dailyCapacity = dailyCapacity;
      if (feePerDay != null) yard.feePerDay = feePerDay;
      if (address) yard.address = address;
      if (contactPhone) yard.contactPhone = contactPhone;
      if (status) yard.status = status;

      await yardRepo.save(yard);

      res.json({ success: true, message: '堆场信息更新成功', data: yard });
    } catch (error: any) {
      logger.error('[Scheduling] updateYard error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * DELETE /api/v1/scheduling/resources/yards/:code
   * 删除堆场
   */
  deleteYard = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;

      const yardRepo = AppDataSource.getRepository(Yard);
      const yard = await yardRepo.findOne({ where: { yardCode: code } });

      if (!yard) {
        res.status(404).json({ success: false, message: '堆场不存在' });
        return;
      }

      await yardRepo.remove(yard);

      res.json({ success: true, message: '堆场删除成功' });
    } catch (error: any) {
      logger.error('[Scheduling] deleteYard error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/v1/scheduling/resources/occupancy/warehouse
   * 获取仓库占用情况（增强版：包含仓库名称和状态）
   */
  getWarehouseOccupancy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, warehouseCode, country } = req.query;

      // 先检查表是否存在
      const tableExists = await AppDataSource.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'ext_warehouse_daily_occupancy'
        ) as exists
      `);

      if (!tableExists[0]?.exists) {
        res.json({ success: true, data: [], message: 'Table not exists' });
        return;
      }

      let query = `
        SELECT 
          o.warehouse_code,
          COALESCE(w.warehouse_name, o.warehouse_code) as warehouse_name,
          o.date,
          o.planned_count,
          o.capacity,
          o.remaining,
          CASE 
            WHEN o.planned_count >= o.capacity THEN 'full'
            WHEN o.planned_count >= o.capacity * 0.8 THEN 'warning'
            ELSE 'normal'
          END as status
        FROM ext_warehouse_daily_occupancy o
        LEFT JOIN dict_warehouses w ON w.warehouse_code = o.warehouse_code
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (warehouseCode) {
        query += ` AND o.warehouse_code = $${paramIndex}`;
        params.push(warehouseCode);
        paramIndex++;
      }

      if (country) {
        query += ` AND w.country = $${paramIndex}`;
        params.push(String(country));
        paramIndex++;
      }

      if (startDate && endDate) {
        query += ` AND o.date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        params.push(String(startDate), String(endDate));
      }

      query += ` ORDER BY o.date ASC, o.warehouse_code ASC`;

      const occupancy = await AppDataSource.query(query, params);

      res.json({ success: true, data: occupancy });
    } catch (error: any) {
      logger.error('[Scheduling] getWarehouseOccupancy error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/v1/scheduling/resources/occupancy/trucking
   * 获取车队占用情况（增强版：包含车队名称和状态）
   */
  getTruckingOccupancy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, truckingCompanyId, country } = req.query;

      let query = `
        SELECT 
          o.trucking_company_id as trucking_company_code,
          COALESCE(t.company_name, o.trucking_company_id) as trucking_company_name,
          o.port_code,
          o.warehouse_code,
          o.date,
          o.planned_trips as planned_count,
          o.capacity,
          o.remaining,
          CASE 
            WHEN o.planned_trips >= o.capacity THEN 'full'
            WHEN o.planned_trips >= o.capacity * 0.8 THEN 'warning'
            ELSE 'normal'
          END as status
        FROM ext_trucking_slot_occupancy o
        LEFT JOIN dict_trucking_companies t ON t.company_code = o.trucking_company_id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (truckingCompanyId) {
        query += ` AND o.trucking_company_id = $${paramIndex}`;
        params.push(truckingCompanyId);
        paramIndex++;
      }

      if (country) {
        query += ` AND t.country = $${paramIndex}`;
        params.push(String(country));
        paramIndex++;
      }

      if (startDate && endDate) {
        query += ` AND o.date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        params.push(String(startDate), String(endDate));
      }

      query += ` ORDER BY o.date ASC, o.trucking_company_id ASC`;

      const occupancy = await AppDataSource.query(query, params);

      res.json({ success: true, data: occupancy });
    } catch (error: any) {
      logger.error('[Scheduling] getTruckingOccupancy error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/v1/scheduling/evaluate-cost
   * 评估单个方案的成本
   */
  evaluateCost = async (req: Request, res: Response): Promise<void> => {
    try {
      const { containerNumber, option } = req.body;

      if (!containerNumber || !option) {
        res.status(400).json({
          success: false,
          message: '缺少必要参数：containerNumber 和 option'
        });
        return;
      }

      // 调用成本优化服务评估成本
      const costBreakdown = await this.costOptimizerService.evaluateTotalCost(option);

      res.json({
        success: true,
        data: {
          containerNumber,
          option,
          costBreakdown
        }
      });
    } catch (error: any) {
      logger.error('[Scheduling] evaluateCost error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * POST /api/v1/scheduling/compare-options
   * 对比多个方案的成本
   */
  compareOptions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { containerNumber, options } = req.body;

      if (!containerNumber || !options || options.length === 0) {
        res.status(400).json({
          success: false,
          message: '缺少必要参数：containerNumber 和 options'
        });
        return;
      }

      // 并行评估所有方案
      const comparisons = await Promise.all(
        options.map(async (option: any) => {
          const costBreakdown = await this.costOptimizerService.evaluateTotalCost(option);
          return {
            option,
            costBreakdown,
            rank: 0 // 后续根据总成本排名
          };
        })
      );

      // 按总成本排序
      comparisons.sort((a, b) => a.costBreakdown.totalCost - b.costBreakdown.totalCost);

      // 更新排名
      comparisons.forEach((item, index) => {
        item.rank = index + 1;
      });

      // 获取推荐方案
      const recommendedOption = comparisons[0];
      const savings =
        comparisons.length > 1
          ? comparisons[1].costBreakdown.totalCost - recommendedOption.costBreakdown.totalCost
          : 0;

      res.json({
        success: true,
        data: {
          containerNumber,
          comparisons,
          recommendedOption: {
            option: recommendedOption.option,
            reason: `总成本最低，比其他方案节省 $${savings.toFixed(2)}`,
            savings
          }
        }
      });
    } catch (error: any) {
      logger.error('[Scheduling] compareOptions error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * GET /api/v1/scheduling/recommend-option/:containerNumber
   * 获取推荐的最优方案
   */
  getRecommendOption = async (req: Request, res: Response): Promise<void> => {
    try {
      const { containerNumber } = req.params;

      // TODO: 实现智能推荐逻辑
      // 暂时返回一个简单的响应
      res.json({
        success: true,
        data: {
          containerNumber,
          message: '推荐方案功能开发中',
          optimalOption: null,
          costBreakdown: null,
          alternatives: [],
          reasoning: ''
        }
      });
    } catch (error: any) {
      logger.error('[Scheduling] getRecommendOption error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * GET /api/v1/scheduling/resources/capacity/range
   * 获取指定日期范围内的能力数据
   */
  getCapacityRange = async (req: Request, res: Response): Promise<void> => {
    try {
      const { start, end, resourceType, warehouseCode, truckingCompanyId } = req.query;

      if (!start || !end || !resourceType) {
        res
          .status(400)
          .json({ success: false, message: '缺少必要参数：start、end 和 resourceType' });
        return;
      }

      const startDate = new Date(String(start));
      const endDate = new Date(String(end));

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        res.status(400).json({ success: false, message: '日期格式错误' });
        return;
      }

      const capacityData: any[] = [];

      if (resourceType === 'warehouse') {
        // 仓库能力数据
        if (!warehouseCode) {
          res.status(400).json({ success: false, message: '仓库类型需要提供 warehouseCode' });
          return;
        }

        const warehouseRepo = AppDataSource.getRepository(Warehouse);
        const warehouse = await warehouseRepo.findOne({
          where: { warehouseCode: String(warehouseCode) }
        });

        if (!warehouse) {
          res.status(404).json({ success: false, message: '仓库不存在' });
          return;
        }

        // 生成日期范围内的数据
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const dayOfWeek = currentDate.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          capacityData.push({
            date: dateStr,
            type: isWeekend ? 'weekend' : 'weekday',
            baseCapacity: isWeekend ? 0 : warehouse.dailyUnloadCapacity || 10,
            finalCapacity: isWeekend ? 0 : warehouse.dailyUnloadCapacity || 10,
            occupied: 0,
            remaining: isWeekend ? 0 : warehouse.dailyUnloadCapacity || 10,
            multiplier: 1.0,
            isManual: false
          });

          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else if (resourceType === 'trucking') {
        // 车队能力数据
        if (!truckingCompanyId) {
          res.status(400).json({ success: false, message: '车队类型需要提供 truckingCompanyId' });
          return;
        }

        const truckingRepo = AppDataSource.getRepository(TruckingCompany);
        const truckingCompany = await truckingRepo.findOne({
          where: { companyCode: String(truckingCompanyId) }
        });

        if (!truckingCompany) {
          res.status(404).json({ success: false, message: '车队不存在' });
          return;
        }

        // 生成日期范围内的数据
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const dayOfWeek = currentDate.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          capacityData.push({
            date: dateStr,
            type: isWeekend ? 'weekend' : 'weekday',
            baseCapacity: isWeekend ? 0 : truckingCompany.dailyCapacity || 10,
            finalCapacity: isWeekend ? 0 : truckingCompany.dailyCapacity || 10,
            occupied: 0,
            remaining: isWeekend ? 0 : truckingCompany.dailyCapacity || 10,
            multiplier: 1.0,
            isManual: false
          });

          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else {
        res
          .status(400)
          .json({ success: false, message: 'resourceType 必须为 warehouse 或 trucking' });
        return;
      }

      res.json({ success: true, data: capacityData });
    } catch (error: any) {
      logger.error('[Scheduling] getCapacityRange error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/v1/scheduling/warehouses
   * 获取可用于指定港口的候选仓库列表
   * Query: { portCode, countryCode }
   */
  getCandidateWarehouses = async (req: Request, res: Response): Promise<void> => {
    try {
      const { portCode, countryCode } = req.query;

      if (!portCode || !countryCode) {
        res.status(400).json({
          success: false,
          message: '缺少必要参数：portCode 和 countryCode'
        });
        return;
      }

      const result = await intelligentSchedulingService.getCandidateWarehouses(
        String(countryCode),
        String(portCode)
      );

      res.json({
        success: true,
        data: result.map((w) => ({
          warehouseCode: w.warehouseCode,
          warehouseName: w.warehouseName,
          propertyType: w.propertyType,
          country: w.country,
          dailyUnloadCapacity: w.dailyUnloadCapacity,
          status: w.status,
          address: w.address
        }))
      });
    } catch (error: any) {
      logger.error('[Scheduling] getCandidateWarehouses error:', error);
      res.status(500).json({
        success: false,
        message: '获取仓库列表失败',
        data: []
      });
    }
  };

  /**
   * POST /api/v1/scheduling/optimize-cost
   * 智能成本优化建议
   * Body: { containers, warehouseCode, truckingCompanyId, basePickupDate }
   */
  optimizeCost = async (req: Request, res: Response): Promise<void> => {
    try {
      const { containers, warehouseCode, truckingCompanyId, basePickupDate } = req.body;

      logger.info('[Scheduling] Optimize cost request:', {
        containers,
        warehouseCode,
        truckingCompanyId,
        basePickupDate
      });

      // 验证参数
      if (!containers || !Array.isArray(containers) || containers.length === 0) {
        res.status(400).json({
          success: false,
          message: 'containers 不能为空'
        });
        return;
      }

      if (!warehouseCode || !truckingCompanyId || !basePickupDate) {
        res.status(400).json({
          success: false,
          message: '缺少必要参数'
        });
        return;
      }

      // 获取仓库和车队信息
      const warehouseRepo = AppDataSource.getRepository(Warehouse);
      const truckingRepo = AppDataSource.getRepository(TruckingCompany);

      const warehouse = await warehouseRepo.findOne({
        where: { warehouseCode }
      });

      if (!warehouse) {
        res.status(404).json({
          success: false,
          message: '仓库不存在'
        });
        return;
      }

      const truckingCompany = await truckingRepo.findOne({
        where: { companyCode: truckingCompanyId }
      });

      if (!truckingCompany) {
        res.status(404).json({
          success: false,
          message: '车队不存在'
        });
        return;
      }

      // ✅ SKILL 原则：不再在后端控制器中计算默认值
      // 正确做法：让 SchedulingCostOptimizerService 自行从 DemurrageService 查询
      // 传递 undefined，让服务层自行处理

      // 对每个货柜进行优化建议（只取第一个货柜作为代表）
      const containerNumber = containers[0];
      const result = await this.costOptimizerService.suggestOptimalUnloadDate(
        containerNumber,
        warehouse,
        truckingCompany,
        new Date(basePickupDate)
        // ✅ 不传 lastFreeDate 参数，让服务层自行从 DemurrageService 获取权威数据
      );

      logger.info(
        `[Scheduling] Optimization result for ${containerNumber}:`,
        JSON.stringify(result, null, 2)
      );
      logger.info(`[Scheduling] Alternatives count: ${result.alternatives.length}`);
      logger.info(`[Scheduling] Savings: ${result.savings}`);

      res.json({
        success: true,
        data: {
          originalCost: result.originalCost,
          optimizedCost: result.optimizedCost,
          savings: result.savings,
          savingsPercent: result.savingsPercent,
          suggestedPickupDate: result.suggestedPickupDate.toISOString().split('T')[0],
          suggestedStrategy: result.suggestedStrategy,
          alternatives: result.alternatives.map((alt) => ({
            containerNumber,
            pickupDate: alt.pickupDate.toISOString().split('T')[0],
            strategy: alt.strategy,
            totalCost: alt.totalCost,
            savings: alt.savings, // ✅ 直接使用服务层返回的 savings
            warehouseCode,
            truckingCompanyCode: truckingCompanyId
          }))
        }
      });
    } catch (error: any) {
      logger.error('[Scheduling] optimizeCost error:', error);
      res.status(500).json({
        success: false,
        message: error.message || '成本优化失败'
      });
    }
  };

  /**
   * POST /api/v1/scheduling/optimize-container/:containerNumber
   * 单柜成本优化
   * Body: { warehouseCode, truckingCompanyId, basePickupDate }
   */
  optimizeContainer = async (req: Request, res: Response): Promise<void> => {
    console.log('[SchedulingController] optimizeContainer called with:', req.params, req.body);
    try {
      const { containerNumber } = req.params;
      const { warehouseCode, truckingCompanyId, basePickupDate } = req.body;

      logger.info('[Scheduling] Optimize container request:', {
        containerNumber,
        warehouseCode,
        truckingCompanyId,
        basePickupDate
      });

      // 验证参数
      if (!warehouseCode || !truckingCompanyId || !basePickupDate) {
        res.status(400).json({
          success: false,
          message: '缺少必要参数：warehouseCode, truckingCompanyId, basePickupDate'
        });
        return;
      }

      // 获取仓库和车队信息
      const warehouseRepo = AppDataSource.getRepository(Warehouse);
      const truckingRepo = AppDataSource.getRepository(TruckingCompany);

      const warehouse = await warehouseRepo.findOne({
        where: { warehouseCode }
      });

      if (!warehouse) {
        res.status(404).json({
          success: false,
          message: '仓库不存在'
        });
        return;
      }

      const truckingCompany = await truckingRepo.findOne({
        where: { companyCode: truckingCompanyId }
      });

      if (!truckingCompany) {
        res.status(404).json({
          success: false,
          message: '车队不存在'
        });
        return;
      }

      // 调用成本优化服务
      const result = await this.costOptimizerService.suggestOptimalUnloadDate(
        containerNumber,
        warehouse,
        truckingCompany,
        new Date(basePickupDate)
      );

      logger.info(
        `[Scheduling] Optimization result for ${containerNumber}:`,
        JSON.stringify(result, null, 2)
      );

      res.json({
        success: true,
        data: {
          containerNumber,
          originalCost: result.originalCost,
          optimizedCost: result.optimizedCost,
          savings: result.savings,
          savingsPercent: result.savingsPercent,
          suggestedPickupDate: result.suggestedPickupDate.toISOString().split('T')[0],
          suggestedStrategy: result.suggestedStrategy,
          alternatives: result.alternatives.map((alt) => ({
            containerNumber,
            pickupDate: alt.pickupDate.toISOString().split('T')[0],
            strategy: alt.strategy,
            totalCost: alt.totalCost,
            savings: alt.savings,
            warehouseCode,
            truckingCompanyCode: truckingCompanyId
          }))
        }
      });
    } catch (error: any) {
      logger.error('[Scheduling] optimizeContainer error:', error);
      res.status(500).json({
        success: false,
        message: error.message || '成本优化失败'
      });
    }
  };

  /**
   * POST /api/v1/scheduling/batch-optimize
   * 批量成本优化
   * Body: { containerNumbers, basePickupDate, lastFreeDate }
   */
  batchOptimizeCost = async (req: Request, res: Response): Promise<void> => {
    try {
      const { containerNumbers, basePickupDate, lastFreeDate } = req.body;

      logger.info('[Scheduling] Batch optimize cost request:', {
        containerNumbers,
        basePickupDate,
        lastFreeDate
      });

      // TODO: 实现批量优化逻辑
      // 目前返回空结果

      res.json({
        success: true,
        data: {
          results: []
        }
      });
    } catch (error: any) {
      logger.error('[Scheduling] batchOptimizeCost error:', error);
      res.status(500).json({
        success: false,
        message: error.message || '批量优化失败'
      });
    }
  };

  /**
   * GET /api/v1/scheduling/cost-comparison/:containerNumber
   * 获取单个货柜的成本对比
   */
  getCostComparison = async (req: Request, res: Response): Promise<void> => {
    try {
      const { containerNumber } = req.params;

      logger.info('[Scheduling] Get cost comparison for:', containerNumber);

      // TODO: 从 ext_cost_forecast_vs_actual 表查询数据
      // 目前返回模拟数据

      res.json({
        success: true,
        data: {
          forecast: {
            totalCost: 1500,
            breakdown: {}
          },
          actual: {
            totalCost: 0,
            breakdown: {}
          },
          variance: 0,
          variancePercent: 0
        }
      });
    } catch (error: any) {
      logger.error('[Scheduling] getCostComparison error:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取成本对比失败'
      });
    }
  };
}
