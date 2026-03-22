<template>
  <UniversalImport 
    title="滞港费标准导入"
    :field-mappings="DEMURRAGE_FIELD_MAPPINGS"
    :tier-column-aliases="DEMURRAGE_TIER_COLUMN_ALIASES"
    api-endpoint="/api/v1/import/demurrage-standards"
    :enable-batch-import="true"
    :batch-size="50"
  />
</template>

<script setup lang="ts">
import { UniversalImport } from '@/components/common/UniversalImport'
import { DEMURRAGE_FIELD_MAPPINGS, DEMURRAGE_TIER_COLUMN_ALIASES } from '@/configs/importMappings/demurrage'
</script>
