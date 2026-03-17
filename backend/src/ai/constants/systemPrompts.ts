/**
 * AI 系统 Prompt 模板
 * System Prompt Templates for AI Controller
 */

/**
 * 构建系统 Prompt
 */
export function buildSystemPrompt(params: {
  schemaDescription: string;
  knowledgeContext: string;
  sqlResult?: { sql: string; rowCount: number; truncated: boolean; data: any[] };
  mcpToolResult?: { toolName: string; success: boolean; result: string; error?: string };
  scheduleResult?: { success: boolean; total: number; successCount: number; failedCount: number; results: any[] };
}): string {
  const { schemaDescription, knowledgeContext, sqlResult, mcpToolResult, scheduleResult } = params;

  let prompt = `你是 LogiX 物流系统的智能助手。你可以帮助用户：
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
`;

  // SQL结果
  if (sqlResult) {
    prompt += `
## 查询结果
SQL: ${sqlResult.sql}
结果数量: ${sqlResult.rowCount} 条
${sqlResult.truncated ? '(仅显示前5条)' : ''}
数据: ${JSON.stringify(sqlResult.data, null, 2)}
`;
  }

  // MCP工具结果
  if (mcpToolResult) {
    const toolTitle = mcpToolResult.toolName === 'read_file' 
      ? '文件内容' 
      : mcpToolResult.toolName === 'search_code' 
        ? '代码搜索结果' 
        : '数据库查询';
    
    prompt += `
## ${toolTitle}
${mcpToolResult.success ? mcpToolResult.result : `调用失败: ${mcpToolResult.error}`}
`;
  }

  // 排产结果
  if (scheduleResult) {
    prompt += `
## 排产结果
排产状态: ${scheduleResult.success ? '成功' : '失败'}
总计: ${scheduleResult.total} 个货柜
成功: ${scheduleResult.successCount} 个
失败: ${scheduleResult.failedCount} 个
排产详情: ${JSON.stringify(scheduleResult.results, null, 2)}
`;
  }

  prompt += `\n请用中文回答问题。如果查询到数据，请用表格或列表形式展示结果。`;

  return prompt;
}
