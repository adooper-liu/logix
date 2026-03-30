# ETA/ATA智能更新状态机规则Skill

**版本**: 1.0  
**制定日期**: 2026-03-19  
**适用范围**: 飞驼数据导入ETA/ATA字段更新逻辑  
**作者**: AI编码助手

---

## 🎯 Skill概述

本Skill定义ETA（预计到港日期）和ATA（实际到港日期）的智能更新规则，引入状态机推理机制，避免机械取值，确保数据的有效性和一致性。

### 核心问题
- 机械地从飞驼字段取值，缺少逻辑验证
- 未考虑物流状态上下文
- 未验证时间逻辑有效性

---

## 🧠 状态机推理原则

### 物流状态与ETA/ATA关系

| 物流状态 | ETA有效性 | ATA有效性 | 说明 |
|----------|-----------|-----------|------|
| not_shipped | ❌ 无效 | ❌ 无效 | 未出运，无到港概念 |
| shipped | ✅ 有效 | ❌ 无效 | 已出运，仅有预计日期 |
| in_transit | ✅ 有效 | ⚠️ 条件有效 | 在途，可能已到中转港 |
| at_port | ✅ 有效 | ✅ 有效 | 已到港（目的港或中转港） |
| picked_up | ✅ 有效 | ✅ 有效 | 已提柜 |
| unloaded | ✅ 有效 | ✅ 有效 | 已卸柜 |
| returned_empty | ✅ 有效 | ✅ 有效 | 已还箱 |

### 时间逻辑验证规则

```typescript
interface DateValidationRules {
  // ETA规则
  etaRules: {
    mustHave: boolean;           // 该状态是否必须有ETA
    cannotBeFuture: boolean;     // ETA不能是未来日期
    mustBeBeforeAta: boolean;    // ETA必须在ATA之前
    maxDaysAhead: number;        // ETA最多可以距今多少天（防止异常大数据）
  };
  
  // ATA规则
  ataRules: {
    mustHave: boolean;           // 该状态是否必须有ATA
    cannotBeFuture: boolean;     // ATA不能是未来日期（允许小误差）
    mustBeAfterEta: boolean;     // ATA必须在ETA之后（或同一天）
    cannotBeBeforeShipDate: boolean; // ATA不能早于出运日期
  };
}

// 状态对应的验证规则
const STATUS_VALIDATION_RULES: Record<string, DateValidationRules> = {
  not_shipped: {
    etaRules: { mustHave: false, cannotBeFuture: false, mustBeBeforeAta: false, maxDaysAhead: 0 },
    ataRules: { mustHave: false, cannotBeFuture: true, mustBeAfterEta: false, cannotBeBeforeShipDate: false }
  },
  shipped: {
    etaRules: { mustHave: true, cannotBeFuture: true, mustBeBeforeAta: true, maxDaysAhead: 90 },
    ataRules: { mustHave: false, cannotBeFuture: true, mustBeAfterEta: true, cannotBeBeforeShipDate: true }
  },
  in_transit: {
    etaRules: { mustHave: true, cannotBeFuture: true, mustBeBeforeAta: true, maxDaysAhead: 90 },
    ataRules: { mustHave: false, cannotBeFuture: true, mustBeAfterEta: true, cannotBeBeforeShipDate: true }
  },
  at_port: {
    etaRules: { mustHave: true, cannotBeFuture: false, mustBeBeforeAta: true, maxDaysAhead: 0 },
    ataRules: { mustHave: true, cannotBeFuture: true, mustBeAfterEta: true, cannotBeBeforeShipDate: true }
  },
  picked_up: {
    etaRules: { mustHave: true, cannotBeFuture: false, mustBeBeforeAta: true, maxDaysAhead: 0 },
    ataRules: { mustHave: true, cannotBeFuture: true, mustBeAfterEta: true, cannotBeBeforeShipDate: true }
  }
};
```

---

## 📋 ETA/ATA更新状态机

