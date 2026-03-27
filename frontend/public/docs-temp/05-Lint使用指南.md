# LogiX 项目代码规范与 Lint 指南

## 📋 概述

LogiX 项目使用统一的代码规范和 Lint 工具，确保代码质量、风格一致性和可维护性。

## 🛠️ 工具配置

### 1. Backend (TypeScript)

**配置文件**:
- `backend/.eslintrc.js` - ESLint 配置
- `backend/.prettierrc.json` - Prettier 配置

**主要规则**:
- ✅ 使用 TypeScript 类型检查
- ✅ 强制 2 空格缩进
- ✅ 单引号
- ✅ 分号结尾
- ✅ 最大行宽 120 字符
- ✅ 禁止 `console.log` (允许 console.warn/error)
- ✅ 禁止 `debugger`
- ✅ 强制使用 `const` 而非 `var`
- ✅ 箭头函数优先

### 2. Frontend (Vue 3 + TypeScript)

**配置文件**:
- `frontend/.eslintrc.cjs` - ESLint 配置
- `frontend/.prettierrc.json` - Prettier 配置

**主要规则**:
- ✅ Vue 3 最佳实践
- ✅ TypeScript 类型检查
- ✅ 强制 2 空格缩进
- ✅ 单引号
- ✅ 无分号 (Vue 风格)
- ✅ 最大行宽 100 字符
- ✅ Vue 组件命名建议

### 3. Markdown 文档

**配置文件**:
- `.markdownlint.json` - Markdown Lint 配置
- `.prettierignore` - 忽略文件列表

**主要规则**:
- ✅ 表格格式规范
- ✅ 代码块周围空行
- ✅ 链接格式
- ✅ 标题层级
- ✅ 最大行宽 200 字符

## 🚀 使用方法

### 项目根目录命令

```bash
# 运行所有 Lint 检查
npm run lint

# 自动修复所有 Lint 错误
npm run lint:fix

# 格式化所有代码
npm run format

# 运行类型检查
npm run type-check

# 完整验证 (类型检查 + Lint)
npm run validate
```

### Backend 专用命令

```bash
cd backend

# Lint 检查
npm run lint

# 自动修复
npm run lint -- --fix

# 格式化
npm run format

# 类型检查
npm run type-check
```

### Frontend 专用命令

```bash
cd frontend

# Lint 检查
npm run lint

# 自动修复
npm run lint -- --fix

# 格式化
npm run format

# 类型检查
npm run type-check
```

### Markdown 文档专用命令

```bash
# Lint 检查
npm run lint:md

# 自动修复
npm run lint:fix:md
```

## 📝 编辑器配置

### VSCode

安装推荐扩展:
- ESLint
- Prettier - Code formatter
- Vetur 或 Volar (Vue)
- TypeScript Vue Plugin (Volar)

创建 `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": [
    "javascript",
    "typescript",
    "vue"
  ],
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### WebStorm / IntelliJ IDEA

内置支持 ESLint 和 Prettier:
1. 设置 → Languages & Frameworks → JavaScript → Code Quality Tools
2. 启用 ESLint
3. 启用 Prettier
4. 设置 Prettier 为默认格式化工具

## ⚙️ CI/CD 集成

### GitHub Actions 示例

```yaml
name: Lint

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run type check
        run: npm run type-check

      - name: Run lint
        run: npm run lint

      - name: Check formatting
        run: npx prettier --check "**/*.{ts,tsx,js,jsx,vue}"
```

## 🎯 最佳实践

### 1. 提交前检查

```bash
# 1. 运行类型检查
npm run type-check

# 2. 运行 Lint 并自动修复
npm run lint:fix

# 3. 格式化代码
npm run format

# 4. 运行测试 (如果有)
npm test
```

### 2. Git Hooks (Husky)

```bash
# 安装 Husky
npm install -D husky lint-staged

# 配置 pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"
```

创建 `.lintstagedrc.json`:
```json
{
  "*.{ts,tsx,js,jsx,vue}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{md}": [
    "markdownlint-cli2 --fix"
  ]
}
```

### 3. VSCode 自动保存

配置 `.vscode/settings.json` 启用保存时自动格式化:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

## 🔧 常见问题

### Q1: Lint 报错太多怎么办?

**A**: 使用 `npm run lint:fix` 自动修复大部分错误。剩余的手动修复。

### Q2: Prettier 和 ESLint 冲突怎么办?

**A**: 将 Prettier 配置为优先级更高:
```js
// .eslintrc.js
{
  rules: {
    'indent': 'off',      // 关闭 ESLint 缩进规则
    'quotes': 'off',      // 关闭 ESLint 引号规则
    'semi': 'off'        // 关闭 ESLint 分号规则
  }
}
```

### Q3: 如何忽略某些文件?

**A**:
- `.prettierignore` - Prettier 忽略列表
- `.eslintignore` - ESLint 忽略列表
- `.markdownlint.json` 中的 `ignore` - Markdown Lint 忽略列表

### Q4: TypeScript 报错 "any" 类型?

**A**:
- 优先使用明确类型
- 必要时使用 `@ts-ignore` 并添加注释
- 配置规则为 `warn` 而非 `error`

## 📚 参考资源

- [ESLint 文档](https://eslint.org/docs/latest/)
- [Prettier 文档](https://prettier.io/docs/en/options.html)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [Vue ESLint](https://eslint.vuejs.org/)
- [Markdown Lint](https://github.com/DavidAnson/markdown-lint)

## ✅ 检查清单

提交代码前确保:
- [ ] 通过类型检查 (`npm run type-check`)
- [ ] 通过 Lint 检查 (`npm run lint`)
- [ ] 代码已格式化 (`npm run format`)
- [ ] Markdown 文档格式正确 (`npm run lint:md`)
- [ ] 测试通过 (如果有测试)
