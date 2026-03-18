# DictionaryExtractor故障排查指南

**文档版本**: v1.0  
**创建日期**: 2026-03-18  
**适用范围**: 前端Excel字典数据提取工具

---

## 1. 常见问题

### 1.1 "Bad uncompressed size" 错误

**错误信息**:
```
DictionaryExtractor.vue:154 Bad uncompressed size: XXXXX != 0
```

**原因**:
1. Excel文件格式不兼容（可能是旧版Excel格式）
2. 文件已损坏或不完整
3. 文件包含特殊格式（宏、数据验证、图表等）
4. SheetJS库版本问题

**解决方案**:

#### 方案1: 重新保存Excel文件
1. 用Microsoft Excel打开文件
2. 点击"文件" → "另存为"
3. 选择格式:
   - **推荐**: "Excel工作簿 (*.xlsx)"
   - **备选**: "Excel 97-2003工作簿 (*.xls)"
4. 重新上传保存后的文件

#### 方案2: 清理Excel文件
1. 复制所有数据到新的Excel文件
2. 仅粘贴值（右键 → 粘贴选项 → 值）
3. 重新上传新文件

#### 方案3: 导出为CSV再转回Excel
1. 在Excel中打开文件
2. 点击"文件" → "另存为"
3. 选择"CSV UTF-8 (逗号分隔) (*.csv)"
4. 重新打开CSV文件
5. 再另存为Excel格式 (*.xlsx)
6. 重新上传

**预防措施**:
- 使用标准Excel格式（避免宏、ActiveX控件）
- 保持SheetJS库版本最新（当前: 0.18.5）
- 上传前检查文件大小（建议 < 50MB）

---

### 1.2 "未识别到任何关键列" 警告

**警告信息**:
```
未识别到任何关键列（船公司、港口、状态码、运输方式），请检查Excel表头
```

**原因**:
1. 列名不匹配（大小写、空格、特殊字符）
2. 列名在第二行或更后
3. Excel文件没有表头行
4. 列名使用了不常见的名称

**解决方案**:

#### 方案1: 检查支持的列名

工具支持的列名：

**船公司列**:
- 船公司
- 船公司名称
- 船公司.供应商全称（中）
- shipping company
- carrier
- carrier code

**港口列**:
- 目的港
- 目的港名称
- 目的港.名称
- port of discharge
- destination port
- POD
- port

**状态码列**:
- 状态码
- status code
- status
- 事件代码
- event code
- eventcode

**运输模式列**:
- 运输方式
- transport mode
- 运输模式
- mode of transport
- transportmode
- mode

#### 方案2: 查看实际表头

1. 打开浏览器的开发者工具（F12）
2. 上传Excel文件
3. 查看Console日志中的"表头样本"
4. 对比实际表头和支持的列名

**日志示例**:
```javascript
表头样本: (10) ['箱号', '船公司', '目的港', '状态码', '运输方式', ...]
找到的列索引: {
  shippingCompanyCol: 1 (船公司),
  portCol: 2 (目的港),
  statusCol: 3 (状态码),
  transportModeCol: 4 (运输方式)
}
```

#### 方案3: 修改Excel表头

如果实际表头不匹配，修改Excel文件的第1行：

**示例**:
```
修改前:
Column A: "箱号(集装箱号)"
Column B: "船司"
Column C: "港口"

修改后:
Column A: "集装箱号"
Column B: "船公司"
Column C: "目的港"
```

#### 方案4: 扩展匹配规则

如需添加自定义列名，修改 `DictionaryExtractor.vue` 第173-184行：

```typescript
// 找到关键列的索引 - 优化匹配逻辑
const shippingCompanyCol = cleanHeaders.findIndex(h => {
  const headerLower = h.toLowerCase()
  return [
    '船公司', 
    '船公司名称', 
    '船公司.供应商全称（中）', 
    'shipping company', 
    'carrier', 
    'carrier code',
    '你的自定义列名'  // 添加自定义列名
  ].some(keyword => 
    headerLower.includes(keyword.toLowerCase()) || 
    keyword.toLowerCase().includes(headerLower)
  )
})
```

---

### 1.3 只识别到部分列

**警告信息**:
```
成功识别到 1/2/3 个关键列: ...
```

**原因**:
1. 部分列名匹配，部分不匹配
2. Excel文件列名拼写错误
3. 列名包含特殊字符或空格

**解决方案**:

#### 方案1: 查看识别到的列

注意提示信息中的列名，例如：
```
成功识别到 2 个关键列: 船公司: 船公司, 运输模式: 运输方式
```

这表示：
- ✅ 船公司列已识别（第B列）
- ❌ 港口列未识别
- ❌ 状态码列未识别
- ✅ 运输模式列已识别（第D列）

#### 方案2: 检查未识别的列

1. 打开Console日志，查看"表头样本"
2. 找到未识别列的实际名称
3. 对比支持的列名列表
4. 修改Excel表头或扩展匹配规则

**示例**:
```javascript
// Console日志
表头样本: ['箱号', '船公司', '目的港口', '状态代码', '运输方式']

// 问题
'目的港口' 不匹配 '目的港'
'状态代码' 不匹配 '状态码'

// 解决方案
修改Excel: '目的港口' → '目的港'
修改Excel: '状态代码' → '状态码'
```

---

### 1.4 提取数据为空

**现象**: 成功识别列，但提取结果为空

**原因**:
1. 数据行从第3行开始（第2行为空）
2. 单元格为空或只有空格
3. 数据在合并单元格中
4. 列索引错误

**解决方案**:

