<script setup lang="ts">
// 根组件逻辑
</script>

<template>
  <div id="app">
    <router-view v-slot="{ Component, route }">
      <keep-alive :include="['Shipments', 'SimpleGanttChart']">
        <component :is="Component" :key="route.name" />
      </keep-alive>
    </router-view>
  </div>
</template>

<style scoped>
#app {
  height: 100vh;
  overflow: hidden;
}
</style>