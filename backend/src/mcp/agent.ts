/**
 * MCP 集成到小乐 AI 服务
 * MCP Integration for XiaoLe AI Assistant
 *
 * 当小乐需要查询代码、文件等内容时，自动调用 MCP 工具
 */

import { fileTool } from './tools/fileTool.js';
import { searchTool } from './tools/searchTool.js';
import { databaseTool } from './tools/databaseTool.js';
import { mcpLogger } from './logger.js';

/**
 * MCP 工具调用结果
 */
export interface MCPToolResult {
  success: boolean;
  toolName: string;
  result: string;
  error?: string;
}

/**
 * 需要调用 MCP 工具的意图模式
 */
const MCP_INTENT_PATTERNS = {
  // 读取文件
  read_file: [
    '查看代码',
    '读取文件',
    '打开文件',
    '显示代码',
    '看看这个文件',
    '文件内容',
  ],
  // 搜索代码
  search_code: [
    '搜索代码',
    '查找',
    '找找',
    '哪里有',
    '哪些文件',
    '搜索',
  ],
  // 数据库查询 - 扩展触发词
  query_database: [
    '数据库',
    '表结构',
    '表有哪些',
    '有哪些表',
    '查询',     // 添加：查询xxx
    '查询数据', // 添加
    '列出',     // 添加：列出xxx
    '显示',     // 添加：显示xxx
    '获取',     // 添加：获取xxx
  ]
};

/**
 * 解析用户消息，提取工具调用参数
 */
function parseToolArguments(message: string, intent: string): any {
  const result: any = {};
  
  // 尝试提取文件路径
  // 匹配常见的路径格式：backend/src/... 或 frontend/src/... 或相对路径
  const pathPattern = /(?:在|找|查看|读取)?\s*([a-zA-Z]:[/\\])?[\w./\\-]+\.(ts|js|vue|md|sql|json)(?:\b|$|\?)/gi;
  const pathMatch = message.match(pathPattern);
  
  if (pathMatch) {
    result.filePath = pathMatch[0];
  }
  
  // 提取搜索关键词
  if (intent === 'search_code') {
    // 移除意图相关的词语，提取关键词
    let keyword = message;
    for (const pattern of MCP_INTENT_PATTERNS.search_code) {
      keyword = keyword.replace(new RegExp(pattern, 'gi'), '');
    }
    result.pattern = keyword.trim();
  }
  
  // 提取 SQL 或表名
  if (intent === 'query_database') {
    // 优先检查是否直接包含完整SQL（以SELECT开头）
    const selectMatch = message.match(/\b(SELECT\s+.+)/is);
    if (selectMatch) {
      result.sql = selectMatch[1].trim();
      // 检查是否包含LIMIT，没有则添加
      if (!result.sql.toUpperCase().includes('LIMIT')) {
        result.sql += ' LIMIT 100';
      }
    }
    // 检查是否是表结构查询
    else if (message.includes('表结构') || message.includes('有哪些表') || message.includes('所有表')) {
      result.showSchema = true;
      result.sql = 'SHOW TABLES';
    } else {
      // 智能解析：从自然语言生成SQL
      // 表名映射
      const tableMapping: Record<string, string> = {
        '货柜': 'biz_containers',
        '集装箱': 'biz_containers',
        'container': 'biz_containers',
        '备货单': 'biz_replenishment_orders',
        '订单': 'biz_replenishment_orders',
        '海运': 'process_sea_freight',
        '船运': 'process_sea_freight',
        '港口': 'process_port_operations',
        '拖卡': 'process_trucking_transport',
        '仓库': 'process_warehouse_operations',
        '还箱': 'process_empty_return',
        '滞港费': 'container_charges'
      };
      
      let tableName = 'biz_containers'; // 默认查货柜表
      for (const [key, table] of Object.entries(tableMapping)) {
        if (message.includes(key)) {
          tableName = table;
          break;
        }
      }
      
      // 提取数量限制
      const limitMatch = message.match(/前(\d+)条|前(\d+)条|(\d+)条/i);
      const limit = limitMatch ? (limitMatch[1] || limitMatch[2] || limitMatch[3]) : '10';
      
      // 提取字段（如果有）
      const fieldMapping: Record<string, string[]> = {
        '货柜': ['container_number', 'bill_of_lading_number', 'container_type_code', 'logistics_status'],
        '备货单': ['order_number', 'customer_name', 'sell_to_country', 'total_boxes', 'total_cbm']
      };
      
      const fields = fieldMapping[Object.keys(tableMapping).find(k => message.includes(k)) || '货柜'] || ['*'];
      result.sql = `SELECT ${fields.join(', ')} FROM ${tableName} LIMIT ${limit}`;
    }
  }
  
  return result;
}

