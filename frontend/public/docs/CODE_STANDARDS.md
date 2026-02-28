# LogiX 代码规范与 Lint 配置

## 📋 概述

LogiX 项目已配置完整的代码 Lint 和格式化工具，确保代码质量和风格一致性。

## 📁 配置文件清单

| 位置 | 文件 | 用途 |
|-------|------|------|
| 根目录 | `.markdownlint.json` | Markdown 文档 Lint 规则 |
| 根目录 | `.prettierignore` | Prettier 忽略文件列表 |
| 根目录 | `package.json` | Lint 和格式化脚本 |
| 根目录 | `LINT_GUIDE.md` | Lint 使用完整指南 |
| backend/ | `.eslintrc.js` | Backend ESLint 配置 |
| backend/ | `.prettierrc.json` | Backend Prettier 配置 |
| backend/ | `package.json` | Backend 脚本 |
| frontend/ | `.eslintrc.cjs` | Frontend ESLint 配置 |
| frontend/ | `.prettierrc.json` | Frontend Prettier 配置 |
| frontend/ | `package.json` | Frontend 脚本 |

## 🛠️ 工具版本

| 工具 | 版本 | 用途 |
|------|------|------|
| ESLint | ^8.56.0 | 代码检查 |
| Prettier | ^3.2.4 | 代码格式化 |
| TypeScript ESLint | ^6.19.0 | TypeScript 支持 |
| Vue ESLint Plugin | ^9.19.2 | Vue 3 支持 |
| Markdown Lint CLI2 | ^0.21.0 | Markdown 文档检查 |

## 🚀 快速开始

### 安装依赖

```bash
# 根目录（包含 Lint 配置）
npm install

# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### 运行 Lint

```bash
# 检查所有代码（推荐）
npm run lint

# 只检查 Backend
npm run lint:backend

# 只检查 Frontend
npm run lint:frontend

# 只检查 Markdown 文档
npm run lint:md
```

### 自动修复

```bash
# 修复所有 Lint 错误
npm run lint:fix

# 修复 Backend
npm run lint:fix:backend

# 修复 Frontend
npm run lint:fix:frontend

# 修复 Markdown
npm run lint:fix:md
```

### 格式化代码

```bash
# 格式化所有代码
npm run format

# 格式化 Backend
npm run format:backend

# 格式化 Frontend
npm run format:frontend
```

### 类型检查

```bash
# 检查所有类型
npm run type-check

# 检查 Backend
npm run type-check:backend

# 检查 Frontend
npm run type-check:frontend
```

### 完整验证（提交前）

```bash
# 类型检查 + Lint 检查
npm run validate
```

## 📝 代码规范

### Backend (TypeScript)

**命名规范**:
- 文件名: `PascalCase` (如 `ContainerService.ts`)
- 类名: `PascalCase` (如 `ContainerRepository`)
- 方法名: `camelCase` (如 `getContainerById`)
- 常量: `UPPER_SNAKE_CASE` (如 `MAX_RETRIES`)
- 接口: `PascalCase` + `I` 前缀 (如 `IContainerService`)
- 类型: `PascalCase` (如 `ContainerStatus`)

**格式规范**:
- 缩进: 2 空格
- 引号: 单引号
- 分号: 必须使用
- 逗号: 不允许尾随逗号 (与 Prettier 配置一致)
- 行宽: 建议 120 字符

**代码示例**:
```typescript
// ✅ 正确
export class ContainerService {
  private readonly repository: IContainerRepository;
  private readonly logger: Logger;

  constructor(repository: IContainerRepository, logger: Logger) {
    this.repository = repository;
    this.logger = logger;
  }

  async getContainerById(id: string): Promise<Container | null> {
    return await this.repository.findById(id);
  }
}
```

### Frontend (Vue 3 + TypeScript)

**组件命名规范**:
- 多词组件: `PascalCase` (如 `ContainerDetails.vue`)
- 单词组件: 可使用单词 (如 `Header.vue`)

**命名规范**:
- 组件文件: `PascalCase.vue`
- 工具文件: `camelCase.ts`
- 常量文件: `UPPER_SNAKE_CASE.ts`
- 类型文件: `PascalCase.types.ts`
- API 文件: `camelCase.api.ts`

**格式规范**:
- 缩进: 2 空格
- 引号: 单引号
- 分号: 不使用 (JavaScript 风格)
- 行宽: 建议 100 字符

**代码示例**:
```vue
<template>
  <div class="container-card">
    <el-card>
      <template #header>
        <h3>{{ containerNumber }}</h3>
      </template>
      <p>{{ status }}</p>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  containerNumber: string;
  status: string;
}

