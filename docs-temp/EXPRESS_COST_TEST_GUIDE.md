# 全球快递费决策可视化 - 快速测试指南

## 🎯 测试目标

验证前端页面与后端 API 的集成是否正常。

---

## 📋 前置条件

### 1. 数据库已迁移

```bash
# 验证表是否存在
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "\dt dict_express_*"
```

预期输出：

```
 Schema |              Name              | Type  |   Owner
--------+--------------------------------+-------+------------
 public | dict_express_carrier_service   | table | logix_user
 public | dict_express_stack_policy      | table | logix_user
 public | dict_express_surcharge_rule    | table | logix_user
 public | dict_express_surcharge_version | table | logix_user
(4 rows)
```

### 2. 后端服务运行中

```bash
cd d:\Github\logix\backend
npm run dev
```

检查日志：

- ✅ Database connected successfully
- ✅ Redis connected successfully
- ✅ Server listening on port 3002（或配置的端口）

### 3. 前端服务运行中

```bash
cd d:\Github\logix\frontend
npm run dev
```

访问: `http://localhost:5173`

---

## 🧪 测试步骤

### 测试 1: 导航栏菜单显示

**步骤**:

1. 打开浏览器，访问 `http://localhost:5173`
2. 登录系统
3. 查看左侧导航栏

**预期结果**:

- ✅ 显示"尾程"一级菜单（货车图标 Van）
- ✅ 展开后显示 2 个子菜单：
  - 快递费规则导入（Upload 图标）
  - 快递模型试算（Calculator 图标）

**失败排查**:

- 清除浏览器缓存（Ctrl + Shift + R）
- 检查控制台是否有路由错误

---

### 测试 2: 快递费规则导入页面

**步骤**:

1. 点击"尾程" → "快递费规则导入"
2. 查看页面布局

**预期结果**:

- ✅ 页面标题显示"📤 全球快递费规则导入"
- ✅ 右上角有"下载模板"按钮
- ✅ 显示 Excel 格式说明提示框
- ✅ 中央有拖拽上传区域

**测试下载模板**:

1. 点击"下载模板"按钮
2. 检查是否下载了 `全球快递费规则_模板.xlsx`
3. 用 Excel 打开，验证包含以下 Sheet：
   - surcharge_rules
   - metadata

**测试文件上传**:

1. 准备一个符合格式的 Excel 文件
2. 拖拽到上传区域或点击选择文件
3. 等待上传完成

**预期结果**:

- ✅ 显示上传进度
- ✅ 成功后显示：
  ```
  ✅ 导入完成
  成功: XXX 条
  失败: 0 条
  版本 ID: 1
  ```
- ✅ 如果失败，显示错误详情表格

**API 调用验证**:
打开浏览器开发者工具（F12）→ Network 标签，检查请求：

```
POST /api/v1/express-cost/import-excel
Content-Type: multipart/form-data
```

响应示例：

```json
{
  "success": true,
  "message": "导入完成：成功 193 条，失败 0 条",
  "data": {
    "success": 193,
    "failed": 0,
    "errors": [],
    "versionId": 1
  }
}
```

---

### 测试 3: 快递费试算页面

**步骤**:

1. 点击"尾程" → "快递模型试算"
2. 查看页面布局

**预期结果**:

- ✅ 左右分栏布局
- ✅ 左侧：试算表单
- ✅ 右侧：计算结果（初始为空状态）

**测试表单填写**:

1. 国家代码: 选择 "美国 (US)"
2. 承运商: 应自动加载并选择第一个（如 FedEx Ground）
3. 规则版本: 保持默认（使用最新版本）
4. 包裹尺寸:
   - 最长边: 50
   - 次长边: 30
   - 最短边: 20
5. 毛重: 40
6. 数量: 1
7. 包装类型: 瓦楞纸箱 (CARTON)

**测试计算**:

1. 点击"开始试算"按钮
2. 观察 loading 状态
3. 查看右侧结果

**预期结果（US FedEx Ground, 50x30x20in, 40lb）**:

```
计费重: 40.00 lb
体积重: 21.58 lb  (50*30*20/139)
附加费总额: $4.87

费用分项:
┌──────┬─────────────┬────────┐
│ 类型 │ 原始名称     │ 金额   │
├──────┼─────────────┼────────┤
│ AHS  │ AHS-Dimensions│ $4.87│
└──────┴─────────────┴────────┘
```

**测试拒收场景**:
修改表单：

- 最长边: 100
- 次长边: 40
- 最短边: 30
- 毛重: 160

点击"开始试算"

**预期结果**:

```
❌ 拒收
原因: 计费重超过上限 150lb
```

**API 调用验证**:
Network 标签检查请求：