### 状态转换图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ETA/ATA 更新状态机                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐     无ATA且无中转港ATA      ┌──────────────────┐     │
│   │  物流状态     │ ─────────────────────────▶ │ ETA仅更新空值     │     │
│   │ ≠已到港       │                              │ ATA不更新         │     │
│   └──────────────┘                              └──────────────────┘     │
│          │                                                │                │
│          │ 有ATA                                         │                │
│          ▼                                                ▼                │
│   ┌──────────────┐     是目的港ATA            ┌──────────────────┐     │
│   │ 物流状态      │ ─────────────────────────▶ │ ETA不更新         │     │
│   │ =已到港       │                              │ ATA更新空值       │     │
│   └──────────────┘                              └──────────────────┘     │
│          │                                                │                │
│          │ 是中转港ATA                                    │                │
│          ▼                                                ▼                │
│   ┌──────────────┐     中转港ATA+目的港ETA          ┌──────────────────┐  │
│   │ 更新中转港    │ ─────────────────────────▶ │ ETA更新空值       │  │
│   │ PortOperation│                              │ ATA更新空值       │  │
│   └──────────────┘                              └──────────────────┘     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 更新决策矩阵

| 场景 | 物流状态 | 目的港ATA | 目的港ETA | 中转港ATA | 操作 |
|------|----------|-----------|-----------|-----------|------|
| 1 | shipped/in_transit | 空 | 空 | 空 | ETA更新为空值，ATA不更新 |
| 2 | shipped/in_transit | 空 | 有 | 空 | ETA不更新（保持），ATA不更新 |
| 3 | at_port | 有 | 空 | 空 | ETA更新为ATA-合理天数，ATA更新为空值 |
| 4 | at_port | 有 | 有 | 空 | ETA、ATA都不更新（已有效） |
| 5 | in_transit | 空 | 空 | 有 | 更新中转港ATA，ETA不更新 |
| 6 | in_transit | 空 | 有 | 有 | 保留两者，更新中转港PortOperation |

---

## 🔧 实现代码框架

### 1. 物流状态获取

```typescript
import { calculateLogisticsStatus } from '../utils/logisticsStatusMachine';

class FeituoImportService {
  
  /**
   * 获取当前货柜的物流状态
   */
  private async getCurrentLogisticsStatus(containerNumber: string): Promise<{
    status: string;
    currentPortType: 'origin' | 'transit' | 'destination' | null;
  }> {
    const container = await this.containerRepo.findOne({
      where: { containerNumber }
    });
    
    if (!container) {
      return { status: 'not_shipped', currentPortType: null };
    }
    
    const portOperations = await this.portOpRepo.find({
      where: { containerNumber }
    });
    
    const seaFreight = await this.seaFreightRepo.findOne({
      where: { containerNumber }
    });
    
    const result = calculateLogisticsStatus(
      container, 
      portOperations, 
      seaFreight
    );
    
    return {
      status: result.status,
      currentPortType: result.currentPortType
    };
  }
}
```

### 2. 日期验证器

```typescript
class DateValidator {
  
  /**
   * 验证ETA是否有效
   */
  static validateETA(
    eta: Date | null, 
    ata: Date | null, 
    shipDate: Date | null,
    logisticsStatus: string
  ): { valid: boolean; reason?: string; correctedValue?: Date } {
    
    // 规则1: at_port状态必须有ETA
    if (logisticsStatus === 'at_port' && !eta) {
      return { valid: false, reason: 'at_port status requires ETA' };
    }
    
    // 规则2: ETA不能是未来日期（允许1天误差）
    if (eta) {
      const now = new Date();
      const oneDayAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      if (eta > oneDayAhead && logisticsStatus !== 'shipped') {
        return { valid: false, reason: 'ETA is too far in future' };
      }
    }
    
    // 规则3: ETA必须在ATA之前
    if (eta && ata && eta > ata) {
      // 如果ETA晚于ATA，可以尝试从ATA反推合理ETA
      const correctedEta = new Date(ata.getTime() - 7 * 24 * 60 * 60 * 1000); // 默认7天
      return { 
        valid: false, 
        reason: 'ETA is after ATA', 
        correctedValue: correctedEta 
      };
    }
    
    // 规则4: ETA不能早于出运日期
    if (eta && shipDate && eta < shipDate) {
      return { valid: false, reason: 'ETA is before ship date' };
    }
    
    return { valid: true };
  }
  
  /**
   * 验证ATA是否有效
   */
  static validateATA(
    ata: Date | null,
    eta: Date | null,
    shipDate: Date | null,
    logisticsStatus: string,
    portType: 'origin' | 'transit' | 'destination'
  ): { valid: boolean; reason?: string } {
    
    // 规则1: 未出运状态不应有ATA
    if (logisticsStatus === 'not_shipped' && ata) {
      return { valid: false, reason: 'not_shipped should not have ATA' };
    }
    
    // 规则2: ATA不能是未来日期（允许小误差）
    if (ata) {
      const now = new Date();
      if (ata > now) {
        // 如果是at_port状态且ATA是未来日期，可能数据有问题
        if (logisticsStatus === 'at_port') {
          return { valid: false, reason: 'ATA cannot be future for at_port status' };
        }
      }
    }
    
    // 规则3: ATA必须在ETA之后（或同一天）
    if (ata && eta && ata < eta) {
      return { valid: false, reason: 'ATA is before ETA' };
    }
    
    // 规则4: ATA不能早于出运日期
    if (ata && shipDate && ata < shipDate) {
      return { valid: false, reason: 'ATA is before ship date' };
    }
    
    return { valid: true };
  }
}
```

