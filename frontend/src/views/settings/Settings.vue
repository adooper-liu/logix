<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Setting, Connection, Notification } from '@element-plus/icons-vue'

// 默认配置（用于重置）
const defaultConfig = {
  api: {
    baseUrl: 'http://localhost:3001/api/v1',
    timeout: 10000,
    retryAttempts: 3
  },
  adapters: {
    defaultSource: 'logistics_path',
    healthCheckInterval: 60000,
    enableAutoFailover: true
  },
  notifications: {
    emailEnabled: true,
    webhookEnabled: true,
    alertThreshold: 80
  }
}

// 系统配置
const systemConfig = ref({ ...JSON.parse(JSON.stringify(defaultConfig)) })

// 保存配置
const saveConfig = async () => {
  const url = systemConfig.value.api?.baseUrl?.trim()
  if (!url) {
    ElMessage.warning('请输入 API 基础 URL')
    return
  }
  try {
    new URL(url)
  } catch {
    ElMessage.warning('请输入有效的 URL（如 http://localhost:3001/api/v1）')
    return
  }
  const timeout = systemConfig.value.api?.timeout
  if (timeout == null || timeout < 1000 || timeout > 30000) {
    ElMessage.warning('请求超时时间需在 1000～30000 ms 之间')
    return
  }
  ElMessage.success('配置保存成功')
  // 实际持久化需对接后端或 localStorage
}

// 重置配置
const resetConfig = () => {
  systemConfig.value = JSON.parse(JSON.stringify(defaultConfig))
  ElMessage.info('已重置为默认值')
}

// 测试连接
const testConnection = async () => {
  const baseUrl = systemConfig.value.api?.baseUrl?.trim()
  if (!baseUrl) {
    ElMessage.warning('请先填写 API 基础 URL')
    return
  }
  ElMessage.info('正在测试连接...')
  try {
    // 后端 /health 在根路径，不在 /api/v1 下
    const origin = baseUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '') || baseUrl
    const res = await fetch(`${origin}/health`, { method: 'GET' })
    if (res.ok) {
      ElMessage.success('连接测试成功')
    } else {
      ElMessage.warning(`连接返回状态 ${res.status}`)
    }
  } catch (e: any) {
    ElMessage.error('连接失败：' + (e?.message || '网络错误'))
  }
}
</script>

