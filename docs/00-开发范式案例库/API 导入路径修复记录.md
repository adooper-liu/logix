# API 导入路径修复记录

**问题发现时间**: 2026-03-27  
**问题类型**: 模块导入错误  
**状态**: ✅ 已修复

---

## 🐛 问题描述

### 错误信息

```
[plugin:vite:import-failure] Failed to resolve import "@/utils/request"
from "src/api/intelligentScheduling.ts". Does the file exist?
```

### 错误位置

- **文件**: `frontend/src/api/intelligentScheduling.ts`
- **行号**: Line 5
- **代码**: `import request from '@/utils/request';`

---

## 🔍 根因分析

### 问题原因

项目中不存在 `@/utils/request.ts` 文件，实际使用的是 `@/services/api.ts`。

### 项目实际情况

- ✅ **存在的文件**: `frontend/src/services/api.ts` (统一 API 请求封装)
- ❌ **不存在的文件**: `frontend/src/utils/request.ts`

### api.ts 导出内容

```typescript
// frontend/src/services/api.ts
export const api = {
  get: (url: string, config?: AxiosRequestConfig) => ...,
  post: (url: string, data?: any, config?: AxiosRequestConfig) => ...,
  put: (url: string, data?: any, config?: AxiosRequestConfig) => ...,
  delete: (url: string, config?: AxiosRequestConfig) => ...,
  // ...
}
```

---

## ✅ 修复方案

### 修改前

```typescript
import request from "@/utils/request";

export async function batchOptimizeContainers(containerNumbers: string[], options?: { forceRefresh?: boolean }): Promise<BatchOptimizeResponse> {
  return request({
    url: "/api/intelligent-scheduling/batch-optimize",
    method: "post",
    data: {
      containerNumbers,
      options,
    } as BatchOptimizeRequest,
  });
}
```

### 修改后

```typescript
import { api } from "@/services/api";

export async function batchOptimizeContainers(containerNumbers: string[], options?: { forceRefresh?: boolean }): Promise<BatchOptimizeResponse> {
  return api.post("/intelligent-scheduling/batch-optimize", {
    containerNumbers,
    options,
  } as BatchOptimizeRequest);
}
```

---

## 📝 关键改动

| 项目         | 修改前                            | 修改后                        |
| ------------ | --------------------------------- | ----------------------------- |
| **导入源**   | `@/utils/request`                 | `@/services/api`              |
| **导入方式** | `import request`                  | `import { api }`              |
| **调用方式** | `request({...})`                  | `api.post(...)`               |
| **URL 路径** | `/api/intelligent-scheduling/...` | `/intelligent-scheduling/...` |

**注意**:

- `api.ts` 的 baseURL 已经是 `/api/v1`,所以不需要重复添加 `/api` 前缀
- 使用命名导出 `{ api }` 而不是默认导出

---

## 🎯 验证结果

### 编译检查

✅ Vite 编译通过，无报错

### 运行时检查

需要验证:

1. API 请求能正常发送
2. 后端接口路径正确
3. 响应数据能正确处理

---

## 📚 经验总结

### 教训

1. **不要假设工具函数存在**: 应该先搜索确认实际使用的封装
2. **遵循项目规范**: 每个项目的 HTTP 封装方式可能不同
3. **检查 baseURL**: 避免 URL 路径重复拼接

### 最佳实践

1. ✅ 优先查看 `services/` 目录下的现有封装
2. ✅ 参考其他 API 文件的写法 (如 `container.ts`)
3. ✅ 使用项目中已有的 axios 实例，不要重新创建

---

## 🔗 相关文件

| 文件         | 路径                                                                                          | 说明             |
| ------------ | --------------------------------------------------------------------------------------------- | ---------------- |
| **修复文件** | [`intelligentScheduling.ts`](file://d:\Gihub\logix\frontend\src\api\intelligentScheduling.ts) | 批量优化 API     |
| **API 封装** | [`api.ts`](file://d:\Gihub\logix\frontend\src\services\api.ts)                                | 统一 HTTP 客户端 |
| **容器 API** | [`container.ts`](file://d:\Gihub\logix\frontend\src\services\container.ts)                    | 参考示例         |

---

## ✨ 后续检查清单

- [x] 修复导入路径
- [x] 调整 API 调用方式
- [ ] 测试 API 能否正常调用
- [ ] 验证后端接口是否存在
- [ ] 检查响应数据处理

---

**修复完成** ✨  
**下一步**: 测试批量优化功能是否正常工作