### 3. 智能ETA/ATA更新方法

```typescript
class FeituoImportService {
  
  /**
   * 智能更新ETA/ATA（带状态机推理）
   */
  private async smartUpdateEtaAta(
    containerNumber: string,
    feituoData: {
      places: PlaceInfo[];        // 飞驼发生地信息数组
      destEta?: Date | null;      // 目的港ETA
      destAta?: Date | null;      // 目的港ATA
      transitEta?: Date | null;   // 中转港ETA
      transitAta?: Date | null;   // 中转港ATA
    }
  ): Promise<{ updated: boolean; reason: string }> {
    
    // 步骤1: 获取当前物流状态
    const { status, currentPortType } = await this.getCurrentLogisticsStatus(containerNumber);
    
    // 步骤2: 获取现有记录
    const existingSf = await this.seaFreightRepo.findOne({
      where: { containerNumber }
    });
    
    const portOps = await this.portOpRepo.find({
      where: { containerNumber },
      order: { portSequence: 'ASC' }
    });
    
    const destPo = portOps.find(po => po.portType === 'destination');
    const transitPoList = portOps.filter(po => po.portType === 'transit');
    
    // 步骤3: 根据状态决定更新策略
    let updateReason = '';
    
    switch (status) {
      case 'not_shipped':
        // 未出运：不更新任何日期
        return { updated: false, reason: 'not_shipped status, skip ETA/ATA update' };
      
      case 'shipped':
      case 'in_transit':
        // 在途：只更新ETA，不更新ATA
        if (!existingSf?.eta && feituoData.destEta) {
          const validation = DateValidator.validateETA(
            feituoData.destEta,
            feituoData.destAta,
            existingSf?.shipmentDate || null,
            status
          );
          
          if (validation.valid) {
            existingSf.eta = feituoData.destEta;
            await this.seaFreightRepo.save(existingSf);
            updateReason = 'Updated ETA in transit status';
          } else {
            updateReason = `Skipped ETA: ${validation.reason}`;
          }
        }
        break;
      
      case 'at_port':
        // 已到港：更新ATA，ETA可能需要修正
        if (currentPortType === 'destination' && feituoData.destAta) {
          // 目的港到港
          const ataValidation = DateValidator.validateATA(
            feituoData.destAta,
            feituoData.destEta || existingSf?.eta || null,
            existingSf?.shipmentDate || null,
            status,
            'destination'
          );
          
          if (ataValidation.valid) {
            // 更新目的港PortOperation的ATA
            if (destPo && !destPo.ataDestPort) {
              destPo.ataDestPort = feituoData.destAta;
              await this.portOpRepo.save(destPo);
            }
            
            // 更新海运表的ATA
            if (!existingSf?.ata) {
              existingSf.ata = feituoData.destAta;
              await this.seaFreightRepo.save(existingSf);
            }
            
            updateReason = 'Updated ATA for destination arrival';
          } else {
            updateReason = `Skipped ATA: ${ataValidation.reason}`;
          }
        } else if (currentPortType === 'transit' && feituoData.transitAta) {
          // 中转港到港：更新中转港ATA，保留目的港ETA
          const transitPo = transitPoList[0]; // 假设第一个中转港
          if (transitPo && !transitPo.ataDestPort) {
            transitPo.ataDestPort = feituoData.transitAta;
            await this.portOpRepo.save(transitPo);
          }
          updateReason = 'Updated ATA for transit arrival';
        }
        break;
      
      case 'picked_up':
      case 'unloaded':
      case 'returned_empty':
        // 已提柜/已卸柜/已还箱：已完成物流，ATA应该已稳定
        // 只在ATA为空时更新
        if (!existingSf?.ata && feituoData.destAta) {
          const validation = DateValidator.validateATA(
            feituoData.destAta,
            feituoData.destEta || existingSf?.eta || null,
            existingSf?.shipmentDate || null,
            status,
            'destination'
          );
          
          if (validation.valid) {
            existingSf.ata = feituoData.destAta;
            await this.seaFreightRepo.save(existingSf);
            updateReason = 'Completed物流, updated final ATA';
          }
        }
        break;
    }
    
    return { updated: !!updateReason, reason: updateReason || 'No update needed' };
  }
}
```

