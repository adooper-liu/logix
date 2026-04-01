<script setup lang="ts">
import { containerService } from '@/services/container'
import { dictService, type DictItem } from '@/services/dict'
import { ElMessage } from 'element-plus'
import { computed, ref, watch, onMounted } from 'vue'

interface Props {
  visible: boolean
  containerNumber: string
  country?: string // 目的国，用于过滤下拉选项
  // 现有数据
  initialData?: {
    plannedCustomsDate?: string
    plannedPickupDate?: string
    plannedDeliveryDate?: string
    plannedUnloadDate?: string
    plannedReturnDate?: string
    truckingCompanyId?: string
    customsBrokerCode?: string
    warehouseId?: string
    unloadModePlan?: string
  }
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
  success: []
}>()

const loading = ref(false)
const dictLoading = ref(false)

// 字典下拉数据
const truckingCompanies = ref<DictItem[]>([])
const customsBrokers = ref<DictItem[]>([])
const warehouses = ref<DictItem[]>([])

const form = ref({
  plannedCustomsDate: '',
  plannedPickupDate: '',
  plannedDeliveryDate: '',
  plannedUnloadDate: '',
  plannedReturnDate: '',
  truckingCompanyId: '',
  customsBrokerCode: '',
  warehouseId: '',
  unloadModePlan: '',
})

// 加载字典数据（带国家过滤）
const loadDictData = async () => {
  if (!props.country) {
    // 如果没有国家信息，加载全部
    const [tc, cb, w] = await Promise.all([
      dictService.getTruckingCompanies(),
      dictService.getCustomsBrokers(),
      dictService.getWarehouses(),
    ])
    truckingCompanies.value = tc.data || []
    customsBrokers.value = cb.data || []
    warehouses.value = w.data || []
  } else {
    const [tc, cb, w] = await Promise.all([
      dictService.getTruckingCompanies(props.country),
      dictService.getCustomsBrokers(props.country),
      dictService.getWarehouses(props.country),
    ])
    truckingCompanies.value = tc.data || []
    customsBrokers.value = cb.data || []
    warehouses.value = w.data || []
  }
}

// 监听弹窗打开，初始化表单数据
watch(
  () => props.visible,
  async val => {
    if (val && props.initialData) {
      form.value = {
        plannedCustomsDate: props.initialData.plannedCustomsDate || '',
        plannedPickupDate: props.initialData.plannedPickupDate || '',
        plannedDeliveryDate: props.initialData.plannedDeliveryDate || '',
        plannedUnloadDate: props.initialData.plannedUnloadDate || '',
        plannedReturnDate: props.initialData.plannedReturnDate || '',
        truckingCompanyId: props.initialData.truckingCompanyId || '',
        customsBrokerCode: props.initialData.customsBrokerCode || '',
        warehouseId: props.initialData.warehouseId || '',
        unloadModePlan: props.initialData.unloadModePlan || '',
      }
      // 加载字典数据
      await loadDictData()
    }
  }
)

const dialogVisible = computed({
  get: () => props.visible,
  set: val => emit('update:visible', val),
})

const handleSubmit = async () => {
  if (!props.containerNumber) {
    ElMessage.warning('货柜号不存在')
    return
  }

  loading.value = true
  try {
    // 只提交有值的字段
    const scheduleData: any = {}
    if (form.value.plannedCustomsDate)
      scheduleData.plannedCustomsDate = form.value.plannedCustomsDate
    if (form.value.plannedPickupDate) scheduleData.plannedPickupDate = form.value.plannedPickupDate
    if (form.value.plannedDeliveryDate)
      scheduleData.plannedDeliveryDate = form.value.plannedDeliveryDate
    if (form.value.plannedUnloadDate) scheduleData.plannedUnloadDate = form.value.plannedUnloadDate
    if (form.value.plannedReturnDate) scheduleData.plannedReturnDate = form.value.plannedReturnDate
    if (form.value.truckingCompanyId) scheduleData.truckingCompanyId = form.value.truckingCompanyId
    if (form.value.customsBrokerCode) scheduleData.customsBrokerCode = form.value.customsBrokerCode
    if (form.value.warehouseId) scheduleData.warehouseId = form.value.warehouseId
    if (form.value.unloadModePlan) scheduleData.unloadModePlan = form.value.unloadModePlan

    const result = await containerService.updateSchedule(props.containerNumber, scheduleData)
    if (result.success) {
      ElMessage.success('计划更新成功')
      dialogVisible.value = false
      emit('success')
    } else {
      ElMessage.error(result.message || '更新失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '更新失败')
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  dialogVisible.value = false
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="编辑计划"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form :model="form" label-width="100px">
      <el-divider content-position="left">清关计划</el-divider>
      <el-form-item label="计划清关日">
        <el-date-picker
          v-model="form.plannedCustomsDate"
          type="date"
          placeholder="选择日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="清关公司">
        <el-select
          v-model="form.customsBrokerCode"
          placeholder="选择清关公司"
          style="width: 100%"
          filterable
          clearable
        >
          <el-option
            v-for="item in customsBrokers"
            :key="item.code"
            :label="item.name"
            :value="item.code"
          >
            <span>{{ item.name }}</span>
            <span v-if="item.nameEn" style="color: #999; font-size: 12px; margin-left: 8px">
              {{ item.nameEn }}
            </span>
          </el-option>
        </el-select>
      </el-form-item>

      <el-divider content-position="left">拖卡计划</el-divider>
      <el-form-item label="计划提柜日">
        <el-date-picker
          v-model="form.plannedPickupDate"
          type="date"
          placeholder="选择日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="计划送仓日">
        <el-date-picker
          v-model="form.plannedDeliveryDate"
          type="date"
          placeholder="选择日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="车队">
        <el-select
          v-model="form.truckingCompanyId"
          placeholder="选择车队"
          style="width: 100%"
          filterable
          clearable
        >
          <el-option
            v-for="item in truckingCompanies"
            :key="item.code"
            :label="item.name"
            :value="item.code"
          >
            <span>{{ item.name }}</span>
            <span v-if="item.nameEn" style="color: #999; font-size: 12px; margin-left: 8px">
              {{ item.nameEn }}
            </span>
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="卸柜方式">
        <el-select v-model="form.unloadModePlan" placeholder="选择卸柜方式" style="width: 100%">
          <el-option label="Drop off（直接卸柜）" value="Drop off" />
          <el-option label="Live load（车板等待卸柜）" value="Live load" />
        </el-select>
      </el-form-item>

      <el-divider content-position="left">仓库计划</el-divider>
      <el-form-item label="计划卸柜日">
        <el-date-picker
          v-model="form.plannedUnloadDate"
          type="date"
          placeholder="选择日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="仓库">
        <el-select
          v-model="form.warehouseId"
          placeholder="选择仓库"
          style="width: 100%"
          filterable
          clearable
        >
          <el-option
            v-for="item in warehouses"
            :key="item.code"
            :label="item.name"
            :value="item.code"
          >
            <span>{{ item.name }}</span>
            <span v-if="item.nameEn" style="color: #999; font-size: 12px; margin-left: 8px">
              {{ item.nameEn }}
            </span>
          </el-option>
        </el-select>
      </el-form-item>

      <el-divider content-position="left">还箱计划</el-divider>
      <el-form-item label="计划还箱日">
        <el-date-picker
          v-model="form.plannedReturnDate"
          type="date"
          placeholder="选择日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit"> 保存 </el-button>
    </template>
  </el-dialog>
</template>