<template>
  <div class="settings-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>系统设置</h2>
      <p>配置系统参数和连接设置</p>
    </div>

    <!-- 帮助说明与应用场景 -->
    <el-collapse class="help-collapse">
      <el-collapse-item name="help">
        <template #title>
          <span class="help-title">
            <span class="help-icon">📖</span>
            帮助说明与应用场景
          </span>
        </template>
        <div class="help-content">
          <section class="help-section">
            <h4>一、帮助说明</h4>
            <ul class="help-desc-list">
              <li><strong>API 配置</strong>：前端请求后端的基地址（如开发环境 http://localhost:3001/api/v1）、请求超时时间与失败重试次数。修改后需「保存配置」；「测试连接」会请求该地址下的 /health 检查是否可达。</li>
              <li><strong>适配器配置</strong>：默认数据源可选「物流路径微服务」或「飞驼API」，用于物流状态等数据的拉取来源；健康检查间隔与「启用自动故障转移」用于在主源不可用时切换备用源。</li>
              <li><strong>通知配置</strong>：邮件通知、Webhook 开关及告警阈值（百分比），用于系统告警与通知策略；实际生效需后端或第三方服务支持。</li>
            </ul>
          </section>
          <section class="help-section">
            <h4>二、应用场景示例</h4>
            <div class="help-scenarios">
              <div class="scenario-item">
                <span class="scenario-label">场景 1：本地开发</span>
                <p>API 基础 URL 填 <code>http://localhost:3001/api/v1</code>，超时 10000 ms，用「测试连接」确认后端已启动且 /health 正常。</p>
              </div>
              <div class="scenario-item">
                <span class="scenario-label">场景 2：生产/预发环境</span>
                <p>将 API 基础 URL 改为生产或预发域名（如 <code>https://api.yourcompany.com/api/v1</code>），适当提高超时与重试次数，保存后刷新页面使请求走新地址。</p>
              </div>
              <div class="scenario-item">
                <span class="scenario-label">场景 3：优先使用飞驼数据</span>
                <p>默认数据源选「飞驼API」，系统会优先从飞驼拉取状态；若飞驼不可用且开启「自动故障转移」，将自动切回「物流路径微服务」。</p>
              </div>
              <div class="scenario-item">
                <span class="scenario-label">场景 4：降低健康检查频率</span>
                <p>将健康检查间隔调大（如 120000 ms），可减少对数据源的心跳请求，适合对实时性要求不高的环境。</p>
              </div>
              <div class="scenario-item">
                <span class="scenario-label">场景 5：告警与通知</span>
                <p>开启「启用邮件通知」或「启用 Webhook」，并设置告警阈值（如 80%）；当触发条件时由后端或集成服务发送告警（需后端实现）。</p>
              </div>
            </div>
          </section>
        </div>
      </el-collapse-item>
    </el-collapse>

    <div class="settings-grid">
      <!-- API配置 -->
      <el-card class="setting-card">
        <template #header>
          <div class="card-header">
            <el-icon><Connection /></el-icon>
            <span>API配置</span>
          </div>
        </template>
        
        <el-form :model="systemConfig" label-width="120px">
          <el-form-item label="API基础URL">
            <el-input v-model="systemConfig.api.baseUrl" />
          </el-form-item>
          
          <el-form-item label="请求超时(ms)">
            <el-input-number 
              v-model="systemConfig.api.timeout" 
              :min="1000" 
              :max="30000"
            />
          </el-form-item>
          
          <el-form-item label="重试次数">
            <el-slider 
              v-model="systemConfig.api.retryAttempts" 
              :min="0" 
              :max="10"
              show-input
            />
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="testConnection">
              测试连接
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 适配器配置 -->
      <el-card class="setting-card">
        <template #header>
          <div class="card-header">
            <el-icon><Setting /></el-icon>
            <span>适配器配置</span>
          </div>
        </template>
        
        <el-form :model="systemConfig" label-width="140px">
          <el-form-item label="默认数据源">
            <el-select v-model="systemConfig.adapters.defaultSource">
              <el-option label="物流路径微服务" value="logistics_path" />
              <el-option label="飞驼API" value="feituo" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="健康检查间隔(ms)">
            <el-input-number 
              v-model="systemConfig.adapters.healthCheckInterval" 
              :min="10000" 
              :max="300000"
            />
          </el-form-item>
          
          <el-form-item label="启用自动故障转移">
            <el-switch v-model="systemConfig.adapters.enableAutoFailover" />
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 通知配置 -->
      <el-card class="setting-card">
        <template #header>
          <div class="card-header">
            <el-icon><Notification /></el-icon>
            <span>通知配置</span>
          </div>
        </template>
        
        <el-form :model="systemConfig" label-width="120px">
          <el-form-item label="启用邮件通知">
            <el-switch v-model="systemConfig.notifications.emailEnabled" />
          </el-form-item>
          
          <el-form-item label="启用Webhook">
            <el-switch v-model="systemConfig.notifications.webhookEnabled" />
          </el-form-item>
          
          <el-form-item label="告警阈值(%)">
            <el-slider 
              v-model="systemConfig.notifications.alertThreshold" 
              :min="50" 
              :max="100"
              show-input
            />
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <el-button type="primary" size="large" @click="saveConfig">
        保存配置
      </el-button>
      <el-button size="large" @click="resetConfig">
        重置默认
      </el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.settings-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;

  h2 {
    font-size: 24px;
    color: $text-primary;
    margin-bottom: 10px;
  }

  p {
    color: $text-secondary;
    font-size: 14px;
  }
}

.help-collapse {
  margin-bottom: 24px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  :deep(.el-collapse-item__header) {
    padding: 12px 16px;
    font-size: 15px;
    background: #f8f9fa;
  }

  :deep(.el-collapse-item__wrap) {
    border-bottom: none;
  }

  :deep(.el-collapse-item__content) {
    padding: 0;
  }
}

.help-title {
  display: flex;
  align-items: center;
  gap: 8px;

  .help-icon {
    font-size: 18px;
  }
}

.help-content {
  padding: 20px 24px;
  background: #fff;
  color: #333;
}

.help-section {
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }

  h4 {
    margin: 0 0 12px 0;
    font-size: 15px;
    color: $text-primary;
  }
}

.help-desc-list {
  margin: 0 0 16px 0;
  padding-left: 20px;
  font-size: 14px;
  line-height: 1.75;
  color: $text-secondary;

  li {
    margin-bottom: 8px;
  }
}

.help-scenarios {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.scenario-item {
  padding: 12px 14px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409eff;

  .scenario-label {
    display: block;
    font-weight: 600;
    font-size: 14px;
    color: $text-primary;
    margin-bottom: 6px;
  }

  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: $text-secondary;
  }

  code {
    padding: 2px 6px;
    background: #e8e8e8;
    border-radius: 4px;
    font-size: 12px;
  }
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.setting-card {
  .card-header {
    display: flex;
    align-items: center;
    font-weight: bold;
    
    .el-icon {
      margin-right: 10px;
      font-size: 18px;
    }
  }
  
  .el-form {
    .el-form-item {
      margin-bottom: 20px;
    }
  }
}

.actions {
  text-align: center;
  
  .el-button {
    margin: 0 10px;
    padding: 12px 30px;
  }
}

@media (max-width: 768px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
  
  .actions {
    .el-button {
      display: block;
      margin: 10px 0;
      width: 100%;
    }
  }
}
</style>