/**
 * 字典映射控制器
 * Dictionary Mapping Controller
 * 提供字典数据映射转换功能，用于Excel导入时的数据标准化
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import { logger } from '../utils/logger';

export class DictMappingController {
  /**
   * 根据中文港口名称获取标准 port_code
   */
  getPortCodeByChineseName = async (req: Request, res: Response): Promise<void> => {
    try {
      const { portName } = req.params;

      if (!portName) {
        res.status(400).json({ error: '港口名称不能为空' });
        return;
      }

      const result = await AppDataSource.query(
        'SELECT port_code, port_name_cn, port_name_en FROM dict_port_name_mapping WHERE port_name_cn = $1 OR port_code_old = $1 LIMIT 1',
        [portName]
      );

      if (result && result.length > 0) {
        res.json({
          success: true,
          data: {
            port_code: result[0].port_code,
            port_name_cn: result[0].port_name_cn,
            port_name_en: result[0].port_name_en
          }
        });
      } else {
        res.json({
          success: false,
          data: null,
          message: `未找到港口 "${portName}" 的标准代码`
        });
      }
    } catch (error: any) {
      logger.error('[getPortCodeByChineseName] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * 批量获取港口代码映射
   */
  getPortCodeMappings = async (req: Request, res: Response): Promise<void> => {
    try {
      const { portNames } = req.body;

      if (!Array.isArray(portNames) || portNames.length === 0) {
        res.status(400).json({ error: '港口名称数组不能为空' });
        return;
      }

      const placeholders = portNames.map((_, i) => `$${i + 1}`).join(',');
      const result = await AppDataSource.query(
        `SELECT port_name_cn, port_code, port_name_en
         FROM dict_port_name_mapping
         WHERE port_name_cn IN (${placeholders}) OR port_code_old IN (${placeholders})`,
        [...portNames, ...portNames]
      );

      const mapping: Record<string, any> = {};
      result.forEach((row: any) => {
        mapping[row.port_name_cn] = {
          port_code: row.port_code,
          port_name_en: row.port_name_en
        };
        if (row.port_code_old && !mapping[row.port_code_old]) {
          mapping[row.port_code_old] = {
            port_code: row.port_code,
            port_name_en: row.port_name_en
          };
        }
      });

      res.json({
        success: true,
        data: mapping
      });
    } catch (error: any) {
      logger.error('[getPortCodeMappings] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * 获取所有港口名称映射
   */
  getAllPortMappings = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await AppDataSource.query(`
        SELECT
          m.id,
          m.port_code,
          m.port_name_cn,
          m.port_name_en,
          m.port_code_old,
          m.is_primary,
          p.port_name as standard_name,
          p.country,
          p.city
        FROM dict_port_name_mapping m
        LEFT JOIN dict_ports p ON m.port_code = p.port_code
        ORDER BY m.port_name_cn
      `);

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('[getAllPortMappings] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * 添加新的港口名称映射
   */
  addPortMapping = async (req: Request, res: Response): Promise<void> => {
    try {
      const { port_code, port_name_cn, port_name_en, port_code_old, is_primary } = req.body;

      if (!port_code || !port_name_cn) {
        res.status(400).json({ error: 'port_code 和 port_name_cn 不能为空' });
        return;
      }

      const result = await AppDataSource.query(
        `INSERT INTO dict_port_name_mapping (port_code, port_name_cn, port_name_en, port_code_old, is_primary)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (port_name_cn) DO UPDATE SET
           port_code = EXCLUDED.port_code,
           port_name_en = EXCLUDED.port_name_en,
           port_code_old = EXCLUDED.port_code_old,
           is_primary = EXCLUDED.is_primary,
           updated_at = NOW()
         RETURNING *`,
        [port_code, port_name_cn, port_name_en || null, port_code_old || null, is_primary !== undefined ? is_primary : true]
      );

      res.json({
        success: true,
        data: result[0],
        message: '港口名称映射添加成功'
      });
    } catch (error: any) {
      logger.error('[addPortMapping] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * 删除港口名称映射
   */
  deletePortMapping = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'ID不能为空' });
        return;
      }

      const result = await AppDataSource.query(
        'DELETE FROM dict_port_name_mapping WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.length === 0) {
        res.status(404).json({ error: '未找到该映射记录' });
        return;
      }

      res.json({
        success: true,
        message: '港口名称映射删除成功'
      });
    } catch (error: any) {
      logger.error('[deletePortMapping] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };
}

export default new DictMappingController();
