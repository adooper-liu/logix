<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DateRangePicker from '@/components/common/DateRangePicker.vue'
import ContainerGanttChart from '@/components/common/ContainerGanttChart.vue'
import { containerService } from '@/services/container'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

const loading = ref(false)
const containers = ref<any[]>([])

// 加载数据的日期范围（更大范围，确保能获取到相关货柜）
const loadDataDateRange = ref<[Date, Date]>([
  dayjs().subtract(180, 'day').startOf('day').toDate(),
  dayjs().add(90, 'day').endOf('day').toDate()
])

// 显示范围（初始为空，加载后会自动设置）
const displayRange = ref<[Date, Date] | null>(null)

// 从货柜中提取所有泳道有数据的日期范围
const calculateDisplayRange = (containersData: any[]): [Date, Date] | null => {
  if (!containersData || containersData.length === 0) return null

  const allDates: Date[] = []

  containersData.forEach(container => {
    // 提取按到港日期
    if (container.portOperations && container.portOperations.length > 0) {
      const destPortOp = container.portOperations.find((op: any) => op.portType === 'destination')
      if (destPortOp && destPortOp.ataDestPort) {
        allDates.push(new Date(destPortOp.ataDestPort))
      }
    }

    // 提取计划提柜日期
    if (container.truckingTransports && container.truckingTransports.length > 0) {
      const trucking = container.truckingTransports[0]
      if (trucking.plannedPickupDate) {
        allDates.push(new Date(trucking.plannedPickupDate))
      }
    }

    // 提取最晚免费日期（提柜）
    if (container.lastFreeDate) {
      allDates.push(new Date(container.lastFreeDate))
    }

    // 提取最晚还箱日期
    if (container.emptyReturns && container.emptyReturns.length > 0) {
      const emptyReturn = container.emptyReturns[0]
      if (emptyReturn.lastReturnDate) {
        allDates.push(new Date(emptyReturn.lastReturnDate))
      }
    }
  })

  if (allDates.length === 0) return null

  // 排序日期
  allDates.sort((a, b) => a.getTime() - b.getTime())

  // 返回最早和最晚日期，并扩展一定范围
  const minDate = dayjs(allDates[0]).startOf('day').toDate()
  const maxDate = dayjs(allDates[allDates.length - 1]).endOf('day').toDate()

  return [minDate, maxDate]
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    // 使用更大的日期范围加载货柜数据，确保能获取到相关的货柜
    const startDate = dayjs(loadDataDateRange.value[0]).format('YYYY-MM-DD')
    const endDate = dayjs(loadDataDateRange.value[1]).format('YYYY-MM-DD')

    console.log('加载货柜数据，日期范围:', startDate, '至', endDate)

    const response = await containerService.getContainers({
      page: 1,
      pageSize: 5000,
      startDate,
      endDate
    })

    if (response) {
      containers.value = response.items || []
      ElMessage.success(`加载了 ${containers.value.length} 个货柜数据`)
      console.log('货柜数据加载完成，总数:', containers.value.length)

      // 计算并设置显示范围
      const range = calculateDisplayRange(containers.value)
      if (range) {
        displayRange.value = range
        console.log('自动设置显示范围:', dayjs(range[0]).format('YYYY-MM-DD'), '至', dayjs(range[1]).format('YYYY-MM-DD'))
      }
    }
  } catch (error) {
    console.error('Failed to load containers:', error)
    ElMessage.error('加载货柜数据失败')
  } finally {
    loading.value = false
  }
}

