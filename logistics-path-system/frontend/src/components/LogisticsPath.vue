<template>
  <div class="logistics-path">
    <!-- 路径头部：概览信息 -->
    <div class="path-header">
      <div class="status-badge" :class="path.overallStatus.toLowerCase()">
        {{ getPathStatusLabel(path.overallStatus) }}
      </div>
      <div class="eta-info" v-if="path.eta">
        预计到达: <strong>{{ formatDateTime(path.eta) }}</strong>
      </div>
      <div class="duration-info" v-if="durationDays">
        已耗时: <strong>{{ durationDays }}天</strong>
      </div>
    </div>

    <!-- 路径主体：时间轴 -->
    <div class="path-timeline">
      <div
        v-for="(node, index) in path.nodes"
        :key="node.id"
        class="path-node"
        :class="{
          'node-completed': node.nodeStatus === 'COMPLETED',
          'node-in-progress': node.nodeStatus === 'IN_PROGRESS',
          'node-pending': node.nodeStatus === 'PENDING',
          'node-alert': node.isAlert
        }"
        @click="handleNodeClick(node)"
      >
        <!-- 连接线 -->
        <div class="connector" v-if="index > 0"></div>

        <!-- 节点图标 -->
        <div class="node-icon">
          <component :is="getStatusIcon(node.status)" />
        </div>

        <!-- 节点内容 -->
        <div class="node-content">
          <div class="node-title">
            {{ node.description }}
            <span v-if="node.isAlert" class="alert-badge">异常</span>
          </div>
          <div class="node-location" v-if="node.location">
            {{ node.location.name }} ({{ node.location.code }})
          </div>
          <div class="node-time">{{ formatDateTime(node.timestamp) }}</div>
          <div class="node-delay" v-if="getDelayDays(index) > 0">
            延误 {{ getDelayDays(index) }} 天
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { StatusPath, StatusNode } from '../types/Logistics';
import { StandardStatus, PathStatus, NodeStatus } from '../types/Logistics';

// Props
const props = defineProps<{
  path: StatusPath;
}>();

// Emits
const emit = defineEmits<{
  nodeClick: [node: StatusNode];
}>();

