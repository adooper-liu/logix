/**
 * ECharts TypeScript 类型声明
 * Vue-ECharts 模块定义
 */

declare module 'vue-echarts' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
