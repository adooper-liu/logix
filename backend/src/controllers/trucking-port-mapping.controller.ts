/**
 * 车队-港口映射控制器
 * Trucking-Port Mapping Controller
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import { logger } from '../utils/logger';

export class TruckingPortMappingController {
  /**
   * 获取所有映射记录
   */
  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = 1, pageSize = 20, country, truckingCompanyName, portName } = req.query;
      const offset = (Number(page) - 1) * Number(pageSize);

      let whereClause = '1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (country) {
        whereClause += ` AND country = $${paramIndex}`;
        params.push(country);
        paramIndex++;
      }
      if (truckingCompanyName) {
        whereClause += ` AND trucking_company_name ILIKE $${paramIndex}`;
        params.push(`%${truckingCompanyName}%`);
        paramIndex++;
      }
      if (portName) {
        whereClause += ` AND port_name ILIKE $${paramIndex}`;
        params.push(`%${portName}%`);
        paramIndex++;
      }

      const [data, total] = await Promise.all([
        AppDataSource.query(
          `SELECT * FROM dict_trucking_port_mapping WHERE ${whereClause} ORDER BY id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
          [...params, Number(pageSize), offset]
        ),
        AppDataSource.query(
          `SELECT COUNT(*) as count FROM dict_trucking_port_mapping WHERE ${whereClause}`,
          params
        )
      ]);

      res.json({
        success: true,
        data,
        total: Number(total[0]?.count || 0)
      });
    } catch (error: any) {
      logger.error('[TruckingPortMapping getAll] Error:', error);
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
        'SELECT * FROM dict_trucking_port_mapping WHERE id = $1',
        [id]
      );

      if (result.length === 0) {
        res.status(404).json({ error: '记录不存在' });
        return;
      }

      res.json({ success: true, data: result[0] });
    } catch (error: any) {
      logger.error('[TruckingPortMapping getById] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * 创建映射记录
   */
  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        country, truckingCompanyId, truckingCompanyName, portCode, portName,
        yardCapacity, standardRate, unit, yardOperationFee,
        mappingType, isDefault, isActive, remarks 
      } = req.body;

      const result = await AppDataSource.query(
        `INSERT INTO dict_trucking_port_mapping 
         (country, trucking_company_id, trucking_company_name, port_code, port_name,
          yard_capacity, standard_rate, unit, yard_operation_fee,
          mapping_type, is_default, is_active, remarks, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
         RETURNING *`,
        [
          country, truckingCompanyId, truckingCompanyName, portCode, portName,
          yardCapacity || 0, standardRate || 0, unit || '', yardOperationFee || 0,
          mappingType || 'DEFAULT', isDefault || false, isActive !== false, remarks || ''
        ]
      );

      res.json({ success: true, data: result[0] });
    } catch (error: any) {
      logger.error('[TruckingPortMapping create] Error:', error);
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
        country, truckingCompanyId, truckingCompanyName, portCode, portName,
        yardCapacity, standardRate, unit, yardOperationFee,
        mappingType, isDefault, isActive, remarks 
      } = req.body;

      const result = await AppDataSource.query(
        `UPDATE dict_trucking_port_mapping 
         SET country = $1, trucking_company_id = $2, trucking_company_name = $3, 
             port_code = $4, port_name = $5, yard_capacity = $6, standard_rate = $7, 
             unit = $8, yard_operation_fee = $9, mapping_type = $10, 
             is_default = $11, is_active = $12, remarks = $13, updated_at = NOW()
         WHERE id = $14
         RETURNING *`,
        [
          country, truckingCompanyId, truckingCompanyName, portCode, portName,
          yardCapacity, standardRate, unit, yardOperationFee,
          mappingType, isDefault, isActive, remarks, id
        ]
      );

      if (result.length === 0) {
        res.status(404).json({ error: '记录不存在' });
        return;
      }

      res.json({ success: true, data: result[0] });
    } catch (error: any) {
      logger.error('[TruckingPortMapping update] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * 删除映射记录
   */
  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await AppDataSource.query('DELETE FROM dict_trucking_port_mapping WHERE id = $1', [id]);
      res.json({ success: true, message: '删除成功' });
    } catch (error: any) {
      logger.error('[TruckingPortMapping delete] Error:', error);
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

      logger.info('[TruckingPortMapping batchCreate] 开始批量导入，记录数:', records.length);

      for (const record of records) {
        try {
          // 先检查是否已存在相同的映射（通过 country + trucking_company_id + port_code 判断）
          const existing = await AppDataSource.query(
            `SELECT id FROM dict_trucking_port_mapping 
             WHERE country = $1 AND trucking_company_id = $2 AND port_code = $3`,
            [record.country, record.truckingCompanyId, record.portCode]
          );

          if (existing.length > 0) {
            // 已存在，执行更新
            logger.info(`[TruckingPortMapping batchCreate] 更新已有映射：${record.truckingCompanyName} - ${record.portName}`);
            await AppDataSource.query(
              `UPDATE dict_trucking_port_mapping 
               SET trucking_company_name = $1, port_name = $2, 
                   yard_capacity = $3, standard_rate = $4, 
                   unit = $5, yard_operation_fee = $6, 
                   mapping_type = $7, is_default = $8, 
                   is_active = $9, remarks = $10, updated_at = NOW()
               WHERE id = $11`,
              [
                record.truckingCompanyName, record.portName,
                record.yardCapacity || 0, record.standardRate || 0,
                record.unit || '', record.yardOperationFee || 0,
                record.mappingType || 'DEFAULT', record.isDefault || false,
                record.isActive !== false, record.remarks || '',
                existing[0].id
              ]
            );
            skipCount++;
          } else {
            // 不存在，执行插入
            logger.info(`[TruckingPortMapping batchCreate] 插入新映射：${record.truckingCompanyName} - ${record.portName}`);
            const insertResult = await AppDataSource.query(
              `INSERT INTO dict_trucking_port_mapping 
               (country, trucking_company_id, trucking_company_name, port_code, port_name,
                yard_capacity, standard_rate, unit, yard_operation_fee,
                mapping_type, is_default, is_active, remarks, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
               RETURNING *`,
              [
                record.country, record.truckingCompanyId, record.truckingCompanyName,
                record.portCode, record.portName,
                record.yardCapacity || 0, record.standardRate || 0, record.unit || '', record.yardOperationFee || 0,
                record.mappingType || 'DEFAULT', record.isDefault || false, record.isActive !== false, record.remarks || ''
              ]
            );
            logger.info('[TruckingPortMapping batchCreate] 插入成功，ID:', insertResult[0]?.id);
            successCount++;
          }
        } catch (innerError: any) {
          const errorMsg = `处理记录失败 ${record.truckingCompanyName} - ${record.portName}: ${innerError.message}`;
          logger.error('[TruckingPortMapping batchCreate] Single record error:', innerError);
          errors.push(errorMsg);
          // 继续处理其他记录，不中断整个流程
        }
      }

      const resultMessage = `批量导入完成，共${records.length}条，新建${successCount}条，更新${skipCount}条`;
      if (errors.length > 0) {
        logger.warn('[TruckingPortMapping batchCreate] 部分记录失败:', errors);
      }
      
      logger.info('[TruckingPortMapping batchCreate]', resultMessage);
      
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
      logger.error('[TruckingPortMapping batchCreate] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };
}

export default new TruckingPortMappingController();
