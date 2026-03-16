/**
 * 意图检测器
 * Intent Detector
 * 
 * 使用高级 NLP 技术检测用户意图
 */

import { logger } from '../../utils/logger';
import { SiliconFlowAdapter } from '../adapters/SiliconFlowAdapter';

/**
 * 意图类型
 */
export enum IntentType {
  // 业务意图
  SCHEDULING = 'scheduling',        // 排产
  DATA_QUERY = 'data_query',        // 数据查询
  KNOWLEDGE_QUERY = 'knowledge_query', // 知识库查询
  REPORT_GENERATION = 'report_generation', // 报表生成
  
  // 系统意图
  HELP = 'help',                    // 帮助
  INFO = 'info',                    // 信息
  ERROR = 'error',                  // 错误
  
  // 其他
  UNKNOWN = 'unknown'               // 未知
}

/**
 * 意图检测结果
 */
export interface IntentDetectionResult {
  intent: IntentType;
  confidence: number;
  entities?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * 意图检测器类
 */
export class IntentDetector {
  private adapter: SiliconFlowAdapter;

  constructor() {
    this.adapter = new SiliconFlowAdapter({
      provider: 'siliconflow',
      model: process.env.SILICON_FLOW_MODEL || 'deepseek-ai/DeepSeek-V2-Chat'
    });
  }

  /**
   * 检测意图
   */
  async detectIntent(text: string): Promise<IntentDetectionResult> {
    try {
      // 构建 Prompt
      const systemPrompt = `你是一个物流系统的意图检测专家。

请分析用户输入的文本，确定其意图类型，并提取相关实体。

## 意图类型
- scheduling: 排产相关，如"帮我排产美国方向的货柜"、"智能排柜"等
- data_query: 数据查询相关，如"查询本周到港的货柜"、"统计本月的滞港费"等
- knowledge_query: 知识库查询相关，如"什么是滞港费"、"如何处理异常货柜"等
- report_generation: 报表生成相关，如"生成本月的货柜报表"、"导出美国方向的排产计划"等
- help: 帮助相关，如"如何使用系统"、"帮助"等
- info: 信息相关，如"系统状态"、"版本信息"等
- error: 错误相关，如"系统报错"、"无法登录"等
- unknown: 未知意图

## 实体提取
对于 scheduling 意图，提取：
- country: 国家/地区
- startDate: 开始日期
- endDate: 结束日期
- containerNumber: 货柜号

对于 data_query 意图，提取：
- queryType: 查询类型（如统计、列表、详情等）
- filters: 过滤条件（如日期范围、国家、状态等）
- metrics: 指标（如数量、金额、时长等）

对于 report_generation 意图，提取：
- reportType: 报表类型
- timeRange: 时间范围
- filters: 过滤条件

## 返回格式
请以 JSON 格式返回，包含以下字段：
- intent: 意图类型
- confidence: 置信度（0-1）
- entities: 提取的实体（如果有）
- metadata: 其他元数据（如果有）

示例：
{
  "intent": "scheduling",
  "confidence": 0.95,
  "entities": {
    "country": "US",
    "startDate": "2026-03-01",
    "endDate": "2026-03-31"
  }
}
`;

      const userPrompt = `分析以下文本的意图：
"${text}"

请按要求返回 JSON 格式的结果。`;

      // 调用 AI 模型
      const result = await this.adapter.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      if (!result.success || !result.result) {
        logger.warn('[IntentDetector] Failed to detect intent:', result.error);
        return {
          intent: IntentType.UNKNOWN,
          confidence: 0.0
        };
      }

      // 解析结果
      let detectionResult: IntentDetectionResult;
      try {
        // 清理结果，确保只包含 JSON
        const cleanedResult = result.result
          .toString()
          .trim()
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*$/gm, '')
          .trim();

        detectionResult = JSON.parse(cleanedResult);
      } catch (parseError) {
        logger.warn('[IntentDetector] Failed to parse intent detection result:', parseError);
        return {
          intent: IntentType.UNKNOWN,
          confidence: 0.0
        };
      }

      // 验证结果
      if (!detectionResult.intent || !detectionResult.confidence) {
        return {
          intent: IntentType.UNKNOWN,
          confidence: 0.0
        };
      }

      logger.info(`[IntentDetector] Detected intent: ${detectionResult.intent} (confidence: ${detectionResult.confidence})`);
      return detectionResult;
    } catch (error: any) {
      logger.error('[IntentDetector] Error detecting intent:', error);
      return {
        intent: IntentType.UNKNOWN,
        confidence: 0.0
      };
    }
  }

  /**
   * 批量检测意图
   */
  async batchDetectIntent(texts: string[]): Promise<IntentDetectionResult[]> {
    const results: IntentDetectionResult[] = [];

    for (const text of texts) {
      const result = await this.detectIntent(text);
      results.push(result);
    }

    return results;
  }

  /**
   * 增强意图检测（使用上下文）
   */
  async detectIntentWithContext(text: string, context?: Record<string, any>): Promise<IntentDetectionResult> {
    // 构建包含上下文的提示
    const contextStr = context ? JSON.stringify(context) : '{}';
    const enhancedText = `Context: ${contextStr}\n\nUser input: ${text}`;

    return this.detectIntent(enhancedText);
  }
}

/**
 * 默认意图检测器实例
 */
export const intentDetector = new IntentDetector();
