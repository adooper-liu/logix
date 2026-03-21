<template>
  <UniversalImport 
    title="滞港费标准导入"
    :field-mappings="DEMURRAGE_FIELD_MAPPINGS"
    api-endpoint="/api/import/demurrage-standards"
    :enable-batch-import="true"
    :batch-size="50"
  />
</template>

<script setup lang="ts">
import { UniversalImport } from '@/components/common/UniversalImport'
import { DEMURRAGE_FIELD_MAPPINGS } from '@/configs/importMappings/demurrage'
</script>
