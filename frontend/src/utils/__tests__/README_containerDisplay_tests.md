# containerDisplay 工具函数测试

## 测试命令

```bash
cd frontend
npm run test -- containerDisplay
```

## 测试覆盖的函数

### ✅ getUtcDayNumber
- [x] 将日期字符串转换为 UTC 天数
- [x] 将 Date 对象转换为 UTC 天数
- [x] 处理无效输入返回 null

### ✅ getDateTagType
- [x] 日期为 null 时返回 info
- [x] 早于最晚日期返回 success
- [x] 等于最晚日期返回 success
- [x] 晚于 1-3 天返回 warning
- [x] 晚于超过 3 天返回 danger
- [x] 非 pickup/return 类型返回 info

### ✅ getDestinationPortDisplay
- [x] 优先使用港口名称
- [x] 无名称时使用港口代码
- [x] 无信息时返回 '-'

### ✅ getCustomsStatusText
- [x] 映射清关状态到中文
- [x] 处理未知状态
- [x] 处理空值

### ✅ formatAlertTypeBadge
- [x] 映射预警类型到中文
- [x] 处理 undefined
- [x] 处理未知类型

### ✅ formatCostModeText
- [x] 映射费用模式到中文
- [x] 处理默认值

### ✅ formatCostItemName
- [x] 优先使用 chargeName
- [x] 映射 chargeType 到标准名称
- [x] 处理未知类型

### ✅ getRowCurrencyPrefix
- [x] 优先使用 countryCurrency
- [x] 使用 sellToCountry 作为备选
- [x] 使用 costBreakdown.currency 作为最后备选
- [x] 默认返回 '$'

### ✅ escapeHtml
- [x] 转义 HTML 特殊字符
- [x] 处理多个特殊字符

### ✅ getFiveNodeKinds
- [x] 处理全部完成的状态
- [x] 处理数据缺失的情况
- [x] 处理不同的物流状态

### ✅ getFiveNodeRows
- [x] 生成完整的五节点数据
- [x] 处理需要查验的情况

### ✅ getEtaCorrection
- [x] 从 portOperations 提取 etaCorrection
- [x] 使用 portOperations 参数
- [x] 无目的港操作时返回 null
- [x] 空数组时返回 null

### ✅ getCostDetailsText
- [x] 生成 HTML 格式的费用详情
- [x] 无费用项时返回提示文本
- [x] 使用自定义货币前缀

## 手动验证示例

在浏览器控制台或 Node.js 环境中测试：

```javascript
import {
  getUtcDayNumber,
  getDateTagType,
  getDestinationPortDisplay,
  getFiveNodeKinds,
  formatAlertTypeBadge,
  getRowCurrencyPrefix,
} from '@/utils/containerDisplay'

// 测试 UTC 天数
console.log('UTC Day:', getUtcDayNumber('2024-03-15')) // 19796

// 测试日期标签
console.log('Date Tag:', getDateTagType('2024-03-10', undefined, 'pickup', '2024-03-15')) // 'success'

// 测试港口显示
console.log('Port:', getDestinationPortDisplay({ 
  destinationPortName: '洛杉矶港', 
  destinationPort: 'USLAX' 
})) // '洛杉矶港'

// 测试五节点状态
const container = {
  customsStatus: 'COMPLETED',
  plannedPickupDate: '2024-03-15',
  logisticsStatus: 'unloaded',
  returnTime: '2024-03-20',
  inspectionRequired: false,
}
console.log('Five Nodes:', getFiveNodeKinds(container))
// { customs: 'ok', pickup: 'ok', unload: 'ok', emptyReturn: 'ok', inspection: 'ok' }

// 测试预警徽章
console.log('Alert Badge:', formatAlertTypeBadge('demurrage')) // '滞港'

// 测试货币前缀
console.log('Currency:', getRowCurrencyPrefix({ countryCurrency: 'EUR' })) // '€'
```

## 运行单元测试

如果安装了 vitest 和 jsdom：

```bash
# 安装依赖
npm install -D jsdom

# 运行测试
npm run test -- containerDisplay
```

## 查看测试覆盖率

```bash
npm run test:coverage -- containerDisplay
```

然后打开 `frontend/coverage/index.html` 查看详细报告。
