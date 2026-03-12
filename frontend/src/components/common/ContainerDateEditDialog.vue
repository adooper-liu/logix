<template>
  <el-dialog
    v-model="visible"
    title="调整货柜日期"
    width="400px"
    :before-close="handleClose"
  >
    <el-form :model="form" label-width="120px" size="default">
      <el-form-item label="集装箱号：">
        <span class="container-number">{{ form.containerNumber }}</span>
      </el-form-item>

      <el-form-item label="日期类型：">
        <el-select v-model="form.dateType" placeholder="请选择日期类型">
          <el-option label="预计到港日" value="etaDestPort" />
          <el-option label="实际到港日" value="ataDestPort" />
          <el-option label="计划提柜日" value="plannedPickupDate" />
          <el-option label="最晚提柜日" value="lastFreeDate" />
        </el-select>
      </el-form-item>

      <el-form-item label="新日期：">
        <el-date-picker
          v-model="form.newDate"
          type="datetime"
          placeholder="选择日期时间"
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DD HH:mm:ss"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="调整原因：">
        <el-input
          v-model="form.reason"
          type="textarea"
          :rows="3"
          placeholder="请输入调整原因"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">
          保存
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

interface Props {
  visible: boolean
  container: any
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'save', data: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
})

const saving = ref(false)
const form = ref({
  containerNumber: '',
  dateType: 'etaDestPort',
  newDate: '',
  reason: '',
})

// 监听 container 变化，初始化表单
watch(
  () => props.container,
  (newContainer) => {
    if (newContainer) {
      form.value.containerNumber = newContainer.containerNumber
      form.value.dateType = 'etaDestPort'
      form.value.newDate = ''
      form.value.reason = ''

      // 根据默认日期类型设置初始值
      const currentDate = newContainer[form.value.dateType]
      if (currentDate) {
        form.value.newDate = currentDate
      }
    }
  },
  { immediate: true }
)

// 监听日期类型变化，自动填充当前值
watch(
  () => form.value.dateType,
  (newType) => {
    if (props.container) {
      const currentDate = props.container[newType]
      if (currentDate) {
        form.value.newDate = currentDate
      }
    }
  }
)

// 保存
const handleSave = () => {
  if (!form.value.newDate) {
    ElMessage.warning('请选择新日期')
    return
  }

  if (!form.value.reason.trim()) {
    ElMessage.warning('请输入调整原因')
    return
  }

  saving.value = true
  emit('save', {
    containerNumber: form.value.containerNumber,
    field: form.value.dateType,
    value: form.value.newDate,
    reason: form.value.reason,
  })
  saving.value = false
}

// 关闭
const handleClose = () => {
  emit('update:visible', false)
}
</script>

<style scoped>
.container-number {
  font-weight: bold;
  color: #409eff;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
