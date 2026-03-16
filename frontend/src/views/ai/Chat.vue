<script setup lang="ts">
import { aiService, type ChatMessage, type AIHealthStatus, type ScheduleResult } from '@/services/ai'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  MagicStick,
  CircleCheck,
  Warning,
  Loading,
  User,
  ChatDotRound,
  DocumentCopy,
  CaretRight,
  Close,
  Delete,
  Promotion,
  DocumentChecked,
  WarningFilled,
  Calendar,
} from '@element-plus/icons-vue'
import { ref, onMounted, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 状态
const loading = ref(false)
const inputMessage = ref('')
const messages = ref<ChatMessage[]>([])
const healthStatus = ref<AIHealthStatus | null>(null)

// SQL预览相关
const showSqlPreview = ref(false)
const previewSql = ref('')
const previewError = ref('')
const executionResult = ref<any[]>([])
const executing = ref(false)

// 排产结果相关
const showScheduleResult = ref(false)
const scheduleResultData = ref<ScheduleResult | null>(null)

// 从 localStorage 获取日期筛选上下文
const getDateContext = () => {
  const dateRangeStr = localStorage.getItem('dateRange')
  const scopedCountryCode = localStorage.getItem('scopedCountryCode')
  
  const context: Record<string, any> = {}
  
  if (dateRangeStr) {
    try {
      const dateRange = JSON.parse(dateRangeStr)
      if (dateRange.startDate) context.startDate = dateRange.startDate
      if (dateRange.endDate) context.endDate = dateRange.endDate
    } catch (e) {
      // ignore
    }
  }
  
  if (scopedCountryCode) {
    context.scopedCountryCode = scopedCountryCode
  }
  
  return context
}

// 滚动引用
const messagesContainer = ref<HTMLElement>()

// 欢迎消息
const welcomeMessage: ChatMessage = {
  role: 'assistant',
  content: `您好！我是 LogiX 智能助手「小乐」。

我可以帮助您：
📊 **数据统计**
- 概览统计、状态分布、按到港/ETA/最晚提柜日统计
- 按国家、船公司、目的港、货代、柜型、清关状态等维度分析
- 滞港费统计（按国家、船公司、目的港）

🔍 **数据查询**
- 搜索货柜（集装箱号、备货单号、船公司等）
- 待清关货柜列表、滞港费预警列表

📦 **智能排产**
- 一键排产、智能排柜（支持指定国家/日期范围）

💡 **更多能力**
- 自然语言生成 SQL
- 查询备货单、拖卡运输、还空箱、仓库等数据

请直接用自然语言描述您的需求，例如：
   - "显示今天到港的货柜数量"
   - "查询美国方向的滞港费情况"
   - "按柜型统计货柜数量"
   - "列出待清关的货柜"
   - "显示滞港费预警列表"
   - "帮我排产美国方向的货柜"
   - "对美国方向本月的货柜执行排产"

   **手动调用技能**：
   您可以在指令中明确提及技能名称，例如："请使用业务知识技能查询物流状态流转"，以确保我使用正确的技能来回答您的问题。`,
  timestamp: new Date().toISOString()
}

// 检查AI健康状态
const checkHealth = async () => {
  try {
    const res = await aiService.healthCheck()
    if (res.success && res.data) {
      healthStatus.value = res.data
      if (res.data.status === 'missing_api_key') {
        ElMessage.warning('AI服务未配置API Key，请在环境变量中设置SILICON_FLOW_API_KEY')
      }
    }
  } catch (error) {
    console.error('AI健康检查失败:', error)
  }
}

// 发送消息
const sendMessage = async () => {
  const msg = inputMessage.value.trim()
  if (!msg) return

  // 检查API Key
  if (healthStatus.value?.status === 'missing_api_key') {
    ElMessage.error('AI服务未配置，请联系管理员配置API Key')
    return
  }

  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: msg,
    timestamp: new Date().toISOString()
  })
  inputMessage.value = ''
  loading.value = true

  // 关闭SQL预览和排产结果
  showSqlPreview.value = false
  showScheduleResult.value = false

  try {
    // 获取上下文（日期范围、国家筛选）
    const context = getDateContext()
    
    // 调用AI对话接口（后端会自动判断是否需要查询数据库或执行排产）
    const chatRes = await aiService.chat(msg, context)

    if (chatRes.success && chatRes.message) {
      // 添加AI回复
      messages.value.push({
        role: 'assistant',
        content: chatRes.message,
        timestamp: new Date().toISOString()
      })

      // 如果有SQL执行结果，显示在预览面板中
      if (chatRes.sqlResult) {
        previewSql.value = chatRes.sqlResult.sql
        executionResult.value = chatRes.sqlResult.data || []
        previewError.value = ''
        showSqlPreview.value = true
        
        if (chatRes.sqlResult.truncated) {
          ElMessage.info(`查询到 ${chatRes.sqlResult.rowCount} 条记录，仅显示前5条`)
        }
      }

      // 如果有排产结果，显示排产面板
      if (chatRes.scheduleResult) {
        scheduleResultData.value = chatRes.scheduleResult
        showScheduleResult.value = true
        
        if (chatRes.scheduleResult.success) {
          ElMessage.success(`排产完成：成功 ${chatRes.scheduleResult.successCount} 个，失败 ${chatRes.scheduleResult.failedCount} 个`)
        } else {
          ElMessage.warning('排产执行完成，但有部分失败')
        }
      }
    } else {
      messages.value.push({
        role: 'assistant',
        content: chatRes.error || '抱歉，发生了错误，请稍后重试。',
        timestamp: new Date().toISOString()
      })
    }
  } catch (error: any) {
    messages.value.push({
      role: 'assistant',
      content: error.message || '网络错误，请稍后重试。',
      timestamp: new Date().toISOString()
    })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

// 执行SQL预览
const executeSqlPreview = async () => {
  if (!previewSql.value) return
  
  executing.value = true
  try {
    const res = await aiService.executeRawSql(previewSql.value)
    if (res.success) {
      executionResult.value = res.results || []
      ElMessage.success(`查询完成，共 ${res.rowCount || 0} 条记录`)
    } else {
      previewError.value = res.error || '执行失败'
    }
  } catch (error: any) {
    previewError.value = error.message
  } finally {
    executing.value = false
  }
}

// 复制SQL
const copySql = async () => {
  if (!previewSql.value) return
  try {
    await navigator.clipboard.writeText(previewSql.value)
    ElMessage.success('SQL已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 清除对话
const clearChat = () => {
  ElMessageBox.confirm('确定要清除当前对话吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    messages.value = []
    showSqlPreview.value = false
    executionResult.value = []
  }).catch(() => {})
}

// 格式化时间
const formatTime = (timestamp?: string) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// 初始化
onMounted(() => {
  messages.value = [welcomeMessage]
  checkHealth()
})
</script>

<template>
  <div class="ai-chat-container">
    <!-- 头部 -->
    <div class="chat-header">
      <div class="header-title">
        <el-icon class="title-icon"><MagicStick /></el-icon>
        <span>小乐</span>
      </div>
      <div class="header-status">
        <el-tag v-if="healthStatus?.status === 'ready'" type="success" size="small">
          <el-icon class="status-icon"><CircleCheck /></el-icon>
          已连接
        </el-tag>
        <el-tag v-else-if="healthStatus?.status === 'missing_api_key'" type="warning" size="small">
          <el-icon class="status-icon"><Warning /></el-icon>
          未配置
        </el-tag>
        <el-tag v-else type="info" size="small">
          <el-icon class="status-icon"><Loading /></el-icon>
          检测中
        </el-tag>
      </div>
    </div>

    <!-- 消息区域 -->
    <div ref="messagesContainer" class="messages-area">
      <div
        v-for="(msg, index) in messages"
        :key="index"
        class="message-item"
        :class="msg.role"
      >
        <div class="message-avatar">
          <el-avatar :size="36" :icon="msg.role === 'user' ? 'User' : 'ChatDotRound'" />
        </div>
        <div class="message-content">
          <div class="message-header">
            <span class="message-sender">{{ msg.role === 'user' ? '您' : '小乐' }}</span>
            <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
          </div>
          <div class="message-body" v-html="msg.content.replace(/\n/g, '<br>')"></div>
        </div>
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="message-item assistant">
        <div class="message-avatar">
          <el-avatar :size="36" :icon="ChatDotRound" />
        </div>
        <div class="message-content">
          <div class="message-header">
            <span class="message-sender">小乐</span>
            <span class="message-time">思考中...</span>
          </div>
          <div class="message-body">
            <el-icon class="loading-icon"><Loading /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- SQL预览面板 -->
    <transition name="slide-fade">
      <div v-if="showSqlPreview" class="sql-preview-panel">
        <div class="preview-header">
          <span>SQL 预览</span>
          <div class="preview-actions">
            <el-button size="small" @click="copySql" :icon="DocumentCopy">复制</el-button>
            <el-button size="small" type="primary" @click="executeSqlPreview" :loading="executing" :icon="CaretRight">执行</el-button>
            <el-button size="small" @click="showSqlPreview = false" :icon="Close">关闭</el-button>
          </div>
        </div>
        <pre class="sql-content">{{ previewSql }}</pre>
        
        <!-- 执行结果 -->
        <div v-if="executionResult.length > 0" class="execution-result">
          <div class="result-header">
            <el-icon><DocumentChecked /></el-icon>
            <span>执行结果 ({{ executionResult.length }} 条)</span>
          </div>
          <el-table :data="executionResult.slice(0, 100)" max-height="300" stripe size="small">
            <el-table-column
              v-for="(val, key) in executionResult[0]"
              :key="key"
              :prop="key"
              :label="String(key)"
              min-width="120"
              show-overflow-tooltip
            />
          </el-table>
          <div v-if="executionResult.length > 100" class="result-note">
            仅显示前100条记录
          </div>
        </div>
        
        <div v-if="previewError" class="preview-error">
          <el-icon><WarningFilled /></el-icon>
          {{ previewError }}
        </div>
      </div>
    </transition>

    <!-- 排产结果面板 -->
    <transition name="slide-fade">
      <div v-if="showScheduleResult && scheduleResultData" class="schedule-result-panel">
        <div class="preview-header">
          <span>
            <el-icon class="header-icon"><Calendar /></el-icon>
            排产结果
          </span>
          <div class="preview-actions">
            <el-button size="small" type="primary" @click="router.push('/scheduling')">
              查看详情
            </el-button>
            <el-button size="small" @click="showScheduleResult = false" :icon="Close">关闭</el-button>
          </div>
        </div>
        
        <!-- 统计卡片 -->
        <div class="schedule-stats">
          <div class="stat-card total">
            <div class="stat-value">{{ scheduleResultData.total }}</div>
            <div class="stat-label">总计</div>
          </div>
          <div class="stat-card success">
            <div class="stat-value">{{ scheduleResultData.successCount }}</div>
            <div class="stat-label">成功</div>
          </div>
          <div class="stat-card failed">
            <div class="stat-value">{{ scheduleResultData.failedCount }}</div>
            <div class="stat-label">失败</div>
          </div>
        </div>
        
        <!-- 排产详情列表 -->
        <div class="schedule-detail" v-if="scheduleResultData.results?.length > 0">
          <div class="detail-header">排产详情</div>
          <el-table :data="scheduleResultData.results" max-height="200" stripe size="small">
            <el-table-column prop="containerNumber" label="柜号" min-width="140" />
            <el-table-column prop="success" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.success ? 'success' : 'danger'" size="small">
                  {{ row.success ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="message" label="消息" show-overflow-tooltip />
          </el-table>
          <div v-if="scheduleResultData.hasMore" class="result-note">
            仅显示前5条记录
          </div>
        </div>
      </div>
    </transition>

    <!-- 输入区域 -->
    <div class="input-area">
      <div class="input-wrapper">
        <el-input
          v-model="inputMessage"
          type="textarea"
          :rows="2"
          placeholder="请输入您的问题，例如：显示今天到港的货柜数量"
          @keydown.enter.ctrl="sendMessage"
          :disabled="loading"
        />
        <el-button
          type="primary"
          :loading="loading"
          :icon="Promotion"
          @click="sendMessage"
          class="send-button"
        >
          发送
        </el-button>
      </div>
      <div class="input-tips">
        <span>按 Ctrl + Enter 发送</span>
        <el-button text type="primary" @click="clearChat" :icon="Delete">清除对话</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-chat-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
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

.header-status .el-tag {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
}

.status-icon {
  margin-right: 4px;
}

.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f5f7fa;
}

.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.message-item.user {
  flex-direction: row-reverse;
}

.message-content {
  max-width: 70%;
  min-width: 200px;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
}

.message-item.user .message-header {
  flex-direction: row-reverse;
}

.message-sender {
  font-weight: 600;
  color: #303133;
}

.message-time {
  color: #909399;
}

.message-body {
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.6;
  font-size: 14px;
  word-break: break-word;
}

.message-item.user .message-body {
  background: #667eea;
  color: white;
  border-bottom-right-radius: 4px;
}

.message-item.assistant .message-body {
  background: white;
  border: 1px solid #ebeef5;
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.loading-icon {
  animation: rotate 1s linear infinite;
  font-size: 20px;
  color: #667eea;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* SQL预览面板 */
.sql-preview-panel {
  background: white;
  border-top: 1px solid #ebeef5;
  max-height: 50%;
  overflow-y: auto;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  font-weight: 600;
}

.preview-actions {
  display: flex;
  gap: 8px;
}

.sql-content {
  margin: 0;
  padding: 16px;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.execution-result {
  border-top: 1px solid #ebeef5;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f0f9eb;
  color: #67c23a;
  font-weight: 600;
}

.result-note {
  padding: 8px 16px;
  color: #909399;
  font-size: 12px;
  text-align: center;
}

.preview-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fef0f0;
  color: #f56c6c;
}

.input-area {
  padding: 16px 20px;
  background: white;
  border-top: 1px solid #ebeef5;
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.input-wrapper :deep(.el-textarea) {
  flex: 1;
}

.input-wrapper :deep(.el-textarea textarea) {
  border-radius: 8px;
  resize: none;
}

.send-button {
  height: 60px;
  padding: 0 24px;
}

.input-tips {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

/* 排产结果面板 */
.schedule-result-panel {
  background: white;
  border-top: 1px solid #ebeef5;
  max-height: 50%;
  overflow-y: auto;
}

.schedule-result-panel .preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  font-weight: 600;
}

.header-icon {
  margin-right: 6px;
  color: #409eff;
}

.schedule-stats {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #f5f7fa;
}

.stat-card {
  flex: 1;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}

.stat-card.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.stat-card.success {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
  color: white;
}

.stat-card.failed {
  background: linear-gradient(135deg, #f56c6c 0%, #f78989 100%);
  color: white;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
}

.stat-label {
  font-size: 12px;
  opacity: 0.9;
  margin-top: 4px;
}

.schedule-detail {
  padding: 0;
  border-top: 1px solid #ebeef5;
}

.detail-header {
  padding: 12px 16px;
  font-weight: 600;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
}

/* 过渡动画 */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(20px);
  opacity: 0;
}
</style>
