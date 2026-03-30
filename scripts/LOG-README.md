# LogiX 日志查看指南

## 📁 日志文件位置

```
d:\Gihub\logix\backend\logs\
```

主要日志文件：
- `app.log` - 应用主日志（所有级别的日志）
- `error.log` - 错误日志（仅 error 级别）
- `daily/*.log` - 按日期分割的日志文件

---

## 🚀 快速查看方法

### 方法 1：一键诊断（推荐）

```powershell
# 在项目根目录执行
.\scripts\quick-diagnose.ps1
```

**功能**：
- ✅ 自动检查日志文件
- ✅ 显示最近的错误
- ✅ 提取免费天数相关日志
- ✅ 显示排产系统日志

---

### 方法 2：实时跟踪日志（带关键字过滤）

```powershell
# 实时查看所有日志
.\scripts\view-backend-logs.ps1

# 只看免费天数相关日志
.\scripts\view-backend-logs.ps1 -Keyword "pickupFreeDays"

# 只看滞港费计算日志
.\scripts\view-backend-logs.ps1 -Keyword "Demurrage"

# 显示最近 500 行
.\scripts\view-backend-logs.ps1 -Keyword "IntelligentScheduling" -Lines 500
```

**快捷键**：
- `Ctrl+C` - 停止跟踪

---

### 方法 3：搜索历史日志

```powershell
# 搜索特定内容
.\scripts\search-backend-logs.ps1 -Keyword "pickupFreeDays"

# 搜索并显示上下文各 3 行
.\scripts\search-backend-logs.ps1 -Keyword "matched standards" -Context 3

# 搜索最近 2000 行
.\scripts\search-backend-logs.ps1 -Keyword "error" -MaxLines 2000
```

---

## 🔍 常用关键字

| 关键字 | 用途 |
|--------|------|
| `pickupFreeDays` | 提柜免费天数 |
| `returnFreeDays` | 还箱免费天数 |
| `matched.*standards` | 匹配的滞港费标准 |
| `IntelligentScheduling` | 智能排产系统 |
| `Demurrage` | 滞港费计算 |
| `"level":"error"` | 错误日志 |
| `scheduleSingleContainer` | 单柜排产逻辑 |

---

## 📊 PowerShell 原生命令

### 查看最新日志

```powershell
cd d:\Gihub\logix\backend

# 查看最后 100 行
Get-Content logs\*.log -Tail 100

# 实时跟踪
Get-Content logs\*.log -Tail 100 -Wait
```

### 搜索日志

```powershell
cd d:\Gihub\logix\backend

# 搜索包含 "pickupFreeDays" 的行
Get-Content logs\*.log | Select-String "pickupFreeDays"

# 搜索并显示上下文
Get-Content logs\*.log | Select-String "pickupFreeDays" -Context 2

# 只搜索错误
Get-Content logs\error.log -Tail 50
```

### 高级搜索

```powershell
# 使用正则表达式搜索
Get-Content logs\*.log -Tail 1000 | 
    Select-String "pickupFreeDays=\d+" -AllMatches

# 统计错误数量
(Get-Content logs\*.log | Select-String '"level":"error"').Count

# 查看特定时间段的日志
Get-ChildItem logs\daily\*.log | 
    Where-Object { $_.LastWriteTime -gt (Get-Date).AddHours(-2) } |
    ForEach-Object { Get-Content $_.FullName } |
    Select-String "pickupFreeDays"
```

---

## 🎯 典型使用场景

### 场景 1：调试免费天数问题

```powershell
# 1. 运行快速诊断
.\scripts\quick-diagnose.ps1

# 2. 实时跟踪免费天数日志
.\scripts\view-backend-logs.ps1 -Keyword "pickupFreeDays"

# 3. 在前端点击「预览排产」，观察后端输出
```

### 场景 2：查找错误原因

```powershell
# 1. 查看最近的错误
Get-Content logs\error.log -Tail 50

# 2. 搜索错误堆栈
Get-Content logs\*.log | Select-String "Error:" -Context 5
```

### 场景 3：分析排产流程

```powershell
# 1. 查看所有排产相关日志
.\scripts\view-backend-logs.ps1 -Keyword "IntelligentScheduling" -Lines 1000

# 2. 筛选特定货柜
.\scripts\view-backend-logs.ps1 -Keyword "GAOU6195045"
```

---

## 💡 提示

1. **日志级别**：
   - `DEBUG` - 详细调试信息
   - `INFO` - 一般信息
   - `WARN` - 警告信息
   - `ERROR` - 错误信息

2. **日志格式**：
   ```json
   {"level":"INFO","message":"排产成功","timestamp":"2026-03-27T10:00:00Z"}
   ```

3. **性能优化**：
   - 使用 `-Tail` 限制行数，避免加载整个文件
   - 使用 `-Wait` 实时跟踪，而不是重复查看
   - 使用具体关键字过滤，减少输出量

4. **日志轮转**：
   - 每日自动生成新日志文件
   - 旧日志保存在 `logs\daily\` 目录
   - 定期清理超过 30 天的日志

---

## 🛠️ 故障排除

### 问题：找不到日志文件

```powershell
# 检查 backend 目录结构
cd d:\Gihub\logix\backend
ls logs

# 如果 logs 目录不存在，后端可能没有运行
# 启动后端：
npm run dev
```

### 问题：日志中没有相关信息

可能原因：
1. 后端未重新编译 → 重启后端
2. 前端缓存未刷新 → `Ctrl+Shift+R` 强制刷新
3. 代码路径未执行 → 确认操作步骤正确

### 问题：PowerShell 无法运行脚本

```powershell
# 修改执行策略
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

# 验证
Get-ExecutionPolicy
```

---

## 📖 相关文档

- [后端开发文档](../backend/README.md)
- [日志配置文档](../docs/Logging.md)
- [故障排查指南](./troubleshooting.md)
