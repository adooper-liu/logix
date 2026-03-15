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
  '外部集成'
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
    // 目前后端只有内存中的知识库，我们需要模拟加载
    // 由于后端是静态内存数据，这里我们预设一些示例数据用于前端展示
    allItems.value = getDefaultKnowledgeItems()
  } catch (error) {
    ElMessage.error('加载知识库失败')
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
