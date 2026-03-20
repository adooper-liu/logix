# ETA更新优先级规则Skill

**版本**: 1.0  
**制定日期**: 2026-03-19  
**适用范围**: 飞驼数据导入ETA字段更新逻辑  
**作者**: AI编码助手

---

## 🎯 Skill概述

本Skill定义飞驼数据导入时ETA（预计到港日期）的更新优先级规则，确保数据准确性和历史数据的稳定性。

### 核心原则
- **只更新空值**：ETA字段只在为空时才写入，避免覆盖已有数据
- **首次导入优先**：第一次导入时的ETA作为基准，后续不再轻易覆盖
- **多数据源 fallback**：当主数据源无值时，依次尝试备选数据源

---

## 📋 优先级规则

### ETA更新优先级（从高到低）

| 优先级 | 数据来源 | 字段映射 | 更新条件 |
|--------|----------|----------|----------|
| 1 | 备货单上海运表的ETA | sea_freight.eta | **只更新空值**（首次导入） |
| 2 | 飞驼-发生地信息-目的港的ETA | 发生地信息_预计到达时间 | 当优先级1为空时 |
| 3 | 飞驼-交货地预计到达时间 | 交货地预计到达时间 | 当优先级1、2都为空时 |
| 4 | 飞驼-目的地预计到达时间 | 目的地预计到达时间 | 作为最终fallback |

### 数据流向

```
飞驼数据导入
     │
     ├────────────────────────────────────────┐
     │  发生地信息_目的港预计到达时间          │
     │  (placeType = 目的地/交货地)            │
     └──────────────────┬─────────────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │ 判断 sea_freight.eta 是否为空 │
         └──────────────────────────────┘
              │                    │
           是 ▼                 否 ▼
    ┌─────────────────┐   ┌─────────────────┐
    │ 写入ETA新值      │   │ 保持原有值       │
    │ (首次导入)       │   │ (不覆盖)         │
    └─────────────────┘   └─────────────────┘
```

---

## 🔧 实现代码

### SeaFreight表ETA更新

```typescript
// feituoImport.service.ts - mergeTable1ToCore 方法

// 优先级1: 先检查现有值是否为空
if (!sf.eta) {
  // 优先级2: 从发生地信息数组中获取目的港的ETA
  const destPlace = places.find(p => 
    p.placeType?.includes('目的地') || 
    p.placeType?.includes('交货地')
  );
  
  // 优先级3-4: fallback到直接列名
  sf.eta = parseDate(
    destPlace?.eta ||                              // 优先级2
    getVal(row, '交货地预计到达时间') ||           // 优先级3
    getVal(row, '目的地预计到达时间') ||           // 优先级4
    getVal(row, 5, '预计到达时间') ||              // 优先级4备选
    getVal(row, '预计到港日期')                    // 优先级4备选
  );
}
```

### PortOperation表ETA更新（目的港）

```typescript
// feituoImport.service.ts - mergeTable2ToCore 方法

// 目的港PortOperation的ETA更新（同样只更新空值）
if (!po.etaDestPort) {
  const destPlace = places.find(p => 
    p.placeType?.includes('目的地') || 
    p.placeType?.includes('交货地')
  );
  
  po.etaDestPort = parseDate(
    destPlace?.eta ||
    getVal(row, '交货地预计到达时间') ||
    getVal(row, '目的地预计到达时间') ||
    getVal(row, 5, '预计到达时间') ||
    getVal(row, '预计到港日期')
  );
}
```

---

## ⚠️ 重要说明

### 1. "只更新空值"的含义
- **首次导入**：ETA字段为空，导入时写入飞驼数据
- **后续导入**：ETA已有值，**不覆盖**原有数据
- 这样保证了历史数据的稳定性

### 2. 数据源优先级说明
- 飞驼Excel中可能有多列包含ETA信息
- 系统按优先级依次尝试取值，直到找到有效值
- 如果所有来源都为空，则不更新

### 3. 预计vs实际
- **ETA (Estimated Time of Arrival)**: 预计到港日期，取飞驼的"预计到达时间"
- **ATA (Actual Time of Arrival)**: 实际到港日期，取飞驼的"实际到达时间"
- 两者更新逻辑相同，都遵循"只更新空值"规则

---

## 📊 相关字段

| 字段名 | 表 | 说明 |
|--------|-----|------|
| eta | process_sea_freight | 海运表的目的港预计到港日期 |
| eta_dest_port | process_port_operations | 港口操作表的目的港预计到港日期 |
| ata | process_sea_freight | 海运表的目的港实际到港日期 |
| ata_dest_port | process_port_operations | 港口操作表的目的港实际到港日期 |

---

## 🔗 相关文件

- **主逻辑**: `backend/src/services/feituoImport.service.ts`
- **字段分组**: `backend/src/constants/FeituoFieldGroupMapping.ts`
- **海运实体**: `backend/src/entities/SeaFreight.ts`
- **港口操作实体**: `backend/src/entities/PortOperation.ts`

---

**文档版本**: v1.0  
**最后更新**: 2026-03-19
