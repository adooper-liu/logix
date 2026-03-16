/**
 * AI 控制器
 * AI Controller
 *
 * 处理 AI 相关的 API 请求
 */

import { Request, Response } from 'express';
import { intelligentSchedulingService } from '../../services/intelligentScheduling.service';
import { logger } from '../../utils/logger';
import { siliconFlowAdapter } from '../adapters/SiliconFlowAdapter';
import { getAllCategories, knowledgeBase, searchKnowledge } from '../data/knowledgeBase';
import { aiBusinessService } from '../services/aiBusiness.service';
import { textToSqlService } from '../services/textToSql.service';
import { ChatMessage } from '../types';
import { cacheManager } from '../utils/cacheManager';
import { inputValidator } from '../utils/inputValidator';
import { schemaReader } from '../utils/schemaReader';

/**
 * 排产意图检测
 */
const SCHEDULE_INTENT_PATTERNS = [
  '排产',
  '智能排柜',
  '一键排产',
  '开始排产',
  '执行排产',
  '帮我排柜',
  '排柜',
  '自动排产',
  '排程'
];

/**
 * 日期范围解析
 */
function parseDateRange(
  message: string,
  context: Record<string, any> | undefined
): { startDate: string; endDate: string } {
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1);

  // 优先使用 context 中的日期
  if (context?.startDate && context?.endDate) {
    return { startDate: context.startDate, endDate: context.endDate };
  }

  const msg = message.toLowerCase();

  // 本周
  if (msg.includes('本周')) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    return {
      startDate: weekStart.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  }

  // 上周
  if (msg.includes('上周')) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() - 7);
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() - today.getDay() - 1);
    return {
      startDate: weekStart.toISOString().split('T')[0],
      endDate: weekEnd.toISOString().split('T')[0]
    };
  }

  // 下周
  if (msg.includes('下周')) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 7);
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() - today.getDay() + 13);
    return {
      startDate: weekStart.toISOString().split('T')[0],
      endDate: weekEnd.toISOString().split('T')[0]
    };
  }

  // 本月
  if (msg.includes('本月') || msg.includes('这个月')) {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      startDate: monthStart.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  }

  // 上月
  if (msg.includes('上月') || msg.includes('上个月')) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    return {
      startDate: monthStart.toISOString().split('T')[0],
      endDate: monthEnd.toISOString().split('T')[0]
    };
  }

  // 今天
  if (msg.includes('今天') || msg.includes('今日')) {
    return {
      startDate: today.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  }

  // 昨天
  if (msg.includes('昨天') || msg.includes('昨日')) {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return {
      startDate: yesterday.toISOString().split('T')[0],
      endDate: yesterday.toISOString().split('T')[0]
    };
  }

  // 明天
  if (msg.includes('明天') || msg.includes('明日')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return {
      startDate: tomorrow.toISOString().split('T')[0],
      endDate: tomorrow.toISOString().split('T')[0]
    };
  }

  // 3月、4月 等月份
  const monthMatch = msg.match(/(\d+)月/);
  if (monthMatch) {
    const month = parseInt(monthMatch[1]);
    if (month >= 1 && month <= 12) {
      const monthStart = new Date(today.getFullYear(), month - 1, 1);
      const monthEnd = new Date(today.getFullYear(), month, 0);
      return {
        startDate: monthStart.toISOString().split('T')[0],
        endDate: monthEnd.toISOString().split('T')[0]
      };
    }
  }

  // 默认使用本年
  return {
    startDate: yearStart.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0]
  };
}

/**
 * 国家解析
 */
function parseCountry(
  message: string,
  context: Record<string, any> | undefined
): string | undefined {
  // 优先使用 context 中的国家
  if (context?.country || context?.scopedCountryCode) {
    return context.country || context.scopedCountryCode;
  }

  const msg = message.toLowerCase();

  // 国家关键词映射
  const countryMap: Record<string, string> = {
    美国: 'US',
    美: 'US',
    美区: 'US',
    英国: 'UK',
    英: 'UK',
    德国: 'DE',
    德: 'DE',
    法国: 'FR',
    法: 'FR',
    日本: 'JP',
    日: 'JP',
    加拿大: 'CA',
    加: 'CA',
    澳大利亚: 'AU',
    澳: 'AU'
  };

  for (const [key, code] of Object.entries(countryMap)) {
    if (msg.includes(key)) {
      return code;
    }
  }

  return undefined;
}

