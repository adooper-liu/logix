/**
 * 仓库-车队映射控制器
 * Warehouse-Trucking Mapping Controller
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import { logger } from '../utils/logger';
import { getScopedCountryCode } from '../utils/requestContext';

export class WarehouseTruckingMappingController {
  /**
   * 获取甘特图静态映射数据（不依赖货柜数据）
   * 返回当前国别的所有港口-车队-仓库映射关系
   */
  getStaticMappings = async (req: Request, res: Response): Promise<void> => {
    try {
      const scopedCountry = getScopedCountryCode();
      
      // 确定要查询的国别列表
      let countries: string[] = [];
      if (scopedCountry) {
        // 有全局筛选时，只查询该国别
        countries = [scopedCountry, scopedCountry === 'GB' ? 'UK' : ''].filter(Boolean);
      } else {
        // 无全局筛选时，查询所有国别
        const countryResult = await AppDataSource.query(
          `SELECT DISTINCT country FROM dict_trucking_port_mapping WHERE is_active = true`
        );
        countries = countryResult.map((r: any) => r.country).filter(Boolean);
      }

      if (countries.length === 0) {
        res.json({
          success: true,
          data: {
            ports: [],
            truckingByPort: {},
            warehousesByTrucking: {}
          }
        });
        return;
      }

      const countryPlaceholders = countries.map((_, i) => `$${i + 1}`).join(', ');

      // 1. 查询所有活跃的车队-港口映射（用于获取港口列表）
      const truckingPortMappings = await AppDataSource.query(
        `SELECT DISTINCT port_code, port_name, country 
         FROM dict_trucking_port_mapping 
         WHERE country IN (${countryPlaceholders}) AND is_active = true
         ORDER BY port_code`,
        countries
      );

      // 2. 查询所有车队（按港口+国别分组）
      const truckingCompanies = await AppDataSource.query(
        `SELECT DISTINCT trucking_company_id, trucking_company_name, port_code, country, is_default
         FROM dict_trucking_port_mapping 
         WHERE country IN (${countryPlaceholders}) AND is_active = true
         ORDER BY trucking_company_id`,
        countries
      );

      // 3. 构建车队按港口分组的映射
      const truckingByPort: Record<string, Array<{
        truckingCompanyId: string;
        truckingCompanyName: string;
        isDefault: boolean;
      }>> = {};
      
      truckingCompanies.forEach((t: any) => {
        const key = `${t.port_code}:${t.country}`;
        if (!truckingByPort[key]) {
          truckingByPort[key] = [];
        }
        truckingByPort[key].push({
          truckingCompanyId: t.trucking_company_id,
          truckingCompanyName: t.trucking_company_name,
          isDefault: t.is_default
        });
      });

      // 4. 收集所有车队ID用于查询仓库映射
      const truckingIds = [...new Set(truckingCompanies.map((t: any) => t.trucking_company_id))];
      
      // 5. 查询仓库-车队映射（车队 → 仓库）
      let warehouseMappings: any[] = [];
      if (truckingIds.length > 0) {
        const truckingIdPlaceholders = truckingIds.map((_, i) => `$${i + 1}`).join(', ');
        const warehouseCountryPlaceholders = countries.map((_, i) => `$${truckingIds.length + i + 1}`).join(', ');
        
        warehouseMappings = await AppDataSource.query(
          `SELECT warehouse_code, warehouse_name, trucking_company_id, country, is_default
           FROM dict_warehouse_trucking_mapping 
           WHERE trucking_company_id IN (${truckingIdPlaceholders})
           AND country IN (${warehouseCountryPlaceholders})
           AND is_active = true
           ORDER BY trucking_company_id, warehouse_code`,
          [...truckingIds, ...countries]
        );
      }

      // 6. 构建仓库按车队分组的映射
      const warehousesByTrucking: Record<string, Array<{
        warehouseCode: string;
        warehouseName: string;
        isDefault: boolean;
      }>> = {};
      
      warehouseMappings.forEach((w: any) => {
        const key = `${w.trucking_company_id}:${w.country}`;
        if (!warehousesByTrucking[key]) {
          warehousesByTrucking[key] = [];
        }
        // 去重
        if (!warehousesByTrucking[key].find(existing => existing.warehouseCode === w.warehouse_code)) {
          warehousesByTrucking[key].push({
            warehouseCode: w.warehouse_code,
            warehouseName: w.warehouse_name,
            isDefault: w.is_default
          });
        }
      });

      // 7. 提取港口列表
      const ports = truckingPortMappings.map((p: any) => ({
        portCode: p.port_code,
        portName: p.port_name,
        country: p.country
      }));

      logger.info(`[getStaticMappings] 返回 ${ports.length} 个港口，${Object.keys(truckingByPort).length} 个车队映射，${Object.keys(warehousesByTrucking).length} 个仓库映射`);

      res.json({
        success: true,
        data: {
          ports,
          truckingByPort,
          warehousesByTrucking
        }
      });
    } catch (error: any) {
      logger.error('[WarehouseTruckingMapping getStaticMappings] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * 获取所有映射记录
   */
  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = 1, pageSize = 20, country, warehouseCode, truckingCompanyName } = req.query;
      const offset = (Number(page) - 1) * Number(pageSize);

      let whereClause = '1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (country) {
        const countryCode = String(country).trim().toUpperCase();
        const aliases =
          countryCode === 'GB' ? ['GB', 'UK'] : countryCode === 'UK' ? ['UK', 'GB'] : [countryCode];

        const aliasPlaceholders = aliases.map(() => `$${paramIndex++}`).join(', ');
        const prefixPlaceholders = aliases.map(() => `$${paramIndex++}`).join(', ');

        whereClause += ` AND (
          UPPER(country) IN (${aliasPlaceholders})
          OR UPPER(warehouse_code) LIKE ANY (ARRAY[${prefixPlaceholders}]::text[])
        )`;

        params.push(...aliases);
        params.push(...aliases.map((code) => `${code}%`));
      }
      if (warehouseCode) {
        whereClause += ` AND warehouse_code ILIKE $${paramIndex}`;
        params.push(`%${warehouseCode}%`);
        paramIndex++;
      }
      if (truckingCompanyName) {
        whereClause += ` AND trucking_company_name ILIKE $${paramIndex}`;
        params.push(`%${truckingCompanyName}%`);
        paramIndex++;
      }

      const [data, total] = await Promise.all([
        AppDataSource.query(
          `SELECT * FROM dict_warehouse_trucking_mapping WHERE ${whereClause} ORDER BY id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
          [...params, Number(pageSize), offset]
        ),
        AppDataSource.query(
          `SELECT COUNT(*) as count FROM dict_warehouse_trucking_mapping WHERE ${whereClause}`,
          params
        )
      ]);

      res.json({
        success: true,
        data,
        total: Number(total[0]?.count || 0)
      });
    } catch (error: any) {
      logger.error('[WarehouseTruckingMapping getAll] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * 根据ID获取单条记录
   */
  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await AppDataSource.query(
        'SELECT * FROM dict_warehouse_trucking_mapping WHERE id = $1',
        [id]
      );

      if (result.length === 0) {
        res.status(404).json({ error: '记录不存在' });
        return;
      }

      res.json({ success: true, data: result[0] });
    } catch (error: any) {
      logger.error('[WarehouseTruckingMapping getById] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * 创建映射记录
   */
  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        country,
        warehouseCode,
        warehouseName,
        truckingCompanyId,
        truckingCompanyName,
        mappingType,
        isDefault,
        isActive,
        transportFee,
        remarks
      } = req.body;

      const result = await AppDataSource.query(
        `INSERT INTO dict_warehouse_trucking_mapping 
         (country, warehouse_code, warehouse_name, trucking_company_id, trucking_company_name, mapping_type, is_default, is_active, transport_fee, remarks, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         RETURNING *`,
        [
          country,
          warehouseCode,
          warehouseName,
          truckingCompanyId,
          truckingCompanyName,
          mappingType || 'DEFAULT',
          isDefault || false,
          isActive !== false,
          transportFee || 0,
          remarks || ''
        ]
      );

      res.json({ success: true, data: result[0] });
    } catch (error: any) {
      logger.error('[WarehouseTruckingMapping create] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * 更新映射记录
   */
  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        country,
        warehouseCode,
        warehouseName,
        truckingCompanyId,
        truckingCompanyName,
        mappingType,
        isDefault,
        isActive,
        transportFee,
        remarks
      } = req.body;

      const result = await AppDataSource.query(
        `UPDATE dict_warehouse_trucking_mapping 
         SET country = $1, warehouse_code = $2, warehouse_name = $3, trucking_company_id = $4, 
             trucking_company_name = $5, mapping_type = $6, is_default = $7, is_active = $8, 
             transport_fee = $9, remarks = $10, updated_at = NOW()
         WHERE id = $11
         RETURNING *`,
        [
          country,
          warehouseCode,
          warehouseName,
          truckingCompanyId,
          truckingCompanyName,
          mappingType,
          isDefault,
          isActive,
          transportFee || 0,
          remarks,
          id
        ]
      );

      if (result.length === 0) {
        res.status(404).json({ error: '记录不存在' });
        return;
      }

      res.json({ success: true, data: result[0] });
    } catch (error: any) {
      logger.error('[WarehouseTruckingMapping update] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * 删除映射记录
   */
  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await AppDataSource.query('DELETE FROM dict_warehouse_trucking_mapping WHERE id = $1', [id]);
      res.json({ success: true, message: '删除成功' });
    } catch (error: any) {
      logger.error('[WarehouseTruckingMapping delete] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * 批量创建映射记录
   */
  batchCreate = async (req: Request, res: Response): Promise<void> => {
    try {
      const records = req.body;
      if (!Array.isArray(records) || records.length === 0) {
        res.status(400).json({ error: '请提供有效的记录数组' });
        return;
      }

      let successCount = 0;
      let skipCount = 0;
      const errors: string[] = [];

      logger.info('[WarehouseTruckingMapping batchCreate] 开始批量导入，记录数:', records.length);

      for (const record of records) {
        try {
          // 先检查是否已存在相同的映射（通过 country + warehouse_code + trucking_company_id 判断）
          const existing = await AppDataSource.query(
            `SELECT id FROM dict_warehouse_trucking_mapping 
             WHERE country = $1 AND warehouse_code = $2 AND trucking_company_id = $3`,
            [record.country, record.warehouseCode, record.truckingCompanyId]
          );

          if (existing.length > 0) {
            // 已存在，执行更新
            logger.info(
              `[WarehouseTruckingMapping batchCreate] 更新已有映射：${record.warehouseName} - ${record.truckingCompanyName}`
            );
            await AppDataSource.query(
              `UPDATE dict_warehouse_trucking_mapping 
               SET warehouse_name = $1, trucking_company_name = $2, 
                   mapping_type = $3, is_default = $4, 
                   is_active = $5, transport_fee = $6, remarks = $7, updated_at = NOW()
               WHERE id = $8`,
              [
                record.warehouseName,
                record.truckingCompanyName,
                record.mappingType || 'DEFAULT',
                record.isDefault || false,
                record.isActive !== false,
                record.transportFee || 0,
                record.remarks || '',
                existing[0].id
              ]
            );
            skipCount++;
          } else {
            // 不存在，执行插入
            logger.info(
              `[WarehouseTruckingMapping batchCreate] 插入新映射：${record.warehouseName} - ${record.truckingCompanyName}`
            );
            const insertResult = await AppDataSource.query(
              `INSERT INTO dict_warehouse_trucking_mapping 
               (country, warehouse_code, warehouse_name, trucking_company_id, trucking_company_name, mapping_type, is_default, is_active, transport_fee, remarks, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
               RETURNING *`,
              [
                record.country,
                record.warehouseCode,
                record.warehouseName,
                record.truckingCompanyId,
                record.truckingCompanyName,
                record.mappingType || 'DEFAULT',
                record.isDefault || false,
                record.isActive !== false,
                record.transportFee || 0,
                record.remarks || ''
              ]
            );
            logger.info(
              '[WarehouseTruckingMapping batchCreate] 插入成功，ID:',
              insertResult[0]?.id
            );
            successCount++;
          }
        } catch (innerError: any) {
          const errorMsg = `处理记录失败 ${record.warehouseName} - ${record.truckingCompanyName}: ${innerError.message}`;
          logger.error('[WarehouseTruckingMapping batchCreate] Single record error:', innerError);
          errors.push(errorMsg);
          // 继续处理其他记录，不中断整个流程
        }
      }

      const resultMessage = `批量导入完成，共${records.length}条，新建${successCount}条，更新${skipCount}条`;
      if (errors.length > 0) {
        logger.warn('[WarehouseTruckingMapping batchCreate] 部分记录失败:', errors);
      }

      logger.info('[WarehouseTruckingMapping batchCreate]', resultMessage);

      res.json({
        success: true,
        message: resultMessage,
        stats: {
          total: records.length,
          created: successCount,
          updated: skipCount,
          failed: errors.length
        },
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error: any) {
      logger.error('[WarehouseTruckingMapping batchCreate] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };
}

export default new WarehouseTruckingMappingController();
