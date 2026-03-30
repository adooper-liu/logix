#!/usr/bin/env node

/**
 * SKILL 原则代码质量检查脚本
 * 
 * 功能：
 * 1. 检查文件行数（≤300 行）
 * 2. 检查方法行数（≤50 行）
 * 3. 检查 JSDoc 完整性
 * 4. 检查 TODO/FIXME 数量
 * 5. 生成质量报告
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  maxFileLines: 300,
  maxFunctionLines: 50,
  maxParameters: 4,
  maxNestingDepth: 3,
  minTestCoverage: 80,
  srcDir: path.join(__dirname, 'backend', 'src'),
  testDir: path.join(__dirname, 'backend', 'src')
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * 主函数
 */
async function main() {
  console.log(`${colors.cyan}================================${colors.reset}`);
  console.log(`${colors.cyan}SKILL 原则代码质量检查${colors.reset}`);
  console.log(`${colors.cyan}================================${colors.reset}\n`);

  const results = {
    files: [],
    errors: [],
    warnings: [],
    stats: {
      totalFiles: 0,
      passedFiles: 0,
      failedFiles: 0,
      totalLines: 0,
      averageLines: 0,
      jsdocCoverage: 0,
      todoCount: 0,
      fixmeCount: 0
    }
  };

  // 扫描服务文件
  const serviceFiles = scanDirectory(CONFIG.srcDir, /\.service\.ts$/);
  
  console.log(`${colors.blue}正在检查 ${serviceFiles.length} 个服务文件...${colors.reset}\n`);

  for (const file of serviceFiles) {
    const result = await checkFile(file);
    results.files.push(result);
    
    if (result.errors.length > 0 || result.warnings.length > 0) {
      results.failedFiles++;
    } else {
      results.passedFiles++;
    }
  }

  // 统计
  results.stats.totalFiles = serviceFiles.length;
  results.stats.averageLines = Math.round(
    results.files.reduce((sum, f) => sum + f.lines, 0) / results.files.length
  );
  
  // 生成报告
  printReport(results);
  
  // 退出码
  process.exit(results.failedFiles > 0 ? 1 : 0);
}

/**
 * 检查单个文件
 */
async function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const fileName = path.basename(filePath);
  
  const result = {
    file: filePath,
    fileName,
    lines: lines.length,
    functions: [],
    errors: [],
    warnings: [],
    jsdocCount: 0,
    todoCount: 0,
    fixmeCount: 0
  };

  // 检查 1: 文件行数
  if (lines.length > CONFIG.maxFileLines) {
    result.errors.push({
      rule: 'max-file-lines',
      message: `文件行数过多 (${lines.length} > ${CONFIG.maxFileLines})`,
      line: 1
    });
  }

  // 检查 2: 分析函数
  const functions = extractFunctions(content);
  result.functions = functions;
  
  for (const func of functions) {
    // 检查函数行数
    if (func.lines > CONFIG.maxFunctionLines) {
      result.errors.push({
        rule: 'max-function-lines',
        message: `函数 "${func.name}" 行数过多 (${func.lines} > ${CONFIG.maxFunctionLines})`,
        line: func.startLine
      });
    }
    
    // 检查参数数量
    if (func.parameters.length > CONFIG.maxParameters) {
      result.warnings.push({
        rule: 'max-parameters',
        message: `函数 "${func.name}" 参数过多 (${func.parameters.length} > ${CONFIG.maxParameters})`,
        line: func.startLine
      });
    }
    
    // 检查 JSDoc
    if (func.hasJSDoc) {
      result.jsdocCount++;
    } else if (func.isPublic) {
      result.warnings.push({
        rule: 'missing-jsdoc',
        message: `公共函数 "${func.name}" 缺少 JSDoc 注释`,
        line: func.startLine
      });
    }
  }

  // 检查 3: TODO/FIXME
  result.todoCount = (content.match(/\/\/\s*TODO/gi) || []).length;
  result.fixmeCount = (content.match(/\/\/\s*FIXME/gi) || []).length;
  
  if (result.todoCount > 5) {
    result.warnings.push({
      rule: 'too-many-todos',
      message: `TODO 注释过多 (${result.todoCount} > 5)`,
      line: 1
    });
  }
  
  if (result.fixmeCount > 0) {
    result.warnings.push({
      rule: 'has-fixme',
      message: `存在 FIXME 注释 (${result.fixmeCount} 个)`,
      line: 1
    });
  }

  return result;
}

