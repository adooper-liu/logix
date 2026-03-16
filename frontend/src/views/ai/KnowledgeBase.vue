<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Delete,
  Edit,
  Search,
  FolderOpened,
  Document,
  CopyDocument,
  Download,
  Refresh,
  Close,
  Check
} from '@element-plus/icons-vue'
import { knowledgeService, type KnowledgeItem } from '@/services/knowledge'

// 状态
const loading = ref(false)
const categories = ref<string[]>([])
const selectedCategory = ref('')
const searchKeyword = ref('')
const knowledgeList = ref<KnowledgeItem[]>([])
const allItems = ref<KnowledgeItem[]>([])

// 新建/编辑弹窗
const dialogVisible = ref(false)
const dialogTitle = ref('')
const editingItem = ref<Partial<KnowledgeItem>>({
  id: '',
  category: '',
  title: '',
  keywords: '',
  content: ''
})
const isEditing = ref(false)

// 模板预览
const templatePreview = ref(false)
const templateCode = ref('')

// 默认分类
const defaultCategories = [
  '物流状态',
  '筛选条件',
  '滞港费',
  '时间概念',
  '港口操作',
  '数据结构',
  '可视化',
  '数据筛选',
  '物流跟踪',
  '外部集成',
  '数据服务'
]

// 筛选后的列表
const filteredList = computed(() => {
  let list = allItems.value
  
  if (selectedCategory.value) {
    list = list.filter(item => item.category === selectedCategory.value)
  }
  
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    list = list.filter(item => 
      item.title.toLowerCase().includes(keyword) ||
      item.content.toLowerCase().includes(keyword) ||
      item.keywords.some(k => k.toLowerCase().includes(keyword))
    )
  }
  
  return list
})

// 加载类别
const loadCategories = async () => {
  try {
    const res = await knowledgeService.getCategories()
    if (res.success && res.data?.categories) {
      categories.value = res.data.categories
      // 合并默认分类
      const allCats = new Set([...defaultCategories, ...res.data.categories])
      categories.value = Array.from(allCats)
    }
  } catch (error) {
    console.error('加载类别失败:', error)
  }
}

// 加载所有知识条目（从后端内存获取）
const loadKnowledgeItems = async () => {
  loading.value = true
  try {
    // 从后端获取完整的知识库数据
    const res = await knowledgeService.getCategories()
    if (res.success && res.data?.items) {
      allItems.value = res.data.items
    } else {
      // 后端没有返回数据时，使用默认数据
      allItems.value = getDefaultKnowledgeItems()
    }
  } catch (error) {
    console.error('加载知识库失败:', error)
    // 出错时使用默认数据
    allItems.value = getDefaultKnowledgeItems()
  } finally {
    loading.value = false
  }
}

