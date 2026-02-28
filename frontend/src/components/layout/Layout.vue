<script setup lang="ts">
import { useUserStore } from '@/store/user'
import {
  ArrowDown,
  Box,
  Calendar,
  Connection,
  DataBoard,
  Document,
  DocumentCopy,
  Grid,
  House,
  InfoFilled,
  Money,
  Monitor,
  Notebook,
  Reading,
  Setting,
  Share,
  SwitchButton,
  Upload,
  User,
  Wallet,
  Warning,
} from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

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
        meta: { title: '货柜管理', icon: 'Box' },
      },
    ],
  },
  {
    title: '系统',
    icon: 'Setting',
    items: [
      {
        path: '/import',
        name: 'ExcelImport',
        meta: { title: 'Excel数据导入', icon: 'Upload' },
      },
      {
        path: '/monitoring',
        name: 'Monitoring',
        meta: { title: '系统监控', icon: 'DataBoard' },
      },
      {
        path: '/dict-mapping',
        name: 'DictMapping',
        meta: { title: '通用字典映射', icon: 'DocumentCopy' },
      },
      {
        path: '/settings',
        name: 'Settings',
        meta: { title: '系统设置', icon: 'Setting' },
      },
      {
        path: '/help',
        name: 'HelpDocumentation',
        meta: { title: '帮助文档', icon: 'Notebook' },
      },
      {
        path: '/about',
        name: 'About',
        meta: { title: '关于', icon: 'InfoFilled' },
      },
    ],
  },
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
  InfoFilled,
  DocumentCopy,
  Notebook,
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
  router.push(path).catch(err => {
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
            <div class="menu-item dropdown-trigger" :class="{ active: isGroupActive(menuGroup) }">
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
@use '@/assets/styles/variables' as *;

.layout-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.navbar {
  width: 100%;
  height: 64px;
  background: linear-gradient(
    135deg,
    $nav-bg-gradient-start 0%,
    $nav-bg-gradient-mid 50%,
    $nav-bg-gradient-end 100%
  );
  box-shadow: $nav-shadow, $nav-glow-shadow;
  position: sticky;
  top: 0;
  z-index: 1000;
  backdrop-filter: $nav-glass-blur;
  background-attachment: fixed;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, $nav-highlight-start, transparent, $nav-highlight-end);
    pointer-events: none;
  }

  .navbar-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    padding: 0 32px;
    max-width: 1440px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
  }

  .navbar-logo {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    min-height: 48px;
    background: $nav-glass-bg;
    backdrop-filter: $nav-glass-blur;
    border-radius: 12px;
    border: 1px solid $nav-glass-border;
    transition: all 0.3s ease;
    flex-shrink: 0;

    &:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateY(-1px);
      box-shadow: $nav-hover-glow;
      border-color: rgba(255, 255, 255, 0.2);
    }

    .logo-icon {
      font-size: 26px;
      color: $nav-accent-cyan;
      filter: drop-shadow(0 2px 8px rgba(0, 212, 255, 0.5));
      animation: float 3s ease-in-out infinite;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .logo-text {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 2px;
      background: linear-gradient(
        135deg,
        $nav-accent-cyan 0%,
        $nav-accent-purple 50%,
        $nav-accent-pink 100%
      );
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
      line-height: 1.2;
      display: inline-block;
      white-space: nowrap;
    }

    .logo-slogan {
      margin-left: 10px;
      font-size: 12px;
      font-weight: 500;
      color: $nav-text-secondary;
      letter-spacing: 0.5px;
      padding-left: 10px;
      border-left: 1px solid rgba(255, 255, 255, 0.2);
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
      color: $nav-text-secondary;
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
      border: 1px solid transparent;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
        transition: left 0.5s;
      }

      .el-icon {
        font-size: 16px;
        flex-shrink: 0;
        transition: transform 0.3s ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: $nav-accent-cyan;
      }

      span {
        line-height: 1.4;
        display: inline-block;
      }

      .dropdown-arrow {
        font-size: 12px;
        transition: transform 0.3s ease;
        margin-left: 2px;
        color: $nav-text-muted;
      }

      &:hover {
        color: $nav-text-primary;
        background: $nav-hover-bg;
        transform: translateY(-2px);
        box-shadow: $nav-hover-glow;
        border-color: rgba(255, 255, 255, 0.15);

        &::before {
          left: 100%;
        }

        .dropdown-arrow {
          transform: rotate(180deg);
          color: $nav-text-primary;
        }
      }

      &.active {
        color: $nav-text-primary;
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(124, 58, 237, 0.15));
        font-weight: 600;
        box-shadow: $nav-hover-glow;
        position: relative;
        border-color: rgba(0, 212, 255, 0.3);

        &::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 70%;
          height: 3px;
          background: $nav-active-indicator;
          border-radius: 2px;
          animation: pulse 2s ease-in-out infinite;
          box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
        }

        .el-icon {
          color: $nav-accent-cyan;
          filter: drop-shadow(0 0 6px rgba(0, 212, 255, 0.5));
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
      color: $nav-text-primary;
      cursor: pointer;
      padding: 8px 16px;
      border-radius: 10px;
      transition: all 0.3s ease;
      background: $nav-glass-bg;
      backdrop-filter: $nav-glass-blur;
      border: 1px solid $nav-glass-border;
      gap: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      white-space: nowrap;
      flex-shrink: 0;

      .user-icon {
        font-size: 18px;
        filter: drop-shadow(0 2px 4px rgba(0, 212, 255, 0.3));
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: $nav-accent-cyan;
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
        color: $nav-text-muted;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: translateY(-2px);
        box-shadow: $nav-hover-glow;
        border-color: rgba(0, 212, 255, 0.3);

        .dropdown-icon {
          transform: rotate(180deg);
          color: $nav-text-primary;
        }
      }
    }
  }
}

.main-content {
  flex: 1;
  overflow-y: auto;
  background-color: $bg-page;
}

// 动画定义
@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

@keyframes pulse {
  0%,
  100% {
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
  background: rgba(15, 20, 40, 0.95) !important;
  backdrop-filter: blur(24px) !important;
  border: 1px solid rgba(0, 212, 255, 0.2) !important;
  border-radius: 12px !important;
  box-shadow:
    $nav-shadow,
    0 0 30px rgba(0, 212, 255, 0.15) !important;
  padding: 8px !important;
  min-width: 180px !important;

  .el-dropdown-menu__item {
    padding: 10px 16px !important;
    border-radius: 6px !important;
    transition: all 0.3s ease !important;
    display: flex;
    align-items: center;
    gap: 8px;
    color: $nav-text-secondary;

    &:hover {
      background: linear-gradient(
        135deg,
        rgba(0, 212, 255, 0.15),
        rgba(124, 58, 237, 0.15)
      ) !important;
      color: $nav-text-primary !important;
      border-color: rgba(0, 212, 255, 0.3) !important;
    }

    &.is-active {
      background: linear-gradient(
        135deg,
        rgba(0, 212, 255, 0.25),
        rgba(124, 58, 237, 0.25)
      ) !important;
      color: $nav-accent-cyan !important;
      font-weight: 600;
      box-shadow: 0 0 15px rgba(0, 212, 255, 0.2) !important;
    }

    .el-icon {
      font-size: 14px;
      color: inherit;
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
