/**
 * 货柜类型定义
 * Container Type Definitions
 */

/** 后端 gantt_derived（与 backend ganttDerivedBuilder gantt-v1 一致） */
export type GanttNodeKey = 'customs' | 'pickup' | 'unload' | 'return'

export interface GanttDerivedNode {
  key: GanttNodeKey
  taskRole: 'main' | 'dashed' | 'none'
  completed: boolean
  /** 甘特展示计划日 YYYY-MM-DD（后端 gantt-v2+） */
  plannedDate?: string | null
  /** 甘特展示实际日 YYYY-MM-DD（后端 gantt-v2+） */
  actualDate?: string | null
}

export interface GanttDerived {
  phase: 1 | 2 | 3 | 4 | 5
  phaseLabel: string
  primaryNode: GanttNodeKey | null
  nodes: GanttDerivedNode[]
  ruleVersion: string
  derivedAt: string
}

export interface Container {
  id?: string;
  containerNumber: string;
  orderNumber: string;
  containerTypeCode: string;
  cargoDescription?: string;
  grossWeight?: number;
  netWeight?: number;
  cbm?: number;
  packages?: number;
  sealNumber?: string;
  inspectionRequired: boolean;
  isUnboxing: boolean;
  logisticsStatus: string;
  /** 甘特阶段/主任务（后端落库 + 接口返回，单一真相） */
  ganttDerived?: GanttDerived | null;
  scheduleStatus?: 'initial' | 'issued' | 'dispatched' | 'adjusted';
  remarks?: string;
  requiresPallet?: boolean;
  requiresAssembly?: boolean;
  containerSize?: number;
  isRolled?: boolean;
  operator?: string;
  containerHolder?: string;
  tareWeight?: number;
  totalWeight?: number;
  overLength?: number;
  overHeight?: number;
  dangerClass?: string;
  currentStatusDescCn?: string;
  currentStatusDescEn?: string;
  createdAt: Date;
  updatedAt: Date;
  // 多个备货单支持
  allOrders?: ReplenishmentOrder[];
  summary?: {
    totalGrossWeight: number;
    totalCbm: number;
    totalBoxes: number;
    shipmentTotalValue: number;
    fobAmount: number;
    cifAmount: number;
    negotiationAmount: number;
    orderCount: number;
  };
  // 关联数据
  order?: ReplenishmentOrder;
  seaFreight?: SeaFreight;
  portOperations?: PortOperation[];
  statusEvents?: StatusEvent[];
  truckingTransports?: TruckingTransport[];
  warehouseOperations?: WarehouseOperation[];
  emptyReturns?: EmptyReturn[];
  // 滞港费汇总
  demurrageSummary?: {
    totalAmount: number;
    currency: string;
    chargeTypes: Array<{
      chargeType: string;
      chargeName: string;
      totalAmount: number;
      records: Array<{
        id: number;
        chargeStartDate: Date;
        chargeEndDate: Date;
        chargeDays: number;
        chargeAmount: number;
        currency: string;
        isFinal: boolean;
      }>;
    }>;
  };
  // 扩展字段
  latestStatus?: {
    statusCode: string;
    statusName: string;
    occurredAt: Date;
    location: string;
  };
  location?: string;
  lastUpdated?: Date;
  status?: string;
  currentPortType?: string;
  latestPortOperation?: {
    portType?: string;
    portName?: string;
    portCode?: string;
    portSequence?: number;
  };
  // 港口和海运信息
  etaDestPort?: Date;
  etaCorrection?: Date;
  ataDestPort?: Date;
  customsStatus?: string;
  destinationPort?: string;
  billOfLadingNumber?: string;
  // 备货单信息
  actualShipDate?: Date;
  sellToCountry?: string;
  customerName?: string;
  // 供应商名称（用于甘特图三级展示）
  supplierNames?: {
    customsBrokerName: string | null;
    truckingCompanyName: string | null;
    warehouseName: string | null;
  };
}

export interface ContainerFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface ContainerResponse {
  success: boolean;
  /** 为 true 表示所选日期范围内无出运记录，已回退为全部货柜 */
  dateFilterFallback?: boolean;
  items: Container[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages?: number;
  };
}

