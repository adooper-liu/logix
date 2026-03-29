#!/usr/bin/env node

/**
 * LogiX 开发范式自动检查工具 - JavaScript 包装器
 * 
 * 这个脚本是为了避免 ts-node 的模块加载问题
 * 
 * 使用方法:
 *   node scripts/dev-paradigm-check.js [options]
 * 
 * 或者:
 *   npm run check -- --phase architecture
 */

const { execSync } = require('child_process');
const path = require('path');

// 获取命令行参数
const args = process.argv.slice(2);

// 构建 ts-node 命令，使用 CommonJS 模式
const tsNodeCmd = [
  'ts-node',
  '--compilerOptions \'{"module":"commonjs"}\'',
  path.join(__dirname, 'dev-paradigm-check.ts'),
  ...args
].join(' ');

try {
  // 先尝试使用本地安装的 ts-node
  const result = execSync(tsNodeCmd, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  process.exit(0);
} catch (error) {
  // 如果失败，尝试使用 npx
  try {
    const npxCmd = [
      'npx',
      'ts-node',
      '--compilerOptions \'{"module":"commonjs"}\'',
      path.join(__dirname, 'dev-paradigm-check.ts'),
      ...args
    ].join(' ');
    
    execSync(npxCmd, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    process.exit(0);
  } catch (npxError) {
    console.error('\n❌ 检查执行失败\n');
    console.error('请确保已安装依赖：');
    console.error('  npm install -g ts-node typescript\n');
    console.error('或者使用 npx 运行：');
    console.error('  npx ts-node --compilerOptions \'{"module":"commonjs"}\' scripts/dev-paradigm-check.ts --phase architecture\n');
    process.exit(1);
  }
}
