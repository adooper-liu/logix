# 智能排产预览确认功能 - 快速参考指南

**最后更新**: 2026-03-25  
**版本**: v3.0

---

## 🚀 快速开始

### 1. 使用预览功能

```typescript
// 前端调用示例
const handlePreview = async () => {
  const result = await containerService.batchSchedule({
    country: "GB",
    dryRun: true, // ← 关键：预览模式
  });

  console.log("预览成功:", result.successCount);
};
```

---

### 2. 确认保存

```typescript
// 前端调用示例
const handleConfirm = async (selectedContainers: string[]) => {
  const result = await containerService.confirmSchedule({
    containerNumbers: selectedContainers,
  });

  console.log("保存成功:", result.savedCount);
};
```

---

## 📡 API 端点

| 功能             | 端点                                      | 方法 | 参数                         |
| ---------------- | ----------------------------------------- | ---- | ---------------------------- |
| 批量排产（预览） | `/api/v1/scheduling/batch-schedule`       | POST | `dryRun: true`               |
| 确认保存         | `/api/v1/scheduling/confirm`              | POST | `containerNumbers: string[]` |
| 单柜预览         | `/api/v1/containers/:id/schedule-preview` | POST | -                            |

---

## 🔑 关键参数

### batchSchedule 请求参数

```json
{
  "country": "GB", // 可选：国家代码
  "startDate": "2026-03-25", // 可选：开始日期
  "endDate": "2026-04-25", // 可选：结束日期
  "limit": 50, // 可选：每批数量
  "skip": 0, // 可选：跳过数量
  "dryRun": true // ← 关键：true=预览，false=正式保存
}
```

---

### confirmSchedule 请求参数

```json
{
  "containerNumbers": ["CNT001", "CNT002", "CNT003"]
}
```

---

## 📊 响应格式

### batchSchedule 响应

```json
{
  "success": true,
  "total": 50,
  "successCount": 48,
  "failedCount": 2,
  "results": [
    {
      "containerNumber": "CNT001",
      "success": true,
      "message": "排产成功",
      "plannedData": {
        "plannedPickupDate": "2026-03-26",
        "plannedDeliveryDate": "2026-03-25",
        "warehouseId": "WH001",
        "unloadModePlan": "Drop off"
      }
    }
  ],
  "hasMore": false
}
```

---

### confirmSchedule 响应

```json
{
  "success": true,
  "savedCount": 3,
  "total": 3,
  "results": [
    {
      "containerNumber": "CNT001",
      "success": true,
      "message": "排产成功"
    },
    {
      "containerNumber": "CNT002",
      "success": false,
      "message": "仓库产能不足"
    }
  ]
}
```

---

## 🧪 测试脚本

### 测试 1: 预览模式

```bash
curl -X POST http://localhost:3001/api/v1/scheduling/batch-schedule \
  -H "Content-Type: application/json" \
  -d '{
    "country": "GB",
    "dryRun": true
  }'
```

**预期**: 返回预览数据，数据库无变化

---

### 测试 2: 确认保存

```bash
curl -X POST http://localhost:3001/api/v1/scheduling/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "containerNumbers": ["CNT001", "CNT002"]
  }'
```

**预期**: 保存排产数据，扣减产能

---

## 🎨 UI 组件使用

### SchedulingPreviewModal 组件

```vue
<template>
  <SchedulingPreviewModal
    v-model="showPreviewModal"
    :preview-results="previewResults"
    @confirm="handleConfirmSchedule"
    @cancel="showPreviewModal = false"
    @view-container="(cn) => router.push(`/shipments/${cn}`)"
  />
</template>

<script setup lang="ts">
import SchedulingPreviewModal from "./components/SchedulingPreviewModal.vue";

const showPreviewModal = ref(false);
const previewResults = ref<any[]>([]);

const handleConfirmSchedule = (selectedContainers: string[]) => {
  // 处理确认逻辑
};
</script>
```

---

## ⚠️ 注意事项

### 1. dryRun 参数

- ✅ `dryRun=true`: 只计算，不写库，不扣产能
- ✅ `dryRun=false`: 正式保存，写库 + 扣产能
- ❌ 不传 dryRun: 默认为 false（正式保存）

---

### 2. confirm 接口

- ✅ 只接收 `containerNumbers`
- ✅ 服务端重新计算
- ❌ 不接受 `plannedData`（防止篡改）

---

### 3. 并发控制

- ⚠️ 预览和确认之间有时间差
- ⚠️ 产能可能被其他人先占用
- ✅ confirm 时会重新检查产能

---

## 📚 完整文档

- [后端实施记录](file://d:\Gihub\logix\scripts\SCHEDULING_CONFIRM_IMPLEMENTATION.md) (585 行)
- [前端实施记录](file://d:\Gihub\logix\frontend\src\views\scheduling\components\SchedulingPreviewModal.vue) (458 行)
- [完整总结](file://d:\Gihub\logix\scripts\PREVIEW_CONFIRM_COMPLETE_SUMMARY.md) (551 行)

---

## 🆘 常见问题

### Q: 预览后确认为什么要重新计算？

**A**: 为了保证数据一致性。预览和确认之间可能有时间差，产能可能已被其他人占用。重新计算可以确保保存时产能仍然充足。

---

### Q: 如何只保存部分货柜？

**A**: 在预览弹窗中取消勾选不想保存的货柜，然后点击"确认保存"。只会保存选中的货柜。

---

### Q: 预览会影响数据库吗？

**A**: 不会。预览使用 `dryRun=true` 参数，只计算不写库，不影响数据库状态。

---

### Q: 确认保存失败怎么办？

**A**: confirm 接口会返回每个货柜的成功/失败状态。失败的货柜会显示原因（如"仓库产能不足"），可以调整后再次确认。

---

**快速参考指南 - 完**

需要更多详细信息，请查看完整文档。📖
