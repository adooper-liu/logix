/**
 * MCP 日志记录器
 * 记录 MCP 服务器的所有操作
 */

import fs from 'fs';
import path from 'path';

// 日志目录（进程工作目录为 backend 时写入 backend/logs）
const LOG_DIR = path.resolve(process.cwd(), 'logs');

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LOG_FILE = path.join(LOG_DIR, `mcp-${new Date().toISOString().split('T')[0]}.log`);

/**
 * 写入日志到文件
 */
function writeLog(level: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  let logEntry = `[${timestamp}] [${level}] ${message}`;

  if (data) {
    try {
      logEntry += ` ${JSON.stringify(data)}`;
    } catch {
      logEntry += ` [无法序列化的数据]`;
    }
  }

  logEntry += '\n';

  // 写入文件
  fs.appendFileSync(LOG_FILE, logEntry);

  // 同时输出到控制台（开发环境）
  if (process.env.NODE_ENV !== 'production') {
    console.log(logEntry.trim());
  }
}

export const mcpLogger = {
  info: (message: string, data?: any) => {
    writeLog('INFO', message, data);
  },

  warn: (message: string, data?: any) => {
    writeLog('WARN', message, data);
  },

  error: (message: string, data?: any) => {
    writeLog('ERROR', message, data);
  },

  debug: (message: string, data?: any) => {
    if (process.env.DEBUG === 'true') {
      writeLog('DEBUG', message, data);
    }
  }
};
