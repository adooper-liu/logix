<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="800px"
    :close-on-click-modal="false"
    @opened="onDialogOpened"
  >
    <!-- 批量设置表单 -->
    <el-card class="batch-setting-card">
      <template #header>
        <div class="card-header">
          <span>批量设置</span>
          <el-tag type="info">快速配置日期范围</el-tag>
        </div>
      </template>

      <el-form ref="batchFormRef" :model="batchForm" label-width="140px" :rules="batchFormRules">
        <!-- 资源信息显示 -->
        <el-alert
          v-if="currentWarehouseCode || currentTruckingCompanyId"
          type="info"
          show-icon
          :closable="false"
          style="margin-bottom: 16px"
        >
          <template #title>
            <div style="display: flex; align-items: center; gap: 8px">
              <el-icon><InfoFilled /></el-icon>
              <span>
                {{ currentResourceType === 'warehouse' ? '仓库' : '车队' }}:
                <strong>{{ currentWarehouseCode || currentTruckingCompanyId }}</strong>
              </span>
            </div>
          </template>
        </el-alert>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="日期范围" prop="dateRange">
              <el-date-picker
                v-model="batchForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="设置能力" prop="capacity">
              <el-input-number
                v-model="batchForm.capacity"
                :min="0"
                :max="100"
                :step="1"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="应用星期" prop="applyDays">
              <el-checkbox-group v-model="batchForm.applyDays">
                <el-checkbox-button v-for="day in weekDays" :key="day.value" :value="day.value">
                  {{ day.label }}
                </el-checkbox-button>
              </el-checkbox-group>
              <div class="form-tip">
                <el-icon><InfoFilled /></el-icon>
                选择要应用的星期几，如只选周六、周日则仅影响周末
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="原因" prop="reason">
              <el-input
                v-model="batchForm.reason"
                type="textarea"
                :rows="3"
                placeholder="请输入原因，如：春节假期、设备维护、仓库盘点等"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item>
              <el-button type="primary" :loading="batchLoading" @click="applyBatchSetting">
                <el-icon><Check /></el-icon>
                应用批量设置
              </el-button>
              <el-button @click="resetBatchForm">
                <el-icon><Refresh /></el-icon>
                重置
              </el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 已手动设置的列表 -->
    <el-card class="manual-settings-list" style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>已手动设置的日期</span>
          <el-badge
            :value="manualSettings.length"
            type="primary"
            :hidden="manualSettings.length === 0"
          />
        </div>
      </template>

      <el-table
        :data="manualSettings"
        v-loading="listLoading"
        stripe
        style="width: 100%"
        max-height="400"
      >
        <el-table-column prop="date" label="日期" width="120" sortable>
          <template #default="{ row }">
            {{ formatDate(row.date) }}
          </template>
        </el-table-column>

        <el-table-column prop="weekday" label="星期" width="100">
          <template #default="{ row }">
            {{ getWeekday(row.date) }}
          </template>
        </el-table-column>

        <el-table-column prop="capacity" label="能力值" width="100" sortable>
          <template #default="{ row }">
            <el-tag :type="row.capacity > 0 ? 'success' : 'danger'">
              {{ row.capacity }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="reason" label="原因" min-width="200" show-overflow-tooltip />

        <el-table-column prop="createdAt" label="设置时间" width="160" sortable>
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="editSetting(row)"> 编辑 </el-button>
            <el-button size="small" type="danger" @click="deleteSetting(row)"> 删除 </el-button>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty description="暂无手动设置记录" />
        </template>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadManualSettings"
        @current-change="loadManualSettings"
        style="margin-top: 16px; justify-content: flex-end"
      />
    </el-card>

    <!-- 对话框底部按钮 -->
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="dialogVisible = false"> 完成 </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import api from '@/services/api'
import { Check, InfoFilled, Refresh } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus'
import { computed, reactive, ref, watch } from 'vue'

// Props & Emits
const props = defineProps<{
  visible: boolean
  resourceType?: 'warehouse' | 'trucking'
  warehouseCode?: string
  truckingCompanyId?: string
  selectedDate?: string  // 可选：打开对话框时选中的日期
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'applied'): void
}>()

// 对话框可见性
const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})

// 当前资源信息（基于 props）
const currentResourceType = computed(() => props.resourceType || 'warehouse')
const currentWarehouseCode = computed(() => props.warehouseCode || '')
const currentTruckingCompanyId = computed(() => props.truckingCompanyId || '')
const initialDate = computed(() => props.selectedDate ? dayjs(props.selectedDate).format('YYYY-MM-DD') : '')

// 标题显示
const dialogTitle = computed(() => {
  const typeText = currentResourceType.value === 'warehouse' ? '仓库' : '车队'
  const codeText = currentWarehouseCode.value || currentTruckingCompanyId.value || ''
  return `📝 手动设置${typeText}能力 - ${codeText}`
})

// 表单引用
const batchFormRef = ref<FormInstance>()