---

## ⚠️ 状态码到ATA的映射

### 可靠状态码（用于确定ATA）

| 状态码 | 含义 | 是否可用于ATA | 说明 |
|--------|------|---------------|------|
| BDAR | 抵港 | ✅ | 船舶已到达港口 |
| POCA | 靠泊 | ✅ | 船舶已靠泊 |
| IRAR | 铁运到站 | ✅ | 火车已到达目的地 |
| FETA | 交货地抵达 | ✅ | 货物已到达最终目的地 |
| DSCH | 卸船 | ✅ | 货物已卸下船舶 |
| IRDS | 铁运卸箱 | ✅ | 火车已卸箱 |

### 预计状态码（仅用于ETA）

| 状态码 | 含义 | 是否可用于ATA | 说明 |
|--------|------|---------------|------|
| FETA | 预计到达 | ❌ | 预计交货 |
| BDAR | 预计抵港 | ❌ | 预计到港 |
| POCA | 预计靠泊 | ❌ | 预计靠泊 |

### 取值优先级

```typescript
const ATA_STATUS_PRIORITY = [
  'FETA',   // 交货地到达（最优先）
  'IRAR',   // 铁运到站
  'IRDS',   // 铁运卸箱
  'BDAR',   // 抵港
  'POCA',   // 靠泊
  'DSCH'    // 卸船
];

const ETA_STATUS_PRIORITY = [
  'FETA',   // 预计交货
  'IRAR',   // 预计铁运到站
  'BDAR',   // 预计抵港
  'POCA'    // 预计靠泊
];
```

---

## 📊 验证日志示例

```
[FeituoImport] ETA/ATA Update Analysis:
  Container: ECMU5400183
  Current Status: in_transit
  Current Port Type: null
  
  Input Data:
    - Destination ETA: 2025-02-15
    - Destination ATA: null
    - Transit ATA: 2025-02-10
  
  Validation:
    - ETA valid: true
    - ATA valid: N/A (no ATA provided)
  
  Decision: Update ETA only (in_transit status)
  Result: ETA updated to 2025-02-15
```

---

## ✅ 已实施改进（2026-03-19）

### 1. 海铁联运ETA区分
- 海港ETA (`po.eta`)：用于滞港费计算
- 火车目的地ETA (`po.transitArrivalDate`)：用于海铁联运跟踪

### 2. 更新规则
- ETA（预计日期）：可以更新（预计日期可能会修正）
- ATA（实际日期）：只更新空值

---

## 📋 智能ETA更新状态机（待完整实施）

### 实现状态
- [x] 海铁联运ETA区分 ✅
- [x] ETA/ATA更新规则 ✅
- [ ] 物流状态推理 ⏳ (部分)
- [ ] 时间验证规则 ⏳ (部分)

### 待完整实现的功能

#### 1. 物流状态推理
```typescript
// 根据当前物流状态决定ETA更新策略
const currentStatus = calculateLogisticsStatus(container, portOps, seaFreight);

switch (currentStatus) {
  case 'not_shipped':  // 不更新
  case 'shipped':      // 可以更新ETA
  case 'in_transit':   // 可以更新ETA
  case 'at_port':      // ETA<=ATA验证
  case 'picked_up':    // 保持稳定
  // ...
}
```

#### 2. 时间验证规则
- ETA不能是未来太久（shipped最多90天，其他60天）
- ETA不能早于出运日期
- ETA不能晚于ATA

---

## 🚂 海铁联运ETA处理（2026-03-19 实施）

### 背景
海铁联运流程：起运港 → 海运 → 目的港海港(DEHAM) → 火车 → 最终目的地(内陆城市)

