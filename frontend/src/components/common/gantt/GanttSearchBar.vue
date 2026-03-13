<template>
  <div class="gantt-search-bar">
    <el-input
      v-model="keyword"
      placeholder="搜索柜号、提单号、目的港"
      :prefix-icon="Search"
      clearable
      @input="$emit('search', keyword)"
      style="width: 400px"
    >
      <template #append>
        <el-select
          :model-value="searchField"
          @update:model-value="$emit('update:searchField', $event)"
          style="width: 120px"
        >
          <el-option label="柜号" value="containerNumber" />
          <el-option label="提单号" value="billOfLading" />
          <el-option label="目的港" value="destinationPort" />
          <el-option label="船名航次" value="shipVoyage" />
        </el-select>
      </template>
    </el-input>

    <el-divider direction="vertical" />

    <el-checkbox-group v-model="quickFilters" @change="$emit('filterChange', quickFilters)">
      <el-checkbox label="即将超期 (3 天)" value="critical" />
      <el-checkbox label="已超期" value="overdue" />
      <el-checkbox label="已到港" value="atPort" />
    </el-checkbox-group>
  </div>
</template>

<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue?: string
  defaultFilters?: string[]
}>()

const emit = defineEmits<{
  search: [keyword: string]
  filterChange: [filters: string[]]
  'update:searchField': [value: string]
}>()

const keyword = ref(props.modelValue || '')
const searchField = ref('containerNumber')
const quickFilters = ref<string[]>(props.defaultFilters || [])

watch(
  () => props.modelValue,
  newVal => {
    if (newVal !== undefined) {
      keyword.value = newVal
    }
  }
)
</script>

<style scoped>
.gantt-search-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
}

:deep(.el-input-group__append) {
  background-color: #f5f7fa;
  border-color: #dcdfe6;
}

:deep(.el-checkbox) {
  margin-right: 16px;
}

:deep(.el-checkbox.is-bordered) {
  padding: 8px 12px;
  border-radius: 4px;
  border-color: #e4e7ed;
}
</style>