// 计算总耗时天数
const durationDays = computed(() => {
  if (!props.path.startedAt || !props.path.nodes.length) return null;

  const firstNode = props.path.nodes[0];
  const lastCompletedNode = [...props.path.nodes]
    .reverse()
    .find(n => n.nodeStatus === NodeStatus.COMPLETED);

  const endTime = lastCompletedNode
    ? new Date(lastCompletedNode.timestamp)
    : new Date();
  const startTime = new Date(firstNode.timestamp);

  const diffTime = Math.abs(endTime.getTime() - startTime.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// 获取路径状态标签
const getPathStatusLabel = (status: PathStatus): string => {
  const LABELS: Record<PathStatus, string> = {
    [PathStatus.ON_TIME]: '准点',
    [PathStatus.DELAYED]: '延误',
    [PathStatus.HOLD]: '扣留',
    [PathStatus.COMPLETED]: '已完成'
  };
  return LABELS[status];
};

// 格式化日期时间
const formatDateTime = (date: Date): string => {
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 计算两个节点之间的延误天数
const getDelayDays = (index: number): number => {
  if (index === 0) return 0;

  const prevNode = props.path.nodes[index - 1];
  const currentNode = props.path.nodes[index];

  const prevTime = new Date(prevNode.timestamp);
  const currTime = new Date(currentNode.timestamp);
  const diffHours = (currTime.getTime() - prevTime.getTime()) / (1000 * 60 * 60);

  // 简单判断：超过24小时算延误（实际应根据业务规则）
  return diffHours > 24 ? Math.ceil((diffHours - 24) / 24) : 0;
};

// 获取状态图标
const getStatusIcon = (status: StandardStatus) => {
  // 这里可以返回不同的图标组件
  // 暂时返回简单的SVG
  return () => {
    const icons: Record<StandardStatus, string> = {
      [StandardStatus.NOT_SHIPPED]: '📦',
      [StandardStatus.EMPTY_PICKED_UP]: '🚚',
      [StandardStatus.GATE_IN]: '🚪',
      [StandardStatus.LOADED]: '⛴️',
      [StandardStatus.DEPARTED]: '🛳️',
      [StandardStatus.SAILING]: '🌊',
      [StandardStatus.TRANSIT_ARRIVED]: '📍',
      [StandardStatus.TRANSIT_DEPARTED]: '🚀',
      [StandardStatus.ARRIVED]: '🏁',
      [StandardStatus.DISCHARGED]: '📤',
      [StandardStatus.AVAILABLE]: '✅',
      [StandardStatus.GATE_OUT]: '🚛',
      [StandardStatus.DELIVERY_ARRIVED]: '🏠',
      [StandardStatus.STRIPPED]: '📋',
      [StandardStatus.RETURNED_EMPTY]: '↩️',
      [StandardStatus.COMPLETED]: '✨',
      [StandardStatus.CUSTOMS_HOLD]: '⚠️',
      [StandardStatus.CARRIER_HOLD]: '🔒',
      [StandardStatus.TERMINAL_HOLD]: '🚧',
      [StandardStatus.CHARGES_HOLD]: '💰',
      [StandardStatus.DUMPED]: '🗑️',
      [StandardStatus.DELAYED]: '⏰',
      [StandardStatus.DETENTION]: '📅',
      [StandardStatus.OVERDUE]: '🚨',
      [StandardStatus.CONGESTION]: '🚦',
      [StandardStatus.HOLD]: '⛔',
      [StandardStatus.UNKNOWN]: '❓'
    };
    return icons[status] || '📍';
  };
};

// 节点点击事件
const handleNodeClick = (node: StatusNode) => {
  emit('nodeClick', node);
};
</script>

<style scoped>
.logistics-path {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.path-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
  border-radius: 8px;
  border-left: 4px solid #2196f3;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 14px;
}

.status-badge.on_time {
  background: #e6f7ee;
  color: #135227;
  border-left: 4px solid #4caf50;
}

.status-badge.delayed {
  background: #fff3e0;
  color: #d84315;
  border-left: 4px solid #ff9800;
}

.status-badge.hold {
  background: #ffebee;
  color: #c62828;
  border-left: 4px solid #f44336;
}

.status-badge.completed {
  background: #e3f2fd;
  color: #1565c0;
  border-left: 4px solid #2196f3;
}

.eta-info,
.duration-info {
  font-size: 14px;
  color: #666;
}

.eta-info strong,
.duration-info strong {
  color: #333;
  margin-left: 5px;
}

.path-timeline {
  position: relative;
  padding: 10px 0;
}

.path-node {
  position: relative;
  display: flex;
  align-items: flex-start;
  margin-bottom: 20px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.path-node:hover {
  transform: translateX(5px);
}

.connector {
  position: absolute;
  top: 20px;
  left: 15px;
  width: 2px;
  height: calc(100% + 20px);
  background: linear-gradient(180deg, #2196f3 0%, #e0e0e0 100%);
  z-index: -1;
}

.path-node.node-completed .connector {
  background: #4caf50;
}

.path-node.node-in-progress .connector {
  background: linear-gradient(180deg, #2196f3 0%, #e0e0e0 100%);
}

.path-node.node-pending .connector {
  background: #e0e0e0;
}

.node-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  margin-top: 4px;
  z-index: 1;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.node-completed .node-icon {
  background: #4caf50;
  color: white;
}

.node-in-progress .node-icon {
  background: #2196f3;
  color: white;
  animation: pulse 2s infinite;
}

.node-pending .node-icon {
  background: #bdbdbd;
  color: white;
}

.node-alert .node-icon {
  background: #f44336;
  color: white;
  animation: blink 1.5s infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.4);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(33, 150, 243, 0);
  }
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.node-content {
  margin-left: 15px;
  flex: 1;
  padding: 10px 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  transition: all 0.2s ease;
}

.path-node:hover .node-content {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-color: #2196f3;
}

.node-title {
  font-weight: 600;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
}

.alert-badge {
  background: #f44336;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  margin-left: 8px;
}

.node-location {
  color: #666;
  font-size: 13px;
  margin-bottom: 2px;
}

.node-time {
  color: #999;
  font-size: 12px;
  margin-bottom: 2px;
}

.node-delay {
  color: #d84315;
  font-size: 12px;
  font-weight: 600;
  margin-top: 4px;
  padding: 2px 6px;
  background: #fff3e0;
  border-radius: 3px;
  display: inline-block;
}
</style>
