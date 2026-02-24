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
  ataDestPort?: Date;
  customsStatus?: string;
  destinationPort?: string;
  billOfLadingNumber?: string;
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
