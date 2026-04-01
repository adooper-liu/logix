/**
 * 🎨 LogiX 颜色系统组合式函数
 *
 * 提供 JS/TS 中使用的颜色常量
 * 与 SCSS 变量保持同步
 */

export function useColors() {
  return {
    // ========== 主题色 ==========
    primary: '#409EFF',
    primaryLight: '#79bbff',
    primaryLighter: '#a0cfff',
    primaryExtraLight: '#c6e2ff',
    primaryDark: '#337ecc',

    // ========== 功能色 ==========
    success: '#67C23A',
    warning: '#E6A23C',
    danger: '#F56C6C',
    info: '#909399',

    successLight: '#95d475',
    warningLight: '#eebe77',
    dangerLight: '#f89898',
    infoLight: '#b1b3b8',

    // ========== 中性色 - Text ==========
    text: {
      primary: '#303133',
      regular: '#606266',
      secondary: '#909399',
      placeholder: '#C0C4CC',
    },

    // ========== 中性色 - Background ==========
    bg: {
      color: '#ffffff',
      page: '#f5f7fa',
      overlay: 'rgba(255, 255, 255, 0.9)',
    },

    // ========== 中性色 - Border ==========
    border: {
      base: '#DCDFE6',
      light: '#E4E7ED',
      lighter: '#EBEEF5',
      extraLight: '#F2F6FC',
    },

    // ========== 业务色 - 物流状态 ==========
    status: {
      shipped: '#409EFF', // 已出运
      inTransit: '#409EFF', // 在途
      atPort: '#67C23A', // 已到港
      pickedUp: '#E6A23C', // 已提柜
      unloaded: '#909399', // 已卸柜
      returnedEmpty: '#909399', // 已还箱
      notShipped: '#909399', // 未出运
    },

    // ========== 业务色 - 优先级 ==========
    priority: {
      critical: '#F56C6C', // 紧急
      high: '#E6A23C', // 高
      medium: '#409EFF', // 中
      low: '#67C23A', // 低
    },

    // ========== 颜色映射表（用于批量替换） ==========
    colorMap: {
      // 主题色
      '#409EFF': 'primary',
      '#409eff': 'primary',
      '#79bbff': 'primaryLight',
      '#a0cfff': 'primaryLighter',
      '#c6e2ff': 'primaryExtraLight',
      '#337ecc': 'primaryDark',

      // 功能色
      '#67C23A': 'success',
      '#67c23a': 'success',
      '#95d475': 'successLight',

      '#E6A23C': 'warning',
      '#e6a23c': 'warning',
      '#eebe77': 'warningLight',

      '#F56C6C': 'danger',
      '#f56c6c': 'danger',
      '#f89898': 'dangerLight',

      '#909399': 'info',
      '#b1b3b8': 'infoLight',

      // 文字色
      '#303133': 'text.primary',
      '#606266': 'text.regular',
      // 注意：'#909399' 已在 info 中定义，这里不再重复
      '#C0C4CC': 'text.placeholder',

      // 背景色
      '#ffffff': 'bg.color',
      '#f5f7fa': 'bg.page',

      // 边框色
      '#DCDFE6': 'border.base',
      '#E4E7ED': 'border.light',
      '#EBEEF5': 'border.lighter',
      '#F2F6FC': 'border.extraLight',
    } as Record<string, string>,

    // ========== 获取颜色的辅助方法 ==========
    /**
     * 根据状态获取颜色
     */
    getStatusColor(status: string): string {
      const statusMap: Record<string, string> = {
        shipped: this.status.shipped,
        'in-transit': this.status.inTransit,
        'at-port': this.status.atPort,
        'picked-up': this.status.pickedUp,
        unloaded: this.status.unloaded,
        'returned-empty': this.status.returnedEmpty,
        'not-shipped': this.status.notShipped,
      }
      return statusMap[status] || this.info
    },

    /**
     * 根据优先级获取颜色
     */
    getPriorityColor(priority: string): string {
      const priorityMap: Record<string, string> = {
        critical: this.priority.critical,
        high: this.priority.high,
        medium: this.priority.medium,
        low: this.priority.low,
      }
      return priorityMap[priority] || this.info
    },
  }
}

// 导出单例实例
export const colors = useColors()