// 星期选项
const weekDays = [
  { value: 'monday', label: '周一' },
  { value: 'tuesday', label: '周二' },
  { value: 'wednesday', label: '周三' },
  { value: 'thursday', label: '周四' },
  { value: 'friday', label: '周五' },
  { value: 'saturday', label: '周六' },
  { value: 'sunday', label: '周日' },
]

// 批量设置表单
const batchForm = reactive({
  dateRange: [] as string[],
  capacity: 0,
  applyDays: ['saturday', 'sunday'] as string[],
  reason: '',
})

// 表单验证规则
const batchFormRules = {
  dateRange: [{ required: true, message: '请选择日期范围', trigger: 'change' }],
  capacity: [{ required: true, message: '请设置能力值', trigger: 'change' }],
}

// 加载状态
const batchLoading = ref(false)
const listLoading = ref(false)

// 手动设置列表
const manualSettings = ref<any[]>([])

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

// 加载手动设置列表
const loadManualSettings = async () => {
  listLoading.value = true
  try {
    // TODO: 等待后端实现手动能力设置 API
    // 暂时返回空列表
    manualSettings.value = []
    pagination.total = 0

    // const response = await api.get('/scheduling/resources/capacity/manual/list', {
    //   params: {
    //     page: pagination.page,
    //     pageSize: pagination.pageSize
    //   }
    // })
    //
    // if (response.data.success) {
    //   manualSettings.value = response.data.data.items
    //   pagination.total = response.data.data.total
    // }
  } catch (error: any) {
    console.error('加载手动设置列表失败:', error)
    // ElMessage.error('加载失败：' + error.message)
  } finally {
    listLoading.value = false
  }
}

// 应用批量设置
const applyBatchSetting = async () => {
  if (!batchFormRef.value) return

  await batchFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return

    if (!batchForm.applyDays || batchForm.applyDays.length === 0) {
      ElMessage.warning('请至少选择一个星期')
      return
    }

    batchLoading.value = true
    try {
      const startDate = batchForm.dateRange[0]
      const endDate = batchForm.dateRange[1]

      // 调用批量设置 API
      const response = await api.post('/scheduling/resources/capacity/manual/batch', {
        resourceType: currentResourceType.value,
        warehouseCode: currentWarehouseCode.value || undefined,
        truckingCompanyId: currentTruckingCompanyId.value || undefined,
        startDate,
        endDate,
        capacity: batchForm.capacity,
        applyDays: batchForm.applyDays,
        reason: batchForm.reason,
      })

      if (response.data.success) {
        ElMessage.success(`成功设置 ${response.data.data.count} 个日期`)

        // 重置表单
        resetBatchForm()

        // 刷新列表
        loadManualSettings()

        // 通知父组件
        emit('applied')
      }
    } catch (error: any) {
      console.error('批量设置失败:', error)
      ElMessage.error('批量设置失败：' + error.message)
    } finally {
      batchLoading.value = false
    }
  })
}

// 重置表单
const resetBatchForm = () => {
  batchForm.dateRange = []
  batchForm.capacity = 0
  batchForm.applyDays = ['saturday', 'sunday']
  batchForm.reason = ''
  batchFormRef.value?.clearValidate()
}

// 编辑设置
const editSetting = (row: any) => {
  // 填充表单
  batchForm.dateRange = [row.date, row.date]
  batchForm.capacity = row.capacity
  batchForm.reason = row.reason

  // 计算星期
  const weekday = getWeekday(row.date).toLowerCase()
  const weekdayMap: Record<string, string> = {
    周一: 'monday',
    周二: 'tuesday',
    周三: 'wednesday',
    周四: 'thursday',
    周五: 'friday',
    周六: 'saturday',
    周日: 'sunday',
  }
  batchForm.applyDays = [weekdayMap[weekday]]

  // 滚动到顶部
  document.querySelector('.batch-setting-card')?.scrollIntoView({ behavior: 'smooth' })
}

// 删除设置
const deleteSetting = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除 ${formatDate(row.date)} 的手动设置吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await api.delete(`/scheduling/resources/capacity/manual/${row.date}`)

    ElMessage.success('删除成功')
    loadManualSettings()
    emit('applied')
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败：' + error.message)
    }
  }
}

// 格式化日期
const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD')
}

// 格式化日期时间
const formatDateTime = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

// 获取星期
const getWeekday = (date: string) => {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return weekdays[dayjs(date).day()]
}

// 对话框打开时
const onDialogOpened = () => {
  loadManualSettings()
}

// 监听可见性变化
watch(
  () => props.visible,
  (newVal: boolean) => {
    if (newVal) {
      loadManualSettings()
    }
  }
)
</script>

<style scoped lang="scss">
.batch-setting-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .form-tip {
    margin-top: 4px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.manual-settings-list {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.el-checkbox-button) {
  min-width: 60px;
}

:deep(.el-table) {
  font-size: 13px;

  .el-button {
    padding: 4px 8px;
    font-size: 12px;
  }
}
</style>