#### 方案1: 检查数据起始行

确保数据从第2行开始：
```
第1行: 表头（船公司、目的港、状态码、运输方式）
第2行: 数据1（CMA, CNSHA, LOBD, 大船）
第3行: 数据2（MSK, FRLEH, DLPT, 大船）
...
```

#### 方案2: 查看提取日志

在Console中查看提取结果：
```javascript
提取结果: 
{
  shippingCompanies: Set(2) {"CMA", "MSK"},
  ports: Set(2) {"CNSHA", "FRLEH"},
  statusCodes: Set(2) {"LOBD", "DLPT"},
  transportModes: Set(1) {"大船"},
  rowCount: 100
}
```

#### 方案3: 检查空值过滤

查看代码中的空值过滤逻辑：
```typescript
// 跳过空值
if (excelValue === null || excelValue === undefined || excelValue === '') {
  return
}
```

确保数据中不是空字符串或空格。

---

### 1.5 Excel文件过大

**现象**: 浏览器卡顿或上传失败

**原因**:
1. Excel文件超过50MB
2. 包含大量格式化、图表、图片
3. 浏览器内存不足

**解决方案**:

#### 方案1: 减少文件大小

1. 删除不必要的列（保留关键列即可）
2. 删除不必要的行（空行、测试数据）
3. 清除格式化（保留纯文本）

#### 方案2: 分批处理

将大文件拆分为多个小文件（每个<5000行）：
```
原始文件: logistics_data_10000rows.xlsx
拆分为:
  - logistics_data_part1_5000rows.xlsx
  - logistics_data_part2_5000rows.xlsx
```

#### 方案3: 使用CSV格式

CSV文件通常比Excel文件小50-70%：
1. 在Excel中打开文件
2. 另存为CSV格式
3. 上传CSV文件（注意：DictionaryExtractor主要支持Excel，CSV需转换）

---

## 2. 调试技巧

### 2.1 查看Console日志

打开浏览器的开发者工具（F12），查看Console日志：

**关键日志**:
```javascript
// 表头样本
表头样本: ['箱号', '船公司', '目的港', '状态码', '运输方式', ...]

// 找到的列索引
找到的列索引: {
  shippingCompanyCol: "1 (船公司)",
  portCol: "2 (目的港)",
  statusCol: "3 (状态码)",
  transportModeCol: "4 (运输方式)"
}

// 提取结果
提取结果: {
  shippingCompanies: Set(5) {"CMA", "MSK", "MSC", "HPL", "WHL"},
  ports: Set(10) {"CNSHA", "CNNGB", "FRLEH", "USSAV", ...},
  statusCodes: Set(15) {"LOBD", "DLPT", "BDAR", "DSCH", "RCVE", ...},
  transportModes: Set(4) {"大船", "驳船", "铁路", "卡车"},
  rowCount: 1000
}
```

### 2.2 检查文件格式

在Console中检查文件对象：
```javascript
// 上传后，在handleFileChange中
console.log('文件信息:', {
  name: selectedFile.value.name,
  size: selectedFile.value.size,
  type: selectedFile.value.type,
  lastModified: selectedFile.value.lastModified
})

// 期望输出
文件信息: {
  name: "飞驼数据.xlsx",
  size: 1024000,  // 约1MB
  type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  lastModified: 1678886400000
}
```

### 2.3 验证映射配置

在Console中测试状态码映射：
```javascript
// 打开Console，粘贴以下代码
const testStatusCodes = ['LOBD', 'DLPT', 'BDAR', 'FDDP', 'FDLB', 'FDBA', 'RCVE']

console.log('状态码映射测试:')
testStatusCodes.forEach(code => {
  const coreField = getCoreFieldName(code)
  const portType = getPortTypeForStatusCode(code)
  console.log(`${code}: ${coreField || '未映射'} (${portType || 'unknown'})`)
})

// 期望输出
状态码映射测试:
LOBD: shipment_date (origin)
DLPT: shipment_date (origin)
BDAR: ata_dest_port (destination)
FDDP: shipment_date (origin)
FDLB: shipment_date (origin)
FDBA: transit_arrival_date (transit)
RCVE: return_time (destination)
```

---

## 3. 常见问题快速解决

### Q1: 上传Excel后页面无反应

**检查项**:
1. 文件格式是否为.xlsx或.xls
2. 文件大小是否超过50MB
3. 浏览器Console是否有错误
4. 是否选择了正确的文件

### Q2: 提取结果数量不对

**检查项**:
1. 数据行是否从第2行开始
2. 是否有空行或空单元格
3. 列名是否被正确识别
4. 查看Console中的提取结果

### Q3: 状态码验证显示全部未映射

**检查项**:
1. 状态码列是否被识别
2. 状态码是否为大写字母
3. 查看`FeiTuoStatusMapping.ts`配置
4. 检查状态码是否在支持列表中

### Q4: 导出CSV/SQL失败

**检查项**:
1. 是否有提取结果（rowCount > 0）
2. 浏览器是否允许下载
3. 查看Console错误日志
4. 尝试重新提取数据

---

## 4. 联系技术支持

如果以上方法无法解决问题，请提供以下信息：

1. **错误截图**
2. **Console日志**（特别是"表头样本"和"找到的列索引"）
3. **Excel文件表头**（第1行的列名）
4. **文件基本信息**（文件名、大小、格式）
5. **操作步骤**（详细描述）

**联系方式**: 技术团队  
**响应时间**: 工作日内4小时

---

**文档版本**: v1.0  
**最后更新**: 2026-03-18  
**下次更新**: 按需更新
