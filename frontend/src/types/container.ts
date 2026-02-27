/**
 * 货柜类型定义
 * Container Type Definitions
 */

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
  items: Container[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
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
  etaCorrection?: Date;
  ataDestPort?: Date;
  ataTransit?: Date;
  transitArrivalDate?: Date;
  destPortUnloadDate?: Date;
  plannedCustomsDate?: Date;
  actualCustomsDate?: Date;
  lastFreeDate?: Date;
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
  timezone?: number;
  customsRemarks?: string;
  remarks?: string;
  freeStorageDays?: number;
  freeDetentionDays?: number;
  freeOffTerminalDays?: number;
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
  motherShipmentDate?: Date;
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
  carrierCompany?: string;
  driverName?: string;
  driverPhone?: string;
  truckPlate?: string;
  lastPickupDate?: Date;
  plannedPickupDate?: Date;
  pickupDate?: Date;
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

// 导出所有类型供外部使用
export type {
  PortOperation,
  SeaFreight,
  TruckingTransport,
  WarehouseOperation,
  EmptyReturn,
  StatusEvent
}