export class AIController {
  /**
   * POST /api/v1/ai/text-to-sql
   * 将自然语言转换为 SQL 并执行
   */
  textToSql = async (req: Request, res: Response): Promise<void> => {
    try {
      const { query, tables, limit, execute } = req.body as {
        query: string;
        tables?: string[];
        limit?: number;
        execute?: boolean;
      };

      // 验证查询参数
      const queryValidation = inputValidator.validateUserMessage(query);
      if (!queryValidation.isValid) {
        res.status(400).json({
          success: false,
          error: queryValidation.error
        });
        return;
      }

      // 验证表格参数
      if (tables) {
        const tablesValidation = inputValidator.validateArray(tables, {
          maxLength: 10,
          elementValidator: (table) =>
            inputValidator.validateString(table, {
              minLength: 1,
              maxLength: 50
            })
        });
        if (!tablesValidation.isValid) {
          res.status(400).json({
            success: false,
            error: tablesValidation.error
          });
          return;
        }
      }

      // 验证限制参数
      if (limit) {
        const limitValidation = inputValidator.validateNumber(limit, {
          min: 1,
          max: 1000
        });
        if (!limitValidation.isValid) {
          res.status(400).json({
            success: false,
            error: limitValidation.error
          });
          return;
        }
      }

      logger.info(`[AI] Text-to-SQL request: ${queryValidation.sanitized}`);

      if (execute) {
        // 生成并执行
        const result = await textToSqlService.generateAndExecute({
          query: queryValidation.sanitized!,
          tables: tables,
          limit: limit
        });
        res.json(result);
      } else {
        // 仅预览 SQL
        const result = await textToSqlService.preview({
          query: queryValidation.sanitized!,
          tables: tables
        });
        res.json(result);
      }
    } catch (error: any) {
      logger.error('[AI] textToSql error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * POST /api/v1/ai/execute-sql
   * 执行原始 SQL（用于预览后确认执行，仅允许 SELECT）
   */
  executeSql = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sql, limit } = req.body as { sql: string; limit?: number };

      // 验证 SQL 参数
      const sqlValidation = inputValidator.validateSqlQuery(sql);
      if (!sqlValidation.isValid) {
        res.status(400).json({
          success: false,
          error: sqlValidation.error
        });
        return;
      }

      // 验证限制参数
      if (limit) {
        const limitValidation = inputValidator.validateNumber(limit, {
          min: 1,
          max: 1000
        });
        if (!limitValidation.isValid) {
          res.status(400).json({
            success: false,
            error: limitValidation.error
          });
          return;
        }
      }

      const result = await textToSqlService.executeSql(sqlValidation.sanitized!, limit);
      if (result.success) {
        res.json({
          success: true,
          sql: result.sql,
          results: result.data,
          rowCount: result.rowCount
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      logger.error('[AI] executeSql error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * GET /api/v1/ai/tables
   * 获取数据库表列表
   */
  getTables = async (req: Request, res: Response): Promise<void> => {
    try {
      const tables = await textToSqlService.getTables();
      res.json({
        success: true,
        data: tables
      });
    } catch (error: any) {
      logger.error('[AI] getTables error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * GET /api/v1/ai/tables/:tableName/columns
   * 获取表的列信息
   */
  getTableColumns = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tableName } = req.params;
      const columns = await textToSqlService.getTableColumns(tableName);
      res.json({
        success: true,
        data: columns
      });
    } catch (error: any) {
      logger.error('[AI] getTableColumns error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * POST /api/v1/ai/chat
   * AI 对话（带知识库检索和自动SQL执行）
   */
  chat = async (req: Request, res: Response): Promise<void> => {
    try {
      const { message, context, options } = req.body as {
        message: string;
        context?: Record<string, any>;
        options?: { execute?: boolean; preview?: boolean; autoQuery?: boolean };
      };

      // 验证消息参数
      const messageValidation = inputValidator.validateUserMessage(message);
      if (!messageValidation.isValid) {
        res.status(400).json({
          success: false,
          error: messageValidation.error
        });
        return;
      }

      // 验证上下文参数
      if (context) {
        const contextValidation = inputValidator.validateObject(context);
        if (!contextValidation.isValid) {
          res.status(400).json({
            success: false,
            error: contextValidation.error
          });
          return;
        }
      }

      // 判断是否需要自动查询数据库
      const autoQuery = options?.autoQuery ?? true; // 默认开启自动查询

      // 获取数据库结构作为上下文
      const schemaDescription = await schemaReader.generateSchemaDescription();

      // 尝试从缓存获取知识库搜索结果
      let relevantKnowledge = cacheManager.getCachedKnowledgeSearch(messageValidation.sanitized!);
      if (!relevantKnowledge) {
        relevantKnowledge = searchKnowledge(messageValidation.sanitized!);
        // 缓存知识库搜索结果
        cacheManager.cacheKnowledgeSearch(messageValidation.sanitized!, relevantKnowledge);
      }
      const knowledgeContext =
        relevantKnowledge.length > 0 ? `## 相关知识库信息\n${relevantKnowledge.join('\n\n')}` : '';

      // ==================== 排产意图检测 ====================
      const isScheduleIntent = SCHEDULE_INTENT_PATTERNS.some((pattern) =>
        messageValidation.sanitized!.toLowerCase().includes(pattern.toLowerCase())
      );

      let scheduleResult = null;

      if (isScheduleIntent) {
        try {
          // 解析参数
          const { startDate, endDate } = parseDateRange(messageValidation.sanitized!, context);
          const country = parseCountry(messageValidation.sanitized!, context);

          logger.info(
            `[AI] Schedule intent detected: country=${country}, startDate=${startDate}, endDate=${endDate}`
          );

          // 调用排产服务
          const scheduleResponse = await intelligentSchedulingService.batchSchedule({
            country,
            startDate,
            endDate,
            forceSchedule: false
          });

          scheduleResult = {
            success: scheduleResponse.success,
            total: scheduleResponse.total,
            successCount: scheduleResponse.successCount,
            failedCount: scheduleResponse.failedCount,
            results: scheduleResponse.results.slice(0, 5), // 只返回前5条
            hasMore: scheduleResponse.results.length > 5
          };

          logger.info(
            `[AI] Schedule completed: success=${scheduleResponse.successCount}, failed=${scheduleResponse.failedCount}`
          );
        } catch (scheduleError: any) {
          logger.error('[AI] Schedule error:', scheduleError);
        }
      }

      // ==================== 数据查询意图检测 ====================

      // 判断是否需要查询数据库
      const dataQueryPatterns = [
        '查询',
        '多少',
        '数量',
        '统计',
        '列表',
        '显示',
        '找出',
        '获取',
        '今天',
        '昨天',
        '本周',
        '本月',
        '在途',
        '到港',
        '已出运',
        '未出运',
        '滞港费',
        '货柜',
        '备货单',
        '船运',
        '港口'
      ];
      const needsDataQuery =
        autoQuery &&
        dataQueryPatterns.some((pattern) =>
          messageValidation.sanitized!.toLowerCase().includes(pattern.toLowerCase())
        );

      let sqlResult = null;
      let generatedSql = '';

      // 如果需要查询数据库，自动生成并执行SQL
      if (needsDataQuery) {
        try {
          // 生成SQL
          const sqlGenResult = await textToSqlService.generateSql({
            query: messageValidation.sanitized!,
            tables: undefined,
            limit: 10
          });

          if (sqlGenResult.success && sqlGenResult.sql && sqlGenResult.sql !== 'INVALID_QUERY') {
            generatedSql = sqlGenResult.sql;

            // 执行SQL
            const execResult = await textToSqlService.executeSql(generatedSql, 10);
            if (execResult.success) {
              sqlResult = {
                sql: generatedSql,
                data: execResult.data?.slice(0, 5) || [], // 只返回前5条用于展示
                rowCount: execResult.rowCount || 0,
                truncated: (execResult.rowCount || 0) > 5
              };
            }
          }
        } catch (sqlError: any) {
          logger.warn('[AI] Auto SQL generation/execution failed:', sqlError.message);
        }
      }

      // 构建系统 Prompt
      const systemPrompt = `你是 LogiX 物流系统的智能助手。你可以帮助用户：
1. 查询物流数据（货柜、备货单、船运等）
2. 生成 SQL 查询
3. 分析业务数据
4. 回答关于物流流程的问题
5. 解释系统筛选条件和业务规则

## 数据库结构
${schemaDescription}

${knowledgeContext}

## 物流系统核心概念
- 货柜 (containers)：集装箱信息，主键 container_number
- 备货单 (replenishment_orders)：出货计划，主键 order_number
- 海运 (sea_freight)：船运信息
- 港口操作 (port_operations)：港口装卸记录，含 port_type(起运港/中转港/目的港)
- 拖卡运输 (trucking_transport)：陆运记录
- 仓库操作 (warehouse_operations)：仓库装卸记录
- 滞港费 (container_charges)：码头堆存费用

## 物流状态流转
not_shipped → shipped → in_transit → at_port → picked_up → unloaded → returned_empty

${
  sqlResult
    ? `
## 查询结果
SQL: ${sqlResult.sql}
结果数量: ${sqlResult.rowCount} 条
${sqlResult.truncated ? '(仅显示前5条)' : ''}
数据: ${JSON.stringify(sqlResult.data, null, 2)}
`
    : ''
}

${
  scheduleResult
    ? `
## 排产结果
排产状态: ${scheduleResult.success ? '成功' : '失败'}
总计: ${scheduleResult.total} 个货柜
成功: ${scheduleResult.successCount} 个
失败: ${scheduleResult.failedCount} 个
${scheduleResult.hasMore ? '(仅显示前5条)' : ''}
排产详情: ${JSON.stringify(scheduleResult.results, null, 2)}
`
    : ''
}

请用中文回答问题。如果查询到数据，请用表格或列表形式展示结果。当用户询问关于筛选条件、时间概念、滞港费计算等业务问题时，优先使用知识库中的信息回答。当用户触发排产时，请明确告知排产结果（成功/失败数量）。`;

      const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];

      // 如果有上下文，添加为用户消息
      if (context) {
        messages.push({
          role: 'user',
          content: `当前上下文：${JSON.stringify(context)}`
        });
      }

      messages.push({ role: 'user', content: messageValidation.sanitized! });

      // 尝试从缓存获取AI响应
      let result = cacheManager.getCachedChatResponse(messageValidation.sanitized!, context);
      if (!result) {
        // 调用 AI
        result = await siliconFlowAdapter.chat(messages);

        // 缓存AI响应
        if (result.success) {
          cacheManager.cacheChatResponse(messageValidation.sanitized!, context, result);
        }
      }

      if (result.success) {
        res.json({
          success: true,
          message: result.result,
          executionTime: result.executionTime,
          sqlResult: sqlResult
            ? {
                sql: sqlResult.sql,
                rowCount: sqlResult.rowCount,
                truncated: sqlResult.truncated,
                data: sqlResult.data
              }
            : undefined,
          scheduleResult: scheduleResult
            ? {
                success: scheduleResult.success,
                total: scheduleResult.total,
                successCount: scheduleResult.successCount,
                failedCount: scheduleResult.failedCount,
                results: scheduleResult.results,
                hasMore: scheduleResult.hasMore
              }
            : undefined
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      logger.error('[AI] chat error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * GET /api/v1/ai/schema
   * 获取完整数据库结构
   */
  getSchema = async (req: Request, res: Response): Promise<void> => {
    try {
      const { keyword } = req.query;

      let tables;
      if (keyword) {
        tables = await schemaReader.searchTables(keyword as string);
      } else {
        tables = await schemaReader.getAllTables();
      }

      const relationships = await schemaReader.getTableRelationships();

      res.json({
        success: true,
        data: {
          tables,
          relationships
        }
      });
    } catch (error: any) {
      logger.error('[AI] getSchema error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * POST /api/v1/ai/validate-sql
   * 验证 SQL 安全性
   */
  validateSql = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sql } = req.body;

      if (!sql) {
        res.status(400).json({
          success: false,
          error: 'SQL is required'
        });
        return;
      }

      const { sqlValidator } = await import('../utils/sqlValidator');
      const result = sqlValidator.validate(sql);

      res.json({
        success: true,
        isValid: result.isValid,
        error: result.error,
        warnings: result.warnings,
        tables: sqlValidator.extractTables(sql),
        complexity: sqlValidator.estimateComplexity(sql)
      });
    } catch (error: any) {
      logger.error('[AI] validateSql error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * GET /api/v1/ai/knowledge
   * 获取知识库类别和内容
   */
  getKnowledge = async (req: Request, res: Response): Promise<void> => {
    try {
      const { category, keyword } = req.query;

      let data;
      if (category) {
        // 按类别获取
        const items = knowledgeBase.filter((item) => item.category === category);
        data = { category, items };
      } else if (keyword) {
        // 搜索知识库
        const results = searchKnowledge(keyword as string);
        data = { keyword, results };
      } else {
        // 获取所有类别和所有知识条目
        const categories = getAllCategories();
        data = { categories, totalItems: knowledgeBase.length, items: knowledgeBase };
      }

      res.json({
        success: true,
        data
      });
    } catch (error: any) {
      logger.error('[AI] getKnowledge error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * GET /api/v1/ai/health
   * 检查 AI 服务健康状态
   */
  health = async (req: Request, res: Response): Promise<void> => {
    try {
      const hasApiKey = !!process.env.SILICON_FLOW_API_KEY;

      res.json({
        success: true,
        data: {
          status: hasApiKey ? 'ready' : 'missing_api_key',
          provider: 'siliconflow',
          model: process.env.SILICON_FLOW_MODEL || 'deepseek-ai/DeepSeek-V2-Chat',
          hasApiKey
        }
      });
    } catch (error: any) {
      logger.error('[AI] health error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * GET /api/v1/ai/stats/overview
   * 获取业务概览统计
   */
  getStatsOverview = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await aiBusinessService.getOverview();
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] getStatsOverview error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * GET /api/v1/ai/stats/status
   * 按物流状态统计
   */
  getStatsByStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await aiBusinessService.getByStatus();
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] getStatsByStatus error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * GET /api/v1/ai/stats/arrival
   * 按到港统计
   */
  getStatsByArrival = async (req: Request, res: Response): Promise<void> => {
    try {
      const { start, end } = req.query;
      const dateRange = start && end ? { start: start as string, end: end as string } : undefined;
      const result = await aiBusinessService.getByArrival(dateRange);
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] getStatsByArrival error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * GET /api/v1/ai/stats/eta
   * 按 ETA 统计
   */
  getStatsByETA = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await aiBusinessService.getByETA();
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] getStatsByETA error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * GET /api/v1/ai/stats/last-free-date
   * 按最晚提柜日统计
   */
  getStatsByLastFreeDate = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await aiBusinessService.getByLastFreeDate();
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] getStatsByLastFreeDate error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * GET /api/v1/ai/stats/demurrage
   * 滞港费概览
   */
  getStatsDemurrage = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await aiBusinessService.getDemurrageOverview();
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] getStatsDemurrage error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * GET /api/v1/ai/stats/shipping-company
   * 按船公司统计
   */
  getStatsByShippingCompany = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await aiBusinessService.getByShippingCompany();
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] getStatsByShippingCompany error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * GET /api/v1/ai/stats/destination-port
   * 按目的港统计
   */
  getStatsByDestinationPort = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await aiBusinessService.getByDestinationPort();
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] getStatsByDestinationPort error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * GET /api/v1/ai/containers/search
   * 搜索货柜
   */
  searchContainers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { keyword, limit } = req.query;
      if (!keyword) {
        res.status(400).json({
          success: false,
          error: 'Keyword is required'
        });
        return;
      }
      const result = await aiBusinessService.searchContainers(
        keyword as string,
        limit ? parseInt(limit as string) : 10
      );
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] searchContainers error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  /**
   * GET /api/v1/ai/stats/country
   * 按销往国家统计
   */
  getStatsByCountry = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await aiBusinessService.getByCountry();
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] getStatsByCountry error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * GET /api/v1/ai/stats/freight-forwarder
   * 按货代公司统计
   */
  getStatsByFreightForwarder = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await aiBusinessService.getByFreightForwarder();
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] getStatsByFreightForwarder error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * GET /api/v1/ai/stats/container-type
   * 按柜型统计
   */
  getStatsByContainerType = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await aiBusinessService.getByContainerType();
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] getStatsByContainerType error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * GET /api/v1/ai/stats/customs-status
   * 按清关状态统计
   */
  getStatsByCustomsStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await aiBusinessService.getByCustomsStatus();
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] getStatsByCustomsStatus error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * GET /api/v1/ai/stats/transit-port
   * 按中转港统计
   */
  getStatsByTransitPort = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await aiBusinessService.getByTransitPort();
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] getStatsByTransitPort error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * GET /api/v1/ai/stats/warehouse
   * 按仓库统计
   */
  getStatsByWarehouse = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await aiBusinessService.getByWarehouse();
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] getStatsByWarehouse error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * GET /api/v1/ai/stats/demurrage-by-country
   * 滞港费按国家统计
   */
  getStatsDemurrageByCountry = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await aiBusinessService.getDemurrageByCountry();
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] getStatsDemurrageByCountry error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * GET /api/v1/ai/stats/demurrage-by-shipping-company
   * 滞港费按船公司统计
   */
  getStatsDemurrageByShippingCompany = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await aiBusinessService.getDemurrageByShippingCompany();
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] getStatsDemurrageByShippingCompany error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * GET /api/v1/ai/stats/demurrage-by-port
   * 滞港费按目的港统计
   */
  getStatsDemurrageByPort = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await aiBusinessService.getDemurrageByPort();
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] getStatsDemurrageByPort error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * GET /api/v1/ai/stats/pending-scheduling
   * 待排产统计
   */
  getStatsPendingScheduling = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await aiBusinessService.getPendingScheduling();
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] getStatsPendingScheduling error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * GET /api/v1/ai/stats/empty-return
   * 还空箱统计
   */
  getStatsEmptyReturn = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await aiBusinessService.getEmptyReturnStatus();
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] getStatsEmptyReturn error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * GET /api/v1/ai/stats/replenishment-order
   * 按备货单统计
   */
  getStatsByReplenishmentOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await aiBusinessService.getByReplenishmentOrder();
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] getStatsByReplenishmentOrder error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * GET /api/v1/ai/stats/trucking
   * 拖卡运输统计
   */
  getStatsTrucking = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await aiBusinessService.getTruckingStatus();
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] getStatsTrucking error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * GET /api/v1/ai/containers/pending-customs
   * 待清关货柜列表
   */
  getPendingCustomsContainers = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const result = await aiBusinessService.getPendingCustomsContainers(limit);
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] getPendingCustomsContainers error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * GET /api/v1/ai/alerts/demurrage
   * 滞港费预警列表
   */
  getDemurrageAlerts = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const result = await aiBusinessService.getDemurrageAlerts(limit);
      res.json(result);
    } catch (error: any) {
      logger.error('[AI] getDemurrageAlerts error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * POST /api/v1/ai/flow
   * 创建流程定义
   */
  createFlow = async (req: Request, res: Response): Promise<void> => {
    try {
      const flowData = req.body as Omit<FlowDefinition, 'id' | 'createdAt' | 'updatedAt'>;
      const flow = flowService.createFlowDefinition(flowData);
      res.json({ success: true, data: flow });
    } catch (error: any) {
      logger.error('[AI] createFlow error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * GET /api/v1/ai/flow
   * 获取所有流程定义
   */
  getFlows = async (req: Request, res: Response): Promise<void> => {
    try {
      const flows = flowService.getFlowDefinitions();
      res.json({ success: true, data: flows });
    } catch (error: any) {
      logger.error('[AI] getFlows error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * GET /api/v1/ai/flow/:id
   * 获取流程定义详情
   */
  getFlow = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const flow = flowService.getFlowDefinition(id);
      if (flow) {
        res.json({ success: true, data: flow });
      } else {
        res.status(404).json({ success: false, error: 'Flow not found' });
      }
    } catch (error: any) {
      logger.error('[AI] getFlow error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * PUT /api/v1/ai/flow/:id
   * 更新流程定义
   */
  updateFlow = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body as Partial<FlowDefinition>;
      const flow = flowService.updateFlowDefinition(id, updates);
      if (flow) {
        res.json({ success: true, data: flow });
      } else {
        res.status(404).json({ success: false, error: 'Flow not found' });
      }
    } catch (error: any) {
      logger.error('[AI] updateFlow error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * DELETE /api/v1/ai/flow/:id
   * 删除流程定义
   */
  deleteFlow = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const success = flowService.deleteFlowDefinition(id);
      if (success) {
        res.json({ success: true, message: 'Flow deleted successfully' });
      } else {
        res.status(404).json({ success: false, error: 'Flow not found' });
      }
    } catch (error: any) {
      logger.error('[AI] deleteFlow error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * POST /api/v1/ai/flow/execute
   * 执行流程
   */
  executeFlow = async (req: Request, res: Response): Promise<void> => {
    try {
      const { flowId, variables = {} } = req.body;
      const result = await flowService.executeFlow(flowId, variables);
      res.json({ success: result.success, data: result });
    } catch (error: any) {
      logger.error('[AI] executeFlow error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * POST /api/v1/ai/flow/execute-definition
   * 执行流程定义（直接执行，不保存）
   */
  executeFlowDefinition = async (req: Request, res: Response): Promise<void> => {
    try {
      const { flow, variables = {} } = req.body;
      const result = await flowService.executeFlowDefinition(flow, variables);
      res.json({ success: result.success, data: result });
    } catch (error: any) {
      logger.error('[AI] executeFlowDefinition error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };
}

export const aiController = new AIController();
