<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { containerService } from '@/services/container'
import { ArrowLeft, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const containerNumber = computed(() => route.params.containerNumber as string)

// 数据加载
const loading = ref(false)
const containerData = ref<any>(null)
const activeTab = ref('info')

// 状态映射
const statusMap: Record<string, { text: string; type: '' | 'success' | 'warning' | 'danger' | 'info' }> = {
  'not_shipped': { text: '未出运', type: 'info' },
  'shipped': { text: '已装船', type: 'success' },
  'in_transit': { text: '在途', type: 'success' },
  'at_port': { text: '已到港', type: 'success' },
  'picked_up': { text: '已提柜', type: 'warning' },
  'unloaded': { text: '已卸柜', type: 'warning' },
  'returned_empty': { text: '已还箱', type: 'success' },
  'hold': { text: '扣留', type: 'danger' },
  'completed': { text: '已完成', type: 'success' }
}

const customsStatusMap: Record<string, { text: string; type: '' | 'success' | 'warning' | 'danger' | 'info' }> = {
  'NOT_STARTED': { text: '未开始', type: 'info' },
  'IN_PROGRESS': { text: '进行中', type: 'warning' },
  'COMPLETED': { text: '已完成', type: 'success' },
  'FAILED': { text: '失败', type: 'danger' }
}

const portTypeMap: Record<string, string> = {
  'origin': '起运港',
  'transit': '中转港',
  'destination': '目的港'
}

// 加载货柜详情
const loadContainerDetail = async () => {
  loading.value = true
  try {
    const response = await containerService.getContainerById(containerNumber.value)
    if (response.success) {
      containerData.value = response.data
    } else {
      ElMessage.error('获取货柜详情失败')
    }
  } catch (error) {
    console.error('Failed to load container details:', error)
    ElMessage.error('获取货柜详情失败')
  } finally {
    loading.value = false
  }
}

// 返回列表
const goBack = () => {
  router.push('/shipments')
}

// 刷新数据
const refreshData = () => {
  loadContainerDetail()
}

// 格式化日期
const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化日期（仅日期）
const formatDateOnly = (date: string | Date | null | undefined): string => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 获取目的港操作信息
const getDestinationPortOperation = () => {
  if (!containerData.value?.portOperations) return null
  return containerData.value.portOperations.find((po: any) => po.portType === 'destination')
}

onMounted(() => {
  loadContainerDetail()
})
</script>

<template>
  <div class="container-detail-page" v-loading="loading">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="goBack" circle size="large" />
        <div>
          <h2>货柜详情</h2>
          <p v-if="containerData">集装箱号: {{ containerData.containerNumber }}</p>
        </div>
      </div>
      <div class="header-right">
        <el-button :icon="Refresh" @click="refreshData">刷新</el-button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div v-if="containerData">
      <!-- 货柜基本信息卡片 -->
      <el-card class="summary-card">
        <div class="info-grid">
          <div class="info-item">
            <span class="label">集装箱号</span>
            <span class="value">{{ containerData.containerNumber }}</span>
          </div>
          <div class="info-item">
            <span class="label">备货单号</span>
            <span class="value link">{{ containerData.orderNumber }}</span>
          </div>
          <div class="info-item">
            <span class="label">柜型</span>
            <el-tag size="small">{{ containerData.containerTypeCode }}</el-tag>
          </div>
          <div class="info-item">
            <span class="label">物流状态</span>
            <el-tag :type="statusMap[containerData.logisticsStatus]?.type || 'info'" size="small">
              {{ statusMap[containerData.logisticsStatus]?.text || containerData.logisticsStatus }}
            </el-tag>
          </div>
          <div class="info-item">
            <span class="label">封条号</span>
            <span class="value">{{ containerData.sealNumber || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">货物描述</span>
            <span class="value">{{ containerData.cargoDescription || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">总重</span>
            <span class="value">{{ (containerData.order?.totalGrossWeight || containerData.grossWeight) ? (containerData.order?.totalGrossWeight || containerData.grossWeight) : '-' }} KG</span>
          </div>
          <div class="info-item">
            <span class="label">体积</span>
            <span class="value">{{ (containerData.order?.totalCbm || containerData.cbm) ? (containerData.order?.totalCbm || containerData.cbm) : '-' }} CBM</span>
          </div>
          <div class="info-item">
            <span class="label">箱数</span>
            <span class="value">{{ (containerData.order?.totalBoxes || containerData.packages) ? (containerData.order?.totalBoxes || containerData.packages) : '-' }}</span>
          </div>
        </div>
      </el-card>

      <!-- 多页签详情 -->
      <el-card class="detail-card">
        <el-tabs v-model="activeTab">
          <!-- 基本信息页签 -->
          <el-tab-pane label="基本信息" name="info">
            <div class="tab-content">
              <h3>货柜信息</h3>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="集装箱号">{{ containerData.containerNumber }}</el-descriptions-item>
                <el-descriptions-item label="备货单号">{{ containerData.orderNumber }}</el-descriptions-item>
                <el-descriptions-item label="柜型">{{ containerData.containerTypeCode }}</el-descriptions-item>
                <el-descriptions-item label="箱尺寸">{{ containerData.containerSize || '-' }}</el-descriptions-item>
                <el-descriptions-item label="封条号">{{ containerData.sealNumber || '-' }}</el-descriptions-item>
                <el-descriptions-item label="持箱人">{{ containerData.containerHolder || '-' }}</el-descriptions-item>
                <el-descriptions-item label="运营方">{{ containerData.operator || '-' }}</el-descriptions-item>
                <el-descriptions-item label="危险品等级">{{ containerData.dangerClass || '-' }}</el-descriptions-item>
                <el-descriptions-item label="箱皮重">{{ containerData.tareWeight || '-' }} KG</el-descriptions-item>
                <el-descriptions-item label="箱总重">{{ containerData.totalWeight || '-' }} KG</el-descriptions-item>
                <el-descriptions-item label="超限长度">{{ containerData.overLength || '-' }} m</el-descriptions-item>
                <el-descriptions-item label="超高">{{ containerData.overHeight || '-' }} m</el-descriptions-item>
                <el-descriptions-item label="货物描述" :span="2">{{ containerData.cargoDescription || '-' }}</el-descriptions-item>
                <el-descriptions-item label="备注" :span="2">{{ containerData.remarks || '-' }}</el-descriptions-item>
              </el-descriptions>

              <h3>货物信息</h3>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="毛重">{{ containerData.grossWeight !== null && containerData.grossWeight !== undefined ? containerData.grossWeight : '-' }} KG</el-descriptions-item>
                <el-descriptions-item label="净重">{{ containerData.netWeight !== null && containerData.netWeight !== undefined ? containerData.netWeight : '-' }} KG</el-descriptions-item>
                <el-descriptions-item label="体积">{{ containerData.cbm !== null && containerData.cbm !== undefined ? containerData.cbm : '-' }} CBM</el-descriptions-item>
                <el-descriptions-item label="箱数">{{ containerData.packages !== null && containerData.packages !== undefined ? containerData.packages : '-' }}</el-descriptions-item>
              </el-descriptions>

              <h3>状态信息</h3>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="物流状态">
                  <el-tag :type="statusMap[containerData.logisticsStatus]?.type || 'info'">
                    {{ statusMap[containerData.logisticsStatus]?.text || containerData.logisticsStatus }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="是否甩柜">
                  <el-tag :type="containerData.isRolled ? 'warning' : 'info'" size="small">
                    {{ containerData.isRolled ? '是' : '否' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="是否查验">
                  <el-tag :type="containerData.inspectionRequired ? 'warning' : 'info'" size="small">
                    {{ containerData.inspectionRequired ? '是' : '否' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="是否开箱">
                  <el-tag :type="containerData.isUnboxing ? 'warning' : 'info'" size="small">
                    {{ containerData.isUnboxing ? '是' : '否' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="当前状态(中文)">{{ containerData.currentStatusDescCn || '-' }}</el-descriptions-item>
                <el-descriptions-item label="当前状态(英文)">{{ containerData.currentStatusDescEn || '-' }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </el-tab-pane>

          <!-- 备货单信息页签 -->
          <el-tab-pane label="备货单信息" name="order">
            <div class="tab-content" v-if="containerData.order">
              <h3>备货单信息</h3>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="备货单号">{{ containerData.order.orderNumber }}</el-descriptions-item>
                <el-descriptions-item label="主备货单号">{{ containerData.order.mainOrderNumber || '-' }}</el-descriptions-item>
                <el-descriptions-item label="销往国家">{{ containerData.order.sellToCountry || '-' }}</el-descriptions-item>
                <el-descriptions-item label="客户名称">{{ containerData.order.customerName || '-' }}</el-descriptions-item>
                <el-descriptions-item label="订单状态">
                  <el-tag>{{ containerData.order.orderStatus || '-' }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="采购贸易模式">{{ containerData.order.procurementTradeMode || '-' }}</el-descriptions-item>
                <el-descriptions-item label="价格条款">{{ containerData.order.priceTerms || '-' }}</el-descriptions-item>
                <el-descriptions-item label="Wayfair SPO">{{ containerData.order.wayfairSpo || '-' }}</el-descriptions-item>
              </el-descriptions>

              <h3>货物汇总</h3>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="箱数合计">{{ containerData.order.totalBoxes || 0 }}</el-descriptions-item>
                <el-descriptions-item label="体积合计">{{ containerData.order.totalCbm || 0 }} CBM</el-descriptions-item>
                <el-descriptions-item label="毛重合计">{{ containerData.order.totalGrossWeight || 0 }} KG</el-descriptions-item>
                <el-descriptions-item label="特殊货物体积">{{ containerData.order.specialCargoVolume || '-' }} CBM</el-descriptions-item>
              </el-descriptions>

              <h3>金额信息</h3>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="出运总价">${{ containerData.order.shipmentTotalValue || '-' }}</el-descriptions-item>
                <el-descriptions-item label="FOB金额">${{ containerData.order.fobAmount || '-' }}</el-descriptions-item>
                <el-descriptions-item label="CIF金额">${{ containerData.order.cifAmount || '-' }}</el-descriptions-item>
                <el-descriptions-item label="议付金额">${{ containerData.order.negotiationAmount || '-' }}</el-descriptions-item>
              </el-descriptions>

              <h3>日期信息</h3>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="订单日期">{{ formatDateOnly(containerData.order.orderDate) }}</el-descriptions-item>
                <el-descriptions-item label="预计出运日期">{{ formatDateOnly(containerData.order.expectedShipDate) }}</el-descriptions-item>
                <el-descriptions-item label="实际出运日期">{{ formatDateOnly(containerData.order.actualShipDate) }}</el-descriptions-item>
                <el-descriptions-item label="创建人">{{ containerData.order.createdBy || '-' }}</el-descriptions-item>
              </el-descriptions>
            </div>
            <el-empty v-else description="暂无备货单信息" />
          </el-tab-pane>

          <!-- 海运信息页签 -->
          <el-tab-pane label="海运信息" name="seafreight">
            <div class="tab-content">
              <div v-if="containerData.seaFreight && containerData.seaFreight.length > 0">
                <div v-for="(sf, index) in containerData.seaFreight" :key="index" class="seafreight-item">
                  <h3>海运信息 #{{ Number(index) + 1 }}</h3>
                  <el-descriptions :column="2" border>
                    <el-descriptions-item label="提单号">{{ sf.billOfLadingNumber || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="航次号">{{ sf.voyageNumber || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="船名">{{ sf.vesselName || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="船公司">{{ sf.shippingCompany || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="起运港">{{ sf.portOfLoading || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="目的港">{{ sf.portOfDischarge || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="中转港">{{ sf.portOfTransit || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="装船日期">{{ formatDateOnly(sf.shippingDate) }}</el-descriptions-item>
                    <el-descriptions-item label="预计到港日期">
                      {{ formatDateOnly(sf.eta || getDestinationPortOperation()?.etaDestPort) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="实际到港日期">
                      {{ formatDateOnly(sf.ata || getDestinationPortOperation()?.ataDestPort) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="货代公司">{{ sf.freightForwarder || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="订舱号">{{ sf.bookingNumber || '-' }}</el-descriptions-item>
                  </el-descriptions>
                </div>
              </div>
              <el-empty v-else description="暂无海运信息" />
            </div>
          </el-tab-pane>

          <!-- 港口操作页签 -->
          <el-tab-pane label="港口操作" name="port">
            <div class="tab-content">
              <div v-if="containerData.portOperations && containerData.portOperations.length > 0">
                <div v-for="(po, index) in containerData.portOperations" :key="index" class="port-item">
                  <h3>{{ portTypeMap[po.portType] || po.portType }}操作 #{{ Number(index) + 1 }}</h3>
                  <el-descriptions :column="2" border>
                    <el-descriptions-item label="港口类型">
                      <el-tag>{{ portTypeMap[po.portType] || po.portType }}</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="港口名称">{{ po.portName || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="港口编码">{{ po.portCode || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="港口序号">{{ po.portSequence || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="预计到港日期">{{ formatDateOnly(po.etaDestPort) }}</el-descriptions-item>
                    <el-descriptions-item label="实际到港日期">{{ formatDateOnly(po.ataDestPort) }}</el-descriptions-item>
                    <el-descriptions-item label="清关状态">
                      <el-tag v-if="po.customsStatus" :type="customsStatusMap[po.customsStatus]?.type || 'info'">
                        {{ customsStatusMap[po.customsStatus]?.text || po.customsStatus }}
                      </el-tag>
                      <span v-else>-</span>
                    </el-descriptions-item>
                    <el-descriptions-item label="ISF申报状态">{{ po.isfStatus || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="最后免费日期">{{ formatDateOnly(po.lastFreeDate) }}</el-descriptions-item>
                    <el-descriptions-item label="清关公司">{{ po.customsBroker || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="码头">{{ po.terminal || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="卸船日期">{{ formatDateOnly(po.unloadingDate) }}</el-descriptions-item>
                  </el-descriptions>
                </div>
              </div>
              <el-empty v-else description="暂无港口操作信息" />
            </div>
          </el-tab-pane>

          <!-- 拖卡运输页签 -->
          <el-tab-pane label="拖卡运输" name="trucking">
            <div class="tab-content">
              <div v-if="containerData.truckingTransports && containerData.truckingTransports.length > 0">
                <div v-for="(tt, index) in containerData.truckingTransports" :key="index" class="trucking-item">
                  <h3>拖卡运输 #{{ Number(index) + 1 }}</h3>
                  <el-descriptions :column="2" border>
                    <el-descriptions-item label="拖卡单号">{{ tt.id || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="拖卡类型">
                      <el-tag>{{ tt.truckingType || '-' }}</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="拖卡公司">{{ tt.carrierCompany || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="司机姓名">{{ tt.driverName || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="司机电话">{{ tt.driverPhone || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="车牌号">{{ tt.truckPlate || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="计划提柜日期">{{ formatDateOnly(tt.plannedPickupDate) }}</el-descriptions-item>
                    <el-descriptions-item label="实际提柜日期">{{ formatDate(tt.pickupDate) }}</el-descriptions-item>
                    <el-descriptions-item label="提柜地点">{{ tt.pickupLocation || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="计划送达日期">{{ formatDateOnly(tt.plannedDeliveryDate) }}</el-descriptions-item>
                    <el-descriptions-item label="实际送达日期">{{ formatDate(tt.deliveryDate) }}</el-descriptions-item>
                    <el-descriptions-item label="送达地点">{{ tt.deliveryLocation || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="卸柜方式">{{ tt.unloadModePlan || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="距离">{{ tt.distanceKm || '-' }} KM</el-descriptions-item>
                    <el-descriptions-item label="费用">${{ tt.cost || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="备注">{{ tt.remarks || '-' }}</el-descriptions-item>
                  </el-descriptions>
                </div>
              </div>
              <el-empty v-else description="暂无拖卡运输信息" />
            </div>
          </el-tab-pane>

          <!-- 仓库操作页签 -->
          <el-tab-pane label="仓库操作" name="warehouse">
            <div class="tab-content">
              <div v-if="containerData.warehouseOperations && containerData.warehouseOperations.length > 0">
                <div v-for="(wo, index) in containerData.warehouseOperations" :key="index" class="warehouse-item">
                  <h3>仓库操作 #{{ Number(index) + 1 }}</h3>
                  <el-descriptions :column="2" border>
                    <el-descriptions-item label="操作单号">{{ wo.id || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="操作类型">
                      <el-tag>{{ wo.operationType || '-' }}</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="仓库ID">{{ wo.warehouseId || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="计划仓库">{{ wo.plannedWarehouse || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="计划卸货日期">{{ formatDateOnly(wo.plannedUnloadDate) }}</el-descriptions-item>
                    <el-descriptions-item label="实际卸货日期">{{ formatDate(wo.unloadDate) }}</el-descriptions-item>
                    <el-descriptions-item label="仓库到达日期">{{ formatDateOnly(wo.warehouseArrivalDate) }}</el-descriptions-item>
                    <el-descriptions-item label="闸口">{{ wo.unloadGate || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="卸货公司">{{ wo.unloadCompany || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="卸货方式">{{ wo.unloadModeActual || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="提货通知日期">{{ formatDateOnly(wo.notificationPickupDate) }}</el-descriptions-item>
                    <el-descriptions-item label="提货时间">{{ formatDate(wo.pickupTime) }}</el-descriptions-item>
                    <el-descriptions-item label="WMS状态">
                      <el-tag :type="wo.wmsStatus === 'COMPLETED' ? 'success' : 'warning'">
                        {{ wo.wmsStatus || '-' }}
                      </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="EBS状态">
                      <el-tag :type="wo.ebsStatus === 'COMPLETED' ? 'success' : 'warning'">
                        {{ wo.ebsStatus || '-' }}
                      </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="WMS确认日期">{{ formatDateOnly(wo.wmsConfirmDate) }}</el-descriptions-item>
                    <el-descriptions-item label="是否开箱">
                      <el-tag :type="wo.isUnboxing ? 'warning' : 'info'">
                        {{ wo.isUnboxing ? '是' : '否' }}
                      </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="开箱时间">{{ formatDate(wo.unboxingTime) }}</el-descriptions-item>
                    <el-descriptions-item label="货物接收人">{{ wo.cargoReceivedBy || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="货物交付给">{{ wo.cargoDeliveredTo || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="备注">{{ wo.remarks || wo.warehouseRemarks || '-' }}</el-descriptions-item>
                  </el-descriptions>
                </div>
              </div>
              <el-empty v-else description="暂无仓库操作信息" />
            </div>
          </el-tab-pane>

          <!-- 还空箱页签 -->
          <el-tab-pane label="还空箱" name="emptyreturn">
            <div class="tab-content">
              <div v-if="containerData.emptyReturns && containerData.emptyReturns.length > 0">
                <div v-for="(er, index) in containerData.emptyReturns" :key="index" class="emptyreturn-item">
                  <h3>还空箱记录 #{{ Number(index) + 1 }}</h3>
                  <el-descriptions :column="2" border>
                    <el-descriptions-item label="还箱单号">{{ er.id || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="还箱地点">{{ er.returnTerminalName || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="还箱终端编码">{{ er.returnTerminalCode || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="计划还箱日期">{{ formatDateOnly(er.plannedReturnDate) }}</el-descriptions-item>
                    <el-descriptions-item label="实际还箱日期">{{ formatDate(er.returnTime) }}</el-descriptions-item>
                    <el-descriptions-item label="上次还箱日期">{{ formatDateOnly(er.lastReturnDate) }}</el-descriptions-item>
                    <el-descriptions-item label="箱况">{{ er.containerCondition || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="备注">{{ er.remarks || er.returnRemarks || '-' }}</el-descriptions-item>
                  </el-descriptions>
                </div>
              </div>
              <el-empty v-else description="暂无还空箱信息" />
            </div>
          </el-tab-pane>

          <!-- 状态事件页签 -->
          <el-tab-pane label="状态事件" name="events">
            <div class="tab-content">
              <el-timeline v-if="containerData.statusEvents && containerData.statusEvents.length > 0">
                <el-timeline-item
                  v-for="(event, index) in containerData.statusEvents"
                  :key="index"
                  :timestamp="formatDate(event.occurredAt)"
                  placement="top"
                >
                  <el-card>
                    <h4>{{ event.statusCode || '-' }}</h4>
                    <p>{{ event.locationNameCn || event.locationNameEn || event.locationCode }}</p>
                    <p class="event-desc">{{ event.description || '-' }}</p>
                  </el-card>
                </el-timeline-item>
              </el-timeline>
              <el-empty v-else description="暂无状态事件记录" />
            </div>
          </el-tab-pane>

          <!-- 时间戳页签 -->
          <el-tab-pane label="时间戳" name="timestamp">
            <div class="tab-content">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="创建时间">{{ formatDate(containerData.createdAt) }}</el-descriptions-item>
                <el-descriptions-item label="更新时间">{{ formatDate(containerData.updatedAt) }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </div>
  </div>
</template>

<style scoped lang="scss">
.container-detail-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 15px;

    h2 {
      font-size: 24px;
      color: #303133;
      margin: 0;
    }

    p {
      color: #909399;
      font-size: 14px;
      margin: 5px 0 0 0;
    }
  }
}

.summary-card {
  margin-bottom: 20px;

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 5px;

      .label {
        font-size: 12px;
        color: #909399;
      }

      .value {
        font-size: 16px;
        font-weight: 500;
        color: #303133;

        &.link {
          color: #409EFF;
          cursor: pointer;
        }
      }
    }
  }
}

.detail-card {
  .tab-content {
    h3 {
      font-size: 16px;
      color: #303133;
      margin: 20px 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 1px solid #EBEEF5;
    }
  }
}

.seafreight-item,
.port-item,
.trucking-item,
.warehouse-item,
.emptyreturn-item {
  margin-bottom: 30px;
  padding: 15px;
  background: #F5F7FA;
  border-radius: 4px;

  &:last-child {
    margin-bottom: 0;
  }
}

.event-desc {
  color: #909399;
  font-size: 13px;
  margin: 5px 0 0 0;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .summary-card {
    .info-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
}
</style>
