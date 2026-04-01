<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  ElMessage,
  ElDatePicker,
  ElSelect,
  ElOption,
  ElButton,
  ElInput,
  ElTable,
  ElTableColumn,
  ElPopconfirm,
} from 'element-plus'
import { inspectionService, type InspectionRecord } from '@/services/inspection'
import { containerService } from '@/services/container'
import dayjs from 'dayjs'

const props = defineProps<{
  containerNumber: string
}>()

const loading = ref(false)
const inspectionRecord = ref<InspectionRecord | null>(null)
const isEditing = ref(false)

// 表单数据
const formData = ref<InspectionRecord>({
  containerNumber: props.containerNumber,
  inspectionSkus: [],
  events: [],
})

// 新事件表单
const newEvent = ref<{
  eventDate: string
  eventStatus: string
}>({
  eventDate: dayjs().format('YYYY-MM-DD'),
  eventStatus: '',
})

// 货柜SKU列表
const containerSkus = ref<string[]>([])

// 问题类型选项
const inspectionTypeOptions = [
  { label: '测试报告内容与标准适用性', value: '测试报告内容与标准适用性' },
  { label: '报告合规与真实性', value: '报告合规与真实性' },
  { label: '新标准要求', value: '新标准要求' },
  { label: '物理查验(非文件类)', value: '物理查验(非文件类)' },
  { label: '其它', value: '其它' },
]

// 清关状态选项
const customsClearanceStatusOptions = [
  { label: '查验中', value: '查验中' },
  { label: '部分放行、部分查验', value: '部分放行、部分查验' },
  { label: '部分放行、部分退运', value: '部分放行、部分退运' },
  { label: '全部退运', value: '全部退运' },
  { label: '退运完成', value: '退运完成' },
  { label: '全部放行', value: '全部放行' },
]

// 加载货柜的SKU列表
const loadContainerSkus = async () => {
  try {
    const response = await containerService.getContainerById(props.containerNumber)
    const containerData = response?.data as any
    if (response.success && containerData?.replenishmentOrders) {
      const skus = new Set<string>()
      containerData.replenishmentOrders.forEach((order: any) => {
        if (order.skus) {
          order.skus.forEach((sku: any) => {
            skus.add(sku.sku)
          })
        }
      })
      containerSkus.value = Array.from(skus)
    }
  } catch (error) {
    console.error('Failed to load container SKUs:', error)
  }
}

// 加载查验记录
const loadInspectionRecord = async () => {
  loading.value = true
  try {
    const response = await inspectionService.getInspectionRecord(props.containerNumber)
    if (response) {
      inspectionRecord.value = response
      formData.value = { ...response }
    } else {
      // 创建空记录
      formData.value = {
        containerNumber: props.containerNumber,
        inspectionSkus: [],
        events: [],
      }
    }
  } catch (error) {
    console.error('Failed to load inspection record:', error)
    ElMessage.error('加载查验记录失败')
  } finally {
    loading.value = false
  }
}

// 保存查验记录
const saveInspectionRecord = async () => {
  loading.value = true
  try {
    const response = await inspectionService.createOrUpdateInspectionRecord(formData.value)
    inspectionRecord.value = response
    formData.value = { ...response }
    ElMessage.success('保存成功')
    isEditing.value = false
  } catch (error) {
    console.error('Failed to save inspection record:', error)
    ElMessage.error('保存失败')
  } finally {
    loading.value = false
  }
}

// 添加事件
const addEvent = async () => {
  if (!newEvent.value.eventDate || !newEvent.value.eventStatus) {
    ElMessage.warning('请填写事件日期和状态')
    return
  }

  if (!formData.value.id) {
    // 先保存记录获取ID
    await saveInspectionRecord()
    if (!formData.value.id) {
      return
    }
  }

  loading.value = true
  try {
    const response = await inspectionService.addInspectionEvent(formData.value.id!, newEvent.value)
    if (!formData.value.events) {
      formData.value.events = []
    }
    formData.value.events.push(response)
    // 清空表单
    newEvent.value = {
      eventDate: dayjs().format('YYYY-MM-DD'),
      eventStatus: '',
    }
    ElMessage.success('事件添加成功')
  } catch (error) {
    console.error('Failed to add event:', error)
    ElMessage.error('事件添加失败')
  } finally {
    loading.value = false
  }
}

