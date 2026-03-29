#!/usr/bin/env node

/**
 * LogiX 开发范式自动检查工具 - JavaScript 包装器
 *
 * 使用方法:
 *   node scripts/dev-paradigm-check.js [options]
 *   npm run check -- --phase architecture
 */

const { execSync } = require("child_process");
const path = require("path");

// 获取命令行参数
const args = process.argv.slice(2);

// 构建 ts-node 命令，使用项目 tsconfig
const tsNodeCmd = [
  "ts-node",
  "-P",
  path.join(__dirname, "tsconfig.json"),
  path.join(__dirname, "dev-paradigm-check.ts"),
  ...args,
].join(" ");

try {
  // 先尝试本地执行
  execSync(tsNodeCmd, {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  });
  process.exit(0);
} catch (error) {
  // 失败时使用 npx
  try {
    const npxCmd = [
      "npx",
      "ts-node",
      "-P",
      path.join(__dirname, "tsconfig.json"),
      path.join(__dirname, "dev-paradigm-check.ts"),
      ...args,
    ].join(" ");

    execSync(npxCmd, {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });
    process.exit(0);
  } catch (npxError) {
    console.error("\n❌ 检查执行失败\n");
    console.error("请确保已安装依赖：");
    console.error("  npm install\n");
    console.error("或者直接使用：");
    console.error("  npm run check -- --phase architecture\n");
    process.exit(1);
  }
}
