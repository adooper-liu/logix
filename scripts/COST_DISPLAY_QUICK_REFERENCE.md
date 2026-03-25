# 排产预览费用显示 - 快速参考

## 功能说明

在排产预览弹窗中，现在可以查看以下费用信息：

### 1. 概览区（顶部）
- **预估总费用**：所有成功排产的货柜费用总和

### 2. 表格列（每行数据）
- **预估费用**：单个货柜的总费用
- **费用明细**：点击问号图标查看详细构成
  - 滞港费（Demurrage）
  - 滞箱费（Detention）
  - 仓储费（Storage）
  - 运输费（Transportation）

---

## 查看步骤

1. 打开排产可视化页面
2. 点击"预览排产"按钮
3. 在弹出的预览窗口中：
   - 顶部查看总费用
   - 表格中查看每个货柜的费用
   - 鼠标悬停问号图标查看明细

---

## 费用计算逻辑

### 滞港费 (Demurrage)
```
基于 ETA 和免费期限计算
公式：超期天数 × 日费率
```

### 滞箱费 (Detention)
```
基于卸货日和还箱日计算
公式：使用天数 × 日费率
```

### 仓储费 (Storage)
```
基于堆存天数计算
公式：堆存天数 × 日费率 + 操作费
```

### 运输费 (Transportation)
```
基于港口到仓库的距离计算
公式：基础费 + 距离 × 单价
Drop off 模式费用翻倍
```

---

## 数据示例

```json
{
  "estimatedCosts": {
    "demurrageCost": 500,
    "detentionCost": 300,
    "storageCost": 200,
    "transportationCost": 400,
    "totalCost": 1400,
    "currency": "USD"
  }
}
```

---

## 注意事项

✅ **已使用真实数据配置**
- 滞港费/滞箱费：从 `dict_demurrage_standards` 读取
- 仓储费：从 `dict_trucking_port_mapping` 读取
- 运输费：从 `dict_trucking_port_mapping.transport_fee` 读取
- 默认值：当数据库无配置时使用 $100 默认值

💡 **性能提示**
- 大批量预览时（>100 柜），响应时间可能较长
- 建议后续实现缓存机制（TTL=5 分钟）

🎨 **视觉设计**
- 橙色加粗字体：单条费用
- Warning Tag：总费用
- Popover：费用明细（hover 触发）

---

## 相关文件

- 实施记录：`scripts/SCHEDULING_COST_DISPLAY_IMPLEMENTATION.md`
- 后端服务：`backend/src/services/intelligentScheduling.service.ts`
- 前端组件：`frontend/src/views/scheduling/components/SchedulingPreviewModal.vue`

---

**更新时间**: 2026-03-21
