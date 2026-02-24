<template>
  <div class="logistics-path-view">
    <div class="container">
      <h1>物流状态可视化</h1>

      <!-- 控制面板 -->
      <div class="control-panel">
        <button @click="refreshData" :disabled="loading">
          {{ loading ? '加载中...' : '刷新数据' }}
        </button>
        <button @click="showMockData = !showMockData">
          {{ showMockData ? '使用真实数据' : '使用模拟数据' }}
        </button>
        <button @click="showValidation = !showValidation">
          {{ showValidation ? '隐藏验证信息' : '显示验证信息' }}
        </button>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>正在加载物流路径数据...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error-state">
        <div class="error-icon">❌</div>
        <h3>加载失败</h3>
        <p>{{ error }}</p>
        <button @click="refreshData">重试</button>
      </div>

      <!-- 物流路径 -->
      <div v-else-if="path" class="path-container">
        <!-- 验证信息 -->
        <div v-if="showValidation" class="validation-info">
          <div :class="['validation-badge', validationResult.isValid ? 'valid' : 'invalid']">
            {{ validationResult.isValid ? '✅ 路径验证通过' : '❌ 路径验证失败' }}
          </div>
          <div v-if="validationResult.errors.length" class="error-list">
            <h4>错误：</h4>
            <ul>
              <li v-for="(error, index) in validationResult.errors" :key="'err-' + index">
                {{ error }}
              </li>
            </ul>
          </div>
          <div v-if="validationResult.warnings.length" class="warning-list">
            <h4>警告：</h4>
            <ul>
              <li v-for="(warning, index) in validationResult.warnings" :key="'warn-' + index">
                {{ warning }}
              </li>
            </ul>
          </div>
        </div>

        <!-- 进度条 -->
        <div class="progress-bar">
          <div class="progress-label">运输进度</div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: pathProgress + '%' }"></div>
          </div>
          <div class="progress-value">{{ Math.round(pathProgress) }}%</div>
        </div>

        <!-- 物流路径组件 -->
        <LogisticsPath :path="path" @node-click="handleNodeClick" />

        <!-- 节点详情面板 -->
        <div v-if="selectedNode" class="node-detail-panel">
          <button class="close-btn" @click="selectedNode = null">×</button>
          <h3>节点详情</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="label">状态：</span>
              <span class="value">{{ selectedNode.description }}</span>
            </div>
            <div class="detail-item">
              <span class="label">时间：</span>
              <span class="value">{{ formatDateTime(selectedNode.timestamp) }}</span>
            </div>
            <div class="detail-item" v-if="selectedNode.location">
              <span class="label">地点：</span>
              <span class="value">{{ selectedNode.location.name }} ({{ selectedNode.location.code }})</span>
            </div>
            <div class="detail-item">
              <span class="label">状态码：</span>
              <span class="value">{{ selectedNode.status }}</span>
            </div>
            <div class="detail-item">
              <span class="label">节点状态：</span>
              <span :class="['value', 'node-status-' + selectedNode.nodeStatus.toLowerCase()]">
                {{ getNodeStatusLabel(selectedNode.nodeStatus) }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">异常：</span>
              <span class="value">{{ selectedNode.isAlert ? '是' : '否' }}</span>
            </div>
          </div>
          <div v-if="Object.keys(selectedNode.rawData).length > 0" class="raw-data-section">
            <h4>原始数据</h4>
            <pre class="raw-data">{{ JSON.stringify(selectedNode.rawData, null, 2) }}</pre>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>暂无物流数据</h3>
        <p>点击"刷新数据"获取最新物流路径信息</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import LogisticsPath from '../components/LogisticsPath.vue';
import type { StatusPath, StatusNode } from '../types/Logistics';
import { NodeStatus } from '../types/Logistics';
import {
  processStatusPath,
  validateStatusPath,
  getPathProgress
} from '../utils/pathValidator';

// 响应式数据
const path = ref<StatusPath | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const showMockData = ref(true);
const showValidation = ref(false);
const selectedNode = ref<StatusNode | null>(null);

// 计算验证结果
const validationResult = computed(() => {
  if (!path.value) return { isValid: false, errors: [], warnings: [] };
  return validateStatusPath(path.value);
});

// 计算路径进度
const pathProgress = computed(() => {
  if (!path.value) return 0;
  return getPathProgress(path.value);
});

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

// 获取节点状态标签
const getNodeStatusLabel = (status: NodeStatus): string => {
  const LABELS: Record<NodeStatus, string> = {
    [NodeStatus.COMPLETED]: '已完成',
    [NodeStatus.IN_PROGRESS]: '进行中',
    [NodeStatus.PENDING]: '未开始'
  };
  return LABELS[status];
};

// 生成模拟数据
const generateMockData = (): StatusPath => {
  const now = new Date();

  return processStatusPath({
    nodes: [
      {
        id: '1',
        status: 'NOT_SHIPPED',
        description: '未出运',
        timestamp: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        location: { id: '1', name: '深圳港', code: 'SZX', type: 'PORT' },
        nodeStatus: 'COMPLETED',
        isAlert: false,
        rawData: { eventCode: 'BOOKING' }
      },
      {
        id: '2',
        status: 'EMPTY_PICKED_UP',
        description: '已提空箱',
        timestamp: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        location: { id: '2', name: '深圳堆场', code: 'SZX-YD', type: 'TERMINAL' },
        nodeStatus: 'COMPLETED',
        isAlert: false,
        rawData: { eventCode: 'STSP' }
      },
      {
        id: '3',
        status: 'GATE_IN',
        description: '已进港',
        timestamp: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000),
        location: { id: '1', name: '深圳港', code: 'SZX', type: 'PORT' },
        nodeStatus: 'COMPLETED',
        isAlert: false,
        rawData: { eventCode: 'GTIN' }
      },
      {
        id: '4',
        status: 'LOADED',
        description: '已装船',
        timestamp: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
        location: { id: '1', name: '深圳港', code: 'SZX', type: 'PORT' },
        nodeStatus: 'COMPLETED',
        isAlert: false,
        rawData: { eventCode: 'LOBD' }
      },
      {
        id: '5',
        status: 'DEPARTED',
        description: '已离港',
        timestamp: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000),
        location: { id: '1', name: '深圳港', code: 'SZX', type: 'PORT' },
        nodeStatus: 'COMPLETED',
        isAlert: false,
        rawData: { eventCode: 'DLPT' }
      },
      {
        id: '6',
        status: 'SAILING',
        description: '航行中',
        timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        location: { id: '3', name: '太平洋', code: 'PACIFIC', type: 'PORT' },
        nodeStatus: 'COMPLETED',
        isAlert: false,
        rawData: { eventCode: 'RDSI' }
      },
      {
        id: '7',
        status: 'ARRIVED',
        description: '已抵港',
        timestamp: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        location: { id: '4', name: '洛杉矶港', code: 'LAX', type: 'PORT', country: '美国' },
        nodeStatus: 'IN_PROGRESS',
        isAlert: false,
        rawData: { eventCode: 'ARVD' }
      },
      {
        id: '8',
        status: 'DISCHARGED',
        description: '已卸船',
        timestamp: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        location: { id: '4', name: '洛杉矶港', code: 'LAX', type: 'PORT', country: '美国' },
        nodeStatus: 'PENDING',
        isAlert: false,
        rawData: { eventCode: 'DSCH' }
      },
      {
        id: '9',
        status: 'AVAILABLE',
        description: '可提货',
        timestamp: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        location: { id: '4', name: '洛杉矶港', code: 'LAX', type: 'PORT', country: '美国' },
        nodeStatus: 'PENDING',
        isAlert: false,
        rawData: { eventCode: 'AVLB' }
      },
      {
        id: '10',
        status: 'RETURNED_EMPTY',
        description: '已还空箱',
        timestamp: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        location: { id: '4', name: '洛杉矶港', code: 'LAX', type: 'PORT', country: '美国' },
        nodeStatus: 'PENDING',
        isAlert: false,
        rawData: { eventCode: 'RTNE' }
      }
    ],
    overallStatus: 'ON_TIME',
    eta: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
    startedAt: null,
    completedAt: null
  });
};

