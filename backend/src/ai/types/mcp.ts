/**
 * MCP (Model Context Protocol) 类型定义
 * 用于定义AI工具的接口和数据结构
 */

/**
 * 工具执行参数
 */
export interface ToolParams {
  [key: string]: any;
}

/**
 * 工具执行结果
 */
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime?: number;
}

/**
 * 工具元数据
 */
export interface ToolMetadata {
  name: string;
  description: string;
  parameters: {
    name: string;
    type: string;
    description: string;
    required: boolean;
  }[];
  category: 'read' | 'write' | 'execute';
  permissions: string[];
}

/**
 * MCP工具接口
 */
export interface MCPTool {
  metadata: ToolMetadata;
  execute(params: ToolParams): Promise<ToolResult>;
}

/**
 * MCP工具执行上下文
 */
export interface MCPContext {
  userId?: string;
  userRole?: string;
  timestamp: Date;
  requestId: string;
}

/**
 * MCP执行日志
 */
export interface MCPLog {
  id: string;
  toolName: string;
  params: ToolParams;
  result: ToolResult;
  context: MCPContext;
  timestamp: Date;
  executionTime: number;
}

/**
 * MCP工具管理器配置
 */
export interface MCPConfig {
  enableWriteTools: boolean;
  enableExecuteTools: boolean;
  defaultPermissions: string[];
  logEnabled: boolean;
}
