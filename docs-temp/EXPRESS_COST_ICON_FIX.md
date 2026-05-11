# 图标修复说明

## 问题

Element Plus Icons Vue 库中不存在 `Calculator` 图标，导致运行时错误：

```
Uncaught SyntaxError: The requested module '/node_modules/.vite/deps/@element-plus_icons-vue.js'
does not provide an export named 'Calculator'
```

## 解决方案

将所有 `Calculator` 图标替换为 `Operation` 图标（齿轮/操作图标），该图标在 Element Plus Icons 中存在且语义相近。

## 修改文件

### 1. Layout.vue

- **文件**: `frontend/src/components/layout/Layout.vue`
- **修改**:
  - 导入语句: `Calculator` → `Operation`
  - iconMap 注册: `Calculator` → `Operation`
  - 菜单配置: `icon: 'Calculator'` → `icon: 'Operation'`

### 2. router/index.ts

- **文件**: `frontend/src/router/index.ts`
- **修改**:
  - 路由 meta: `icon: 'Calculator'` → `icon: 'Operation'`

### 3. ExpressCostCalculator.vue

- **文件**: `frontend/src/views/import/ExpressCostCalculator.vue`
- **修改**:
  - 导入语句: `Calculator` → `Operation`
  - 卡片标题图标: `<Calculator />` → `<Operation />`
  - 按钮图标: `<Calculator />` → `<Operation />`

## 验证

重启前端开发服务器后，错误应消失：

```bash
cd frontend
npm run dev
```

访问页面，检查：

- ✅ 导航栏"尾程"菜单正常显示
- ✅ "快递模型试算"子菜单显示 Operation 图标
- ✅ 试算页面标题和按钮图标正常显示

## 备选方案

如果希望使用其他图标，可以从以下 Element Plus Icons 中选择：

| 图标名称        | 用途      | 示例 |
| --------------- | --------- | ---- |
| Operation       | 操作/设置 | ⚙️   |
| Tools           | 工具      | 🔧   |
| TrendCharts     | 趋势/图表 | 📊   |
| DataAnalysis    | 数据分析  | 📈   |
| DocumentChecked | 文档审核  | 📄✓  |

修改方法：

1. 在 Layout.vue 中导入新图标
2. 在 iconMap 中注册
3. 更新菜单配置中的 icon 值

---

**修复日期**: 2026-04-23  
**修复人**: SOLO Coder