// 获取默认知识条目（与后端一致）
const getDefaultKnowledgeItems = (): KnowledgeItem[] => [
  {
    id: 'logistics-status',
    category: '物流状态',
    title: '物流状态流转',
    keywords: ['状态', '流转', '桑基图', '物流状态'],
    content: `## 物流状态流转
LogiX 系统使用 7 层流转架构：
not_shipped → shipped → in_transit → at_port → picked_up → unloaded → returned_empty

各状态含义：
- not_shipped: 未出运
- shipped: 已出运（已装船）
- in_transit: 在途（航行中）
- at_port: 已到港
- picked_up: 已提柜
- unloaded: 已卸柜
- returned_empty: 已还空箱`
  },
  {
    id: 'filter-conditions',
    category: '筛选条件',
    title: '筛选条件说明',
    keywords: ['筛选', '过滤', '按到港', '按ETA', '按计划提柜'],
    content: `## 筛选条件说明

### 按到港维度
- 今日到港：当天 ATA 的货柜
- 之前未提柜：今日之前已到港但尚未提柜
- 之前已提柜：今日之前已到港且已提柜

### 按 ETA 维度
- 已逾期：ETA < 今日
- 3日内：今日 ≤ ETA ≤ 3天
- 7日内：3天 < ETA ≤ 7天
- 7日后：ETA > 7天

### 按计划提柜维度
- 已逾期：计划提柜日 < 今日
- 今日计划：计划提柜日 = 今日
- 3日内：今日 < 计划提柜日 ≤ 3天
- 7日内：3天 < 计划提柜日 ≤ 7天`
  },
  {
    id: 'demurrage-rules',
    category: '滞港费',
    title: '滞港费计算规则',
    keywords: ['滞港费', '堆存费', 'demurrage', 'free_days', '免费天数'],
    content: `## 滞港费计算规则

### 标准匹配条件
1. 进口国信息
2. 目的港
3. 船公司
4. 货代公司
5. 有效期内记录

### 收费标志
- 标记=Y：不收取
- 标记=N：要收取

### 计算方式
- 按到港：从 ETA 或 ATA 开始计算
- 按卸船：从卸船时间开始计算`
  },
  {
    id: 'time-concepts',
    category: '时间概念',
    title: '时间概念说明',
    keywords: ['历时', '倒计时', '超期', '时间', 'eta', 'ata'],
    content: `## 时间概念说明

### 三个核心概念
1. **历时**：衡量历史衔接效率（蓝色）
2. **倒计时**：未来日期显示（橙色/绿色）
3. **超期**：风险预警指标（红色脉冲）

### 关键日期字段
- ETA: 预计到港时间
- ATA: 实际到港时间
- 计划提柜日
- 最晚提柜日
- 最晚还箱日`
  },
  {
    id: 'project-overview',
    category: '项目信息',
    title: 'LogiX项目概述',
    keywords: ['项目', '概述', '核心价值', '定位'],
    content: `## LogiX项目概述

### 项目定位
一个完整的**国际物流管理系统**，采用现代化的微服务架构，提供从备货单创建到最终还空箱的全流程跟踪与管理。

### 核心价值
1. **全流程可视化** - 33 种物流状态实时追踪
2. **智能调度** - 基于状态机的自动排程
3. **数据集成** - 飞驼 API 无缝对接
4. **多维度分析** - 甘特图、桑基图、统计卡片

### 系统架构
- **前端层**: Vue 3 + Element Plus (端口: 5173)
- **主服务层**: Express + TypeORM (端口: 3001)
- **物流路径微服务**: Apollo GraphQL (端口: 4000)
- **数据层**: PostgreSQL/TimescaleDB + Redis`
  },
  {
    id: 'tech-stack',
    category: '技术信息',
    title: '技术栈详解',
    keywords: ['技术栈', '后端', '前端', '微服务'],
    content: `## 技术栈详解

### 后端技术栈
- Node.js 18+、TypeScript 5.3+、Express 4.18+
- TypeORM 0.3+、PostgreSQL 14+、TimescaleDB
- Redis 7+、Socket.IO 4.6+、Winston 3.11+

### 前端技术栈
- Vue 3 3.4+、TypeScript 5.3+、Element Plus 2.4.4
- Pinia 2.1.7、Vue Router 4.2.5、Axios 1.6.2
- ECharts 5.4.3、Apollo Client

### 微服务技术栈
- Apollo Server 4.10+、Express 4.18+`
  },
  {
    id: 'core-features',
    category: '功能模块',
    title: '核心功能模块',
    keywords: ['功能', '模块', '集装箱管理', '状态可视化'],
    content: `## 核心功能模块

### 1. 集装箱全生命周期管理
- 备货单创建 → 货柜分配 → 提空箱 → 装货 → 进港 → 装船 → 海运运输 → 抵港卸船 → 清关 → 提货运送 → 仓库卸货 → 还空箱 → 流程完成

### 2. 物流状态可视化
- 33 种标准状态，包括初始状态、集装箱操作、运输中、港口操作、交付、完成、异常状态
- 完整的状态流转规则

### 3. 外部数据适配器
- FeiTuoAdapter (主要数据源)
- LogisticsPathAdapter (备用数据源)
- CustomApiAdapter (扩展适配器)
- 支持统一接口标准、自动故障转移、健康检查机制

### 4. 甘特图可视化
- 简单甘特图：按目的港分组，日视图（7/15/30 天切换）
- 完整甘特图：多泳道（到港/提柜/还箱等维度），可配置，复杂筛选

### 5. 统计与监控
- 统计卡片：总集装箱数、在途数量、异常数量、已完成数量
- 倒计时卡片：最晚提柜倒计时、最晚还箱倒计时、免费期倒计时
- 监控系统：Prometheus + Grafana，服务健康状态，性能指标监控，实时告警`
  },
  {
    id: 'database-design',
    category: '数据结构',
    title: '数据库设计',
    keywords: ['数据库', '表结构', '实体关系', '命名规范'],
    content: `## 数据库设计

### 表结构概览（共 30 张表）
- **字典表**: 7 张（港口、船公司、柜型等）
- **业务表**: 2 张（备货单、货柜）
- **流程表**: 5 张（海运、港口操作、拖车、仓库、还箱）
- **飞驼扩展表**: 4 张（状态事件、装载记录、HOLD、费用）
- **扩展表**: 2 张（滞港费标准、记录）
- **其他辅助表**: 10 张（国家、客户、SKU 等）

### 核心实体关系
- biz_replenishment_orders → biz_containers
- biz_containers → process_sea_freight
- biz_containers → process_port_operations
- biz_containers → process_trucking_transport
- biz_containers → process_warehouse_operations
- biz_containers → process_empty_return

### 命名规范
- 数据库表名：前缀 + snake_case (如 biz_containers)
- 数据库字段：snake_case (如 container_number)
- 实体属性：camelCase + @Column (如 containerNumber)
- API 映射：与数据库一致`
  },
  {
    id: 'dev-standards',
    category: '开发规范',
    title: '开发规范',
    keywords: ['开发规范', '核心原则', '命名规则', '代码风格'],
    content: `## 开发规范

### 核心原则
1. **数据库优先** - 表结构是唯一基准
2. **禁止临时补丁** - 不用 SQL UPDATE 修补数据
3. **开发顺序** - SQL → 实体 → API → 前端
4. **日期口径统一** - 所有展示使用顶部日期范围

### 命名规则
- 实体类：PascalCase
- 实体属性：camelCase
- 数据库表：snake_case
- 数据库字段：snake_case

### 代码风格
- 缩进：2 空格
- 引号：单引号
- 后端：加分号，行宽 ~120
- 前端：无分号，行宽 ~100
- 禁止：console.log、硬编码中文、硬编码色值

### 组件拆分
- 单一职责：一个文件只做一类事
- 文件大小：Vue < 300 行，TS < 200 行
- 命名体现职责：ContainerDetails, useContainerData`
  },
  {
    id: 'docs-system',
    category: '项目信息',
    title: '文档体系',
    keywords: ['文档', '体系', '分类', '维护规范'],
    content: `## 文档体系

### 文档分类

#### 正式文档（frontend/public/docs/）
- **特征**: 长期有效、持续更新
- **目录**: 11 个分类，70+ 文档
- **示例**: 开发规范、架构设计、API 文档

#### 临时文档（frontend/public/docs/09-misc/）
- **特征**: 特定场景、可能过期
- **用途**: 修复记录、迁移记录、验证报告
- **清理**: 定期整合或删除

### 核心文档索引
- **01-standards/**: 9 文档（命名规范、代码规范）
- **02-architecture/**: 5 文档（物流流程完整说明）
- **03-database/**: 3 文档（数据库主表关系）
- **05-state-machine/**: 3 文档（物流状态机）
- **06-statistics/**: 12 文档（甘特图显示逻辑）
- **08-deployment/**: 4 文档（TimescaleDB指南）
- **11-project/**: 18 文档（项目行动指南）

### 文档维护规范
1. **新增文档**: 先分类，再编号命名
2. **更新文档**: 标注版本号和更新日期
3. **删除文档**: 确认价值，整合内容
4. **定期维护**: 每月检查临时文档`
  },
  {
    id: 'quick-start',
    category: '项目信息',
    title: '快速开始指南',
    keywords: ['快速开始', '环境要求', '安装步骤', 'Docker部署'],
    content: `## 快速开始指南

### 环境要求
- Node.js >= 18.x
- PostgreSQL >= 14.x 或 TimescaleDB
- Redis >= 7.x
- npm >= 9.x

### 安装步骤
1. 克隆项目：git clone <repository-url> && cd logix
2. 安装后端依赖：cd backend && npm install
3. 安装前端依赖：cd ../frontend && npm install
4. 配置数据库：cp backend/.env.example backend/.env
5. 初始化数据库：psql -U postgres -f 03_create_tables.sql
6. 启动服务：
   - 后端：cd backend && npm run dev (端口 3001)
   - 前端：cd frontend && npm run dev (端口 5173)

### Docker 部署
- 使用 Docker Compose 启动完整环境：docker-compose -f docker-compose.timescaledb.yml up -d
- 查看日志：docker-compose logs -f backend
- 停止服务：docker-compose -f docker-compose.timescaledb.yml down`
  }
]

