/**
 * 字典类型定义
 * Dictionary Type Definitions
 */

// 国别字典
export interface Country {
  code: string;
  nameCn: string;
  nameEn: string;
  region?: string;
  continent?: string;
  currency?: string;
  phoneCode?: string;
  sortOrder?: number;
  isActive?: boolean;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 客户类型字典
export interface CustomerType {
  typeCode: string;
  typeNameCn: string;
  typeNameEn: string;
  sortOrder?: number;
  isActive?: boolean;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 港口字典
export interface Port {
  portCode: string;
  portName: string;
  portNameEn?: string;
  portType?: string;
  country?: string;
  state?: string;
  city?: string;
  timezone?: number;
  latitude?: number;
  longitude?: number;
  supportExport?: boolean;
  supportImport?: boolean;
  supportContainerOnly?: boolean;
  status?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 船公司字典
export interface ShippingCompany {
  companyCode: string;
  companyName: string;
  companyNameEn?: string;
  scacCode?: string;
  apiProvider?: string;
  supportBooking?: boolean;
  supportBillOfLading?: boolean;
  supportContainer?: boolean;
  websiteUrl?: string;
  contactPhone?: string;
  contactEmail?: string;
  status?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 货代公司字典
export interface FreightForwarder {
  forwarderCode: string;
  forwarderName: string;
  forwarderNameEn?: string;
  contactPhone?: string;
  contactEmail?: string;
  status?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 清关公司字典
export interface CustomsBroker {
  brokerCode: string;
  brokerName: string;
  brokerNameEn?: string;
  contactPhone?: string;
  contactEmail?: string;
  status?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 拖车公司字典
export interface TruckingCompany {
  companyCode: string;
  companyName: string;
  companyNameEn?: string;
  contactPhone?: string;
  contactEmail?: string;
  status?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 柜型字典
export interface ContainerType {
  typeCode: string;
  typeNameCn: string;
  typeNameEn: string;
  sizeFt?: number;
  typeAbbrev?: string;
  fullName?: string;
  dimensions?: string;
  maxWeightKg?: number;
  maxCbm?: number;
  teu?: number;
  sortOrder?: number;
  isActive?: boolean;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 仓库字典
export interface Warehouse {
  warehouseCode: string;
  warehouseName: string;
  warehouseNameEn?: string;
  warehouseType?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  contactPhone?: string;
  contactEmail?: string;
  status?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 海外公司字典
export interface OverseasCompany {
  companyCode: string;
  companyName: string;
  companyNameEn?: string;
  country: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  currency?: string;
  taxId?: string;
  bankName?: string;
  bankAccount?: string;
  sortOrder?: number;
  isActive?: boolean;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 客户字典
// 说明: 客户包括外部平台客户和集团内部子公司
export interface Customer {
  customerCode: string;
  customerName: string;
  customerNameEn?: string;
  customerTypeCode?: string;
  country?: string;
  overseasCompanyCode?: string; // 海外公司编码（如果客户是子公司）
  customerCategory?: string; // 客户类别 (PLATFORM-平台客户, SUBSIDIARY-子公司, OTHER-其他)
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  paymentTerm?: string; // 付款条款
  priceTerm?: string; // 价格条款 (FOB/CIF/DDP等)
  taxNumber?: string; // 税号
  customsCode?: string; // 海关编码
  status?: string;
  sortOrder?: number;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
  // 关联信息
  customerTypeInfo?: CustomerType;
  countryInfo?: Country;
  overseasCompany?: OverseasCompany;
}

// 字典响应格式
export interface DictionaryResponse<T> {
  success: boolean;
  items: T[];
  total?: number;
}

// 字典查询参数
export interface DictionaryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}