```
POST /api/v1/express-cost/calculate
Content-Type: application/json

Request Body:
{
  "countryCode": "US",
  "carrierServiceId": 1,
  "longestIn": 50,
  "secondIn": 30,
  "shortestIn": 20,
  "grossWeightLbs": 40,
  "quantity": 1,
  "packagingType": "CARTON"
}
```

响应示例：

```json
{
  "success": true,
  "data": {
    "status": "OK",
    "billableWeightLbs": 40,
    "volumeWeightLbs": 21.58,
    "totalSurcharge": 4.87,
    "charges": [
      {
        "type": "AHS_DIM",
        "typeRaw": "AHS - Dimensions",
        "amount": 4.87,
        "triggered": true
      }
    ],
    "metadata": {
      "rulesMatched": 1,
      "rulesDisabled": 0
    }
  }
}
```

---

### 测试 4: 互斥策略验证

**场景**: Oversize 触发后禁用 AHS

**表单数据**:

- 国家: US
- 承运商: FedEx Ground
- 最长边: 100 in
- 次长边: 40 in
- 最短边: 30 in
- 毛重: 80 lb

**预期结果**:

```
计费重: 80.00 lb
体积重: 86.33 lb  (100*40*30/139)
附加费总额: $39.00

费用分项:
┌────────┬──────────┬────────┐
│ 类型   │ 原始名称  │ 金额   │
├────────┼──────────┼────────┤
│ OVERSIZE│ Oversize│ $39.00│
│ AHS    │ AHS-Dim  │ $0.00  │ ← 被禁用
└────────┴──────────┴────────┘

禁用原因: IF_THEN_DISABLE(OVERSIZE -> AHS_DIM)
```

---

### 测试 5: 多箱场景

**表单数据**:

- 国家: CA
- 承运商: FedEx Ground
- 最长边: 40 in
- 次长边: 30 in
- 最短边: 20 in
- 毛重: 50 lb
- **数量: 10**

**预期结果**:

- 单箱计费重: 50 lb
- 总体积重: 17.27 lb \* 10 = 172.7 lb
- 总毛重: 500 lb
- 计费重取 max(500, 172.7) = 500 lb

如果 CA 有规则 "单箱 > 150lb 拒收"，则应返回拒收。

---

## 🐛 常见问题

### Q1: 承运商列表为空

**原因**: 数据库中未导入规则数据  
**解决**: 先执行测试 2，导入 Excel 规则文件

### Q2: 计算结果为空或报错

**原因**:

1. 后端服务未启动
2. API 路径配置错误

**解决**:

```bash
# 检查后端是否运行
curl http://localhost:3002/api/v1/express-cost/versions

# 检查前端环境变量
cat frontend/.env.development | grep VITE_API_BASE_URL
```

### Q3: 导入失败，提示 "Excel 文件缺少必需的 Sheet"

**原因**: Excel 文件格式不正确  
**解决**:

1. 点击"下载模板"获取正确格式
2. 确保包含 `surcharge_rules` 和 `metadata` Sheet
3. Sheet 名称必须完全匹配（区分大小写）

### Q4: 图标不显示

**原因**: Element Plus 图标未正确注册  
**解决**:

1. 检查 Layout.vue 是否导入了 `Calculator` 和 `Van`
2. 重启前端开发服务器

---

## ✅ 验收清单

完成以下所有检查项即表示测试通过：

- [ ] 导航栏显示"尾程"菜单
- [ ] 能访问快递费规则导入页面
- [ ] 能下载模板文件
- [ ] 能成功导入 Excel 规则文件
- [ ] 导入结果显示正确
- [ ] 能访问快递费试算页面
- [ ] 表单字段完整且可编辑
- [ ] 承运商列表能动态加载
- [ ] 基本费用计算正确（AHS_DIM）
- [ ] 互斥策略生效（Oversize 禁用 AHS）
- [ ] 拒收判定正确（计费重超限）
- [ ] 体积重计算公式正确（÷139）
- [ ] 多箱场景计算正确
- [ ] 错误提示友好
- [ ] Loading 状态显示正常

---

## 📊 性能基准

| 操作            | 预期耗时 | 实际耗时 | 状态 |
| --------------- | -------- | -------- | ---- |
| 页面加载        | < 1s     | \_\_\_   | ☐    |
| 导入 200 条规则 | < 5s     | \_\_\_   | ☐    |
| 单次试算        | < 200ms  | \_\_\_   | ☐    |
| 承运商列表加载  | < 500ms  | \_\_\_   | ☐    |

---

**测试人员**: ******\_\_\_******  
**测试日期**: ******\_\_\_******  
**测试结果**: ☐ 通过 ☐ 失败  
**备注**: ******************\_\_\_******************
