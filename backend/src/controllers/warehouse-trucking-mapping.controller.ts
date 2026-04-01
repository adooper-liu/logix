/**
 * 仓库-车队映射控制器
 * Warehouse-Trucking Mapping Controller
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import { logger } from '../utils/logger';

export class WarehouseTruckingMappingController {
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
