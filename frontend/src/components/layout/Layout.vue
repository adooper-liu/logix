<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import {
  Box,
  DataBoard,
  Connection,
  Calendar,
  Warning,
  User,
  ArrowDown,
  Setting,
  SwitchButton,
  Wallet,
  Share,
  Grid,
  Money,
  Reading,
  Document,
  Upload,
  House,
  Monitor,
  InfoFilled
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 菜单分组定义
const menuGroups = computed(() => [
  {
    title: '货柜',
    icon: 'Box',
    items: [
      {
        path: '/shipments',
        name: 'Shipments',
        meta: { title: '集装箱管理', icon: 'Box' }
      }
    ]
  },
  {
    title: '监控',
    icon: 'Monitor',
    items: [
      {
        path: '/monitoring',
        name: 'Monitoring',
        meta: { title: '监控中心', icon: 'Monitor' }
      }
    ]
  },
  {
    title: '系统',
    icon: 'Setting',
    items: [
      {
        path: '/import',
        name: 'ExcelImport',
        meta: { title: 'Excel数据导入', icon: 'Upload' }
      },
      {
        path: '/settings',
        name: 'Settings',
        meta: { title: '系统设置', icon: 'Setting' }
      },
      {
        path: '/about',
        name: 'About',
        meta: { title: '关于', icon: 'InfoFilled' }
      }
    ]
  }
])

// 图标组件映射
const iconMap: Record<string, unknown> = {
  DataBoard,
  Connection,
  Grid,
  Calendar,
  Warning,
  Wallet,
  Share,
  Box,
  Money,
  Reading,
  Document,
  Upload,
  House,
  Monitor,
  Setting,
  InfoFilled
}

// 当前激活的路由
const activeRoute = computed(() => route.path)

// 判断菜单组是否激活
const isGroupActive = (group: any) => {
  return group.items.some((item: any) => item.path === route.path)
}

// 处理菜单点击
const handleMenuClick = (path: string) => {
  if (route.path === path) {
    return
  }
  router.push(path).catch((err) => {
    if (!err.message.includes('NavigationDuplicated')) {
      console.error('路由跳转失败:', err)
    }
  })
}

// 退出登录
const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="layout-container">
    <!-- 顶部导航栏 -->
    <div class="navbar">
      <div class="navbar-content">
        <div class="navbar-logo">
          <el-icon class="logo-icon">
            <Box />
          </el-icon>
          <span class="logo-text">LogiX</span>
          <span class="logo-slogan">让复杂物流变得简单愉快</span>
        </div>

        <div class="menu-items">
          <el-dropdown
            v-for="menuGroup in menuGroups"
            :key="menuGroup.title"
            trigger="hover"
            placement="bottom"
            @command="handleMenuClick"
          >
            <div
              class="menu-item dropdown-trigger"
              :class="{ active: isGroupActive(menuGroup) }"
            >
              <el-icon>
                <component :is="iconMap[menuGroup.icon || 'Box']" />
              </el-icon>
              <span>{{ menuGroup.title }}</span>
              <el-icon class="dropdown-arrow">
                <ArrowDown />
              </el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="item in menuGroup.items"
                  :key="item.path"
                  :command="item.path"
                  :class="{ 'is-active': activeRoute === item.path }"
                >
                  <el-icon>
                    <component :is="iconMap[item.meta.icon || 'Box']" />
                  </el-icon>
                  <span>{{ item.meta.title }}</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>

        <div class="navbar-right">
          <el-dropdown @command="handleLogout">
            <span class="user-info">
              <el-icon class="user-icon"><User /></el-icon>
              <span>{{ userStore.userInfo?.username || '管理员' }}</span>
              <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>
                  <el-icon><User /></el-icon>
                  个人中心
                </el-dropdown-item>
                <el-dropdown-item>
                  <el-icon><Setting /></el-icon>
                  系统设置
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="main-content">
      <router-view />
    </div>
  </div>
</template>

<style scoped lang="scss">
.layout-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.navbar {
  width: 100%;
  height: 64px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
  position: sticky;
  top: 0;
  z-index: 1000;
  backdrop-filter: blur(20px);
  background-attachment: fixed;

  .navbar-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    padding: 0 32px;
    max-width: 1440px;
    margin: 0 auto;
  }

  .navbar-logo {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    min-height: 48px;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: all 0.3s ease;
    flex-shrink: 0;

    &:hover {
      background: rgba(255, 255, 255, 0.25);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
    }

    .logo-icon {
      font-size: 26px;
      color: white;
      filter: drop-shadow(0 2px 4px rgba(255, 255, 255, 0.3));
      animation: float 3s ease-in-out infinite;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .logo-text {
      font-size: 22px;
      font-weight: 800;
      color: white;
      letter-spacing: 2px;
      background: linear-gradient(135deg, #ffffff 0%, #f0f0ff 50%, #fff5e5 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      line-height: 1.2;
      display: inline-block;
      white-space: nowrap;
    }

    .logo-slogan {
      margin-left: 10px;
      font-size: 12px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
      letter-spacing: 0.5px;
      padding-left: 10px;
      border-left: 1px solid rgba(255, 255, 255, 0.3);
      line-height: 1.4;
      white-space: nowrap;
      display: inline-block;
    }
  }

  .menu-items {
    display: flex;
    align-items: center;
    flex: 1;
    justify-content: center;
    gap: 8px;
    padding: 0 12px;

    .menu-item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 16px;
      min-width: auto;
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      line-height: 1.4;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-weight: 500;
      position: relative;
      overflow: hidden;
      white-space: nowrap;
      text-decoration: none;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
        transition: left 0.5s;
      }

      .el-icon {
        font-size: 16px;
        flex-shrink: 0;
        transition: transform 0.3s ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      span {
        line-height: 1.4;
        display: inline-block;
      }

      .dropdown-arrow {
        font-size: 12px;
        transition: transform 0.3s ease;
        margin-left: 2px;
      }

      &:hover {
        color: white;
        background: rgba(255, 255, 255, 0.25);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

        &::before {
          left: 100%;
        }

        .dropdown-arrow {
          transform: rotate(180deg);
        }
      }

      &.active {
        color: white;
        background: rgba(255, 255, 255, 0.35);
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        position: relative;

        &::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 60%;
          height: 3px;
          background: linear-gradient(90deg, #f093fb, #f5576c);
          border-radius: 2px;
          animation: pulse 2s ease-in-out infinite;
        }
      }
    }
  }

  .navbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 24px;

    .user-info {
      display: inline-flex;
      align-items: center;
      color: rgba(255, 255, 255, 0.95);
      cursor: pointer;
      padding: 8px 16px;
      border-radius: 10px;
      transition: all 0.3s ease;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.25);
      gap: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      white-space: nowrap;
      flex-shrink: 0;

      .user-icon {
        font-size: 18px;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      span {
        line-height: 1.5;
        display: inline-block;
      }

      .dropdown-icon {
        font-size: 12px;
        transition: transform 0.3s ease;
        display: inline-flex;
        align-items: center;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        border-color: rgba(255, 255, 255, 0.4);

        .dropdown-icon {
          transform: rotate(180deg);
        }
      }
    }
  }
}

