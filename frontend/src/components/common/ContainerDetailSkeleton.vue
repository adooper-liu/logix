<template>
  <div class="container-detail-skeleton">
    <!-- 物流状态标签骨架 -->
    <div class="status-badge-skeleton"></div>

    <!-- 页面头部骨架 -->
    <div class="header-skeleton">
      <div class="container-number-skeleton"></div>
      <div class="navigation-skeleton">
        <div class="nav-button-skeleton"></div>
        <div class="nav-button-skeleton"></div>
      </div>
    </div>

    <!-- 操作区骨架 -->
    <div class="action-bar-skeleton">
      <div class="button-skeleton"></div>
    </div>

    <!-- 概览区骨架 -->
    <div class="overview-section-skeleton">
      <!-- 基本信息骨架 -->
      <div class="summary-card-skeleton">
        <div class="card-header-skeleton"></div>
        <div class="info-row-skeleton">
          <div class="info-item-skeleton highlight"></div>
          <div class="info-item-skeleton"></div>
          <div class="info-item-skeleton"></div>
        </div>
      </div>

      <!-- 关键日期骨架 -->
      <div class="key-dates-skeleton">
        <div class="card-header-skeleton"></div>
        <div class="timeline-skeleton">
          <div v-for="i in 6" :key="i" class="timeline-item-skeleton">
            <div class="timeline-dot-skeleton"></div>
            <div class="timeline-content-skeleton">
              <div class="timeline-label-skeleton"></div>
              <div class="timeline-date-skeleton"></div>
              <div class="timeline-status-skeleton"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 五节点时间线骨架 -->
      <div class="five-node-skeleton">
        <div class="card-header-skeleton"></div>
        <div class="five-node-content-skeleton">
          <div v-for="i in 5" :key="i" class="node-skeleton">
            <div class="node-circle-skeleton"></div>
            <div class="node-content-skeleton">
              <div class="node-label-skeleton"></div>
              <div class="node-date-skeleton"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 详情Tab区骨架 -->
    <div class="tabs-section-skeleton">
      <div class="tabs-header-skeleton">
        <div v-for="i in 8" :key="i" class="tab-item-skeleton"></div>
      </div>
      <div class="tab-content-skeleton">
        <div class="content-block-skeleton"></div>
        <div class="content-block-skeleton"></div>
        <div class="content-block-skeleton"></div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.container-detail-skeleton {
  padding: $spacing-md;
  position: relative;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: $spacing-sm;
  }
}

/* 骨架屏动画 */
@keyframes skeleton-loading {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: -100% 50%;
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    rgba($primary-color, 0.1) 25%,
    rgba($primary-color, 0.2) 50%,
    rgba($primary-color, 0.1) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: $radius-base;
}

/* 物流状态标签骨架 */
.status-badge-skeleton {
  @extend .skeleton;
  position: fixed;
  top: 72px;
  right: 80px;
  z-index: 999;
  width: 120px;
  height: 32px;
  border-radius: 999px;
}

/* 页面头部骨架 */
.header-skeleton {
  margin-bottom: $spacing-md;

  .container-number-skeleton {
    @extend .skeleton;
    width: 200px;
    height: 32px;
    margin-bottom: $spacing-sm;
  }

  .navigation-skeleton {
    display: flex;
    gap: $spacing-sm;

    .nav-button-skeleton {
      @extend .skeleton;
      width: 120px;
      height: 32px;
      border-radius: $radius-base;
    }
  }
}

/* 操作区骨架 */
.action-bar-skeleton {
  display: flex;
  justify-content: flex-end;
  margin-bottom: $spacing-md;

  .button-skeleton {
    @extend .skeleton;
    width: 100px;
    height: 36px;
    border-radius: $radius-base;
  }
}

/* 概览区骨架 */
.overview-section-skeleton {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
}

/* 卡片头部骨架 */
.card-header-skeleton {
  @extend .skeleton;
  height: 48px;
  margin-bottom: $spacing-sm;
  border-radius: $radius-base $radius-base 0 0;
}

/* 基本信息骨架 */
.summary-card-skeleton {
  @extend .skeleton;
  padding: $spacing-md;
  border-radius: $radius-large;
  margin-bottom: $spacing-sm;

  .info-row-skeleton {
    display: flex;
    gap: $spacing-md;
    flex-wrap: wrap;

    .info-item-skeleton {
      @extend .skeleton;
      width: 150px;
      height: 40px;
      border-radius: $radius-base;

      &.highlight {
        width: 200px;
      }
    }
  }
}

/* 关键日期骨架 */
.key-dates-skeleton {
  @extend .skeleton;
  padding: $spacing-md;
  border-radius: $radius-large;
  margin-bottom: $spacing-sm;

  .timeline-skeleton {
    display: flex;
    flex-direction: row;
    gap: $spacing-sm;
    overflow-x: auto;

    .timeline-item-skeleton {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 90px;

      .timeline-dot-skeleton {
        @extend .skeleton;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-bottom: $spacing-xs;
      }

      .timeline-content-skeleton {
        display: flex;
        flex-direction: column;
        gap: $spacing-xs;

        .timeline-label-skeleton {
          @extend .skeleton;
          width: 60px;
          height: 16px;
          border-radius: $radius-small;
        }

        .timeline-date-skeleton {
          @extend .skeleton;
          width: 80px;
          height: 16px;
          border-radius: $radius-small;
        }

        .timeline-status-skeleton {
          @extend .skeleton;
          width: 70px;
          height: 14px;
          border-radius: 999px;
        }
      }
    }
  }
}

/* 五节点时间线骨架 */
.five-node-skeleton {
  @extend .skeleton;
  padding: $spacing-md;
  border-radius: $radius-large;

  .five-node-content-skeleton {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .node-skeleton {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;

      .node-circle-skeleton {
        @extend .skeleton;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        margin-bottom: $spacing-xs;
      }

      .node-content-skeleton {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: $spacing-xs;

        .node-label-skeleton {
          @extend .skeleton;
          width: 80px;
          height: 16px;
          border-radius: $radius-small;
        }

        .node-date-skeleton {
          @extend .skeleton;
          width: 100px;
          height: 14px;
          border-radius: $radius-small;
        }
      }
    }
  }
}

/* 详情Tab区骨架 */
.tabs-section-skeleton {
  @extend .skeleton;
  padding: $spacing-md;
  border-radius: $radius-large;

  .tabs-header-skeleton {
    display: flex;
    gap: $spacing-sm;
    margin-bottom: $spacing-md;
    overflow-x: auto;

    .tab-item-skeleton {
      @extend .skeleton;
      width: 80px;
      height: 32px;
      border-radius: $radius-base;
    }
  }

  .tab-content-skeleton {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;

    .content-block-skeleton {
      @extend .skeleton;
      height: 120px;
      border-radius: $radius-base;
    }
  }
}
</style>
