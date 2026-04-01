/**
 * MCP 服务器入口
 * Model Context Protocol Server for LogiX
 *
 * 提供只读工具：小乐可以通过这些工具查询项目信息
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ServerCapabilities
} from '@modelcontextprotocol/sdk/types.js';
import { fileTool } from './tools/fileTool.js';
import { searchTool } from './tools/searchTool.js';
import { databaseTool } from './tools/databaseTool.js';
import { mcpLogger } from './logger.js';

/**
 * MCP 服务器配置
 */
const SERVER_CONFIG = {
  name: 'logix-mcp-server',
  version: '1.0.0',
  description: 'LogiX 项目的 MCP 工具服务器，提供只读操作能力'
};

/**
 * LogiX MCP 服务器类
 */
class LogixMCPServer {
  private server: Server;
  private tools: Map<string, any> = new Map();

  constructor() {
    // 初始化服务器
    const capabilities: ServerCapabilities = {
      tools: {}
    };

    this.server = new Server(SERVER_CONFIG as any, capabilities as any);

    // 注册所有工具
    this.registerTools();

    // 设置请求处理器
    this.setupHandlers();
  }

  /**
   * 注册所有可用工具
   */
  private registerTools() {
    // 文件读取工具
    this.tools.set('read_file', fileTool);
    // 代码搜索工具
    this.tools.set('search_code', searchTool);
    // 数据库查询工具
    this.tools.set('query_database', databaseTool);

    mcpLogger.info('MCP tools registered', {
      toolCount: this.tools.size,
      tools: Array.from(this.tools.keys())
    });
  }

  /**
   * 设置请求处理器
   */
  private setupHandlers() {
    // 列出所有可用工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const toolDefinitions = Array.from(this.tools.values()).map((tool) => tool.definition);

      mcpLogger.info('List tools requested', { toolCount: toolDefinitions.length });

      return {
        tools: toolDefinitions
      };
    });

    // 调用工具
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      mcpLogger.info('Tool called', {
        toolName: name,
        args: JSON.stringify(args).substring(0, 200)
      });

      const tool = this.tools.get(name);

      if (!tool) {
        const error = `Unknown tool: ${name}`;
        mcpLogger.error(error);
        return {
          content: [{ type: 'text', text: `Error: ${error}` }],
          isError: true
        };
      }

      try {
        // 执行工具并记录结果
        const result = await tool.execute(args);

        mcpLogger.info('Tool executed successfully', {
          toolName: name,
          resultLength: typeof result === 'string' ? result.length : 0
        });

        return {
          content: [{ type: 'text', text: result }]
        };
      } catch (error: any) {
        mcpLogger.error('Tool execution failed', {
          toolName: name,
          error: error.message
        });

        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true
        };
      }
    });
  }

  /**
   * 启动 MCP 服务器
   */
  async start() {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      mcpLogger.info('MCP Server started', SERVER_CONFIG);

      // 保持进程运行
      process.on('SIGINT', () => {
        mcpLogger.info('MCP Server shutting down');
        process.exit(0);
      });
    } catch (error: any) {
      mcpLogger.error('Failed to start MCP Server', { error: error.message });
      process.exit(1);
    }
  }
}

// 导出用于集成的实例
export const mcpServer = new LogixMCPServer();

// 独立运行：设置 MCP_STANDALONE=1 后执行 node 编译产物入口
if (process.env.MCP_STANDALONE === '1') {
  void mcpServer.start();
}