/**
 * 检测用户消息是否需要调用 MCP 工具
 */
function detectMCPTool(message: string): string | null {
  const lowerMessage = message.toLowerCase();
  const trimmedMessage = message.trim().toLowerCase();
  
  // 调试日志
  mcpLogger.debug('detectMCPTool input', { 
    message: trimmedMessage, 
    length: trimmedMessage.length 
  });
  
  // 检测文件读取意图
  for (const pattern of MCP_INTENT_PATTERNS.read_file) {
    if (lowerMessage.includes(pattern.toLowerCase())) {
      // 检查是否提到了具体文件（支持多种匹配方式）
      // 支持：以.ts结尾、或包含 .ts 等文件路径
      if (/\.(ts|js|vue|md|sql|json)/i.test(message)) {
        return 'read_file';
      }
    }
  }
  
  // 检测代码搜索意图
  for (const pattern of MCP_INTENT_PATTERNS.search_code) {
    if (lowerMessage.includes(pattern.toLowerCase())) {
      return 'search_code';
    }
  }
  
  // 检测数据库查询意图 - 简化逻辑
  // 直接检查关键词
  const normalizedMessage = lowerMessage;
  
  // 检查是否包含"查询"相关词
  const hasQueryWord = normalizedMessage.includes('查询') || normalizedMessage.includes('select');
  
  // 检查是否包含业务相关词
  const hasBusinessWord = 
    normalizedMessage.includes('货柜') || 
    normalizedMessage.includes('container') || 
    normalizedMessage.includes('备货单') || 
    normalizedMessage.includes('订单') || 
    normalizedMessage.includes('海运') ||
    normalizedMessage.includes('船运') ||
    normalizedMessage.includes('仓库') ||
    normalizedMessage.includes('港口') ||
    normalizedMessage.includes('滞港费');
  
  mcpLogger.debug('Keyword check', { hasQueryWord, hasBusinessWord, message: normalizedMessage });
  
  if (hasQueryWord && hasBusinessWord) {
    mcpLogger.info('MCP TRIGGERED: query_database for message: ' + normalizedMessage);
    return 'query_database';
  }
  
  // 原有模式匹配作为后备
  for (const pattern of MCP_INTENT_PATTERNS.query_database) {
    if (message.includes(pattern.toLowerCase())) {
      mcpLogger.debug('MCP detected: query_database via pattern match');
      return 'query_database';
    }
  }

  // 检测直接SQL查询（以SELECT开头）
  if (/\bSELECT\b/i.test(message)) {
    mcpLogger.debug('MCP detected: query_database via SELECT keyword');
    return 'query_database';
  }

  mcpLogger.debug('MCP not detected for message');
  return null;
}

/**
 * 调用 MCP 工具
 */
async function callMCPTool(toolName: string, args: any): Promise<MCPToolResult> {
  mcpLogger.info('Calling MCP tool', { toolName, args });
  
  try {
    let result: string;
    
    switch (toolName) {
      case 'read_file':
        result = await fileTool.execute(args);
        break;
        
      case 'search_code':
        result = await searchTool.execute(args);
        break;
        
      case 'query_database':
        result = await databaseTool.execute(args);
        break;
        
      default:
        return {
          success: false,
          toolName,
          result: '',
          error: `Unknown tool: ${toolName}`
        };
    }
    
    mcpLogger.info('MCP tool executed successfully', { toolName });
    
    return {
      success: true,
      toolName,
      result
    };
  } catch (error: any) {
    mcpLogger.error('MCP tool execution failed', { toolName, error: error.message });
    
    return {
      success: false,
      toolName,
      result: '',
      error: error.message
    };
  }
}

/**
 * 小乐 MCP 集成服务
 */
export const mcpAgent = {
  /**
   * 处理用户消息，自动调用 MCP 工具
   * 返回 null 表示不需要调用工具，否则返回工具调用结果
   */
  async processMessage(message: string): Promise<MCPToolResult | null> {
    // 检测是否需要调用 MCP 工具
    const toolName = detectMCPTool(message);
    
    if (!toolName) {
      mcpLogger.debug('No MCP tool needed for this message');
      return null;
    }
    
    mcpLogger.info('MCP tool detected', { toolName, message });
    
    // 解析工具参数
    const args = parseToolArguments(message, toolName);
    
    // 调用工具
    const result = await callMCPTool(toolName, args);
    
    return result;
  },
  
  /**
   * 获取可用的 MCP 工具列表（供 AI 了解能力）
   */
  getAvailableTools(): any[] {
    return [
      fileTool.definition,
      searchTool.definition,
      databaseTool.definition
    ];
  }
};
