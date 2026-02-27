<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft, Refresh } from '@element-plus/icons-vue'

const props = defineProps<{
  containerNumber: string
  loading: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

const router = useRouter()

const goBack = () => {
  router.push('/shipments')
}

const handleRefresh = () => {
  emit('refresh')
}
</script>

<template>
  <div class="page-header">
    <div class="header-left">
      <el-button :icon="ArrowLeft" @click="goBack" circle size="large" />
      <div>
        <h2>货柜详情</h2>
        <p>集装箱号: {{ containerNumber }}</p>
      </div>
    </div>
    <div class="header-right">
      <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  position: relative;
  z-index: 100;

  .header-left {
    display: flex;
    align-items: center;
    gap: 15px;

    h2 {
      font-size: 24px;
      color: #303133;
      margin: 0;
    }

    p {
      margin: 0;
      font-size: 14px;
      color: #909399;
    }
  }
}
</style>
