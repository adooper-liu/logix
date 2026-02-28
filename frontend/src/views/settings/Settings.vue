<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Setting, Connection, Notification } from '@element-plus/icons-vue'

// 系统配置
const systemConfig = ref({
  // API配置
  api: {
    baseUrl: 'http://localhost:3001/api/v1',
    timeout: 10000,
    retryAttempts: 3
  },
  
  // 适配器配置
  adapters: {
    defaultSource: 'logistics_path',
    healthCheckInterval: 60000,
    enableAutoFailover: true
  },
  
  // 通知配置
  notifications: {
    emailEnabled: true,
    webhookEnabled: true,
    alertThreshold: 80
  }
})

// 表单验证
const formRules = {
  'api.baseUrl': [
    { required: true, message: '请输入API基础URL', trigger: 'blur' },
    { type: 'url', message: '请输入有效的URL', trigger: 'blur' }
  ],
  'api.timeout': [
    { required: true, message: '请输入超时时间', trigger: 'blur' },
    { type: 'number', message: '请输入数字', trigger: 'blur' }
  ]
}

// 保存配置
const saveConfig = () => {
  ElMessage.success('配置保存成功')
  // 这里应该调用API保存配置
}

// 重置配置
const resetConfig = () => {
  ElMessage.info('配置已重置为默认值')
  // 这里应该重置为默认配置
}

// 测试连接
const testConnection = async () => {
  ElMessage.info('正在测试连接...')
  // 这里应该调用测试连接API
  setTimeout(() => {
    ElMessage.success('连接测试成功')
  }, 1500)
}
</script>

<template>
  <div class="settings-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>系统设置</h2>
      <p>配置系统参数和连接设置</p>
    </div>

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
  margin-bottom: 30px;
  
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