.main-content {
  flex: 1;
  overflow-y: auto;
  background-color: #f5f7fa;
}

// 动画定义
@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    width: 60%;
  }
  50% {
    opacity: 0.8;
    width: 80%;
  }
}

// Element Plus 下拉菜单覆盖
:deep(.el-dropdown-menu) {
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2) !important;
  padding: 8px !important;
  min-width: 180px !important;

  .el-dropdown-menu__item {
    padding: 10px 16px !important;
    border-radius: 6px !important;
    transition: all 0.3s ease !important;
    display: flex;
    align-items: center;
    gap: 8px;

    &:hover {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(240, 147, 251, 0.1)) !important;
    }

    &.is-active {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(240, 147, 251, 0.2)) !important;
      color: #667eea !important;
      font-weight: 600;
    }

    .el-icon {
      font-size: 14px;
    }

    span {
      font-size: 14px;
    }
  }
}

// 响应式设计
@media (max-width: 1024px) {
  .navbar {
    .navbar-content {
      padding: 0 20px;
    }

    .menu-items {
      gap: 6px;
      padding: 0 8px;

      .menu-item {
        padding: 6px 12px;
        font-size: 13px;
        gap: 4px;

        .el-icon {
          font-size: 14px;
        }

        .dropdown-arrow {
          font-size: 10px;
        }
      }
    }

    .navbar-logo {
      .logo-slogan {
        display: none;
      }
    }
  }
}

@media (max-width: 768px) {
  .navbar {
    height: 56px;

    .navbar-content {
      padding: 0 12px;
    }

    .navbar-logo {
      padding: 6px 10px;
      border-radius: 8px;

      .logo-icon {
        font-size: 20px;
      }

      .logo-text {
        font-size: 16px;
        letter-spacing: 1px;
      }

      .logo-slogan {
        display: none;
      }
    }

    .menu-items {
      gap: 4px;
      padding: 0 4px;

      .menu-item {
        padding: 4px 8px;
        font-size: 12px;
        gap: 3px;

        .el-icon {
          font-size: 12px;
        }

        .dropdown-arrow {
          font-size: 8px;
        }

        span {
          display: none;
        }
      }
    }

    .navbar-right {
      padding: 0 8px;
      gap: 8px;

      .user-info {
        padding: 6px 10px;

        span:not(.el-icon) {
          display: none;
        }

        .user-icon {
          font-size: 16px;
        }
      }
    }
  }
}
</style>