// 刷新数据
const refreshData = async () => {
  loading.value = true;
  error.value = null;

  try {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (showMockData.value) {
      path.value = generateMockData();
    } else {
      // 这里应该调用真实的API
      // const response = await fetch('/api/logistics-path');
      // path.value = processStatusPath(await response.json());
      path.value = generateMockData(); // 暂时使用模拟数据
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '未知错误';
  } finally {
    loading.value = false;
  }
};

// 节点点击处理
const handleNodeClick = (node: StatusNode) => {
  selectedNode.value = node;
};

// 组件挂载时加载数据
onMounted(() => {
  refreshData();
});
</script>

<style scoped>
.logistics-path-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px 20px;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
}

h1 {
  color: white;
  text-align: center;
  margin-bottom: 30px;
  font-size: 2rem;
}

.control-panel {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  justify-content: center;
}

.control-panel button {
  padding: 10px 20px;
  background: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.control-panel button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.control-panel button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-state,
.error-state,
.empty-state {
  background: white;
  padding: 60px 20px;
  border-radius: 12px;
  text-align: center;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon,
.empty-icon {
  font-size: 60px;
  margin-bottom: 20px;
}

.path-container {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.validation-info {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.validation-badge {
  padding: 8px 12px;
  border-radius: 4px;
  font-weight: 600;
  margin-bottom: 10px;
  display: inline-block;
}

.validation-badge.valid {
  background: #e6f7ee;
  color: #135227;
}

.validation-badge.invalid {
  background: #ffebee;
  color: #c62828;
}

.error-list h4,
.warning-list h4 {
  color: #333;
  margin: 10px 0 5px;
}

.error-list ul,
.warning-list ul {
  margin: 0;
  padding-left: 20px;
}

.error-list li {
  color: #c62828;
  margin-bottom: 4px;
}

.warning-list li {
  color: #f57c00;
  margin-bottom: 4px;
}

.progress-bar {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 30px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
}

.progress-label {
  font-weight: 600;
  color: #333;
  min-width: 80px;
}

.progress-track {
  flex: 1;
  height: 12px;
  background: #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.5s ease;
  border-radius: 6px;
}

.progress-value {
  font-weight: 700;
  color: #667eea;
  min-width: 50px;
  text-align: right;
}

.node-detail-panel {
  position: relative;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  margin-top: 30px;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  border: none;
  background: #f3f4f6;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #e5e7eb;
}

.node-detail-panel h3 {
  margin: 0 0 20px;
  color: #333;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.detail-item .label {
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
}

.detail-item .value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}

.node-status-completed {
  color: #4caf50;
}

.node-status-in_progress {
  color: #2196f3;
}

.node-status-pending {
  color: #9e9e9e;
}

.raw-data-section {
  margin-top: 20px;
}

.raw-data-section h4 {
  margin-bottom: 10px;
  color: #333;
}

.raw-data {
  background: #1f2937;
  color: #e5e7eb;
  padding: 15px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.5;
}
</style>