// 删除事件
const deleteEvent = async (eventId: number) => {
  loading.value = true
  try {
    await inspectionService.deleteInspectionEvent(eventId)
    if (formData.value.events) {
      formData.value.events = formData.value.events.filter(event => event.id !== eventId)
    }
    ElMessage.success('事件删除成功')
  } catch (error) {
    console.error('Failed to delete event:', error)
    ElMessage.error('事件删除失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadContainerSkus()
  await loadInspectionRecord()
})
</script>

<template>
  <div class="inspection-record">
    <div class="record-header">
      <h3 class="record-title">查验记录</h3>
      <el-button type="primary" size="small" @click="isEditing = !isEditing">
        {{ isEditing ? '取消编辑' : '编辑记录' }}
      </el-button>
    </div>

    <div class="record-content" v-loading="loading">
      <!-- 表头信息 -->
      <el-card class="info-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>表头信息</span>
          </div>
        </template>

        <div class="form-grid">
          <div class="form-item">
            <label class="form-label">问题类型</label>
            <el-select
              v-model="formData.inspectionType"
              placeholder="请选择"
              :disabled="!isEditing"
              class="form-select"
            >
              <el-option
                v-for="option in inspectionTypeOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </div>

          <div class="form-item">
            <label class="form-label">查验SKU</label>
            <el-select
              v-model="formData.inspectionSkus"
              multiple
              placeholder="请选择SKU"
              :disabled="!isEditing"
              class="form-select"
            >
              <el-option v-for="sku in containerSkus" :key="sku" :label="sku" :value="sku" />
            </el-select>
          </div>

          <div class="form-item">
            <label class="form-label">海关质疑</label>
            <el-input
              v-model="formData.customsQuestion"
              type="textarea"
              :rows="2"
              placeholder="记录海关提出的原始、具体问题"
              :disabled="!isEditing"
              class="form-textarea"
            />
          </div>

          <div class="form-item">
            <label class="form-label">海关要求</label>
            <el-input
              v-model="formData.customsRequirement"
              type="textarea"
              :rows="2"
              placeholder="记录海关明确要求的证据或行动"
              :disabled="!isEditing"
              class="form-textarea"
            />
          </div>

          <div class="form-item">
            <label class="form-label">海关时限</label>
            <el-input
              v-model="formData.customsDeadline"
              placeholder="记录海关给出的处理期限（如有）"
              :disabled="!isEditing"
              class="form-input"
            />
          </div>

          <div class="form-item">
            <label class="form-label">出运前风险预判</label>
            <el-input
              v-model="formData.preShipmentRiskAssessment"
              type="textarea"
              :rows="3"
              placeholder="记录在产品认证或发货前，内部是否已识别到该潜在风险，以及预判结论"
              :disabled="!isEditing"
              class="form-textarea"
            />
          </div>

          <div class="form-item">
            <label class="form-label">本次应对措施</label>
            <el-input
              v-model="formData.responseMeasures"
              type="textarea"
              :rows="3"
              placeholder="记录为解决本次清关事件所采取的具体行动"
              :disabled="!isEditing"
              class="form-textarea"
            />
          </div>

          <div class="form-item">
            <label class="form-label">海关最终裁定</label>
            <el-input
              v-model="formData.customsFinalDecision"
              type="textarea"
              :rows="2"
              placeholder="记录海关的最终决定及理由"
              :disabled="!isEditing"
              class="form-textarea"
            />
          </div>

          <div class="form-item">
            <label class="form-label">最新状态</label>
            <el-input
              v-model="formData.latestStatus"
              type="textarea"
              :rows="2"
              placeholder="动态更新当前处理进展"
              :disabled="!isEditing"
              class="form-textarea"
            />
          </div>

          <div class="form-item">
            <label class="form-label">是否已清关完结</label>
            <el-select
              v-model="formData.customsClearanceStatus"
              placeholder="请选择"
              :disabled="!isEditing"
              class="form-select"
            >
              <el-option
                v-for="option in customsClearanceStatusOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </div>

          <div class="form-item">
            <label class="form-label">产生滞港费用</label>
            <el-input
              v-model.number="formData.demurrageFee"
              type="number"
              placeholder="金额，本地币"
              :disabled="true"
              class="form-input"
            />
            <span class="form-hint">由滞港费计算表带过来，不需要这里填</span>
          </div>

          <div class="form-item">
            <label class="form-label">责任认定</label>
            <el-input
              v-model="formData.responsibilityDetermination"
              type="textarea"
              :rows="2"
              placeholder="记录内部判定的责任根源"
              :disabled="!isEditing"
              class="form-textarea"
            />
          </div>

          <div class="form-item">
            <label class="form-label">备注</label>
            <el-input
              v-model="formData.remarks"
              type="textarea"
              :rows="3"
              placeholder="手工填写以上字段未尽项内容"
              :disabled="!isEditing"
              class="form-textarea"
            />
          </div>
        </div>

        <div v-if="isEditing" class="form-actions">
          <el-button type="primary" @click="saveInspectionRecord">保存记录</el-button>
        </div>
      </el-card>

      <!-- 事件履历 -->
      <el-card class="events-card" shadow="hover" style="margin-top: 20px">
        <template #header>
          <div class="card-header">
            <span>事件履历</span>
            <el-button v-if="isEditing" type="success" size="small" @click="addEvent">
              添加事件
            </el-button>
          </div>
        </template>

        <div v-if="isEditing" class="event-form" style="margin-bottom: 20px">
          <el-date-picker
            v-model="newEvent.eventDate"
            type="date"
            placeholder="选择日期"
            style="width: 180px; margin-right: 10px"
          />
          <el-input
            v-model="newEvent.eventStatus"
            placeholder="事件状态"
            style="flex: 1; margin-right: 10px"
          />
          <el-button type="primary" size="small" @click="addEvent">添加</el-button>
        </div>

        <el-table :data="formData.events || []" style="width: 100%">
          <el-table-column prop="eventDate" label="日期" width="120">
            <template #default="scope">
              {{ scope.row.eventDate }}
            </template>
          </el-table-column>
          <el-table-column prop="eventStatus" label="最新状态" min-width="200" />
          <el-table-column label="操作" width="100" v-if="isEditing">
            <template #default="scope">
              <el-popconfirm title="确定删除此事件吗？" @confirm="deleteEvent(scope.row.id!)">
                <template #reference>
                  <el-button type="danger" size="small" plain>删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="!formData.events || formData.events.length === 0" class="empty-events">
          <p>暂无事件记录</p>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.inspection-record {
  .record-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .record-title {
      font-size: $font-size-lg;
      font-weight: 600;
      color: $text-primary;
      margin: 0;
    }
  }

  .record-content {
    .info-card,
    .events-card {
      border-radius: $radius-large;
      border: 1px solid $border-lighter;

      :deep(.el-card__body) {
        padding: $spacing-lg;
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        color: $text-primary;
      }
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(48%, 1fr));
      gap: $spacing-md;

      .form-item {
        .form-label {
          display: block;
          font-weight: 500;
          color: $text-regular;
          margin-bottom: $spacing-xs;
        }

        .form-input,
        .form-select {
          width: 100%;
        }

        .form-textarea {
          width: 100%;
        }

        .form-hint {
          display: block;
          font-size: $font-size-sm;
          color: $text-secondary;
          margin-top: $spacing-xs;
        }
      }

      .form-actions {
        grid-column: 1 / -1;
        display: flex;
        justify-content: flex-end;
        margin-top: $spacing-md;
      }
    }

    .event-form {
      display: flex;
      align-items: center;
    }

    .empty-events {
      text-align: center;
      padding: $spacing-xl;
      color: $text-secondary;
    }
  }
}
</style>
