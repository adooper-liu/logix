# 统计口径可视化组件使用说明

## 功能概述

根据 `public/docs-temp/statistics-visualization.md` 的可视化方案，新增了一个前端统计口径可视化组件，用于展示货柜不同状态的包含、排除与关系结构，帮助用户理解数据统计口径，避免被代码错误欺骗。

## 访问路径

- **路由路径**: `/statistics-visualization`
- **菜单位置**: 导航栏 → 货柜 → 统计口径可视化

## 功能特性

### 1. 数据概览
- 展示总货柜数、在途货柜、已提柜货柜
- 数据验证通过率（基于4项一致性检查）
- 实时刷新数据（30秒自动刷新）

### 2. 状态分布
- 展示所有货柜按物流状态的分布
- 包含7种状态：未出运、已出运、在途、已到港、已提柜、已卸柜、已还箱
- 总计应等于货柜总数

### 3. 到港分布
- 基于ETA和ATA日期的到港统计
- 目标集：已出运 + 在途 + 已到港
- 8个分类：已逾期未到港、到达中转港、今日到港、今日之前到港、3天内预计到港、7天内预计到港、7天以上预计到港、其他情况
- 验证：到港统计总和 ≤ 目标集

### 4. 提柜分布
- 已到港但尚未提柜货柜的提柜安排情况
- 目标集：已到港 (at_port)
- 6个分类：计划提柜逾期、今日计划提柜、今日实际提柜、待安排提柜、3天内预计提柜、7天内预计提柜

### 5. 最晚提柜
- 最后免费日倒计时（仅未安排拖卡运输的货柜）
- 关键区别：只统计无拖卡运输记录的货柜
- 与"按提柜统计"的区别：
  - "按提柜"：统计所有 at_port 货柜
  - "最晚提柜"：只统计无拖卡运输记录的货柜
- 5个分类：已超时、即将超时(1-3天)、预警(4-7天)、时间充裕(7天以上)、缺最后免费日

### 6. 最晚还箱
- 最后还箱日倒计时
- 目标集：已提柜 + 已卸柜
- 必须条件：有还箱记录且未还箱
- 5个分类：已超时、即将超时(1-3天)、预警(4-7天)、时间充裕(7天以上)、缺最后还箱日
- 验证：还箱统计总和 = 目标集

## 数据验证规则

### 规则1: 状态分布总和
```
not_shipped + shipped + in_transit + at_port + picked_up + unloaded + returned_empty = 总货柜数
```

### 规则2: 到港统计 vs 目标集
```
overdue + transit + today + arrived-before-today + within3Days + within7Days + over7Days + other
≤ shipped + in_transit + at_port
```

### 规则3: 提柜统计 + 最晚提柜 vs at_port
```
(按提柜统计总和) + (最晚提柜统计总和) ≤ at_port
```

### 规则4: 还箱统计 vs picked_up+unloaded
```
expired + urgent + warning + normal + noLastReturnDate = picked_up + unloaded
```

## 可视化特点

1. **颜色编码**：
   - 红色边框：已超时（过期）
   - 橙色边框：即将超时（紧急）
   - 蓝色背景：正常状态
   - 绿色标记：验证通过
   - 红色标记：验证失败

2. **信息提示框**：
   - 黄色警告框：目标集说明、关键区别说明
   - 蓝色信息框：包含条件说明

3. **验证表格**：
   - 显示每个验证项目的预期值、实际值、差异
   - 通过/失败状态一目了然
   - 差异用颜色标记（绿色=无差异，红色=有差异）

## API接口

