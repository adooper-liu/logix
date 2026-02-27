/**
 * 通用字典映射控制器
 * Universal Dictionary Mapping Controller
 * 支持所有字典类型的名称到代码的映射转换
 * 包括: PORT, COUNTRY, SHIPPING_COMPANY, CONTAINER_TYPE, CUSTOMER, WAREHOUSE, etc.
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import { logger } from '../utils/logger';

/**
 * 获取标准代码
 * @query dictType 字典类型 (PORT, COUNTRY, SHIPPING_COMPANY, etc.)
 * @query name 输入名称(可以是中文名、英文名、旧代码等)
 */
export class UniversalDictMappingController {
  getStandardCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { dictType, name } = req.query;

      if (!dictType || !name) {
        res.status(400).json({ error: 'dictType 和 name 参数不能为空' });
        return;
      }

      const result = await AppDataSource.query(
        'SELECT get_standard_code($1, $2) as standard_code',
        [dictType, name]
      );

      const standardCode = result[0]?.standard_code;

      if (standardCode) {
        // 获取完整的映射信息
        const mappingInfo = await AppDataSource.query(
          `SELECT
            standard_code,
            standard_name,
            name_cn,
            name_en,
            old_code,
            is_primary
           FROM dict_universal_mapping
           WHERE dict_type = $1 AND standard_code = $2
           LIMIT 1`,
          [dictType, standardCode]
        );

        res.json({
          success: true,
          data: mappingInfo[0] || { standard_code: standardCode }
        });
      } else {
        res.json({
          success: false,
          data: null,
          message: `未找到类型 "${dictType}" 中名称 "${name}" 的标准代码`
        });
      }
    } catch (error: any) {
      logger.error('[getStandardCode] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * 批量获取标准代码
   * @body dictType 字典类型
   * @body names 输入名称数组
   */
  getStandardCodesBatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { dictType, names } = req.body;

      if (!dictType || !Array.isArray(names)) {
        res.status(400).json({ error: 'dictType 和 names 数组不能为空' });
        return;
      }

      const result = await AppDataSource.query(
        'SELECT get_standard_codes_batch($1, $2) as mapping',
        [dictType, names]
      );

      res.json({
        success: true,
        data: result[0]?.mapping || {},
        dict_type: dictType
      });
    } catch (error: any) {
      logger.error('[getStandardCodesBatch] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * 获取指定类型的所有映射
   * @param dictType 字典类型
   */
  getMappingsByType = async (req: Request, res: Response): Promise<void> => {
    try {
      const { dictType } = req.params;

      if (!dictType) {
        res.status(400).json({ error: 'dictType 参数不能为空' });
        return;
      }

      const result = await AppDataSource.query(
        'SELECT * FROM get_all_mappings_by_type($1)',
        [dictType]
      );

      res.json({
        success: true,
        data: result,
        dict_type: dictType,
        total: result.length
      });
    } catch (error: any) {
      logger.error('[getMappingsByType] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * 获取所有字典类型
   */
  getAllDictTypes = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await AppDataSource.query(`
        SELECT
          dict_type,
          COUNT(*) as mapping_count,
          MIN(sort_order) as first_sort
        FROM dict_universal_mapping
        WHERE is_active = TRUE
        GROUP BY dict_type
        ORDER BY dict_type
      `);

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('[getAllDictTypes] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * 模糊搜索映射
   * @param dictType 字典类型
   * @query keyword 关键词
   */
  searchMappings = async (req: Request, res: Response): Promise<void> => {
    try {
      const { dictType } = req.params;
      const { keyword } = req.query;

      if (!dictType) {
        res.status(400).json({ error: 'dictType 参数不能为空' });
        return;
      }

      const result = await AppDataSource.query(
        'SELECT * FROM search_mappings_fuzzy($1, $2)',
        [dictType, keyword || '']
      );

      res.json({
        success: true,
        data: result,
        dict_type: dictType,
        keyword: keyword,
        total: result.length
      });
    } catch (error: any) {
      logger.error('[searchMappings] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * 添加新的映射
   */
  addMapping = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        dict_type,
        target_table,
        target_field,
        standard_code,
        standard_name,
        name_cn,
        name_en,
        old_code,
        is_primary,
        sort_order
      } = req.body;

      if (!dict_type || !target_table || !target_field || !standard_code || !name_cn) {
        res.status(400).json({
          error: 'dict_type, target_table, target_field, standard_code, name_cn 不能为空'
        });
        return;
      }

      const result = await AppDataSource.query(
        `INSERT INTO dict_universal_mapping
         (dict_type, target_table, target_field, standard_code, standard_name,
          name_cn, name_en, old_code, is_primary, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (dict_type, name_cn) DO UPDATE SET
           target_table = EXCLUDED.target_table,
           target_field = EXCLUDED.target_field,
           standard_code = EXCLUDED.standard_code,
           standard_name = EXCLUDED.standard_name,
           name_en = EXCLUDED.name_en,
           old_code = EXCLUDED.old_code,
           is_primary = EXCLUDED.is_primary,
           sort_order = EXCLUDED.sort_order,
           updated_at = NOW()
         RETURNING *`,
        [
          dict_type,
          target_table,
          target_field,
          standard_code,
          standard_name || null,
          name_cn,
          name_en || null,
          old_code || null,
          is_primary !== undefined ? is_primary : true,
          sort_order || 0
        ]
      );

      res.json({
        success: true,
        data: result[0],
        message: '映射添加成功'
      });
    } catch (error: any) {
      logger.error('[addMapping] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * 批量添加映射
   */
  addMappingsBatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { mappings } = req.body;

      if (!Array.isArray(mappings) || mappings.length === 0) {
        res.status(400).json({ error: 'mappings 数组不能为空' });
        return;
      }

      const results = [];

      for (const mapping of mappings) {
        try {
          const result = await AppDataSource.query(
            `INSERT INTO dict_universal_mapping
             (dict_type, target_table, target_field, standard_code, standard_name,
              name_cn, name_en, old_code, is_primary, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (dict_type, name_cn) DO UPDATE SET
               standard_code = EXCLUDED.standard_code,
               standard_name = EXCLUDED.standard_name,
               name_en = EXCLUDED.name_en,
               old_code = EXCLUDED.old_code,
               updated_at = NOW()
             RETURNING *`,
            [
              mapping.dict_type,
              mapping.target_table,
              mapping.target_field,
              mapping.standard_code,
              mapping.standard_name || null,
              mapping.name_cn,
              mapping.name_en || null,
              mapping.old_code || null,
              mapping.is_primary !== undefined ? mapping.is_primary : true,
              mapping.sort_order || 0
            ]
          );
          results.push({ success: true, data: result[0] });
        } catch (err: any) {
          results.push({ success: false, error: err.message, mapping });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failedCount = results.length - successCount;

      res.json({
        success: failedCount === 0,
        data: results,
        summary: {
          total: results.length,
          success: successCount,
          failed: failedCount
        },
        message: `批量添加完成: 成功 ${successCount} 条, 失败 ${failedCount} 条`
      });
    } catch (error: any) {
      logger.error('[addMappingsBatch] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * 更新映射
   */
  updateMapping = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (!id) {
        res.status(400).json({ error: 'ID 不能为空' });
        return;
      }

      // 构建动态更新语句
      const fields = [];
      const values = [];
      let paramIndex = 1;

      const allowedFields = [
        'standard_code', 'standard_name', 'name_cn', 'name_en',
        'old_code', 'is_primary', 'is_active', 'sort_order', 'remarks'
      ];

      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          fields.push(`${field} = $${paramIndex}`);
          values.push(updates[field]);
          paramIndex++;
        }
      });

      if (fields.length === 0) {
        res.status(400).json({ error: '没有有效的更新字段' });
        return;
      }

      values.push(id);

      const query = `
        UPDATE dict_universal_mapping
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await AppDataSource.query(query, values);

      if (result.length === 0) {
        res.status(404).json({ error: '未找到该映射记录' });
        return;
      }

      res.json({
        success: true,
        data: result[0],
        message: '映射更新成功'
      });
    } catch (error: any) {
      logger.error('[updateMapping] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * 删除映射
   */
  deleteMapping = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'ID 不能为空' });
        return;
      }

      const result = await AppDataSource.query(
        'DELETE FROM dict_universal_mapping WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.length === 0) {
        res.status(404).json({ error: '未找到该映射记录' });
        return;
      }

      res.json({
        success: true,
        message: '映射删除成功'
      });
    } catch (error: any) {
      logger.error('[deleteMapping] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * 获取映射统计信息
   */
  getMappingStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await AppDataSource.query(`
        SELECT
          dict_type,
          COUNT(*) as total_count,
          SUM(CASE WHEN is_primary = TRUE THEN 1 ELSE 0 END) as primary_count,
          SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_count,
          MIN(created_at) as first_created,
          MAX(updated_at) as last_updated
        FROM dict_universal_mapping
        GROUP BY dict_type
        ORDER BY dict_type
      `);

      const totalStats = await AppDataSource.query(`
        SELECT
          COUNT(*) as total_mappings,
          COUNT(DISTINCT dict_type) as total_types,
          SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_mappings
        FROM dict_universal_mapping
      `);

      res.json({
        success: true,
        data: {
          by_type: result,
          summary: totalStats[0]
        }
      });
    } catch (error: any) {
      logger.error('[getMappingStats] Error:', error);
      res.status(500).json({ error: error.message });
    }
  };
}

export default new UniversalDictMappingController();
