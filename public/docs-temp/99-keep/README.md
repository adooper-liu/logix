# 临时文档目录 (docs-temp)

此目录存放临时性的文档，包括：
- 验证报告（数据验证、功能验证等）
- 问题修复总结
- 迁移记录
- 架构说明（已整合到正式文档的临时版本）
- 特定问题的解决方案文档

## 📋 文档分类

### 验证报告类
- DATA_VERIFICATION_REPORT_MRKU4896861.md - 特定货柜数据验证
- ARRIVAL_COUNTDOWN_VERIFICATION.md - 倒计时功能验证

### 修复总结类
- DATE_FIX_SUMMARY.md - 日期问题修复总结
- DATE_PARSING_FIX.md - 日期解析修复
- FREIGHT_CURRENCY_AMOUNT_IMPORT_FIX.md - 运费金额导入修复
- IMPLEMENT_TIME_FIX_GUIDE.md - 时间修复实现指南
- IMPORT_MAPPING_FIX_SUMMARY.md - 导入映射修复总结
- DOCUMENT_TRANSFER_DATE_TYPE_CHANGE.md - 文档传输日期类型变更

### 迁移类
- TIMESTAMP_MIGRATION_COMPLETE.md - 时间戳迁移完成记录

### 架构与实现类
- ARCHITECTURE_EXPLAINED.md - 架构说明（临时版）
- DEVELOPMENT_SUMMARY.md - 开发总结
- LOGISTICS_STATUS_STATE_MACHINE.md - 物流状态状态机（临时版）
- UNIFIED_STATUS_MACHINE_IMPLEMENTATION.md - 统一状态机实现
- MULTIPLE_ORDERS_PER_CONTAINER.md - 多订单单柜实现

### 其他临时文档
- CLEAR_PORTS_TAB_DUPLICATION.md - 港口标签页去重
- CONTAINER_NUMBER_FIX.md - 集装箱号修复

## ⚠️ 注意事项

1. **不要在正式文档中引用此目录下的文档**
2. **临时文档定期清理**：过期的临时文档应删除
3. **有价值的内容应及时整合到正式文档**中
4. **Git 追踪**：此目录的文档应纳入 Git 管理，保留历史记录

## 🔄 整合流程

当临时文档包含有价值的内容时，按以下步骤整合：

1. 识别可整合的内容
2. 将相关内容更新到 `frontend/public/docs/` 下的正式文档
3. 在正式文档中更新引用
4. 移动已整合的临时文档到此目录（或删除）
5. 更新此 README 的文档列表
