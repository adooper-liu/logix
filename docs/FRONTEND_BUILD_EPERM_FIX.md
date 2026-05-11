# 前端构建 EPERM 错误解决方案

## 问题描述

运行 `.\scripts\local-prod-demo.ps1` 时出现以下错误:

```
npm error code EPERM
npm error syscall unlink
npm error path E:\logix\frontend\node_modules\@esbuild\win32-x64\esbuild.exe
npm error errno -4048
npm error [Error: EPERM: operation not permitted, unlink '...']
```

## 原因分析

Windows 系统中,`esbuild.exe` 或其他可执行文件可能被以下进程占用:
- VS Code 或其他编辑器
- Node.js 开发服务器
- 防病毒软件实时扫描
- Windows Search 索引服务
- 之前未正常退出的 npm/node 进程

## 解决方案

### 方案 1: 自动修复(推荐)

新版 `local-prod-demo.ps1` 已包含自动修复逻辑:
1. 尝试正常安装
2. 失败后自动停止相关进程
3. 强制清理 node_modules
4. 重新安装依赖

直接重新运行脚本即可:
```powershell
.\scripts\local-prod-demo.ps1
```

### 方案 2: 手动清理

如果自动修复失败,手动执行:

```powershell
# 1. 停止所有 node 相关进程
Get-Process | Where-Object { $_.ProcessName -match 'node|vite|esbuild' } | Stop-Process -Force

# 2. 等待 2 秒
Start-Sleep -Seconds 2

# 3. 删除 node_modules
Remove-Item -Recurse -Force frontend\node_modules

# 4. 重新运行脚本
.\scripts\local-prod-demo.ps1
```

### 方案 3: 以管理员身份运行

右键点击 PowerShell → "以管理员身份运行",然后执行:
```powershell
cd E:\logix
.\scripts\local-prod-demo.ps1
```

### 方案 4: 排除防病毒软件扫描

将项目目录添加到防病毒软件的排除列表:
- `E:\logix\frontend\node_modules`
- `E:\logix\backend\node_modules`

常见防病毒软件设置:
- **Windows Defender**: 设置 → 病毒和威胁防护 → 管理设置 → 排除项
- **其他杀毒软件**: 参考相应文档添加排除目录

### 方案 5: 禁用 Windows Search 索引

1. 右键点击 `E:\logix\frontend\node_modules`
2. 属性 → 高级
3. 取消勾选 "除了文件属性外,还允许索引此文件夹中文件的内容"
4. 应用到所有子文件夹和文件

## 预防措施

### 1. 使用 .gitignore

确保 `node_modules` 在 `.gitignore` 中,避免 Git 操作时锁定文件。

### 2. 关闭编辑器后再运行脚本

在运行构建脚本前,关闭 VS Code 或其他可能占用文件的编辑器。

### 3. 使用 WSL2(推荐)

如果经常在 Windows 上遇到权限问题,考虑使用 WSL2:
```bash
# 在 WSL2 中
cd /mnt/e/logix
./scripts/local-prod-demo.sh  # 需要创建对应的 shell 脚本
```

### 4. 定期清理缓存

```powershell
npm cache clean --force
Remove-Item -Recurse -Force frontend\node_modules\.vite
```

## 验证修复

成功构建后应该看到:

```
✓ Frontend build completed
>>> 启动 Docker Compose...
```

并且 `frontend/dist/index.html` 文件存在。

## 常见问题

### Q: 为什么只在前端构建时出现这个问题?

A: 因为前端使用了 Vite + esbuild,esbuild 会生成原生可执行文件(`esbuild.exe`),这些文件在 Windows 上更容易被锁定。

### Q: 可以使用 yarn 或 pnpm 吗?

A: 可以,但需要修改脚本中的 npm 命令为相应的包管理器命令。

### Q: 每次都要手动清理吗?

A: 不需要。新版脚本已包含自动修复逻辑,只在首次或特殊情况下需要手动干预。

## 技术细节

### EPERM 错误码

- **EPERM**: Operation not permitted (操作不被允许)
- **errno -4048**: Windows 特定的文件锁定错误
- **syscall unlink**: 尝试删除文件时失败

### esbuild 为什么会被锁定?

esbuild 是一个用 Go 编写的极速 JavaScript 打包器,它会:
1. 下载平台特定的二进制文件(`esbuild.exe`)
2. 在构建过程中加载到内存
3. 如果进程异常退出,文件句柄可能未释放
4. Windows 不允许删除正在使用的文件

## 联系支持

如果以上方案都无法解决问题,请提供:
1. 完整的错误日志
2. Windows 版本 (`winver`)
3. Node.js 版本 (`node --version`)
4. 防病毒软件列表
5. 是否使用 WSL2