// 打开新建弹窗
const openCreateDialog = () => {
  dialogTitle.value = '新建知识条目'
  isEditing.value = false
  editingItem.value = {
    id: '',
    category: selectedCategory.value || defaultCategories[0],
    title: '',
    keywords: '',
    content: ''
  }
  dialogVisible.value = true
}

// 打开编辑弹窗
const openEditDialog = (item: KnowledgeItem) => {
  dialogTitle.value = '编辑知识条目'
  isEditing.value = true
  editingItem.value = {
    id: item.id,
    category: item.category,
    title: item.title,
    keywords: item.keywords.join(', '),
    content: item.content
  }
  dialogVisible.value = true
}

// 保存知识条目
const saveItem = () => {
  if (!editingItem.value.title || !editingItem.value.content) {
    ElMessage.warning('请填写标题和内容')
    return
  }

  const keywords = editingItem.value.keywords
    ? editingItem.value.keywords.split(',').map(k => k.trim()).filter(k => k)
    : []

  const newItem: KnowledgeItem = {
    id: editingItem.value.id || `custom-${Date.now()}`,
    category: editingItem.value.category || '其他',
    title: editingItem.value.title,
    keywords,
    content: editingItem.value.content
  }

  if (isEditing.value) {
    // 编辑模式：更新现有项
    const index = allItems.value.findIndex(item => item.id === newItem.id)
    if (index >= 0) {
      allItems.value[index] = newItem
      ElMessage.success('更新成功')
    }
  } else {
    // 新建模式：添加到列表
    allItems.value.push(newItem)
    ElMessage.success('添加成功')
  }

  dialogVisible.value = false
}