/**
 * 提取函数信息
 */
function extractFunctions(content) {
  const functions = [];
  const lines = content.split('\n');
  
  // 简化的函数检测（实际应该用 AST 解析）
  const functionRegex = /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/gm;
  const methodRegex = /^(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*\w+)?\s*\{/gm;
  
  let match;
  while ((match = functionRegex.exec(content)) !== null) {
    const startLine = content.substring(0, match.index).split('\n').length;
    const endLine = findFunctionEnd(lines, startLine);
    
    functions.push({
      name: match[1],
      parameters: match[2].split(',').filter(p => p.trim()).length,
      lines: endLine - startLine,
      startLine,
      endLine,
      hasJSDoc: hasJSDoc(lines, startLine),
      isPublic: true
    });
  }
  
  return functions;
}

/**
 * 查找函数结束行
 */
function findFunctionEnd(lines, startLine) {
  let braceCount = 0;
  let inFunction = false;
  
  for (let i = startLine - 1; i < lines.length; i++) {
    const line = lines[i];
    
    for (const char of line) {
      if (char === '{') {
        braceCount++;
        inFunction = true;
      } else if (char === '}') {
        braceCount--;
      }
    }
    
    if (inFunction && braceCount === 0) {
      return i + 1;
    }
  }
  
  return lines.length;
}

/**
 * 检查是否有 JSDoc
 */
function hasJSDoc(lines, lineNum) {
  if (lineNum <= 1) return false;
  const prevLine = lines[lineNum - 2].trim();
  return prevLine.endsWith('*/') || prevLine.includes('@param');
}

/**
 * 扫描目录
 */
function scanDirectory(dir, pattern) {
  const files = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!item.startsWith('.') && item !== 'node_modules') {
          files.push(...scanDirectory(fullPath, pattern));
        }
      } else if (pattern.test(item)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dir}:`, error.message);
  }
  
  return files;
}

/**
 * 打印报告
 */
function printReport(results) {
  console.log(`${colors.cyan}================================${colors.reset}`);
  console.log(`${colors.cyan}检查结果${colors.reset}`);
  console.log(`${colors.cyan}================================${colors.reset}\n`);
  
  // 总体统计
  console.log(`${colors.blue}总体统计:${colors.reset}`);
  console.log(`  总文件数：${results.stats.totalFiles}`);
  console.log(`  ✅ 通过：${results.passedFiles}`);
  console.log(`  ❌ 失败：${results.failedFiles}`);
  console.log(`  平均行数：${results.stats.averageLines}`);
  console.log(`  TODO 数量：${results.stats.todoCount}`);
  console.log(`  FIXME 数量：${results.stats.fixmeCount}\n`);
  
  // 详细结果
  for (const fileResult of results.files) {
    console.log(`${colors.yellow}${fileResult.fileName}${colors.reset}`);
    console.log(`  行数：${fileResult.lines}`);
    console.log(`  函数数：${fileResult.functions.length}`);
    console.log(`  JSDoc: ${fileResult.jsdocCount}/${fileResult.functions.length}`);
    
    if (fileResult.errors.length > 0) {
      console.log(`  ${colors.red}错误:${colors.reset}`);
      for (const error of fileResult.errors) {
        console.log(`    - Line ${error.line}: ${error.message}`);
      }
    }
    
    if (fileResult.warnings.length > 0) {
      console.log(`  ${colors.yellow}警告:${colors.reset}`);
      for (const warning of fileResult.warnings) {
        console.log(`    - Line ${warning.line}: ${warning.message}`);
      }
    }
    
    console.log('');
  }
  
  // 最终结论
  console.log(`${colors.cyan}================================${colors.reset}`);
  if (results.failedFiles === 0) {
    console.log(`${colors.green}✅ 恭喜！所有文件都符合 SKILL 原则！${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ 发现 ${results.failedFiles} 个文件需要改进${colors.reset}`);
    console.log(`${colors.yellow}请根据上述报告进行重构优化${colors.reset}`);
  }
  console.log(`${colors.cyan}================================${colors.reset}\n`);
}

// 运行
main().catch(console.error);
