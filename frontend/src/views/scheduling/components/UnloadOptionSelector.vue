<template>
  <div class="unload-option-selector">
    <el-form :model="selectedOption" label-width="100px" size="small">
      <el-form-item label="策略">
        <el-select v-model="selectedOption.strategy" @change="handleSelectChange">
          <el-option label="Direct" value="Direct" />
          <el-option label="Drop off" value="Drop off" />
          <el-option label="Expedited" value="Expedited" />
        </el-select>
      </el-form-item>
      
      <el-form-item label="仓库">
        <el-select v-model="selectedWarehouseCode" @change="handleWarehouseChange" filterable>
          <el-option
            v-for="option in filteredOptions"
            :key="option.warehouse.warehouseCode"
            :label="`${option.warehouse.warehouseName} (${option.warehouse.warehouseCode})`"
            :value="option.warehouse.warehouseCode"
          />
        </el-select>
      </el-form-item>
      
      <el-form-item label="提柜日期">
        <el-date-picker
          v-model="selectedOption.plannedPickupDate"
          type="date"
          placeholder="选择提柜日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          @change="handleDateChange"
        />
      </el-form-item>
      
      <el-form-item label="免费期内">
        <el-tag :type="selectedOption.isWithinFreePeriod ? 'success' : 'danger'">
          {{ selectedOption.isWithinFreePeriod ? '是' : '否' }}
        </el-tag>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { UnloadOption } from '@/types/scheduling'

const props = defineProps<{
  options: UnloadOption[]
  modelValue?: UnloadOption | null
}>()

const emit = defineEmits<{
  change: [option: UnloadOption]
  'update:modelValue': [option: UnloadOption | null]
}>()

const selectedOption = ref<UnloadOption>(
  props.modelValue || props.options[0] || {
    containerNumber: '',
    warehouse: { warehouseCode: '', warehouseName: '', country: '' },
    unloadDate: new Date().toISOString().split('T')[0],
    strategy: 'Direct',
    isWithinFreePeriod: true
  }
)

const selectedWarehouseCode = ref(selectedOption.value.warehouse.warehouseCode)

const filteredOptions = computed(() => {
  // 根据选中的策略过滤选项
  return props.options.filter(opt => opt.strategy === selectedOption.value.strategy)
})

const handleSelectChange = () => {
  // 策略改变时，重置为同策略的第一个选项
  if (filteredOptions.value.length > 0) {
    selectedOption.value = { ...filteredOptions.value[0] }
    selectedWarehouseCode.value = selectedOption.value.warehouse.warehouseCode
    emitChange()
  }
}

const handleWarehouseChange = () => {
  const option = filteredOptions.value.find(
    opt => opt.warehouse.warehouseCode === selectedWarehouseCode.value
  )
  if (option) {
    selectedOption.value = { ...option }
    emitChange()
  }
}

const handleDateChange = () => {
  emitChange()
}

const emitChange = () => {
  emit('change', selectedOption.value)
  emit('update:modelValue', selectedOption.value)
}

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    selectedOption.value = newVal
    selectedWarehouseCode.value = newVal.warehouse.warehouseCode
  }
})
</script>

<style scoped lang="scss">
.unload-option-selector {
  background: var(--el-fill-color-lighter);
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 16px;
}
</style>
