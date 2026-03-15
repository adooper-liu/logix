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
        whereClause += ` AND country = $${paramIndex}`;
        params.push(country);
        paramIndex++;
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
      const { country, warehouseCode, warehouseName, truckingCompanyId, truckingCompanyName, mappingType, isDefault, isActive, remarks } = req.body;

      const result = await AppDataSource.query(
        `INSERT INTO dict_warehouse_trucking_mapping 
         (country, warehouse_code, warehouse_name, trucking_company_id, trucking_company_name, mapping_type, is_default, is_active, remarks, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         RETURNING *`,
        [country, warehouseCode, warehouseName, truckingCompanyId, truckingCompanyName, mappingType || 'DEFAULT', isDefault || false, isActive !== false, remarks || '']
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
      const { country, warehouseCode, warehouseName, truckingCompanyId, truckingCompanyName, mappingType, isDefault, isActive, remarks } = req.body;

      const result = await AppDataSource.query(
        `UPDATE dict_warehouse_trucking_mapping 
         SET country = $1, warehouse_code = $2, warehouse_name = $3, trucking_company_id = $4, 
             trucking_company_name = $5, mapping_type = $6, is_default = $7, is_active = $8, remarks = $9, updated_at = NOW()
         WHERE id = $10
         RETURNING *`,
        [country, warehouseCode, warehouseName, truckingCompanyId, truckingCompanyName, mappingType, isDefault, isActive, remarks, id]
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

      for (const record of records) {
        await AppDataSource.query(
          `INSERT INTO dict_warehouse_trucking_mapping 
           (country, warehouse_code, warehouse_name, trucking_company_id, trucking_company_name, mapping_type, is_default, is_active, remarks, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
           ON CONFLICT DO NOTHING`,
          [
            record.country, record.warehouseCode, record.warehouseName, 
            record.truckingCompanyId, record.truckingCompanyName, 
            record.mappingType || 'DEFAULT', record.isDefault || false, record.isActive !== false, record.remarks || ''
          ]
        );
      }

      res.json({ success: true, message: `批量导入成功，共${records.length}条` });
    } catch (error: any) {
      logger.error('[WarehouseTruckingMapping batchCreate] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };
}

export default new WarehouseTruckingMappingController();
