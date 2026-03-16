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
import { Yard } from '../entities/Yard';
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
      const { startDate, endDate, country } = req.query;
      const hasDateRange = startDate && endDate;
      const dateCondition = hasDateRange
        ? `AND (COALESCE(po.ata_dest_port, po.eta_dest_port)::date >= $1::date AND COALESCE(po.ata_dest_port, po.eta_dest_port)::date <= $2::date)`
        : '';
      const ataEtaCondition = 'AND (po.ata_dest_port IS NOT NULL OR po.eta_dest_port IS NOT NULL)';

      // 查询待排产货柜数量（与 batchSchedule 口径一致：有目的港、ATA/ETA 非空、可选日期范围、可选国家）
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
      }

      const initialCountResult = await containerRepo.query(
        `SELECT COUNT(*) as count FROM biz_containers c
         WHERE c.schedule_status = 'initial'
         ${countryCondition}
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
         ${countryCondition}
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

      // 导入映射实体
      const { WarehouseTruckingMapping } = require('../entities/WarehouseTruckingMapping');
      const { TruckingPortMapping } = require('../entities/TruckingPortMapping');
      
      // 获取映射关系
      const warehouseTruckingMappingRepo = AppDataSource.getRepository(WarehouseTruckingMapping);
      const truckingPortMappingRepo = AppDataSource.getRepository(TruckingPortMapping);
      
      const mappingWhere: any = {};
      if (country) {
        mappingWhere.country = String(country);
      }
      
      // 查询有效的仓库-车队映射
      const warehouseTruckingMappings = await warehouseTruckingMappingRepo.find({
        where: {
          ...mappingWhere,
          isActive: true
        },
        select: ['warehouseCode', 'truckingCompanyId']
      });
      
      // 查询有效的车队-港口映射
      const truckingPortMappings = await truckingPortMappingRepo.find({
        where: {
          ...mappingWhere,
          isActive: true
        },
        select: ['truckingCompanyId', 'portCode']
      });
      
      // 提取映射中的仓库代码和车队代码
      const mappedWarehouseCodes = new Set(warehouseTruckingMappings.map(m => m.warehouseCode));
      
      // 车队必须同时在两个映射表中存在（与智能排产服务逻辑一致）
      const warehouseTruckingIds = new Set(warehouseTruckingMappings.map(m => m.truckingCompanyId));
      const truckingPortIds = new Set(truckingPortMappings.map(m => m.truckingCompanyId));
      // 取交集，只有同时在两个映射表中存在的车队才有效
      const mappedTruckingCompanyIds = new Set([...warehouseTruckingIds].filter(id => truckingPortIds.has(id)));

      // 获取仓库产能信息（只包含在映射表中的仓库）
      const warehouseRepo = AppDataSource.getRepository(Warehouse);
      let warehouses: Warehouse[] = [];
      try {
        const warehouseWhere: any = { status: 'ACTIVE' };
        if (country) {
          warehouseWhere.country = String(country);
        }
        warehouses = await warehouseRepo.find({ 
          where: warehouseWhere,
          select: ['warehouseCode', 'warehouseName', 'country', 'dailyUnloadCapacity']
        });
        // 过滤出在映射表中的仓库
        warehouses = warehouses.filter(w => mappedWarehouseCodes.has(w.warehouseCode));
        
        if (warehouses.length === 0) {
          const warehouseWhereNoStatus: any = {};
          if (country) {
            warehouseWhereNoStatus.country = String(country);
          }
          warehouses = await warehouseRepo.find({ 
            where: warehouseWhereNoStatus,
            select: ['warehouseCode', 'warehouseName', 'country', 'dailyUnloadCapacity']
          });
          // 过滤出在映射表中的仓库
          warehouses = warehouses.filter(w => mappedWarehouseCodes.has(w.warehouseCode));
        }
      } catch (e) {
        logger.warn('[Scheduling] Query warehouse with status failed, retrying without filter:', e);
        const warehouseWhere: any = {};
        if (country) {
          warehouseWhere.country = String(country);
        }
        warehouses = await warehouseRepo.find({ 
          where: warehouseWhere,
          select: ['warehouseCode', 'warehouseName', 'country', 'dailyUnloadCapacity']
        });
        // 过滤出在映射表中的仓库
        warehouses = warehouses.filter(w => mappedWarehouseCodes.has(w.warehouseCode));
      }

      // 获取车队信息（只包含在映射表中的车队）
      const truckingRepo = AppDataSource.getRepository(TruckingCompany);
      let truckings: TruckingCompany[] = [];
      try {
        const truckingWhere: any = { status: 'ACTIVE' };
        if (country) {
          truckingWhere.country = String(country);
        }
        truckings = await truckingRepo.find({
          where: truckingWhere,
          select: ['companyCode', 'companyName', 'country', 'dailyCapacity']
        });
        // 过滤出在映射表中的车队
        truckings = truckings.filter(t => mappedTruckingCompanyIds.has(t.companyCode));
        
        if (truckings.length === 0) {
          const truckingWhereNoStatus: any = {};
          if (country) {
            truckingWhereNoStatus.country = String(country);
          }
          truckings = await truckingRepo.find({
            where: truckingWhereNoStatus,
            select: ['companyCode', 'companyName', 'country', 'dailyCapacity']
          });
          // 过滤出在映射表中的车队
          truckings = truckings.filter(t => mappedTruckingCompanyIds.has(t.companyCode));
        }
      } catch (e) {
        logger.warn('[Scheduling] Query trucking with status failed, retrying without filter:', e);
        const truckingWhere: any = {};
        if (country) {
          truckingWhere.country = String(country);
        }
        truckings = await truckingRepo.find({
          where: truckingWhere,
          select: ['companyCode', 'companyName', 'country']
        });
        // 过滤出在映射表中的车队
        truckings = truckings.filter(t => mappedTruckingCompanyIds.has(t.companyCode));
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
      const { yardCode, yardName, portCode, dailyCapacity, feePerDay, address, contactPhone } = req.body;

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
      const { yardName, portCode, dailyCapacity, feePerDay, address, contactPhone, status } = req.body;

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
}