// 删除知识条目
const deleteItem = (item: KnowledgeItem) => {
  ElMessageBox.confirm(
    `确定要删除知识条目「${item.title}」吗？`,
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    const index = allItems.value.findIndex(i => i.id === item.id)
    if (index >= 0) {
      allItems.value.splice(index, 1)
      ElMessage.success('删除成功')
    }
  }).catch(() => {})
}

// 导出为模板代码
const exportAsCode = () => {
  const items = filteredList.value.length > 0 ? filteredList.value : allItems.value
  const code = generateTemplateCode(items)
  
  // 复制到剪贴板
  navigator.clipboard.writeText(code).then(() => {
    ElMessage.success('模板代码已复制到剪贴板')
  }).catch(() => {
    templateCode.value = code
    templatePreview.value = true
    ElMessage.info('请手动复制模板代码')
  })
}

// 生成模板代码
const generateTemplateCode = (items: KnowledgeItem[]): string => {
  const itemsCode = items.map(item => {
    const keywordsArray = item.keywords.map(k => `'${k}'`).join(', ')
    return `  {
    id: '${item.id}',
    category: '${item.category}',
    title: '${item.title}',
    keywords: [${keywordsArray}],
    content: \`${item.content}\`
  }`
  }).join(',\n\n')

  return `/**
 * AI 知识库
 * AI Knowledge Base
 * 
 * 物流系统业务知识，供 AI 对话时检索使用
 * 自动生成时间: ${new Date().toLocaleString('zh-CN')}
 */

export interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  keywords: string[];
  content: string;
}

export const knowledgeBase: KnowledgeItem[] = [
${itemsCode}
];`
}

// 复制内容
const copyContent = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

// 初始化
onMounted(() => {
  loadCategories()
  loadKnowledgeItems()
})
</script>