飞驼数据中包含多个目的地：
- **海港目的港**：船舶靠泊的港口（如 DEHAM 汉堡）
- **火车目的地**：火车最终到达的内陆城市（如 DEDUS 杜伊斯堡）

### placeType 区分

| placeType | 含义 | 用途 |
|-----------|------|------|
| 目的地 | 海港目的港 | 滞港费计算起点 |
| 交货地 | 火车目的地 | 海铁联运跟踪 |

### 实现代码

```typescript
// 解析 places 数组，区分海港和火车目的地
const destPlaces = places.filter(p => 
  p.placeType?.includes('目的地') || p.placeType?.includes('交货地')
);

// 海港目的港：不是交货地的目的地
let seaDestPlace = destPlaces.find(p => !p.placeType?.includes('交货地'));

// 火车目的地：交货地类型的地点
let railDestPlace = destPlaces.find(p => p.placeType?.includes('交货地'));
```

### ETA/ATA 更新规则

| 字段 | 数据来源 | 更新条件 | 用途 |
|------|----------|----------|------|
| po.eta (海港ETA) | seaDestPlace.eta | 只更新空值 | 滞港费计算起点 |
| po.ata (海港ATA) | seaDestPlace.ata | 只更新空值 | 实际到港确认 |
| po.transitArrivalDate (火车到达) | railDestPlace.eta | 只更新空值 | 海铁联运跟踪 |
| po.destPortUnloadDate | seaDestPlace.actualDischarge | 只更新空值 | 卸船日 |

### 数据流向

```
飞驼 发生地信息 数组
     │
     ├── 目的地(海港) ──► po.eta / po.ata / po.destPortUnloadDate
     │                     (滞港费计算用)
     │
     └── 交货地(火车) ──► po.transitArrivalDate
                           (海铁联运跟踪用)
```

### 已修改文件

- `backend/src/services/feituoImport.service.ts`
  - mergeTable1ToCore 方法：添加 seaDestPlace/railDestPlace 区分逻辑
  - mergeTable2ToCore 方法：添加 seaDestPlace/railDestPlace 区分逻辑
  - 所有日期字段更新：改为"只更新空值"

---

## 🔨 重构（2026-03-19 实施）

### 重构目的
飞驼导入服务代码行数过多(~1400行)，存在大量重复代码，需要提取为独立组件以增强复用能力。

### 新增组件

#### 1. FeituoPlaceAnalyzer.ts
- **位置**: `backend/src/services/feituo/FeituoPlaceAnalyzer.ts`
- **功能**: 地点解析、港口类型区分
- **核心方法**:
  - `parsePlaceArray(row)`: 解析发生地信息数组，支持JSON数组格式和后缀列格式
  - `analyzePorts(places, existingSeaFreight)`: 区分海港目的港和火车目的地

#### 2. FeituoSmartDateUpdater.ts
- **位置**: `backend/src/services/feituo/FeituoSmartDateUpdater.ts`
- **功能**: ETA/ATA智能更新（带状态机验证）
- **核心方法**:
  - `smartUpdateETA(containerNumber, newEta, newAta)`: 根据物流状态决定更新策略
  - `validateETA(eta, ata, shipDate, logisticsStatus)`: 验证ETA有效性

### 重构效果
- 移除重复代码约 ~80行
- 主服务类从 ~1423行 减少到 ~1340行 (减少约6%)
- 职责分离，更易于测试和维护

### 调用方式
```typescript
import { feituoPlaceAnalyzer, PortAnalysisResult } from './feituo/FeituoPlaceAnalyzer';
import { feituoSmartDateUpdater } from './feituo/FeituoSmartDateUpdater';

// 地点解析
const places = feituoPlaceAnalyzer.parsePlaceArray(row);
const portAnalysis = feituoPlaceAnalyzer.analyzePorts(places, existingSf);

// 智能日期更新
const result = await feituoSmartDateUpdater.smartUpdateETA(containerNumber, newEta, newAta);
```

---

## 🔗 相关文件

- **状态机**: `backend/src/utils/logisticsStatusMachine.ts`
- **飞驼导入**: `backend/src/services/feituoImport.service.ts`
- **字段分组**: `backend/src/constants/FeituoFieldGroupMapping.ts`

---

**文档版本**: v1.0  
**最后更新**: 2026-03-19