// 处理日期变化
const handleDateChange = async (value: [Date, Date] | null) => {
  if (value) {
    displayRange.value = value
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="gantt-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>货柜时间分布甘特图</h2>
        <p class="subtitle">可视化展示货柜在不同时间节点的分布情况</p>
      </div>
      <div class="header-actions">
        <DateRangePicker v-model="displayRange" @update:modelValue="handleDateChange" />
        <el-button type="primary" @click="loadData" :loading="loading">
          刷新数据
        </el-button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-bar">
      <div class="stat-item">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 3V7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8 3V7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M16 3V7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-label">货柜总数</span>
          <span class="stat-value">{{ containers.length }}</span>
        </div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-icon display-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 7V3M16 7V3M3 10H21M21 10V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V10H21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-label">显示范围</span>
          <span class="stat-value" v-if="displayRange">
            {{ dayjs(displayRange[0]).format('YYYY-MM-DD') }} 至 {{ dayjs(displayRange[1]).format('YYYY-MM-DD') }}
          </span>
          <span class="stat-value" v-else>-</span>
        </div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-icon load-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 16V4C4 2.89543 4.89543 2 6 2H18C19.1046 2 20 2.89543 20 4V16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 2V8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 16H22V20C22 21.1046 21.1046 22 20 22H4C2.89543 22 2 21.1046 2 20V16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-label">加载范围</span>
          <span class="stat-value">{{ dayjs(loadDataDateRange[0]).format('YYYY-MM-DD') }} 至 {{ dayjs(loadDataDateRange[1]).format('YYYY-MM-DD') }}</span>
        </div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-icon days-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-label">显示天数</span>
          <span class="stat-value" v-if="displayRange">
            {{ dayjs(displayRange[1]).diff(dayjs(displayRange[0]), 'day') + 1 }} 天
          </span>
          <span class="stat-value" v-else>-</span>
        </div>
      </div>
    </div>

    <!-- 甘特图 -->
    <div class="gantt-section">
      <el-card class="gantt-card" v-loading="loading">
        <ContainerGanttChart
          v-if="displayRange"
          :containers="containers"
          :startDate="displayRange[0]"
          :endDate="displayRange[1]"
        />
        <div v-else class="no-data">
          <el-empty description="暂无数据" />
        </div>
      </el-card>
    </div>

    <!-- 使用说明 -->
    <div class="info-section">
      <el-card>
        <template #header>
          <h3>使用说明</h3>
        </template>
        <div class="info-content">
          <div class="info-item">
            <h4>泳道说明：</h4>
            <ul>
              <li><strong>按到港：</strong>显示货柜实际到港日期</li>
              <li><strong>按计划提柜：</strong>显示货柜计划提柜日期</li>
              <li><strong>按最晚提柜：</strong>显示货柜最晚免费提柜日期</li>
              <li><strong>按最晚还箱：</strong>显示货柜最晚还箱日期</li>
            </ul>
          </div>
          <div class="info-item">
            <h4>颜色说明：</h4>
            <ul>
              <li><span class="color-dot" style="background-color: #67c23a;"></span> 绿色：按到港</li>
              <li><span class="color-dot" style="background-color: #e6a23c;"></span> 橙色：按计划提柜</li>
              <li><span class="color-dot" style="background-color: #f56c6c;"></span> 红色：按最晚提柜</li>
              <li><span class="color-dot" style="background-color: #909399;"></span> 灰色：按最晚还箱</li>
            </ul>
          </div>
          <div class="info-item">
            <h4>预警状态：</h4>
            <ul>
              <li><span class="warning-dot overdue"></span> 已逾期：日期已过，显示红色并闪烁</li>
              <li><span class="warning-dot urgent"></span> 即将到期：3天内到期，显示橙色并闪烁</li>
            </ul>
          </div>
          <div class="info-item">
            <h4>操作提示：</h4>
            <ul>
              <li>鼠标悬停在圆点上可查看货柜详细信息</li>
              <li>选择不同日期范围可查看对应时间段的数据</li>
              <li>周末日期背景会高亮显示</li>
            </ul>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.gantt-page {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;

  .header-left {
    h2 {
      margin: 0 0 8px 0;
      font-size: 24px;
      color: $text-primary;
      font-weight: 600;
    }

    .subtitle {
      margin: 0;
      font-size: 14px;
      color: $text-secondary;
    }
  }

  .header-actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }
}

.stats-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.25);

  .stat-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.25);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .stat-icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      color: white;
      font-size: 20px;
      flex-shrink: 0;
      transition: all 0.3s ease;

      svg {
        width: 22px;
        height: 22px;
      }

      &.display-icon {
        background: rgba(102, 234, 204, 0.3);
      }

      &.load-icon {
        background: rgba(255, 206, 86, 0.3);
      }

      &.days-icon {
        background: rgba(237, 100, 166, 0.3);
      }
    }

    .stat-content {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .stat-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.85);
        font-weight: 500;
        letter-spacing: 0.5px;
      }

      .stat-value {
        font-size: 18px;
        font-weight: 700;
        color: white;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }
    }
  }

  .stat-divider {
    width: 2px;
    height: 32px;
    background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    flex-shrink: 0;
  }
}

.gantt-section {
  .gantt-card {
    padding: 0;
    background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f5 100%);
    border: none;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    overflow: hidden;

    &:hover {
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
      transform: translateY(-2px);
    }

    :deep(.el-card__body) {
      padding: 0;
    }
  }

  .no-data {
    padding: 80px 20px;
    text-align: center;
    background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f5 100%);

    .el-empty {
      :deep(.el-empty__image) {
        svg {
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1));
        }
      }

      :deep(.el-empty__description) {
        font-size: 15px;
        color: $text-secondary;
      }
    }
  }
}

.info-section {
  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: $text-primary;
  }

  .info-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;

    .info-item {
      h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: 600;
        color: $text-primary;
      }

      ul {
        margin: 0;
        padding-left: 20px;
        list-style: none;

        li {
          font-size: 13px;
          color: $text-secondary;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;

          &:last-child {
            margin-bottom: 0;
          }

          strong {
            color: $text-primary;
          }

          .color-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            flex-shrink: 0;
          }

          .warning-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            flex-shrink: 0;

            &.overdue {
              background-color: #f56c6c;
              animation: pulse 2s infinite;
            }

            &.urgent {
              background-color: #e6a23c;
              animation: pulse 2s infinite;
            }
          }
        }
      }
    }
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;

    .header-actions {
      width: 100%;
      flex-direction: column;
      align-items: stretch;
    }
  }

  .stats-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    padding: 16px;

    .stat-item {
      padding: 12px 16px;
      gap: 12px;

      .stat-icon {
        width: 36px;
        height: 36px;

        svg {
          width: 18px;
          height: 18px;
        }
      }

      .stat-content {
        .stat-value {
          font-size: 16px;
        }
      }
    }

    .stat-divider {
      display: none;
    }
  }

  .info-content {
    grid-template-columns: 1fr;
  }
}
</style>
