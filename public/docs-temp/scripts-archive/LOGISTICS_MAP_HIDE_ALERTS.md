# 物流地图隐藏超期预警和路径验证

## 修改说明

**修改文件**：`frontend/src/views/shipments/components/LogisticsPathTab.vue`

**修改内容**：在物流地图视图（`variant === 'map'`）中隐藏超期预警和路径验证信息。

## 修改细节

### 修改前

```vue
<!-- 超期预警 -->
<el-alert v-if="path.isOverdue" type="error" :title="t('container.logisticsPath.overdueAlert.title')" :description="overdueAlertText" show-icon class="overdue-alert" />

<!-- 路径验证（纯文本，无卡片） -->
<div v-if="validationResult" class="validation-inline-plain">
  <!-- ... -->
</div>
```

**问题**：所有视图（包括物流地图）都显示超期预警和路径验证。

### 修改后

```vue
<!-- 超期预警（仅阶段分组视图显示） -->
<el-alert v-if="variant === 'grouped' && path.isOverdue" type="error" :title="t('container.logisticsPath.overdueAlert.title')" :description="overdueAlertText" show-icon class="overdue-alert" />

<!-- 路径验证（仅阶段分组视图显示，纯文本，无卡片） -->
<div v-if="variant === 'grouped' && validationResult" class="validation-inline-plain">
  <!-- ... -->
</div>
```

**效果**：只有阶段分组视图（`variant === 'grouped'`）显示超期预警和路径验证，物流地图视图（`variant === 'map'`）不显示。

## 视图对比

### 阶段分组视图（显示预警和验证）

```
┌─────────────────────────────────────┐
│ ❌ 超期预警                          │
│ ETA 已超期未到港，请关注货柜状态。    │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  路径验证失败  错误：所有节点均...  │
└─────────────────────────────────────┘
┌─────┬─────┬─────┬─────┬─────┐
│起运 │海运 │到港 │提柜 │还箱 │
│...  │...  │...  │...  │...  │
└─────┴─────┴─────┴─────┴─────┘
```

### 物流地图视图（不显示预警和验证）

```
┌─────────────────────────────────────┐
│          地图容器                    │
│                                      │
│   [地图显示港口位置和航线]            │
│                                      │
└─────────────────────────────────────┘
```

## 业务原因

### 物流地图的用途

1. **地理可视化**：查看货柜的地理位置和移动轨迹
2. **快速概览**：快速了解货柜当前在哪里
3. **空间分析**：查看港口、路线等空间信息

### 为什么隐藏预警和验证

1. **视图专注性**：地图视图应专注于地理位置，避免信息干扰
2. **用户体验**：地图模式用于快速查看位置，而非详细分析
3. **信息分层**：
   - 地图视图：看位置
   - 阶段分组视图：看详细状态和分析

### 保留阶段分组视图的预警和验证

**阶段分组视图仍然显示**：

- ✅ 超期预警
- ✅ 路径验证
- ✅ 所有节点的详细信息

**原因**：

- 阶段分组视图用于详细分析货柜状态
- 用户需要知道是否有延误或异常
- 路径验证帮助识别数据完整性问题

## 代码逻辑

### variant 参数

```typescript
const props = withDefaults(
  defineProps<{
    containerNumber: string;
    billOfLadingNumber?: string;
    /** grouped=阶段分组；map=仅地图（由父级货柜详情独立 Tab 使用） */
    variant?: "grouped" | "map";
  }>(),
  { variant: "grouped" },
);
```

**取值**：

- `'grouped'`：阶段分组视图（默认），显示完整信息
- `'map'`：地图视图，仅显示地图

### 条件判断

```typescript
// 超期预警
v-if="variant === 'grouped' && path.isOverdue"

// 路径验证
v-if="variant === 'grouped' && validationResult"
```

**逻辑**：

- 只有当 `variant === 'grouped'` 时才显示
- 地图视图（`variant === 'map'`）不显示

## 影响范围

### 不受影响

1. **阶段分组视图**：所有预警和验证正常显示
2. **数据加载**：数据获取和验证逻辑不变
3. **其他 Tab**：货柜信息、海运信息等不受影响

### 受影响

1. **物流地图 Tab**：
   - ❌ 不显示超期预警
   - ❌ 不显示路径验证
   - ✅ 仍显示地图和位置信息

## 测试场景

### 场景 1：物流地图视图

**操作**：

1. 访问货柜详情页
2. 切换到"物流地图"标签

**预期结果**：

- ✅ 显示地图容器
- ✅ 显示港口位置（如果有坐标数据）
- ❌ 不显示超期预警
- ❌ 不显示路径验证

### 场景 2：物流路径视图（阶段分组）

**操作**：

1. 访问货柜详情页
2. 切换到"物流路径"标签

**预期结果**：

- ✅ 显示超期预警（如果 `isOverdue === true`）
- ✅ 显示路径验证结果
- ✅ 显示阶段分组的节点信息

## 相关文件

- **前端组件**：`frontend/src/views/shipments/components/LogisticsPathTab.vue`
- **父组件**：`frontend/src/views/shipments/ContainerDetailRefactored.vue`
- **服务**：`frontend/src/services/logisticsPath.ts`

## 注意事项

1. **仅前端显示控制**：后端数据获取和验证逻辑不变
2. **条件判断顺序**：先检查 `variant`，再检查具体条件
3. **代码注释**：已更新注释说明"仅阶段分组视图显示"

## 回滚方案

如需恢复显示（不推荐）：

```vue
<!-- 恢复超期预警显示 -->
<el-alert
  v-if="path.isOverdue"  <!-- 移除 variant === 'grouped' && -->
  type="error"
  ...
/>

<!-- 恢复路径验证显示 -->
<div v-if="validationResult" class="validation-inline-plain">  <!-- 移除 variant === 'grouped' && -->
```

---

**修改时间**：2026-03-31  
**修改人员**：刘志高  
**影响范围**：物流地图视图显示逻辑  
**修改类型**：UI 优化
