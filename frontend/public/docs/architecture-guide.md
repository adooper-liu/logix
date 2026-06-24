# LogiX 架构设计指南

## 系统架构概览

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend   │────▶│   Backend     │────▶│  Database   │
│  (Vue 3 + TS)│     │ (NestJS + TS) │     │(PostgreSQL) │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │ External APIs│
                    │ (FeiTuo等)   │
                    └─────────────┘
```

---

## 后端分层架构

### Layer 1: Controllers（路由层）
**职责**: 参数校验、路由分发、响应格式化  
**位置**: `backend/src/controllers/`  
**示例**:
```typescript
@Controller('containers')
export class ContainerController {
  @Get()
  async list(@Query() query: ListQueryDto) {
    return await this.containerService.list(query);
  }
}
```

### Layer 2: Services（业务逻辑层）
**职责**: 核心业务逻辑、事务管理、外部API调用  
**位置**: `backend/src/services/`  
**示例**:
```typescript
@Injectable()
export class ContainerService {
  async list(query: ListQueryDto) {
    // 1. 构建查询条件
    // 2. 执行数据库查询
    // 3. 数据转换
    // 4. 返回结果
  }
}
```

### Layer 3: Entities（数据实体层）
**职责**: TypeORM实体定义、数据库映射  
**位置**: `backend/src/entities/`  
**示例**:
```typescript
@Entity({ name: 'biz_containers' })
export class Container {
  @PrimaryColumn()
  containerNumber: string;
  
  @Column({ name: 'logistics_status' })
  logisticsStatus: string;
}
```

### Layer 4: Utils（工具函数层）
**职责**: 纯函数、无状态计算、通用工具  
**位置**: `backend/src/utils/`  
**示例**:
```typescript
// logisticsStatusMachine.ts
export function calculateLogisticsStatus(container: Container): string {
  // 纯函数，无副作用
}
```

---

## 前端分层架构

### Layer 1: Views（页面组件）
**职责**: 页面布局、子组件编排  
**位置**: `frontend/src/views/`  
**示例**:
```vue
<template>
  <ContainerList />
  <ContainerDetails v-if="selectedContainer" />
</template>
```

### Layer 2: Components（展示组件）
**职责**: 具体UI展示、交互逻辑  
**位置**: `frontend/src/components/`  
**示例**:
```vue
<!-- ContainerCard.vue -->
<template>
  <el-card>
    <h3>{{ container.containerNumber }}</h3>
    <p>Status: {{ container.logisticsStatus }}</p>
  </el-card>
</template>
```

### Layer 3: Composables（组合式函数）
**职责**: 复用逻辑、数据获取、状态管理  
**位置**: `frontend/src/composables/`  
**示例**:
```typescript
// useContainerData.ts
export function useContainerData() {
  const containers = ref([]);
  
  async function fetchContainers() {
    containers.value = await ContainerService.list();
  }
  
  return { containers, fetchContainers };
}
```

### Layer 4: Services（API服务）
**职责**: HTTP请求封装、数据转换  
**位置**: `frontend/src/services/`  
**示例**:
```typescript
// container.ts
export class ContainerService {
  static async list(params: any) {
    return await api.get('/containers', { params });
  }
}
```

### Layer 5: Stores（Pinia状态管理）
**职责**: 全局状态、缓存管理  
**位置**: `frontend/src/stores/`  
**示例**:
```typescript
// containerStore.ts
export const useContainerStore = defineStore('container', () => {
  const selectedContainer = ref(null);
  
  function selectContainer(container) {
    selectedContainer.value = container;
  }
  
  return { selectedContainer, selectContainer };
});
```

---

## 模块划分

### 核心模块
| 模块 | 路径 | 职责 |
|------|------|------|
| Containers | `src/modules/containers/` | 货柜CRUD、状态管理 |
| Demurrage | `src/modules/demurrage/` | 滞港费计算、预警 |
| Scheduling | `src/modules/scheduling/` | 智能排柜引擎 |
| FeiTuo | `src/modules/feituo/` | 飞驼API集成 |
| Import | `src/modules/import/` | Excel导入、数据验证 |

### 共享模块
| 模块 | 路径 | 职责 |
|------|------|------|
| Dict | `src/modules/dict/` | 字典表管理 |
| Auth | `src/modules/auth/` | 认证授权 |
| Common | `src/modules/common/` | 通用工具、异常处理 |

---

## 依赖注入模式

### NestJS DI
```typescript
@Injectable()
export class ContainerService {
  constructor(
    @InjectRepository(Container) 
    private repo: Repository<Container>,
    private demurrageService: DemurrageService
  ) {}
}
```

### Vue Composition API
```typescript
export function useContainerLogic() {
  const containerStore = useContainerStore();
  const { fetchContainers } = useContainerData();
  
  return { containerStore, fetchContainers };
}
```

---

## 数据流示例：滞港费计算

```
用户点击"计算滞港费"
   ↓
Frontend: ContainerDetails.vue
   ↓ (emit event)
Frontend: useDemurrageCalculation.ts
   ↓ (API call)
Frontend: DemurrageService.calculate()
   ↓ (HTTP POST /api/v1/demurrage/calculate)
Backend: DemurrageController.calculate()
   ↓ (call service)
Backend: DemurrageService.calculate()
   ↓ (query database)
Backend: Repository.find()
   ↓ (apply formula)
Backend: calculateDemurrageAmount()
   ↓ (return result)
Frontend: 显示费用结果
```

---

## 错误处理策略

### 后端异常过滤器
```typescript
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    
    response.status(exception.getStatus()).json({
      statusCode: exception.getStatus(),
      message: exception.message,
      timestamp: new Date().toISOString()
    });
  }
}
```

### 前端错误拦截
```typescript
// api.ts
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      router.push('/login');
    }
    return Promise.reject(error);
  }
);
```

---

## 性能优化

### 后端
- **数据库索引**: 为常用查询字段添加索引
- **连接池**: TypeORM配置connection pool
- **缓存**: Redis缓存热点数据
- **分页**: 大列表必须分页（limit/offset）

### 前端
- **懒加载**: 路由级代码分割
- **虚拟滚动**: 长列表使用el-table-v2
- **防抖**: 搜索输入debounce 300ms
- **图片优化**: 使用webp格式、lazy loading

---

## 测试策略

### 单元测试
```typescript
// container.service.spec.ts
describe('ContainerService', () => {
  it('should calculate status correctly', () => {
    const container = mockContainer({ pickupDate: new Date() });
    const status = calculateLogisticsStatus(container);
    expect(status).toBe('picked_up');
  });
});
```

### 集成测试
```typescript
// container.e2e-spec.ts
describe('Container API (e2e)', () => {
  it('GET /containers should return list', async () => {
    const response = await request(app.getHttpServer())
      .get('/containers')
      .expect(200);
    
    expect(response.body.data).toBeInstanceOf(Array);
  });
});
```

---

## 部署架构

```
┌─────────────┐
│   Nginx     │ (反向代理、静态资源)
└──────┬──────┘
       │
┌──────▼──────┐
│  Backend    │ (NestJS, 多实例负载均衡)
└──────┬──────┘
       │
┌──────▼──────┐
│ PostgreSQL  │ (主从复制、定时备份)
└─────────────┘
```

---

## 参考文档

- 项目地图: `.qoder/rules/logix-project-map.mdc`
- 开发规范: `development-standards.md`
- 业务知识: `business-handbook.md`

---

**维护者**: LogiX Team  
**最后更新**: 2026-06-23
