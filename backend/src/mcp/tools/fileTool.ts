/**
 * 文件读取工具
 * 提供读取项目文件的能力
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 项目根目录
const PROJECT_ROOT = path.resolve(__dirname, '../../../..');

/**
 * 允许访问的目录
 */
const ALLOWED_DIRS = [
  PROJECT_ROOT,
  path.join(PROJECT_ROOT, 'backend'),
  path.join(PROJECT_ROOT, 'frontend'),
  path.join(PROJECT_ROOT, 'shared'),
];

/**
 * 检查路径是否在允许的目录内
 */
function isPathAllowed(filePath: string): boolean {
  const resolvedPath = path.resolve(filePath);
  
  for (const allowedDir of ALLOWED_DIRS) {
    if (resolvedPath.startsWith(path.resolve(allowedDir))) {
      return true;
    }
  }
  
  return false;
}

/**
 * 读取文件工具
 */
export const fileTool = {
  definition: {
    name: 'read_file',
    description: '读取项目文件内容。安全限制：只能读取 backend/、frontend/、shared/ 目录下的文件，不能读取配置中的敏感信息。',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { 
          type: 'string', 
          description: '要读取的文件路径，例如：backend/src/services/container.service.ts 或 frontend/src/views/Shipments.vue'
        },
        limit: {
          type: 'number',
          description: '限制返回的行数（可选），默认返回全部',
          default: 500
        },
        offset: {
          type: 'number',
          description: '从第几行开始读取（可选），默认从第1行开始',
          default: 0
        }
      },
      required: ['filePath']
    }
  },

  /**
   * 执行文件读取
   */
  async execute(args: { filePath: string; limit?: number; offset?: number }): Promise<string> {
    const { filePath, limit = 500, offset = 0 } = args;
    
    // 安全检查：防止路径遍历攻击
    if (filePath.includes('..')) {
      throw new Error('不允许使用路径遍历符号 (..)');
    }
    
    // 检查是否在允许的目录内
    if (!isPathAllowed(filePath)) {
      throw new Error(`路径不在允许的目录内：${filePath}`);
    }
    
    // 解析完整路径
    let fullPath: string;
    if (path.isAbsolute(filePath)) {
      fullPath = filePath;
    } else {
      // 相对路径相对于项目根目录
      fullPath = path.join(PROJECT_ROOT, filePath);
    }
    
    // 检查文件是否存在
    if (!fs.existsSync(fullPath)) {
      throw new Error(`文件不存在：${filePath}`);
    }
    
    // 检查是否是文件
    const stats = fs.statSync(fullPath);
    if (!stats.isFile()) {
      throw new Error(`不是文件：${filePath}`);
    }
    
    // 限制文件大小（最大 1MB）
    if (stats.size > 1024 * 1024) {
      throw new Error(`文件太大（${(stats.size / 1024 / 1024).toFixed(2)}MB），最大支持 1MB`);
    }
    
    // 读取文件内容
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    
    // 返回指定范围的行
    const startLine = offset;
    const endLine = Math.min(offset + limit, lines.length);
    const selectedLines = lines.slice(startLine, endLine);
    
    let result = `文件: ${filePath}\n`;
    result += `总行数: ${lines.length}\n`;
    result += `显示行数: ${startLine + 1} - ${endLine}\n`;
    result += `---\n`;
    result += selectedLines.join('\n');
    
    if (endLine < lines.length) {
      result += `\n... (还有 ${lines.length - endLine} 行)`;
    }
    
    return result;
  }
};