export interface ContainerStats {
  total: number;
  todayUpdated: number;
  statusDistribution: Array<{
    status: string;
    count: number;
  }>;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

export interface CreateContainerDTO {
  containerNumber: string;
  orderNumber: string;
  containerTypeCode: string;
  cargoDescription?: string;
  grossWeight?: number;
  netWeight?: number;
  cbm?: number;
  packages?: number;
  sealNumber?: string;
}

export interface UpdateContainerDTO extends Partial<CreateContainerDTO> {
  inspectionRequired?: boolean;
  isUnboxing?: boolean;
  logisticsStatus?: string;
  remarks?: string;
}

// 备货单信息
export interface ReplenishmentOrder {
  orderNumber: string;
  mainOrderNumber?: string;
  sellToCountry?: string;
  customerCode?: string;
  customerName?: string;
  orderStatus?: string;
  procurementTradeMode?: string;
  priceTerms?: string;
  wayfairSpo?: string;
  totalBoxes?: number;
  totalCbm?: number;
  totalGrossWeight?: number;
  specialCargoVolume?: number;
  shipmentTotalValue?: number;
  fobAmount?: number;
  cifAmount?: number;
  negotiationAmount?: number;
  orderDate?: Date;
  expectedShipDate?: Date;
  actualShipDate?: Date;
  containerRequired?: boolean;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// 港口操作信息
export interface PortOperation {
  id: string;
  containerNumber: string;
  portType?: string;
  portCode?: string;
  portName?: string;
  portSequence?: number;
  etaDestPort?: Date;
  revisedEtaDestPort?: Date;
  etaCorrection?: Date;
  ataDestPort?: Date;
  ataTransit?: Date;
  etdTransit?: Date;
  atdTransit?: Date;
  transitArrivalDate?: Date;
  destPortUnloadDate?: Date;
  plannedCustomsDate?: Date;
  actualCustomsDate?: Date;
  lastFreeDate?: Date;
  lastFreeDateMode?: 'actual' | 'forecast';
  allGeneratedDate?: Date;
  customsStatus?: string;
  documentStatus?: string;
  isfStatus?: string;
  isfDeclarationDate?: Date;
  customsBrokerCode?: string;
  customsBroker?: string;
  documentTransferDate?: Date;
  gateInTime?: Date;
  gateInTerminal?: string;
  gateOutTime?: Date;
  gateOutTerminal?: string;
  dischargedTime?: Date;
  availableTime?: Date;
  terminal?: string;
  berthPosition?: string;
  statusCode?: string;
  statusOccurredAt?: Date;
  hasOccurred?: boolean;
  locationType?: string;
  locationNameEn?: string;
  locationNameCn?: string;
  dataSource?: string;
  cargoLocation?: string;
  latitude?: number;
  longitude?: number;
  timezone?: number;
  customsRemarks?: string;
  remarks?: string;
  freeStorageDays?: number;
  freeDetentionDays?: number;
  freeOffTerminalDays?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// 海运信息
export interface SeaFreight {
  id?: string;
  containerNumber: string;
  billOfLadingNumber?: string;
  voyageNumber?: string;
  vesselName?: string;
  shippingCompanyId?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  portOfTransit?: string;
  transitPortCode?: string;
  shipmentDate?: Date;
  eta?: Date;
  ata?: Date;
  freightForwarderId?: string;
  bookingNumber?: string;
  portEntryDate?: Date;
  documentReleaseDate?: Date;
  motherShipmentDate?: Date;
  motherVesselName?: string;
  motherVoyageNumber?: string;
  transportMode?: string;
  mblScac?: string;
  mblNumber?: string;
  hblScac?: string;
  hblNumber?: string;
  amsNumber?: string;
  railYardEntryDate?: Date;
  truckYardEntryDate?: Date;
  standardFreightAmount?: number;
  freightCurrency?: string;
  etd?: Date;
  atd?: Date;
  customsClearanceDate?: Date;
  portOpenDate?: Date;
  portCloseDate?: Date;
  routeCode?: string;
  imoNumber?: string;
  mmsiNumber?: string;
  flag?: string;
  etaOrigin?: Date;
  ataOrigin?: Date;
  remarks?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// 拖卡运输信息
export interface TruckingTransport {
  id?: string;
  containerNumber: string;
  truckingType?: string;
  truckingCompanyId?: string;
  carrierCompany?: string;
  driverName?: string;
  driverPhone?: string;
  truckPlate?: string;
  lastPickupDate?: Date;
  plannedPickupDate?: Date;
  pickupDate?: Date;
  /** feituo | business | manual */
  pickupDateSource?: string;
  isPrePickup?: boolean;
  pickupNotification?: string;
  pickupLocation?: string;
  lastDeliveryDate?: Date;
  plannedDeliveryDate?: Date;
  deliveryDate?: Date;
  deliveryLocation?: string;
  unloadModePlan?: string;
  distanceKm?: number;
  cost?: number;
  remarks?: string;
}

// 仓库操作信息
export interface WarehouseOperation {
  id?: string;
  containerNumber: string;
  operationType?: string;
  warehouseId?: string;
  plannedWarehouse?: string;
  actualWarehouse?: string;
  warehouseGroup?: string;
  lastUnloadDate?: Date;
  plannedUnloadDate?: Date;
  unloadDate?: Date;
  warehouseArrivalDate?: Date;
  unloadGate?: string;
  unloadCompany?: string;
  unloadModePlan?: string;
  unloadModeActual?: string;
  notificationPickupDate?: Date;
  pickupTime?: Date;
  wmsStatus?: string;
  ebsStatus?: string;
  wmsConfirmDate?: Date;
  isUnboxing?: boolean;
  unboxingTime?: Date;
  cargoReceivedBy?: string;
  cargoDeliveredTo?: string;
  warehouseRemarks?: string;
  remarks?: string;
}

// 还空箱信息
export interface EmptyReturn {
  id?: string;
  containerNumber: string;
  returnTerminalName?: string;
  returnTerminalCode?: string;
  lastReturnDate?: Date;
  plannedReturnDate?: Date;
  returnTime?: Date;
  notificationReturnDate?: Date;
  notificationReturnTime?: Date;
  containerCondition?: string;
  returnRemarks?: string;
  remarks?: string;
}

// 状态事件
export interface StatusEvent {
  id?: string;
  containerNumber: string;
  statusCode?: string;
  statusName?: string;
  occurredAt?: Date;
  locationCode?: string;
  locationNameEn?: string;
  locationNameCn?: string;
  description?: string;
}

// 货柜列表项类型，用于列表视图
export interface ContainerAlert {
  id: number;
  type: string;
  level: string;
  message: string;
  resolved: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface ContainerListItem {
  containerNumber: string;
  orderNumber: string;
  billOfLadingNumber?: string;
  mblNumber?: string;
  containerTypeCode: string;
  logisticsStatus: string;
  alerts?: ContainerAlert[];
  alertCount?: number;
  resolvedAlertCount?: number;
  hasResolvedAlerts?: boolean;
  totalCost?: number;
  costBreakdown?: {
    currency: string;
    total: number;
    items: Array<{
      chargeType: string | null;
      chargeName: string | null;
      amount: number;
      mode: 'actual' | 'forecast';
    }>;
  };
  inspectionRequired: boolean;
  isUnboxing: boolean;
  destinationPort?: string;
  destinationPortName?: string;
  location?: string;
  actualShipDate?: Date;
  createdAt?: Date;
  etaDestPort?: Date;
  etaCorrection?: Date;
  ataDestPort?: Date;
  customsStatus?: string;
  countryCurrency?: string;
  plannedPickupDate?: Date;
  pickupDate?: Date;
  lastFreeDate?: Date;
  lastReturnDate?: Date;
  returnTime?: Date;
  cargoDescription?: string;
  lastUpdated?: Date;
  currentPortType?: string;
  latestPortOperation?: {
    portType?: string;
    portName?: string;
  };
  portOperations?: PortOperation[];
}

// 导出所有类型供外部使用
export type {
  PortOperation,
  SeaFreight,
  TruckingTransport,
  WarehouseOperation,
  EmptyReturn,
  StatusEvent,
  ContainerListItem
}
