/**
 * 通用字典管理控制器
 * 提供所有字典表的CRUD操作
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import { Port } from '../entities/Port';
import { ShippingCompany } from '../entities/ShippingCompany';
import { FreightForwarder } from '../entities/FreightForwarder';
import { CustomsBroker } from '../entities/CustomsBroker';
import { TruckingCompany } from '../entities/TruckingCompany';
import { Warehouse } from '../entities/Warehouse';
import { Country } from '../entities/Country';
import { CustomerType } from '../entities/CustomerType';
import { OverseasCompany } from '../entities/OverseasCompany';
import { ContainerType } from '../entities/ContainerType';
import { TruckingPortMapping } from '../entities/TruckingPortMapping';
import { WarehouseTruckingMapping } from '../entities/WarehouseTruckingMapping';
import { logger } from '../utils/logger';
import { snakeToCamel } from '../utils/snakeToCamel';

// 字典表配置
const DICT_CONFIG: Record<string, {
  entity: any;
  tableName: string;
  primaryKey: string;
  labelFields: string[];
  searchableFields: string[];
  allFields: Record<string, string>;
}> = {
  PORT: {
    entity: Port,
    tableName: 'dict_ports',
    primaryKey: 'portCode',
    labelFields: ['portCode', 'portName'],
    searchableFields: ['portCode', 'portName', 'portNameEn'],
    allFields: {
      portCode: '港口代码',
      portName: '港口名称',
      portNameEn: '英文名称',
      portType: '港口类型',
      country: '国家',
      state: '州/省',
      city: '城市',
      timezone: '时区',
      latitude: '纬度',
      longitude: '经度',
      supportExport: '支持出口',
      supportImport: '支持进口',
      supportContainerOnly: '仅箱号查询',
      status: '状态',
      remarks: '备注'
    }
  },
  SHIPPING_COMPANY: {
    entity: ShippingCompany,
    tableName: 'dict_shipping_companies',
    primaryKey: 'companyCode',
    labelFields: ['companyCode', 'companyName'],
    searchableFields: ['companyCode', 'companyName', 'companyNameEn'],
    allFields: {
      companyCode: '公司代码',
      companyName: '公司名称',
      companyNameEn: '英文名称',
      scacCode: 'SCAC代码',
      apiProvider: 'API提供商',
      supportBooking: '支持订舱查询',
      supportBillOfLading: '支持提单查询',
      supportContainer: '支持箱号查询',
      websiteUrl: '网址',
      contactPhone: '联系电话',
      contactEmail: '邮箱',
      status: '状态',
      remarks: '备注'
    }
  },
  CONTAINER_TYPE: {
    entity: ContainerType,
    tableName: 'dict_container_types',
    primaryKey: 'typeCode',
    labelFields: ['typeCode', 'typeNameCn'],
    searchableFields: ['typeCode', 'typeNameCn', 'typeNameEn'],
    allFields: {
      typeCode: '柜型代码',
      typeNameCn: '中文名称',
      typeNameEn: '英文名称',
      sizeFt: '尺寸(英尺)',
      typeAbbrev: '缩写',
      fullName: '全称',
      dimensions: '尺寸规格',
      maxWeightKg: '最大载重(KG)',
      maxCbm: '最大体积(CBM)',
      teu: 'TEU',
      sortOrder: '排序',
      isActive: '启用',
      remarks: '备注'
    }
  },
  FREIGHT_FORWARDER: {
    entity: FreightForwarder,
    tableName: 'dict_freight_forwarders',
    primaryKey: 'forwarderCode',
    labelFields: ['forwarderCode', 'forwarderName'],
    searchableFields: ['forwarderCode', 'forwarderName', 'forwarderNameEn'],
    allFields: {
      forwarderCode: '公司代码',
      forwarderName: '公司名称',
      forwarderNameEn: '英文名称',
      contactPhone: '联系电话',
      contactEmail: '邮箱',
      status: '状态',
      remarks: '备注'
    }
  },
  CUSTOMS_BROKER: {
    entity: CustomsBroker,
    tableName: 'dict_customs_brokers',
    primaryKey: 'brokerCode',
    labelFields: ['brokerCode', 'brokerName'],
    searchableFields: ['brokerCode', 'brokerName', 'brokerNameEn'],
    allFields: {
      brokerCode: '公司代码',
      brokerName: '公司名称',
      brokerNameEn: '英文名称',
      contactPhone: '联系电话',
      contactEmail: '邮箱',
      status: '状态',
      remarks: '备注'
    }
  },
  TRUCKING_COMPANY: {
    entity: TruckingCompany,
    tableName: 'dict_trucking_companies',
    primaryKey: 'companyCode',
    labelFields: ['companyCode', 'companyName'],
    searchableFields: ['companyCode', 'companyName', 'companyNameEn'],
    allFields: {
      companyCode: '公司代码',
      companyName: '公司名称',
      companyNameEn: '英文名称',
      contactPhone: '联系电话',
      contactEmail: '邮箱',
      status: '状态',
      dailyCapacity: '日容量',
      remarks: '备注'
    }
  },
  WAREHOUSE: {
    entity: Warehouse,
    tableName: 'dict_warehouses',
    primaryKey: 'warehouseCode',
    labelFields: ['warehouseCode', 'warehouseName'],
    searchableFields: ['warehouseCode', 'warehouseName', 'warehouseNameEn'],
    allFields: {
      warehouseCode: '仓库代码',
      warehouseName: '仓库名称',
      warehouseNameEn: '英文名称',
      shortName: '简称',
      propertyType: '属性类型',
      warehouseType: '仓库类型',
      companyCode: '公司代码',
      address: '地址',
      city: '城市',
      state: '州/省',
      country: '国家',
      contactPhone: '联系电话',
      contactEmail: '邮箱',
      status: '状态',
      remarks: '备注'
    }
  },
  COUNTRY: {
    entity: Country,
    tableName: 'dict_countries',
    primaryKey: 'code',
    labelFields: ['code', 'nameCn'],
    searchableFields: ['code', 'nameCn', 'nameEn'],
    allFields: {
      code: '国家代码',
      nameCn: '中文名称',
      nameEn: '英文名称',
      region: '区域',
      continent: '洲',
      currency: '货币',
      phoneCode: '电话区号',
      sortOrder: '排序',
      isActive: '启用',
      remarks: '备注'
    }
  },
  CUSTOMER_TYPE: {
    entity: CustomerType,
    tableName: 'dict_customer_types',
    primaryKey: 'typeCode',
    labelFields: ['typeCode', 'typeNameCn'],
    searchableFields: ['typeCode', 'typeNameCn', 'typeNameEn'],
    allFields: {
      typeCode: '类型代码',
      typeNameCn: '中文名称',
      typeNameEn: '英文名称',
      sortOrder: '排序',
      isActive: '启用',
      remarks: '备注'
    }
  },
  OVERSEAS_COMPANY: {
    entity: OverseasCompany,
    tableName: 'dict_overseas_companies',
    primaryKey: 'companyCode',
    labelFields: ['companyCode', 'companyName'],
    searchableFields: ['companyCode', 'companyName', 'companyNameEn'],
    allFields: {
      companyCode: '公司代码',
      companyName: '公司名称',
      companyNameEn: '英文名称',
      country: '国家',
      address: '地址',
      contactPerson: '联系人',
      contactPhone: '联系电话',
      contactEmail: '邮箱',
      currency: '默认币种',
      taxId: '税号',
      bankName: '开户银行',
      bankAccount: '银行账号',
      sortOrder: '排序',
      isActive: '启用',
      remarks: '备注'
    }
  },
  TRUCKING_PORT_MAPPING: {
    entity: TruckingPortMapping,
    tableName: 'dict_trucking_port_mapping',
    primaryKey: 'id',
    labelFields: ['id', 'truckingCompanyName'],
    searchableFields: ['country', 'truckingCompanyName', 'portName'],
    allFields: {
      id: 'ID',
      country: '国家',
      truckingCompanyId: '车队代码',
      truckingCompanyName: '车队名称',
      portCode: '港口代码',
      portName: '港口名称',
      yardCapacity: '堆场容量',
      standardRate: '收费标准',
      unit: '单位',
      yardOperationFee: '堆场操作费',
      mappingType: '映射类型',
      isDefault: '默认',
      isActive: '启用',
      remarks: '备注'
    }
  },
  WAREHOUSE_TRUCKING_MAPPING: {
    entity: WarehouseTruckingMapping,
    tableName: 'dict_warehouse_trucking_mapping',
    primaryKey: 'id',
    labelFields: ['id', 'warehouseName'],
    searchableFields: ['country', 'warehouseName', 'truckingCompanyName'],
    allFields: {
      id: 'ID',
      country: '国家',
      warehouseCode: '仓库代码',
      warehouseName: '仓库名称',
      truckingCompanyId: '车队代码',
      truckingCompanyName: '车队名称',
      mappingType: '映射类型',
      isDefault: '默认',
      isActive: '启用',
      remarks: '备注'
    }
  }
};

export class DictManageController {
  /**
   * GET /api/v1/dict-manage/types
   * 获取所有字典类型
   */
  getTypes = async (_req: Request, res: Response): Promise<void> => {
    try {
      const types = Object.entries(DICT_CONFIG).map(([key, config]) => ({
        value: key,
        label: this.getTypeLabel(key),
        tableName: config.tableName,
        primaryKey: config.primaryKey
      }));
      res.json({ success: true, data: types });
    } catch (error: any) {
      logger.error('[DictManage] getTypes error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/v1/dict-manage/:type
   * 获取指定字典类型的数据列表
   */
  getList = async (req: Request, res: Response): Promise<void> => {
    try {
      const { type } = req.params;
      const config = DICT_CONFIG[type];
      if (!config) {
        res.status(400).json({ success: false, message: `未知字典类型: ${type}` });
        return;
      }

      const { page = 1, pageSize = 20, keyword = '' } = req.query;
      const repo = AppDataSource.getRepository(config.entity);

      const query: any = {};
      if (keyword && config.searchableFields.length > 0) {
        const orConditions = config.searchableFields.map(field => ({
          [field]: require('typeorm').Like(`%${keyword}%`)
        }));
        query.where = orConditions;
      }

      const [data, total] = await repo.findAndCount({
        ...query,
        order: { createdAt: 'DESC' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize)
      });

      // 转换字段名
      const transformedData = data.map((item: any) => this.transformToCamelCase(item));

      res.json({
        success: true,
        data: transformedData,
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      });
    } catch (error: any) {
      logger.error('[DictManage] getList error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/v1/dict-manage/:type/:id
   * 获取单条记录
   */
  getOne = async (req: Request, res: Response): Promise<void> => {
    try {
      const { type, id } = req.params;
      const config = DICT_CONFIG[type];
      if (!config) {
        res.status(400).json({ success: false, message: `未知字典类型: ${type}` });
        return;
      }

      const repo = AppDataSource.getRepository(config.entity);
      let item: any;

      if (config.primaryKey === 'id') {
        item = await repo.findOne({ where: { id: Number(id) } as any });
      } else {
        item = await repo.findOne({ where: { [config.primaryKey]: id } as any });
      }

      if (!item) {
        res.status(404).json({ success: false, message: '记录不存在' });
        return;
      }

      res.json({ success: true, data: this.transformToCamelCase(item) });
    } catch (error: any) {
      logger.error('[DictManage] getOne error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/v1/dict-manage/:type
   * 新增记录
   */
  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const { type } = req.params;
      const config = DICT_CONFIG[type];
      if (!config) {
        res.status(400).json({ success: false, message: `未知字典类型: ${type}` });
        return;
      }

      const repo = AppDataSource.getRepository(config.entity);
      // 统一将 snake_case 转为 camelCase，兼容表单(camelCase)与导入(snake_case)
      let data = snakeToCamel(req.body);
      data = this.normalizeBooleans(data, config);

      // 车队-港口映射：自动补全 truckingCompanyId 和 portCode
      if (type === 'TRUCKING_PORT_MAPPING') {
        // 自动补全 truckingCompanyId（支持大小写不敏感匹配）
        if (data.truckingCompanyName && !data.truckingCompanyId) {
          const name = String(data.truckingCompanyName).trim();
          const truckingCompany = await AppDataSource.getRepository(TruckingCompany)
            .createQueryBuilder('tc')
            .where('tc.company_code = :name OR LOWER(TRIM(tc.company_name)) = LOWER(:name)', { name })
            .orWhere('tc.company_name_en IS NOT NULL AND LOWER(TRIM(tc.company_name_en)) = LOWER(:name)', { name })
            .getOne();
          if (truckingCompany) {
            data.truckingCompanyId = truckingCompany.companyCode;
          }
        }
        // 自动补全 portCode：先查 dict_ports，再查 dict_universal_mapping
        if (data.portName && !data.portCode) {
          const portCode = await this.resolvePortCode(data.portName);
          if (portCode) {
            data.portCode = portCode;
          }
        }
        // 必填校验：port_code 和 trucking_company_id 不能为空
        if (!data.portCode || !data.portCode.toString().trim()) {
          const portHint = (!data.portName || !String(data.portName).trim())
            ? '港口名称和港口代码不能同时为空，请填写港口名称或港口代码'
            : `港口「${data.portName}」未在字典中找到，请先在「港口」字典维护或使用标准港口代码，也可在「通用字典映射」中配置名称→代码`;
          res.status(400).json({ success: false, message: portHint });
          return;
        }
        if (!data.truckingCompanyId || !data.truckingCompanyId.toString().trim()) {
          res.status(400).json({
            success: false,
            message: `车队「${data.truckingCompanyName || '(空)'}」未在字典中找到，请先在「拖车公司」字典维护`
          });
          return;
        }
      }

      // 仓库-车队映射：自动补全 truckingCompanyId
      if (type === 'WAREHOUSE_TRUCKING_MAPPING' && data.truckingCompanyName && !data.truckingCompanyId) {
        const truckingCompany = await AppDataSource.getRepository(TruckingCompany)
          .createQueryBuilder('tc')
          .where('tc.companyName = :name', { name: data.truckingCompanyName })
          .orWhere('tc.companyNameEn = :name', { name: data.truckingCompanyName })
          .getOne();
        if (truckingCompany) {
          data.truckingCompanyId = truckingCompany.companyCode;
        }
      }

      // 自增主键(id)：不参与存在性检查，不传入 create（Excel 中该列常被误填业务编码）
      if (config.primaryKey === 'id') {
        delete data.id;
      } else {
        // 非自增主键：检查是否已存在
        const pkValue = data[config.primaryKey];
        if (pkValue !== undefined && pkValue !== '' && pkValue !== null) {
          const existing = await repo.findOne({ where: { [config.primaryKey]: pkValue } as any });
          if (existing) {
            res.status(400).json({ success: false, message: `记录已存在: ${pkValue}` });
            return;
          }
        }
      }

      const entity = repo.create(data);
      const result = await repo.save(entity);

      res.json({ success: true, data: this.transformToCamelCase(result) });
    } catch (error: any) {
      logger.error('[DictManage] create error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * PUT /api/v1/dict-manage/:type/:id
   * 更新记录
   */
  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { type, id } = req.params;
      const config = DICT_CONFIG[type];
      if (!config) {
        res.status(400).json({ success: false, message: `未知字典类型: ${type}` });
        return;
      }

      const repo = AppDataSource.getRepository(config.entity);
      let item: any;

      if (config.primaryKey === 'id') {
        item = await repo.findOne({ where: { id: Number(id) } as any });
      } else {
        item = await repo.findOne({ where: { [config.primaryKey]: id } as any });
      }

      if (!item) {
        res.status(404).json({ success: false, message: '记录不存在' });
        return;
      }

      // 统一将 snake_case 转为 camelCase
      let data = snakeToCamel(req.body);
      data = this.normalizeBooleans(data, config);
      // 不允许修改主键
      delete data[config.primaryKey];

      Object.assign(item, data);
      const result = await repo.save(item);

      res.json({ success: true, data: this.transformToCamelCase(result) });
    } catch (error: any) {
      logger.error('[DictManage] update error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * DELETE /api/v1/dict-manage/:type/:id
   * 删除记录
   */
  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { type, id } = req.params;
      const config = DICT_CONFIG[type];
      if (!config) {
        res.status(400).json({ success: false, message: `未知字典类型: ${type}` });
        return;
      }

      const repo = AppDataSource.getRepository(config.entity);
      let item: any;

      if (config.primaryKey === 'id') {
        item = await repo.findOne({ where: { id: Number(id) } as any });
      } else {
        item = await repo.findOne({ where: { [config.primaryKey]: id } as any });
      }

      if (!item) {
        res.status(404).json({ success: false, message: '记录不存在' });
        return;
      }

      await repo.remove(item);

      res.json({ success: true, message: '删除成功' });
    } catch (error: any) {
      logger.error('[DictManage] delete error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/v1/dict-manage/:type/fields
   * 获取字段配置
   */
  getFields = async (req: Request, res: Response): Promise<void> => {
    try {
      const { type } = req.params;
      const config = DICT_CONFIG[type];
      if (!config) {
        res.status(400).json({ success: false, message: `未知字典类型: ${type}` });
        return;
      }

      const fields = Object.entries(config.allFields).map(([key, label]) => ({
        field: key,
        label,
        isPrimaryKey: key === config.primaryKey,
        isBoolean: ['isActive', 'isDefault', 'supportExport', 'supportImport', 'supportContainerOnly'].includes(key)
      }));

      res.json({ success: true, data: fields });
    } catch (error: any) {
      logger.error('[DictManage] getFields error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /** 从港口名称解析 port_code：先查 dict_ports，再查 dict_universal_mapping */
  private async resolvePortCode(nameOrCode: string): Promise<string | null> {
    if (!nameOrCode || !String(nameOrCode).trim()) return null;
    const v = String(nameOrCode).trim();
    // 1. 查 dict_ports（大小写不敏感）
    const port = await AppDataSource.getRepository(Port)
      .createQueryBuilder('p')
      .select('p.portCode')
      .where('p.port_code = :v OR LOWER(TRIM(p.port_name)) = LOWER(:v)', { v })
      .orWhere('p.port_name_en IS NOT NULL AND LOWER(TRIM(p.port_name_en)) = LOWER(:v)', { v })
      .getOne();
    if (port) return port.portCode;
    // 2. 查 dict_universal_mapping（PORT 类型）
    try {
      const rows = await AppDataSource.query(
        'SELECT get_standard_code($1, $2) as code',
        ['PORT', v]
      );
      const code = rows?.[0]?.code;
      return code && String(code).trim() ? String(code).trim() : null;
    } catch {
      return null;
    }
  }

  /** Excel 导入的布尔值字符串转为 boolean */
  private normalizeBooleans(data: any, config: (typeof DICT_CONFIG)[string]): any {
    const boolFields = ['isActive', 'isDefault', 'supportExport', 'supportImport', 'supportContainerOnly'];
    const result = { ...data };
    for (const key of boolFields) {
      if (!(key in config.allFields)) continue;
      const v = result[key];
      if (v === undefined || v === null || v === '') continue;
      if (typeof v === 'boolean') continue;
      if (typeof v === 'number') {
        result[key] = v === 1;
      } else if (typeof v === 'string') {
        result[key] = ['是', 'yes', 'true', '1', 'y'].includes(String(v).toLowerCase().trim());
      }
    }
    return result;
  }

  // 获取字典类型的中文标签
  private getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      PORT: '港口',
      SHIPPING_COMPANY: '船公司',
      CONTAINER_TYPE: '柜型',
      FREIGHT_FORWARDER: '货代公司',
      CUSTOMS_BROKER: '清关公司',
      TRUCKING_COMPANY: '拖车公司',
      WAREHOUSE: '仓库',
      COUNTRY: '国家',
      CUSTOMER_TYPE: '客户类型',
      OVERSEAS_COMPANY: '海外公司',
      TRUCKING_PORT_MAPPING: '车队-港口映射',
      WAREHOUSE_TRUCKING_MAPPING: '仓库-车队映射'
    };
    return labels[type] || type;
  }

  // 转换为驼峰命名
  private transformToCamelCase(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(item => this.transformToCamelCase(item));
    if (typeof obj !== 'object') return obj;

    const result: any = {};
    for (const key in obj) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      let value = obj[key];
      // 处理布尔值
      if (value === true) value = true;
      else if (value === false) value = false;
      else if (value === 'true') value = true;
      else if (value === 'false') value = false;
      result[camelKey] = value;
    }
    return result;
  }

  // 转换为下划线命名
  private transformToSnakeCase(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(item => this.transformToSnakeCase(item));
    if (typeof obj !== 'object') return obj;

    const result: any = {};
    for (const key in obj) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = obj[key];
    }
    return result;
  }
}
