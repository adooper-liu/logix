# 货柜详情页 TAB 顺序调整

## 修改说明

**修改文件**：`frontend/src/views/shipments/ContainerDetailRefactored.vue`

**修改内容**：将"预警"、"时间预测"、"风险评估"三个 TAB 移动到"物流地图"之前。

## 修改前后对比

### 修改前（错误）

```
货柜详情页 TAB 顺序：
1. 物流路径
2. 物流地图          ← 预警相关 TAB 在后面
3. 货柜信息
4. 海运信息
5. 港口操作
6. 拖卡运输
7. 仓库操作
8. 还空箱
9. 滞港费
10. 变更日志
11. 查验记录
12. 预警             ← 太靠后
13. 时间预测         ← 太靠后
14. 风险评估         ← 太靠后
```

**问题**：

- 预警、时间预测、风险评估与物流路径/地图紧密相关
- 用户需要先看预警，再看地图位置
- 原来的顺序导致用户需要滚动很多 TAB 才能看到预警

### 修改后（正确）

```
货柜详情页 TAB 顺序：
1. 物流路径
2. 预警             ← 移动到物流地图前
3. 时间预测         ← 移动到物流地图前
4. 风险评估         ← 移动到物流地图前
5. 物流地图
6. 货柜信息
7. 海运信息
8. 港口操作
9. 拖卡运输
10. 仓库操作
11. 还空箱
12. 滞港费
13. 变更日志
14. 查验记录
```

**优势**：

- ✅ 预警相关 TAB 紧跟物流路径/地图
- ✅ 用户可快速查看预警信息
- ✅ 符合"先看风险，再看位置"的业务逻辑

## 修改细节

### 修改前代码（第 159-245 行）

```vue
<el-tabs v-model="activeTab" class="detail-tabs" @tab-change="onDetailTabChange">
  <el-tab-pane :label="t('container.detail.logisticsPath')" name="logistics-path" lazy>
    <!-- 物流路径 -->
  </el-tab-pane>
  <el-tab-pane :label="t('container.detail.logisticsPathMap')" name="logistics-path-map" lazy>
    <!-- 物流地图 -->
  </el-tab-pane>
  <!-- ... 中间有很多其他 TAB ... -->
  <el-tab-pane label="预警" name="alert" lazy>
    <!-- 预警 -->
  </el-tab-pane>
  <el-tab-pane label="时间预测" name="time-prediction" lazy>
    <!-- 时间预测 -->
  </el-tab-pane>
  <el-tab-pane label="风险评估" name="risk" lazy>
    <!-- 风险评估 -->
  </el-tab-pane>
</el-tabs>
```

### 修改后代码（第 159-192 行）

```vue
<el-tabs v-model="activeTab" class="detail-tabs" @tab-change="onDetailTabChange">
  <el-tab-pane :label="t('container.detail.logisticsPath')" name="logistics-path" lazy>
    <!-- 物流路径 -->
  </el-tab-pane>
  <el-tab-pane label="预警" name="alert" lazy>
    <!-- 预警 -->
  </el-tab-pane>
  <el-tab-pane label="时间预测" name="time-prediction" lazy>
    <!-- 时间预测 -->
  </el-tab-pane>
  <el-tab-pane label="风险评估" name="risk" lazy>
    <!-- 风险评估 -->
  </el-tab-pane>
  <el-tab-pane :label="t('container.detail.logisticsPathMap')" name="logistics-path-map" lazy>
    <!-- 物流地图 -->
  </el-tab-pane>
  <!-- ... 其他 TAB 保持不变 ... -->
</el-tabs>
```

## 业务逻辑

### TAB 分组设计

修改后的 TAB 顺序体现了清晰的功能分组：

#### 第一组：物流状态监控（TAB 1-5）

1. **物流路径**：查看完整物流链路和节点状态
2. **预警**：查看当前货柜的所有预警信息
3. **时间预测**：查看关键节点的预计时间
4. **风险评估**：查看货柜的风险评分和风险因素
5. **物流地图**：查看货柜的地理位置和移动轨迹

**设计理念**：

- 从抽象到具体（路径 → 预警 → 预测 → 风险 → 地图）
- 从时间维度到空间维度
- 从分析到可视化

#### 第二组：业务详情（TAB 6-11）

6. **货柜信息**：基本信息
7. **海运信息**：海运详情
8. **港口操作**：清关、提柜等
9. **拖卡运输**：拖车运输详情
10. **仓库操作**：卸柜、还箱等
11. **还空箱**：还箱详情

**设计理念**：

- 按业务流程顺序排列
- 从海运到陆运到仓储

#### 第三组：费用与记录（TAB 12-14）

12. **滞港费**：费用明细
13. **变更日志**：操作记录
14. **查验记录**：查验历史

**设计理念**：

- 费用和记录类信息放在最后

### 用户体验优化

#### 修改前的问题

**场景**：用户想查看货柜风险

1. 打开货柜详情
2. 看到"物流路径"
3. 看到"物流地图"
4. 需要继续向右滚动...
5. 经过 9 个 TAB
6. 才看到"预警"、"时间预测"、"风险评估"

**问题**：

- ❌ 预警信息太靠后
- ❌ 用户容易忽略重要风险
- ❌ 需要多次点击才能看到

