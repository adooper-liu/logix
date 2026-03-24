/**
 * 代码搜索工具
 * 提供在项目中搜索代码的能力
 */

import fs from 'fs';
import path from 'path';

function resolveProjectRoot(): string {
  if (process.env.LOGIX_PROJECT_ROOT != null && process.env.LOGIX_PROJECT_ROOT !== '') {
    return path.resolve(process.env.LOGIX_PROJECT_ROOT);
  }
  const cwd = process.cwd();
  return path.basename(cwd) === 'backend' ? path.resolve(cwd, '..') : cwd;
}

const PROJECT_ROOT = resolveProjectRoot();

/**
 * 允许搜索的目录
 */
const ALLOWED_SEARCH_DIRS = [
  path.join(PROJECT_ROOT, 'backend/src'),
  path.join(PROJECT_ROOT, 'frontend/src'),
  path.join(PROJECT_ROOT, 'shared'),
];

/**
 * 忽略的文件/目录
 */
const IGNORE_PATTERNS = [
  'node_modules',
  'dist',
  'build',
  '.git',
  '.cache',
  'coverage',
  '.next',
  'logs',
];

/**
 * 搜索目录中的文件
 */
function searchFiles(dir: string, pattern: RegExp, results: string[], maxResults: number = 50): boolean {
  if (results.length >= maxResults) return true;

  if (!fs.existsSync(dir)) return false;

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    if (results.length >= maxResults) break;

    const fullPath = path.join(dir, item.name);

    // 跳过忽略的目录
    if (item.isDirectory()) {
      if (IGNORE_PATTERNS.includes(item.name)) continue;
      searchFiles(fullPath, pattern, results, maxResults);
    } else if (item.isFile()) {
      // 只搜索代码文件
      const ext = path.extname(item.name).toLowerCase();
      const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.json', '.md', '.sql'];

      if (codeExtensions.includes(ext)) {
        if (pattern.test(item.name) || pattern.test(fullPath)) {
          results.push(fullPath);
        }
      }
    }
  }

  return results.length >= maxResults;
}

/**
 * 在文件中搜索内容
 */
function searchInFile(filePath: string, pattern: RegExp, maxMatches: number = 10): string[] {
  const matches: string[] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length && matches.length < maxMatches; i++) {
      if (pattern.test(lines[i])) {
        const lineNum = String(i + 1).padStart(4, ' ');
        matches.push(`${lineNum}: ${lines[i].trim()}`);
      }
    }
  } catch {
    // 忽略读取错误
  }

  return matches;
}

/**
 * 代码搜索工具
 */
export const searchTool = {
  definition: {
    name: 'search_code',
    description: '在项目代码中搜索内容。支持搜索文件名、文件路径、或文件内容中的关键词。',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: '搜索模式，可以是简单的关键词或正则表达式'
        },
        path: {
          type: 'string',
          description: '搜索路径（可选），默认搜索整个项目，例如：backend/src/services',
          default: 'backend/src'
        },
        type: {
          type: 'string',
          description: '搜索类型：file（文件名）、content（文件内容）、all（默认）',
          default: 'all'
        },
        maxResults: {
          type: 'number',
          description: '最大返回结果数，默认 30',
          default: 30
        }
      },
      required: ['pattern']
    }
  },

  /**
   * 执行代码搜索
   */
  async execute(args: {
    pattern: string;
    path?: string;
    type?: string;
    maxResults?: number;
  }): Promise<string> {
    const {
      pattern,
      path: searchPath = 'backend/src',
      type = 'all',
      maxResults = 30
    } = args;

    // 安全检查
    if (pattern.includes('..') || searchPath.includes('..')) {
      throw new Error('不允许使用路径遍历符号');
    }

    // 解析搜索目录
    let searchDir: string;
    if (path.isAbsolute(searchPath)) {
      searchDir = searchPath;
    } else {
      searchDir = path.join(PROJECT_ROOT, searchPath);
    }

    // 验证目录在允许范围内
    let isAllowed = false;
    for (const allowedDir of ALLOWED_SEARCH_DIRS) {
      if (searchDir.startsWith(path.resolve(allowedDir))) {
        isAllowed = true;
        break;
      }
    }

    if (!isAllowed) {
      // 尝试相对于项目根目录
      searchDir = path.join(PROJECT_ROOT, searchPath);
      isAllowed = ALLOWED_SEARCH_DIRS.some(dir => searchDir.startsWith(path.resolve(dir)));

      if (!isAllowed) {
        throw new Error(`搜索路径不在允许的目录内：${searchPath}`);
      }
    }

    if (!fs.existsSync(searchDir)) {
      throw new Error(`搜索目录不存在：${searchPath}`);
    }

    // 将搜索模式转换为正则表达式
    let regex: RegExp;
    try {
      regex = new RegExp(pattern, 'i'); // 不区分大小写
    } catch {
      // 如果不是有效正则，则作为普通字符串搜索
      regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    const results: string[] = [];
    const fileResults: Map<string, string[]> = new Map();

    // 搜索文件名
    if (type === 'file' || type === 'all') {
      searchFiles(searchDir, regex, results, maxResults);
    }

    // 搜索文件内容
    if (type === 'content' || type === 'all') {
      // 先找到所有匹配的文件
      const matchedFiles: string[] = [];
      searchFiles(searchDir, regex, matchedFiles, 100);

      // 然后在每个文件中搜索内容
      for (const file of matchedFiles) {
        if (results.length >= maxResults) break;

        const matches = searchInFile(file, regex, 5);
        if (matches.length > 0) {
          fileResults.set(file, matches);
        }
      }
    }

    // 构建结果
    let result = `搜索: "${pattern}"\n`;
    result += `路径: ${searchPath}\n`;
    result += `类型: ${type}\n`;
    result += `---\n\n`;

    if (type === 'content' || type === 'all') {
      if (fileResults.size > 0) {
        result += `找到 ${fileResults.size} 个匹配的文件:\n\n`;

        for (const [file, matches] of fileResults) {
          const relativePath = file.replace(PROJECT_ROOT + path.sep, '');
          result += `📄 ${relativePath}\n`;
          for (const match of matches) {
            result += `  ${match}\n`;
          }
          result += '\n';
        }
      } else {
        result += '未找到匹配的内容\n';
      }
    } else {
      if (results.length > 0) {
        result += `找到 ${results.length} 个匹配的文件:\n\n`;
        for (const file of results.slice(0, maxResults)) {
          const relativePath = file.replace(PROJECT_ROOT + path.sep, '');
          result += `📄 ${relativePath}\n`;
        }
      } else {
        result += '未找到匹配的文件\n';
      }
    }

    if (type === 'all' && results.length > maxResults) {
      result += `\n... (还有 ${results.length - maxResults} 个结果)`;
    }

    return result;
  }
};