const props = defineProps<Props>();
</script>

<style scoped lang="scss">
.container-card {
  padding: 20px;
}
</style>
```

### Markdown 文档

**文件命名**: `UPPER_SNAKE_CASE.md` (如 `DEVELOPMENT_STANDARDS.md`)

**格式规范**:
- 标题层级: 使用 `#` 到 `######`
- 代码块: 指定语言 (如 ```typescript)
- 链接: 使用绝对路径 (如 `/docs/FILE.md`)
- 表格: 使用 Markdown 表格语法
- 行宽: 最大 200 字符

## ⚙️ 编辑器集成

### VSCode

安装推荐扩展:
- ESLint
- Prettier - Code formatter
- Volar (Vue 3)
- TypeScript Vue Plugin (Volar)

配置 `.vscode/settings.json`:
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
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[vue]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## 🔧 Git Hooks (可选)

使用 Husky 在提交前自动检查:

```bash
# 安装依赖
npm install -D husky lint-staged

# 初始化 Husky
npx husky install

# 添加 pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"
```

配置 `.lintstagedrc.json`:
```json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{vue}": ["eslint --fix", "prettier --write"],
  "*.{js,jsx}": ["eslint --fix", "prettier --write"],
  "*.{md}": ["markdownlint-cli2 --fix"]
}
```

## 🎯 最佳实践

### 1. 提交前检查清单

- [ ] 通过类型检查 (`npm run type-check`)
- [ ] 通过 Lint 检查 (`npm run lint`)
- [ ] 代码已格式化 (`npm run format`)
- [ ] Markdown 文档格式正确 (`npm run lint:md`)
- [ ] 测试通过 (如果有测试)
- [ ] 更新相关文档 (如果有功能变更)

### 2. 编码规范

**DO ✅**:
- 编写有意义的变量和函数名
- 添加必要的注释
- 使用 TypeScript 类型
- 编写单元测试
- 遵循单一职责原则
- 使用 const/let 而非 var

**DON'T ❌**:
- 使用 any 类型 (除非必要)
- 提交 console.log
- 硬编码魔法数字
- 忽略 Lint 错误
- 提交未格式化的代码
- 提交未测试的代码

### 3. 文档规范

**必须包含**:
- 功能描述
- 使用示例
- API 文档 (如果是接口)
- 参数说明
- 返回值说明
- 错误处理说明

## 📚 参考资源

- [ESLint 文档](https://eslint.org/docs/latest/)
- [Prettier 文档](https://prettier.io/docs/en/options.html)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Vue 3 文档](https://vuejs.org/)
- [Vue 风格指南](https://vuejs.org/style-guide/)
- [Airbnb JavaScript 风格指南](https://github.com/airbnb/javascript)

## ❓ 常见问题

### Q: Lint 报错太多怎么办?

A: 大部分错误可以自动修复:
```bash
npm run lint:fix
```

### Q: Prettier 和 ESLint 冲突?

A: 在 ESLint 配置中禁用与 Prettier 冲突的规则:
```js
// .eslintrc.js
rules: {
  'indent': 'off',
  'quotes': 'off',
  'semi': 'off',
  'comma-dangle': 'off'
}
```

### Q: 如何忽略特定文件?

A: 使用相应的忽略文件:
- `.eslintignore` - ESLint
- `.prettierignore` - Prettier
- `.markdownlint.json` 中的 `ignore` - Markdown Lint

### Q: 如何处理 TypeScript any 类型?

A:
1. 优先定义明确类型
2. 使用泛型
3. 如果必须使用 any，添加注释说明原因
4. 配置规则为 `off` 或 `warn`

## 📊 Lint 状态

当前配置已通过以下验证:
- ✅ Backend ESLint 配置
- ✅ Frontend ESLint 配置
- ✅ Markdown Lint 配置
- ✅ Prettier 配置
- ✅ 忽略文件配置
- ✅ NPM 脚本配置

最后更新: 2026-02-28
