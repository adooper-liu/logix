<template>
  <div class="alert-center">
    <div class="alert-center-header">
      <h3 class="alert-center-title">预警中心</h3>
      <div class="alert-center-actions">
        <el-button size="small" @click="refreshAlerts">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>
    <div class="alert-center-content">
      <div v-if="loading" class="loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        加载中...
      </div>
      <div v-else-if="alerts.length === 0" class="empty">
        <el-icon><InfoFilled /></el-icon>
        <p>暂无预警信息</p>
      </div>
      <el-collapse v-else>
        <el-collapse-item
          v-for="alert in alerts"
          :key="alert.id"
          :title="`${getAlertLevelText(alert.level)} - ${alert.containerNumber}`"
          :name="alert.id"
        >
          <div class="alert-item">
            <div class="alert-item-content">
              <p class="alert-message">{{ alert.message }}</p>
              <div class="alert-meta">
                <span class="alert-type">{{ getAlertTypeText(alert.type) }}</span>
                <span class="alert-time">{{ formatDateToLocal(alert.createdAt) }}</span>
              </div>
            </div>
            <div class="alert-item-actions">
              <el-button
                v-if="!alert.resolved"
                size="small"
                type="primary"
                @click="acknowledgeAlert(alert.id)"
              >
                确认
              </el-button>
              <el-button
                v-if="!alert.resolved"
                size="small"
                type="success"
                @click="resolveAlert(alert.id)"
              >
                解决
              </el-button>
              <span v-else class="alert-resolved">已解决</span>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { alertApi } from '@/services/alert'
import { useUserStore } from '@/store/user'
import { Refresh, Loading, InfoFilled } from '@element-plus/icons-vue'
import { formatDateToLocal } from '@/utils/dateTimeUtils'

const userStore = useUserStore()
const alerts = ref<any[]>([])
const loading = ref(false)

const getAlertLevelText = (level: string) => {
  const levelMap: Record<string, string> = {
    info: '信息',
    warning: '警告',
    critical: '紧急',
  }
  return levelMap[level] || level
}

const getAlertTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    customs: '清关',
    trucking: '拖卡',
    unloading: '卸柜',
    emptyReturn: '还箱',
    inspection: '查验',
    demurrage: '滞港费',
    detention: '滞箱费',
  }
  return typeMap[type] || type
}

const refreshAlerts = async () => {
  loading.value = true
  try {
    const response = await alertApi.getAllAlerts({ resolved: false })
    alerts.value = response.data
  } catch (error) {
    console.error('获取预警列表失败:', error)
  } finally {
    loading.value = false
  }
}

const acknowledgeAlert = async (alertId: number) => {
  try {
    const userId = String(userStore.userInfo?.id ?? 'system')
    await alertApi.acknowledgeAlert(alertId, userId)
    refreshAlerts()
  } catch (error) {
    console.error('确认预警失败:', error)
  }
}

const resolveAlert = async (alertId: number) => {
  try {
    const userId = String(userStore.userInfo?.id ?? 'system')
    await alertApi.resolveAlert(alertId, userId)
    refreshAlerts()
  } catch (error) {
    console.error('解决预警失败:', error)
  }
}

onMounted(() => {
  refreshAlerts()
})
</script>

<style scoped lang="scss">
@import '@/assets/styles/variables';

.alert-center {
  background: $bg-color;
  border-radius: $radius-base;
  box-shadow: $shadow-light;
  overflow: hidden;

  .alert-center-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $spacing-md;
    border-bottom: 1px solid $border-light;

    .alert-center-title {
      margin: 0;
      font-size: $font-size-lg;
      font-weight: 600;
      color: $text-primary;
    }
  }

  .alert-center-content {
    padding: $spacing-md;

    .loading,
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: $spacing-xl 0;
      color: $text-secondary;

      el-icon {
        font-size: 32px;
        margin-bottom: $spacing-md;
      }
    }

    .alert-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: $spacing-md 0;

      .alert-item-content {
        flex: 1;

        .alert-message {
          margin: 0 0 $spacing-sm 0;
          color: $text-primary;
          line-height: 1.5;
        }

        .alert-meta {
          display: flex;
          gap: $spacing-md;
          font-size: $font-size-sm;
          color: $text-secondary;

          .alert-type {
            background: $bg-overlay;
            padding: 2px 8px;
            border-radius: $radius-small;
            border: 1px solid $border-light;
          }
        }
      }

      .alert-item-actions {
        display: flex;
        gap: $spacing-sm;
        align-items: center;

        .alert-resolved {
          font-size: $font-size-sm;
          color: $success-color;
        }
      }
    }
  }
}
</style>
