<template>
  <transition name="fade">
    <div
      v-if="visible"
      ref="menuRef"
      class="context-menu"
      :style="{
        left: position.x + 'px',
        top: position.y + 'px',
      }"
    >
      <div
        v-for="item in menuItems"
        :key="item.key"
        class="menu-item"
        :class="{ 'is-disabled': item.disabled }"
        @click="handleItemClick(item)"
      >
        <component :is="item.icon" class="menu-icon" />
        <span>{{ item.label }}</span>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { View, Edit, DocumentCopy, Delete, Connection } from '@element-plus/icons-vue'

interface MenuItem {
  key: string
  label: string
  icon: any
  disabled?: boolean
  handler?: () => void
}

interface Props {
  visible: boolean
  container: any
  position: { x: number; y: number }
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'viewDetail'): void
  (e: 'editDate'): void
  (e: 'copyContainerNumber'): void
  (e: 'delete'): void
  (e: 'togglePathLines'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const menuRef = ref<HTMLElement | null>(null)

// 菜单项配置
const menuItems = computed<MenuItem[]>(() => [
  {
    key: 'viewDetail',
    label: '查看详情',
    icon: View,
    handler: () => emit('viewDetail'),
  },
  {
    key: 'editDate',
    label: '调整日期',
    icon: Edit,
    handler: () => emit('editDate'),
  },
  {
    key: 'copy',
    label: '复制柜号',
    icon: DocumentCopy,
    handler: () => {
      if (props.container?.containerNumber) {
        navigator.clipboard.writeText(props.container.containerNumber)
        emit('copyContainerNumber')
      }
    },
  },
  {
    key: 'togglePathLines',
    label: '显示路径连线',
    icon: Connection,
    handler: () => emit('togglePathLines'),
  },
  {
    key: 'delete',
    label: '删除货柜',
    icon: Delete,
    disabled: true, // 暂时禁用
    handler: () => emit('delete'),
  },
])

// 处理菜单项点击
const handleItemClick = (item: MenuItem) => {
  if (!item.disabled && item.handler) {
    item.handler()
    emit('update:visible', false)
  }
}

// 点击外部关闭菜单
const handleClickOutside = (event: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit('update:visible', false)
  }
}

// 监听点击事件
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.context-menu {
  position: fixed;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 9999;
  min-width: 150px;
  padding: 4px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #303133;
  transition: background 0.2s;
}

.menu-item:hover:not(.is-disabled) {
  background: #f5f7fa;
  color: #409eff;
}

.menu-item.is-disabled {
  color: #c0c4cc;
  cursor: not-allowed;
}

.menu-icon {
  width: 16px;
  height: 16px;
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