#### 修改后的体验

**场景**：用户想查看货柜风险

1. 打开货柜详情
2. 看到"物流路径"
3. 立即看到"预警"
4. 看到"时间预测"
5. 看到"风险评估"
6. 需要看地图时，旁边就是"物流地图"

**优势**：

- ✅ 预警信息触手可及
- ✅ 快速了解货柜风险
- ✅ 符合"风险优先"的业务思维

## 完整 TAB 列表

### 当前顺序（修改后）

| 序号 | TAB 名称 | 组件                       | 说明               |
| ---- | -------- | -------------------------- | ------------------ |
| 1    | 物流路径 | LogisticsPathTab (grouped) | 阶段分组的物流路径 |
| 2    | 预警     | AlertTab                   | 货柜预警信息       |
| 3    | 时间预测 | TimePredictionTab          | 关键节点时间预测   |
| 4    | 风险评估 | RiskCardTab                | 风险评估卡片       |
| 5    | 物流地图 | LogisticsPathTab (map)     | 地图可视化         |
| 6    | 货柜信息 | ContainerInfo              | 基本信息卡片       |
| 7    | 海运信息 | SeaFreightInfo             | 海运详情           |
| 8    | 港口操作 | PortOperations             | 港口操作详情       |
| 9    | 拖卡运输 | TruckingTransport          | 拖车运输详情       |
| 10   | 仓库操作 | WarehouseOperations        | 仓库操作详情       |
| 11   | 还空箱   | EmptyReturn                | 还箱详情           |
| 12   | 滞港费   | DemurrageDetailSection     | 滞港费明细         |
| 13   | 变更日志 | ChangeLogTab               | 操作记录           |
| 14   | 查验记录 | InspectionRecord           | 查验历史           |

### 路由映射

```typescript
watch(
  () => route.query.tab,
  (tab) => {
    if (tab === "demurrage") activeTab.value = "demurrage";
    else if (tab === "logistics-path") activeTab.value = "logistics-path";
    else if (tab === "logistics-path-map") activeTab.value = "logistics-path-map";
    else if (tab === "change-log") activeTab.value = "change-log";
    else if (tab === "inspection") activeTab.value = "inspection";
    else if (tab === "alert")
      activeTab.value = "alert"; // ← 预警
    else if (tab === "time-prediction")
      activeTab.value = "time-prediction"; // ← 时间预测
    else if (tab === "risk") activeTab.value = "risk"; // ← 风险评估
  },
  { immediate: true },
);
```

## 测试场景

### 场景 1：访问货柜详情

**操作步骤**：

1. 访问任意货柜详情页（如 CXDU1919549）

**预期结果**：

- ✅ 默认打开"物流路径"
- ✅ 向右依次是：预警、时间预测、风险评估、物流地图
- ✅ 预警相关 TAB 紧跟物流路径

### 场景 2：通过 URL 参数打开特定 TAB

**操作步骤**：

1. 访问 `/shipments/CXDU1919549?tab=alert`

**预期结果**：

- ✅ 打开"预警"标签
- ✅ 位置：第 2 个标签

### 场景 3：通过 URL 参数打开物流地图

**操作步骤**：

1. 访问 `/shipments/CXDU1919549?tab=logistics-path-map`

**预期结果**：

- ✅ 打开"物流地图"
- ✅ 位置：第 5 个标签（在预警、时间预测、风险评估之后）

## 相关文件

- **主文件**：`frontend/src/views/shipments/ContainerDetailRefactored.vue`
- **预警组件**：`frontend/src/views/shipments/components/AlertTab.vue`
- **时间预测**：`frontend/src/views/shipments/components/TimePredictionTab.vue`
- **风险评估**：`frontend/src/views/shipments/components/RiskCardTab.vue`
- **物流地图**：`frontend/src/views/shipments/components/LogisticsPathTab.vue`

## 注意事项

1. **保持懒加载**：所有 TAB 都使用 `lazy` 属性，按需加载
2. **路由兼容**：确保 `route.query.tab` 的映射包含所有 TAB
3. **组件引用**：`logisticsPathMapTabRef` 只用于地图 TAB，位置变化不影响功能

## 回滚方案

如需回滚到原来的顺序（不推荐）：

```vue
<!-- 将预警、时间预测、风险评估移回后面 -->
<el-tab-pane :label="t('container.detail.logisticsPath')" name="logistics-path" lazy>
  <!-- 物流路径 -->
</el-tab-pane>
<el-tab-pane :label="t('container.detail.logisticsPathMap')" name="logistics-path-map" lazy>
  <!-- 物流地图 -->
</el-tab-pane>
<!-- ... 中间有很多其他 TAB ... -->
<el-tab-pane label="预警" name="alert" lazy>
  <!-- 预警 -->
</el-tab-pane>
<el-tab-pane label="时间预测" name="time-prediction" lazy>
  <!-- 时间预测 -->
</el-tab-pane>
<el-tab-pane label="风险评估" name="risk" lazy>
  <!-- 风险评估 -->
</el-tab-pane>
```

---

**修改时间**：2026-03-31  
**修改人员**：刘志高  
**影响范围**：货柜详情页 TAB 顺序  
**修改类型**：用户体验优化