<template>
  <div class="knowledge-base-container">
    <!-- 头部 -->
    <div class="page-header">
      <div class="header-title">
        <el-icon class="title-icon"><FolderOpened /></el-icon>
        <span>知识库管理</span>
      </div>
      <div class="header-actions">
        <el-button type="primary" :icon="Plus" @click="openCreateDialog">
          新建知识
        </el-button>
        <el-button :icon="Download" @click="exportAsCode">
          导出模板
        </el-button>
        <el-button :icon="Refresh" @click="loadKnowledgeItems">
          刷新
        </el-button>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-select
        v-model="selectedCategory"
        placeholder="选择分类"
        clearable
        style="width: 200px"
      >
        <el-option
          v-for="cat in categories"
          :key="cat"
          :label="cat"
          :value="cat"
        />
      </el-select>
      
      <el-input
        v-model="searchKeyword"
        placeholder="搜索标题、关键词或内容..."
        :prefix-icon="Search"
        clearable
        style="width: 300px"
      />
      
      <span class="item-count">
        共 {{ filteredList.length }} 条知识
      </span>
    </div>

    <!-- 知识列表 -->
    <div class="knowledge-list" v-loading="loading">
      <el-empty v-if="filteredList.length === 0" description="暂无知识条目" />
      
      <div
        v-for="item in filteredList"
        :key="item.id"
        class="knowledge-card"
      >
        <div class="card-header">
          <div class="card-title-row">
            <el-tag size="small" type="info">{{ item.category }}</el-tag>
            <span class="card-title">{{ item.title }}</span>
          </div>
          <div class="card-actions">
            <el-button text size="small" :icon="CopyDocument" @click="copyContent(item.content)">
              复制
            </el-button>
            <el-button text size="small" :icon="Edit" @click="openEditDialog(item)">
              编辑
            </el-button>
            <el-button text size="small" type="danger" :icon="Delete" @click="deleteItem(item)">
              删除
            </el-button>
          </div>
        </div>
        
        <div class="card-keywords">
          <el-tag
            v-for="kw in item.keywords"
            :key="kw"
            size="small"
            type="primary"
            effect="plain"
            class="keyword-tag"
          >
            {{ kw }}
          </el-tag>
        </div>
        
        <div class="card-content">
          <pre>{{ item.content }}</pre>
        </div>
      </div>
    </div>

    <!-- 新建/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form label-width="80px">
        <el-form-item label="分类" required>
          <el-select v-model="editingItem.category" placeholder="选择分类" style="width: 100%">
            <el-option
              v-for="cat in categories"
              :key="cat"
              :label="cat"
              :value="cat"
            />
            <el-option label="+ 新建分类" value="__new__" disabled />
          </el-select>
        </el-form-item>
        
        <el-form-item label="标题" required>
          <el-input v-model="editingItem.title" placeholder="请输入标题" />
        </el-form-item>
        
        <el-form-item label="关键词">
          <el-input
            v-model="editingItem.keywords"
            placeholder="用逗号分隔，如：状态,流转,桑基图"
          />
        </el-form-item>
        
        <el-form-item label="内容" required>
          <el-input
            v-model="editingItem.content"
            type="textarea"
            :rows="12"
            placeholder="使用 Markdown 格式编写内容..."
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveItem">
          {{ isEditing ? '保存' : '添加' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 模板预览弹窗 -->
    <el-dialog
      v-model="templatePreview"
      title="模板代码预览"
      width="800px"
    >
      <el-input
        v-model="templateCode"
        type="textarea"
        :rows="20"
        readonly
        style="font-family: 'Consolas', monospace;"
      />
      <template #footer>
        <el-button @click="templatePreview = false">关闭</el-button>
        <el-button type="primary" @click="copyContent(templateCode)">
          复制代码
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.knowledge-base-container {
  padding: 20px;
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  margin-bottom: 20px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
}

.title-icon {
  font-size: 24px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.item-count {
  margin-left: auto;
  color: #909399;
  font-size: 14px;
}

.knowledge-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.knowledge-card {
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: white;
  transition: box-shadow 0.3s;
}

.knowledge-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.card-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.keyword-tag {
  cursor: default;
}

.card-content {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 6px;
}

.card-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.6;
  color: #606266;
  max-height: 200px;
  overflow-y: auto;
}
</style>