### 获取详细统计数据
```
GET /api/v1/containers/statistics-detailed
```
返回数据：
```json
{
  "success": true,
  "data": {
    "statusDistribution": {
      "not_shipped": 0,
      "shipped": 0,
      "in_transit": 85,
      "at_port": 92,
      "picked_up": 54,
      "unloaded": 0,
      "returned_empty": 119
    },
    "arrivalDistribution": {
      "overdue": 21,
      "transit": 79,
      "today": 0,
      "arrivedBeforeToday": 219,
      "within3Days": 27,
      "within7Days": 16,
      "over7Days": 21,
      "other": 85
    },
    "pickupDistribution": {
      "overdue": 23,
      "todayPlanned": 19,
      "todayActual": 0,
      "pending": 0,
      "within3Days": 30,
      "within7Days": 6
    },
    "lastPickupDistribution": {
      "expired": 0,
      "urgent": 0,
      "warning": 0,
      "normal": 0,
      "noLastFreeDate": 0
    },
    "returnDistribution": {
      "expired": 6,
      "urgent": 9,
      "warning": 13,
      "normal": 26,
      "noLastReturnDate": 0
    }
  }
}
```

### 获取统计数据验证
```
GET /api/v1/containers/statistics-verify
```
返回数据：
```json
{
  "success": true,
  "data": {
    "totalContainers": 350,
    "totalInTransit": 177,
    "totalArrival": 468,
    "totalPickup": 78,
    "totalLastPickup": 0,
    "totalReturn": 54,
    "atPortTotal": 92,
    "pickedUpTotal": 54,
    "checks": [
      {
        "name": "状态分布总和",
        "status": "PASS",
        "expected": 350,
        "actual": 350,
        "diff": 0
      },
      {
        "name": "到港统计 vs 目标集",
        "status": "FAIL",
        "expected": "≤ 177",
        "actual": 468,
        "diff": 291
      },
      {
        "name": "提柜统计 + 最晚提柜 vs at_port",
        "status": "PASS",
        "expected": "≤ 92",
        "actual": 78,
        "diff": -14
      },
      {
        "name": "还箱统计 vs picked_up+unloaded",
        "status": "PASS",
        "expected": 54,
        "actual": 54,
        "diff": 0
      }
    ]
  }
}
```

## 文件结构

### 前端文件
```
frontend/src/
├── views/shipments/
│   └── StatisticsVisualization.vue          # 统计可视化组件
├── services/
│   └── container.ts                         # 添加了 getStatisticsVerify 方法
├── router/
│   └── index.ts                            # 添加了路由配置
├── components/layout/
│   └── Layout.vue                          # 添加了菜单项
└── locales/
    └── zh-CN.ts                           # 添加了国际化文本
```

### 后端文件
```
backend/src/
├── controllers/
│   └── container.controller.ts             # 添加了 getStatisticsVerify 方法
└── routes/
    └── container.routes.ts                 # 添加了 API 路由
```

## 使用场景

1. **数据问题排查**：当怀疑统计数据有误时，通过验证表格快速定位问题
2. **统计口径理解**：通过可视化结构理解各统计口径的包含与排除关系
3. **业务状态监控**：通过颜色编码快速识别需要关注的问题（如已超时、即将超时）
4. **新人培训**：帮助新成员快速理解物流状态流转和统计逻辑

## 注意事项

1. **最晚提柜全为0是正常的**：如果所有 at_port 货柜都已安排拖卡运输，则最晚提柜统计会全为0
2. **到港统计可能重复计数**：当前版本存在货柜与港口操作表一对多关系导致的重复计数，需要后端修复
3. **自动刷新**：页面每30秒自动刷新数据，也可手动点击刷新按钮
4. **验证通过率**：基于4项一致性检查，100%表示所有验证都通过

## 后续改进建议

1. **修复到港统计的重复计数问题**：所有到港相关查询改用 `COUNT(DISTINCT)`
2. **添加历史趋势图**：展示统计数据的历史变化趋势
3. **添加导出功能**：支持将统计数据导出为 Excel 或 PDF
4. **添加异常报警**：当验证失败或出现异常数据时，发送通知
5. **添加数据钻取**：点击统计数字可以查看具体的货柜列表
