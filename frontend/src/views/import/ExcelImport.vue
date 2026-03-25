<template>
  <UniversalImport
    title="货柜数据导入"
    :field-mappings="CONTAINER_FIELD_MAPPINGS"
    api-endpoint="/api/v1/import/excel/batch"
    :enable-batch-import="true"
    :batch-size="50"
    @success="handleSuccess"
    @error="handleError"
  />
</template>

<script setup lang="ts">
import { UniversalImport } from '@/components/common/UniversalImport'
import { CONTAINER_FIELD_MAPPINGS } from '@/configs/importMappings/container'

/**
 * 处理导入成功
 */
function handleSuccess(result: {
  total: number
  success: number
  failed: number
  errors: string[]
}) {
  console.log('[ExcelImport] 导入成功:', result)
  // 可以在这里添加额外的成功处理逻辑，如刷新列表、发送通知等
}

/**
 * 处理导入失败
 */
function handleError(error: string) {
  console.error('[ExcelImport] 导入失败:', error)
  // 可以在这里添加额外的错误处理逻辑
}
</script>
