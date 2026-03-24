/**
 * 货柜导入控制器
 * Container Import Controller
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import { Container } from '../entities/Container';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { SeaFreight } from '../entities/SeaFreight';
import { PortOperation } from '../entities/PortOperation';
import { TruckingTransport } from '../entities/TruckingTransport';
import { PICKUP_DATE_SOURCE } from '../constants/pickupDateSource';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { EmptyReturn } from '../entities/EmptyReturn';
import { ContainerType } from '../entities/ContainerType';
import { ShippingCompany } from '../entities/ShippingCompany';
import { FreightForwarder } from '../entities/FreightForwarder';
import { Port } from '../entities/Port';
import { TruckingCompany } from '../entities/TruckingCompany';
import { CustomsBroker } from '../entities/CustomsBroker';
import { Customer } from '../entities/Customer';
import { ExtDemurrageStandard } from '../entities/ExtDemurrageStandard';
import { feituoImportService } from '../services/feituoImport.service';
import { OverseasCompany } from '../entities/OverseasCompany';
import { Repository } from 'typeorm';
import { logger } from '../utils/logger';
import { resolveDemurrageFreeDays } from '../utils/demurrageTiers';
import { auditLogService } from '../services/auditLog.service';

export class ImportController {
  private containerRepository: Repository<Container>;
  private orderRepository: Repository<ReplenishmentOrder>;
  private seaFreightRepository: Repository<SeaFreight>;
  private portOperationRepository: Repository<PortOperation>;
  private truckingRepository: Repository<TruckingTransport>;
  private warehouseRepository: Repository<WarehouseOperation>;
  private emptyReturnRepository: Repository<EmptyReturn>;
  private containerTypeRepository: Repository<ContainerType>;
  private demurrageStandardRepository: Repository<ExtDemurrageStandard>;
  private customerRepository: Repository<Customer>;

  constructor() {
    this.containerRepository = AppDataSource.getRepository(Container);
    this.orderRepository = AppDataSource.getRepository(ReplenishmentOrder);
    this.seaFreightRepository = AppDataSource.getRepository(SeaFreight);
    this.portOperationRepository = AppDataSource.getRepository(PortOperation);
    this.truckingRepository = AppDataSource.getRepository(TruckingTransport);
    this.warehouseRepository = AppDataSource.getRepository(WarehouseOperation);
    this.emptyReturnRepository = AppDataSource.getRepository(EmptyReturn);
    this.containerTypeRepository = AppDataSource.getRepository(ContainerType);
    this.demurrageStandardRepository = AppDataSource.getRepository(ExtDemurrageStandard);
    this.customerRepository = AppDataSource.getRepository(Customer);
  }

  /**
   * 当 customer_code 为空且 sell_to_country 有值时，从 biz_customers 补全 customer_code
   * 见 15-排柜数据补全与缺省方案.md
   */
  /**
   * 根据 customer_name 自动填充 sell_to_country
   * 从 biz_customers 表查询 customer_name 对应的 country 字段
   */
  private async fillSellToCountryFromCustomer(orderData: {
    customerName?: string;
    sellToCountry?: string;
  }): Promise<void> {
    // 如果 sell_to_country 已有值，不覆盖
    if (orderData.sellToCountry?.trim()) return;
    // 如果 customer_name 为空，无法查询
    if (!orderData.customerName?.trim()) return;

    const cust = await this.customerRepository.findOne({
      where: { customerName: orderData.customerName.trim() },
      select: ['country']
    });
    if (cust?.country) {
      orderData.sellToCountry = cust.country;
      logger.info(`[Import] 从 customer_name 补全 sell_to_country: ${cust.country}`);
    }
  }

  /**
   * 当 customer_code 为空且 sell_to_country 有值时，从 biz_customers 补全 customer_code
   * 见 15-排柜数据补全与缺省方案.md
   */
  private async fillCustomerCodeFromSellToCountry(orderData: {
    customerCode?: string;
    sellToCountry?: string;
  }): Promise<void> {
    if (orderData.customerCode || !orderData.sellToCountry?.trim()) return;
    const cust = await this.customerRepository.findOne({
      where: { customerName: orderData.sellToCountry!.trim() },
      select: ['customerCode']
    });
    if (cust) {
      orderData.customerCode = cust.customerCode;
      logger.info(`[Import] 从 sell_to_country 补全 customer_code: ${cust.customerCode}`);
    }
  }

  /**
   * 验证并规范化柜型编码
   * @param originalCode Excel 中的柜型编码
   * @returns 有效的柜型编码，如果无效则返回默认值 '20GP'
   */
  private async validateAndNormalizeContainerType(originalCode: string): Promise<string> {
    if (!originalCode) return '20GP';

    // 定义常见的柜型编码映射
    const containerTypeMap: { [key: string]: string } = {
      // 标准编码
      '20GP': '20GP', '40GP': '40GP', '45GP': '45GP',
      '20HC': '20HC', '40HC': '40HC', '45HC': '45HC', '53HC': '53HC',
      '20FR': '20FR', '40FR': '40FR', '45FR': '45FR',
      '20OT': '20OT', '40OT': '40OT', '45OT': '45OT',
      '20TK': '20TK', '40TK': '40TK', '45TK': '45TK',
      '20RF': '20RF', '40RF': '40RF', '45RF': '45RF',
      '20HT': '20HT', '40HT': '40HT', '45HT': '45HT',
      '20HQ': '20HC', '40HQ': '40HC', // 高柜变体
      '20DV': '20HC', '40DV': '40HC', // DV = High Cube
      '20GP1': '20GP', '40GP1': '40GP',
      // 常见变体
      '20': '20GP', '40': '40GP', '45': '45GP',
      '20ft': '20GP', '40ft': '40GP',
      '20FT': '20GP', '40FT': '40GP',
      'HC20': '20HC', 'HC40': '40HC',
      'GP20': '20GP', 'GP40': '40GP',
      'GP45': '45GP',
      'STANDARD': '20GP',
    };

    // 标准化输入
    const normalizedInput = originalCode.trim().toUpperCase().replace(/\s+/g, '');

    // 检查是否在映射表中
    if (containerTypeMap[normalizedInput]) {
      const mappedCode = containerTypeMap[normalizedInput];
      // 验证映射后的编码是否在数据库中存在
      const exists = await this.containerTypeRepository.exists({
        where: { typeCode: mappedCode }
      });
      return exists ? mappedCode : '20GP';
    }

    // 检查是否直接存在于数据库中
    const exists = await this.containerTypeRepository.exists({
      where: { typeCode: normalizedInput }
    });
    if (exists) {
      return normalizedInput;
    }

    // 尝试提取数字（如 '20', '40', '45'）
    const sizeMatch = normalizedInput.match(/^(\d{2})/);
    if (sizeMatch) {
      const size = sizeMatch[1];
      if (normalizedInput.includes('H') || normalizedInput.includes('HQ') || normalizedInput.includes('DV')) {
        const hcCode = `${size}HC`;
        const hcExists = await this.containerTypeRepository.exists({
          where: { typeCode: hcCode }
        });
        if (hcExists) return hcCode;
      }
      const gpCode = `${size}GP`;
      const gpExists = await this.containerTypeRepository.exists({
        where: { typeCode: gpCode }
      });
      if (gpExists) return gpCode;
    }

    // 默认返回 20GP
    return '20GP';
  }

  /**
   * 验证并规范化物流状态
   * @param originalStatus Excel 中的物流状态
   * @returns 有效的物流状态
   */
  private validateLogisticsStatus(originalStatus: string): string {
    if (!originalStatus) return 'not_shipped';

    const statusMap: { [key: string]: string } = {
      // 英文状态
      'not_shipped': 'not_shipped',
      'in_transit': 'in_transit',
      'at_port': 'at_port',
      'picked_up': 'picked_up',
      'unloaded': 'unloaded',
      'returned_empty': 'returned_empty',
      'cancelled': 'cancelled',
      // 中文状态
      '未出运': 'not_shipped',
      '在途': 'in_transit',
      '已到港': 'at_port',
      '已提柜': 'picked_up',
      '已卸柜': 'unloaded',
      '已还箱': 'returned_empty',
      '已取消': 'cancelled',
      // 常见变体
      '未出货': 'not_shipped',
      '未发出': 'not_shipped',
      '运输中': 'in_transit',
      '到达': 'at_port',
      '提货': 'picked_up',
      '卸货': 'unloaded',
      '还柜': 'returned_empty',
      '取消': 'cancelled',
    };

    const normalizedInput = originalStatus.trim().toLowerCase();
    return statusMap[normalizedInput] || 'not_shipped';
  }

  /**
   * 口径统一：从字典表解析港口编码（仅解析，不自动创建）
   * @param queryRunner 查询运行器
   * @param nameOrCode Excel 中的港口名称或代码
   * @returns 字典中的 port_code，未匹配则返回 null 并记录警告
   */
  private async resolvePortCode(queryRunner: any, nameOrCode: string): Promise<string | null> {
    if (!nameOrCode || !nameOrCode.trim()) return null;
    const v = nameOrCode.trim();
    const port = await queryRunner.manager
      .getRepository(Port)
      .createQueryBuilder('p')
      .where('p.port_code = :v OR LOWER(TRIM(p.port_name)) = LOWER(:v) OR (p.port_name_en IS NOT NULL AND LOWER(TRIM(p.port_name_en)) = LOWER(:v))', { v })
      .getOne();
    if (!port) {
      logger.warn(`[Import] 港口未匹配（口径统一）: ${v}`);
      return null;
    }
    return port.portCode;
  }

  /**
   * 口径统一：从字典表解析船公司编码（仅解析，不自动创建）
   */
  private async resolveShippingCompanyCode(queryRunner: any, nameOrCode: string): Promise<string | null> {
    if (!nameOrCode || !nameOrCode.trim()) return null;
    const v = nameOrCode.trim();
    const ship = await queryRunner.manager
      .getRepository(ShippingCompany)
      .createQueryBuilder('s')
      .where('s.company_code = :v OR LOWER(TRIM(s.company_name)) = LOWER(:v) OR (s.company_name_en IS NOT NULL AND LOWER(TRIM(s.company_name_en)) = LOWER(:v))', { v })
      .getOne();
    if (!ship) {
      logger.warn(`[Import] 船公司未匹配（口径统一）: ${v}`);
      return null;
    }
    return ship.companyCode;
  }

  /**
   * 口径统一：从字典表解析货代编码（仅解析，不自动创建）
   */
  private async resolveFreightForwarderCode(queryRunner: any, nameOrCode: string): Promise<string | null> {
    if (!nameOrCode || !nameOrCode.trim()) return null;
    const v = nameOrCode.trim();
    const ff = await queryRunner.manager
      .getRepository(FreightForwarder)
      .createQueryBuilder('f')
      .where('f.forwarder_code = :v OR LOWER(TRIM(f.forwarder_name)) = LOWER(:v) OR (f.forwarder_name_en IS NOT NULL AND LOWER(TRIM(f.forwarder_name_en)) = LOWER(:v))', { v })
      .getOne();
    if (!ff) {
      logger.warn(`[Import] 货代未匹配（口径统一）: ${v}`);
      return null;
    }
    return ff.forwarderCode;
  }

  /**
   * 验证并规范化船公司代码（口径统一：先解析，未匹配则自动创建字典并返回 code）
   */
  private async validateShippingCompany(queryRunner: any, companyName: string): Promise<string | null> {
    const code = await this.resolveShippingCompanyCode(queryRunner, companyName);
    if (code) return code;
    if (!companyName || !companyName.trim()) return null;
    const trimmedName = companyName.trim();
    let newCode = trimmedName.length <= 10 ? trimmedName.toUpperCase().replace(/\s+/g, '_') : `NEW_${  Date.now()}`;
    // 确保代码长度不超过 50 字符
    if (newCode.length > 50) {
      newCode = `NEW_${  Date.now()  }_${  trimmedName.substring(0, 20).toUpperCase().replace(/\s+/g, '_')}`;
      newCode = newCode.substring(0, 50);
    }
    const newCompany = queryRunner.manager.create(ShippingCompany, {
      companyCode: newCode,
      companyName: trimmedName,
      companyNameEn: trimmedName
    });
    await queryRunner.manager.save(newCompany);
    logger.info(`[Import] 自动创建船公司（口径统一）: ${trimmedName} → ${newCode}`);
    return newCode;
  }

  /**
   * 验证并规范化货代公司代码（口径统一：先解析，未匹配则自动创建字典并返回 code）
   */
  private async validateFreightForwarder(queryRunner: any, forwarderName: string): Promise<string | null> {
    const code = await this.resolveFreightForwarderCode(queryRunner, forwarderName);
    if (code) return code;
    if (!forwarderName || !forwarderName.trim()) return null;
    const trimmedName = forwarderName.trim();
    let newCode = trimmedName.length <= 10 ? trimmedName.toUpperCase().replace(/\s+/g, '_') : `NEW_FF_${  Date.now()}`;
    // 确保代码长度不超过 50 字符
    if (newCode.length > 50) {
      newCode = `NEW_FF_${  Date.now()  }_${  trimmedName.substring(0, 15).toUpperCase().replace(/\s+/g, '_')}`;
      newCode = newCode.substring(0, 50);
    }
    const newForwarder = queryRunner.manager.create(FreightForwarder, {
      forwarderCode: newCode,
      forwarderName: trimmedName,
      forwarderNameEn: trimmedName
    });
    await queryRunner.manager.save(newForwarder);
    logger.info(`[Import] 自动创建货代（口径统一）: ${trimmedName} → ${newCode}`);
    return newCode;
  }

  /**
   * 验证并规范化港口代码（口径统一：先解析，未匹配则自动创建字典并返回 code）
   */
  private async validatePort(queryRunner: any, portName: string): Promise<string | null> {
    const code = await this.resolvePortCode(queryRunner, portName);
    if (code) return code;
    if (!portName || !portName.trim()) return null;
    const trimmedName = portName.trim();
    // 仅允许标准 UN/LOCODE 自动建港口，避免把中文名/描述写进 port_code
    const candidate = trimmedName.toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z0-9]{5}$/.test(candidate)) {
      logger.warn(`[Import] 跳过自动创建港口：非标准 port_code（${trimmedName}）`);
      return null;
    }
    const newCode = candidate;
    const newPort = queryRunner.manager.create(Port, {
      portCode: newCode,
      portName: trimmedName,
      portNameEn: trimmedName
    });
    await queryRunner.manager.save(newPort);
    logger.info(`[Import] 自动创建港口（口径统一）: ${trimmedName} → ${newCode}`);
    return newCode;
  }

  /**
   * 验证并规范化清关公司代码（如果不存在则自动创建）
   * @param queryRunner 查询运行器
   * @param brokerName Excel 中的清关公司名称或代码
   * @returns 有效的清关公司代码
   */
  private async validateCustomsBroker(queryRunner: any, brokerName: string): Promise<string | null> {
    if (!brokerName || brokerName.trim() === '') return null;

    const trimmedName = brokerName.trim();

    // 首先检查是否已经是代码
    const byCode = await queryRunner.manager.findOne(CustomsBroker, {
      where: { brokerCode: trimmedName }
    });
    if (byCode) return trimmedName;

    // 按名称查找
    const byName = await queryRunner.manager.findOne(CustomsBroker, {
      where: [
        { brokerName: trimmedName },
        { brokerNameEn: trimmedName }
      ]
    });
    if (byName) return byName.brokerCode;

    // 不存在，自动创建
    let newCode = trimmedName.length <= 10 ? trimmedName.toUpperCase().replace(/\s+/g, '_') : `NEW_BROKER_${  Date.now()}`;
    // 确保代码长度不超过 50 字符
    if (newCode.length > 50) {
      newCode = `NEW_BROKER_${  Date.now()  }_${  trimmedName.substring(0, 15).toUpperCase().replace(/\s+/g, '_')}`;
      newCode = newCode.substring(0, 50);
    }

    const newBroker = queryRunner.manager.create(CustomsBroker, {
      brokerCode: newCode,
      brokerName: trimmedName,
      brokerNameEn: trimmedName
    });

    await queryRunner.manager.save(newBroker);
    logger.info(`[Import] 新增清关公司: ${trimmedName} (代码: ${newCode})`);
    return newCode;
  }

  /**
   * 验证并规范化拖车公司代码（如果不存在则自动创建）
   * @param queryRunner 查询运行器
   * @param companyName Excel 中的拖车公司名称或代码
   * @returns 有效的拖车公司代码
   */
  private async validateTruckingCompany(queryRunner: any, companyName: string): Promise<string | null> {
    if (!companyName || companyName.trim() === '') return null;

    const trimmedName = companyName.trim();

    // 首先检查是否已经是代码
    const byCode = await queryRunner.manager.findOne(TruckingCompany, {
      where: { companyCode: trimmedName }
    });
    if (byCode) return trimmedName;

    // 按名称查找
    const byName = await queryRunner.manager.findOne(TruckingCompany, {
      where: [
        { companyName: trimmedName },
        { companyNameEn: trimmedName }
      ]
    });
    if (byName) return byName.companyCode;

    // 不存在，自动创建
    let newCode = trimmedName.length <= 10 ? trimmedName.toUpperCase().replace(/\s+/g, '_') : `NEW_TRUCK_${  Date.now()}`;
    // 确保代码长度不超过 50 字符
    if (newCode.length > 50) {
      newCode = `NEW_TRUCK_${  Date.now()  }_${  trimmedName.substring(0, 15).toUpperCase().replace(/\s+/g, '_')}`;
      newCode = newCode.substring(0, 50);
    }

    const newCompany = queryRunner.manager.create(TruckingCompany, {
      companyCode: newCode,
      companyName: trimmedName,
      companyNameEn: trimmedName
    });

    await queryRunner.manager.save(newCompany);
    logger.info(`[Import] 新增拖车公司: ${trimmedName} (代码: ${newCode})`);
    return newCode;
  }

  /**
   * 导入Excel数据到数据库
   *
   * 数据结构:
   * {
   *   tables: {
   *     replenishment_orders: { ... },
   *     containers: { ... },
   *     sea_freight: { ... },
   *     port_operations: { ... },
   *     trucking_transports: { ... },
   *     warehouse_operations: { ... },
   *     empty_returns: { ... }
   *   }
   * }
   */
  async importExcelData(req: Request, res: Response): Promise<void> {
    const { tables } = req.body;

    if (!tables || typeof tables !== 'object') {
      res.status(400).json({
        success: false,
        message: '缺少tables参数'
      });
      return;
    }

    logger.info('[Import] 接收到导入请求:', JSON.stringify(tables, null, 2));

    // snake_case转camelCase（用于TypeORM entity）
    const snakeToCamel = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(snakeToCamel);
      const result: any = {};
      for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = snakeToCamel(obj[key]);
      }
      return result;
    };

    // 使用完整表名（统一使用数据库 snake_case 命名）
    const orderData = snakeToCamel(tables.biz_replenishment_orders);
    const containerData = snakeToCamel(tables.biz_containers);
    const seaFreightData = snakeToCamel(tables.process_sea_freight);
    // Excel 列名为「提单号」时可能以中文键传入，统一取出提单号
    const getBlNumber = (sf: any) =>
      sf?.billOfLadingNumber ?? sf?.mblNumber ?? (sf && typeof sf['提单号'] !== 'undefined' && sf['提单号'] !== '' ? sf['提单号'] : null);
    const portData = tables.process_port_operations; // 数组需要单独处理
    const truckingData = snakeToCamel(tables.process_trucking_transport);
    const warehouseData = snakeToCamel(tables.process_warehouse_operations);
    const returnData = snakeToCamel(tables.process_empty_return);

    // 港口操作是数组，需要单独转换每个元素
    const portOperations = portData?.map((p: any) => snakeToCamel(p)) || [];

    try {
      // 使用事务确保数据一致性
      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const resultData: any = {};

        // 1. 先创建海运（biz_containers.bill_of_lading_number 外键依赖 process_sea_freight）
        // 2. 再创建货柜（biz_replenishment_orders.container_number 外键依赖 biz_containers）
        // 3. 最后创建备货单
        if (seaFreightData?.containerNumber || getBlNumber(seaFreightData)) {
          if (seaFreightData && !seaFreightData.billOfLadingNumber && seaFreightData['提单号']) {
            seaFreightData.billOfLadingNumber = seaFreightData['提单号'];
          }
          logger.info('[Import] 处理海运信息:', seaFreightData);

          // 转换船公司名称为代码
          if (seaFreightData.shippingCompanyId) {
            seaFreightData.shippingCompanyId = await this.validateShippingCompany(queryRunner, seaFreightData.shippingCompanyId);
          }

          // 转换货代公司名称为代码
          if (seaFreightData.freightForwarderId) {
            seaFreightData.freightForwarderId = await this.validateFreightForwarder(queryRunner, seaFreightData.freightForwarderId);
          }

          // 转换起运港名称为代码
          if (seaFreightData.portOfLoading) {
            seaFreightData.portOfLoading = await this.validatePort(queryRunner, seaFreightData.portOfLoading);
          }

          // 转换目的港名称为代码
          if (seaFreightData.portOfDischarge) {
            seaFreightData.portOfDischarge = await this.validatePort(queryRunner, seaFreightData.portOfDischarge);
          }

          // 转换途经港名称为代码
          if (seaFreightData.transitPortCode) {
            seaFreightData.transitPortCode = await this.validatePort(queryRunner, seaFreightData.transitPortCode);
          }

          let existingSeaFreight;
      if (seaFreightData.billOfLadingNumber) {
        existingSeaFreight = await queryRunner.manager.findOne(SeaFreight, {
          where: { billOfLadingNumber: seaFreightData.billOfLadingNumber }
        });
      }

          if (existingSeaFreight) {
            Object.assign(existingSeaFreight, seaFreightData);
            await queryRunner.manager.save(existingSeaFreight);
          } else {
            const seaFreight = queryRunner.manager.create(SeaFreight, seaFreightData);
            await queryRunner.manager.save(seaFreight);
          }
        }

        // 2. 创建或更新货柜（海运已存在，bill_of_lading_number 外键可满足）
        let containerExisted = false; // 用于审计日志
        if (containerData?.containerNumber) {
          const blNum = getBlNumber(seaFreightData);
          if (blNum) containerData.billOfLadingNumber = blNum;
          logger.info('[Import] 处理货柜:', containerData.containerNumber);

          const existingContainer = await queryRunner.manager.findOne(Container, {
            where: { containerNumber: containerData.containerNumber }
          });
          containerExisted = !!existingContainer;

          const containerTypeCode = await this.validateAndNormalizeContainerType(
            containerData.containerTypeCode || '40HQ'
          );
          const logisticsStatus = this.validateLogisticsStatus(
            containerData.logisticsStatus || ''
          );

          if (existingContainer) {
            Object.assign(existingContainer, {
              ...containerData,
              containerTypeCode,
              logisticsStatus
            });
            await queryRunner.manager.save(existingContainer);
          } else {
            const container = queryRunner.manager.create(Container, {
              ...containerData,
              orderNumber: containerData.orderNumber,
              containerTypeCode,
              logisticsStatus
            });
            await queryRunner.manager.save(container);
            logger.info('[Import] 创建货柜成功');
          }
          if (containerData.billOfLadingNumber) {
            await queryRunner.manager.query(
              'UPDATE biz_containers SET bill_of_lading_number = $1 WHERE container_number = $2',
              [containerData.billOfLadingNumber, containerData.containerNumber]
            );
          }
          resultData.containerNumber = containerData.containerNumber;
        }

        // 3. 创建或更新备货单（货柜已存在，container_number 外键可满足）
        if (orderData?.orderNumber) {
          if (containerData?.containerNumber) {
            orderData.containerNumber = containerData.containerNumber;
          }
          // 先根据 customer_name 自动填充 sell_to_country
          await this.fillSellToCountryFromCustomer(orderData);
          // 再从 sell_to_country 补全 customer_code
          await this.fillCustomerCodeFromSellToCountry(orderData);
          logger.info('[Import] 处理备货单:', orderData.orderNumber);

          const existingOrder = await queryRunner.manager.findOne(ReplenishmentOrder, {
            where: { orderNumber: orderData.orderNumber }
          });

          if (existingOrder) {
            Object.assign(existingOrder, orderData);
            await queryRunner.manager.save(existingOrder);
          } else {
            const order = queryRunner.manager.create(ReplenishmentOrder, orderData);
            await queryRunner.manager.save(order);
          }
          resultData.orderNumber = orderData.orderNumber;
        }

        // 4. 创建或更新港口操作（支持多港经停，数组格式）
        if (Array.isArray(portOperations)) {
          logger.info(`[Import] 处理港口操作，数量: ${portOperations.length}`);

          for (const port of portOperations) {
            // portType 默认为 destination（目的港）
            if (!port.portType) {
              port.portType = 'destination';
              logger.info(`[Import] 港口操作缺少portType，使用默认值 destination`);
            }

            if (!port.containerNumber) {
              logger.warn('[Import] 跳过无效港口操作（缺少containerNumber）:', port);
              continue;
            }

            // 转换港口名称为代码
            if (port.portCode) {
              port.portCode = await this.validatePort(queryRunner, port.portCode);
            }

            // 转换清关公司名称为代码
            if (port.customsBrokerCode) {
              port.customsBrokerCode = await this.validateCustomsBroker(queryRunner, port.customsBrokerCode);
            }

            const existingPort = await queryRunner.manager.findOne(PortOperation, {
              where: {
                containerNumber: port.containerNumber,
                portType: port.portType,
                portSequence: port.portSequence || 1
              }
            });

            if (existingPort) {
              Object.assign(existingPort, port);
              await queryRunner.manager.save(existingPort);
              logger.info(`[Import] 更新港口操作: ${port.containerNumber}-${port.portType}-${port.portSequence}`);
            } else {
              const portOperation = queryRunner.manager.create(PortOperation, {
                ...port,
                id: `${port.containerNumber}-${port.portType}-${port.portSequence || 1}`,
                portType: port.portType,
                portSequence: port.portSequence || 1
              });
              await queryRunner.manager.save(portOperation);
              logger.info(`[Import] 新增港口操作: ${port.containerNumber}-${port.portType}-${port.portSequence}`);
            }
          }
        }

        // 5. 创建或更新拖卡运输
        if (truckingData?.containerNumber) {
          logger.info('[Import] 处理拖卡运输:', truckingData.containerNumber);

          // 转换拖车公司名称为代码
          if (truckingData.truckingCompanyId) {
            truckingData.truckingCompanyId = await this.validateTruckingCompany(queryRunner, truckingData.truckingCompanyId);
          }

          const existingTrucking = await queryRunner.manager.findOne(TruckingTransport, {
            where: { containerNumber: truckingData.containerNumber }
          });

          if (existingTrucking) {
            Object.assign(existingTrucking, truckingData);
            if (truckingData.pickupDate != null && truckingData.pickupDate !== undefined) {
              existingTrucking.pickupDateSource = PICKUP_DATE_SOURCE.BUSINESS;
            }
            await queryRunner.manager.save(existingTrucking);
          } else {
            const trucking = queryRunner.manager.create(TruckingTransport, truckingData);
            if (truckingData.pickupDate != null && truckingData.pickupDate !== undefined) {
              trucking.pickupDateSource = PICKUP_DATE_SOURCE.BUSINESS;
            }
            await queryRunner.manager.save(trucking);
          }
        }

        // 6. 创建或更新仓库操作
        if (warehouseData?.containerNumber) {
          logger.info('[Import] 处理仓库操作:', warehouseData.containerNumber);

          const existingWarehouse = await queryRunner.manager.findOne(WarehouseOperation, {
            where: { containerNumber: warehouseData.containerNumber }
          });

          if (existingWarehouse) {
            Object.assign(existingWarehouse, warehouseData);
            await queryRunner.manager.save(existingWarehouse);
          } else {
            const warehouse = queryRunner.manager.create(WarehouseOperation, warehouseData);
            await queryRunner.manager.save(warehouse);
          }
        }

        // 7. 创建或更新还空箱
        if (returnData?.containerNumber) {
          logger.info('[Import] 处理还空箱:', returnData.containerNumber);
          logger.info('[Import] 还空箱数据详情:', JSON.stringify(returnData, null, 2));

          const existingReturn = await queryRunner.manager.findOne(EmptyReturn, {
            where: { containerNumber: returnData.containerNumber }
          });

          if (existingReturn) {
            Object.assign(existingReturn, returnData);
            await queryRunner.manager.save(existingReturn);
            logger.info('[Import] 更新还空箱记录:', returnData.containerNumber);
          } else {
            const emptyReturn = queryRunner.manager.create(EmptyReturn, returnData);
            await queryRunner.manager.save(emptyReturn);
            logger.info('[Import] 新增还空箱记录:', returnData.containerNumber);
          }
        } else {
          logger.warn('[Import] 缺少还空箱数据 - containerNumber为空');
        }

        await queryRunner.commitTransaction();
        logger.info('[Import] 导入成功:', resultData);

        // 记录数据变更日志
        if (containerData?.containerNumber) {
          const batchId = `excel_${Date.now()}`;
          await auditLogService.logChange({
            sourceType: 'excel_import',
            entityType: 'biz_containers',
            entityId: containerData.containerNumber,
            action: containerExisted ? 'UPDATE' : 'INSERT',
            changedFields: null,
            batchId,
            remark: 'Excel导入: replenishment_orders, sea_freight, port_operations, trucking_transport, warehouse_operations, empty_return'
          });
        }

        // 导入成功后，自动更新货柜状态
        if (containerData?.containerNumber) {
          try {
            const { ContainerStatusService } = await import('../services/containerStatus.service');
            const statusService = new ContainerStatusService();
            await statusService.updateStatus(containerData.containerNumber);
            logger.info(`[Import] 货柜 ${containerData.containerNumber} 状态已自动更新`);
          } catch (statusError) {
            logger.warn(`[Import] 自动更新货柜状态失败:`, statusError);
            // 不影响导入结果，只记录警告
          }
        }

        res.json({
          success: true,
          message: '数据导入成功',
          data: resultData
        });

      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }

    } catch (error: any) {
      logger.error('[Import] 导入失败:', error);

      // 判断是否是唯一约束冲突
      if (error.code === '23505') {
        res.status(409).json({
          success: false,
          message: '数据已存在，唯一约束冲突',
          error: error.detail || '未知字段',
        });
        return;
      }

      // 判断是否是外键约束失败
      if (error.code === '23503') {
        res.status(400).json({
          success: false,
          message: '外键约束失败，关联数据不存在',
          error: error.detail || '未知字段',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: '导入失败',
        error: error.message,
      });
    }
  }

  /**
   * 批量导入Excel数据到数据库
   *
   * 数据结构:
   * {
   *   batch: [
   *     {
   *       tables: {
   *         replenishment_orders: { ... },
   *         containers: { ... },
   *         sea_freight: { ... },
   *         port_operations: { ... },
   *         trucking_transports: { ... },
   *         warehouse_operations: { ... },
   *         empty_returns: { ... }
   *       }
   *     },
   *     ...
   *   ]
   * }
   */
  async importBatchExcelData(req: Request, res: Response): Promise<void> {
    const { batch } = req.body;

    if (!Array.isArray(batch)) {
      logger.error('[Import] batch参数必须是数组');
      res.status(400).json({
        success: false,
        message: 'batch参数必须是数组'
      });
      return;
    }

    // 检查数据库连接状态
    if (!AppDataSource.isInitialized) {
      logger.error('[Import] 数据库未初始化');
      res.status(503).json({
        success: false,
        message: '数据库连接未就绪，请稍后重试'
      });
      return;
    }

    logger.info(`[Import] 接收到批量导入请求，共 ${batch.length} 条记录`);

    // snake_case转camelCase（用于TypeORM entity）
    const snakeToCamel = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(snakeToCamel);
      const result: any = {};
      for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = snakeToCamel(obj[key]);
      }
      return result;
    };
    const getBlNumber = (sf: any) =>
      sf?.billOfLadingNumber ?? sf?.mblNumber ?? (sf && typeof sf['提单号'] !== 'undefined' && sf['提单号'] !== '' ? sf['提单号'] : null);

    const results: any[] = [];
    const errors: any[] = [];
    const containersToUpdate: string[] = []; // 收集需要更新状态的货柜号

    // 逐条处理，每条记录独立事务
    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];

      if (!item || !item.tables) {
        errors.push({
          rowIndex: i + 1,
          error: '数据格式错误：缺少tables对象'
        });
        results.push({ success: false, rowIndex: i + 1 });
        continue;
      }

      const { tables } = item;

      // 转换字段名为camelCase（用于TypeORM entity）
      const convertedTables: any = {};
      for (const [tableName, tableData] of Object.entries(tables)) {
        // 港口操作是数组，需要单独转换每个元素
        if (tableName === 'process_port_operations' && Array.isArray(tableData)) {
          convertedTables[tableName] = tableData.map((p: any) => snakeToCamel(p));
        } else if (tableData) {
          convertedTables[tableName] = snakeToCamel(tableData);
        }
      }

      let queryRunner;

      try {
        queryRunner = AppDataSource.createQueryRunner();

        // 等待连接可用
        await queryRunner.connect();

        // 检查连接状态
        if (!queryRunner.isTransactionActive) {
          await queryRunner.startTransaction();
        }

        try {
          const {
            biz_replenishment_orders: orderData,
            biz_containers: containerData,
            process_sea_freight: seaFreightData,
            process_port_operations: portData,
            process_trucking_transport: truckingData,
            process_warehouse_operations: warehouseData,
            process_empty_return: returnData
          } = convertedTables;

          const resultData: any = { rowIndex: i + 1 };

          // 1. 先创建海运（biz_containers.bill_of_lading_number 外键依赖 process_sea_freight）
          // 2. 再创建货柜（biz_replenishment_orders.container_number 外键依赖 biz_containers）
          // 3. 最后创建备货单
          logger.info(`[Import] 第${i + 1}行: 海运数据 - ${JSON.stringify(seaFreightData)}`);
          if (seaFreightData?.containerNumber || getBlNumber(seaFreightData)) {
            if (seaFreightData && !seaFreightData.billOfLadingNumber && seaFreightData['提单号']) {
              seaFreightData.billOfLadingNumber = seaFreightData['提单号'];
            }
            // 转换船公司名称为代码
            if (seaFreightData.shippingCompanyId) {
              seaFreightData.shippingCompanyId = await this.validateShippingCompany(queryRunner, seaFreightData.shippingCompanyId);
            }

            // 转换货代公司名称为代码
            if (seaFreightData.freightForwarderId) {
              seaFreightData.freightForwarderId = await this.validateFreightForwarder(queryRunner, seaFreightData.freightForwarderId);
            }

            // 转换起运港名称为代码
            if (seaFreightData.portOfLoading) {
              seaFreightData.portOfLoading = await this.validatePort(queryRunner, seaFreightData.portOfLoading);
            }

            // 转换目的港名称为代码
            if (seaFreightData.portOfDischarge) {
              seaFreightData.portOfDischarge = await this.validatePort(queryRunner, seaFreightData.portOfDischarge);
            }

            // 转换途经港名称为代码
            if (seaFreightData.transitPortCode) {
              seaFreightData.transitPortCode = await this.validatePort(queryRunner, seaFreightData.transitPortCode);
            }

            let existingSeaFreight;
      if (seaFreightData.billOfLadingNumber) {
        existingSeaFreight = await queryRunner.manager.findOne(SeaFreight, {
          where: { billOfLadingNumber: seaFreightData.billOfLadingNumber }
        });
      }

            if (existingSeaFreight) {
              Object.assign(existingSeaFreight, seaFreightData);
              await queryRunner.manager.save(existingSeaFreight);
            } else {
              const seaFreight = queryRunner.manager.create(SeaFreight, seaFreightData);
              await queryRunner.manager.save(seaFreight);
            }
          }

          // 2. 创建或更新货柜（海运已存在，bill_of_lading_number 外键可满足）
          let batchContainerExisted = false;
          if (containerData?.containerNumber) {
            const blNum = getBlNumber(seaFreightData);
            if (blNum) containerData.billOfLadingNumber = blNum;
            logger.info(`[Import] 第${i + 1}行: 创建货柜 - ${containerData.containerNumber}`);
            const existingContainer = await queryRunner.manager.findOne(Container, {
              where: { containerNumber: containerData.containerNumber }
            });
            batchContainerExisted = !!existingContainer;

            const containerTypeCode = await this.validateAndNormalizeContainerType(
              containerData.containerTypeCode || '40HQ'
            );
            const logisticsStatus = this.validateLogisticsStatus(
              containerData.logisticsStatus || ''
            );

            if (existingContainer) {
              Object.assign(existingContainer, {
                ...containerData,
                containerTypeCode,
                logisticsStatus
              });
              await queryRunner.manager.save(existingContainer);
            } else {
              const container = queryRunner.manager.create(Container, {
                ...containerData,
                orderNumber: containerData.orderNumber,
                containerTypeCode,
                logisticsStatus
              });
              await queryRunner.manager.save(container);
            }
            if (containerData.billOfLadingNumber) {
              await queryRunner.manager.query(
                'UPDATE biz_containers SET bill_of_lading_number = $1 WHERE container_number = $2',
                [containerData.billOfLadingNumber, containerData.containerNumber]
              );
            }
            resultData.containerNumber = containerData.containerNumber;
          }

          // 3. 创建或更新备货单（货柜已存在，container_number 外键可满足）
          if (orderData?.orderNumber) {
            if (containerData?.containerNumber) {
              orderData.containerNumber = containerData.containerNumber;
            }
            // 先根据 customer_name 自动填充 sell_to_country
            await this.fillSellToCountryFromCustomer(orderData);
            // 再从 sell_to_country 补全 customer_code
            await this.fillCustomerCodeFromSellToCountry(orderData);
            logger.info(`[Import] 第${i + 1}行: 创建备货单 - ${orderData.orderNumber}`);
            const existingOrder = await queryRunner.manager.findOne(ReplenishmentOrder, {
              where: { orderNumber: orderData.orderNumber }
            });

            if (existingOrder) {
              Object.assign(existingOrder, orderData);
              await queryRunner.manager.save(existingOrder);
              logger.info(`[Import] 第${i + 1}行: 更新备货单成功`);
            } else {
              const order = queryRunner.manager.create(ReplenishmentOrder, orderData);
              await queryRunner.manager.save(order);
              logger.info(`[Import] 第${i + 1}行: 创建备货单成功`);
            }
            resultData.orderNumber = orderData.orderNumber;
          }

          // 4. 创建或更新港口操作（支持多港经停，数组格式）
          if (Array.isArray(portData)) {
            for (const port of portData) {
              if (!port.containerNumber || !port.portType) {
                continue;
              }

              // 转换港口名称为代码
              if (port.portCode) {
                port.portCode = await this.validatePort(queryRunner, port.portCode);
              }

              // 转换清关公司名称为代码
              if (port.customsBrokerCode) {
                port.customsBrokerCode = await this.validateCustomsBroker(queryRunner, port.customsBrokerCode);
              }

              const existingPort = await queryRunner.manager.findOne(PortOperation, {
                where: {
                  containerNumber: port.containerNumber,
                  portType: port.portType,
                  portSequence: port.portSequence || 1
                }
              });

              if (existingPort) {
                Object.assign(existingPort, port);
                await queryRunner.manager.save(existingPort);
              } else {
                const portOperation = queryRunner.manager.create(PortOperation, {
                  ...port,
                  id: `${port.containerNumber}-${port.portType}-${port.portSequence || 1}`,
                  portType: port.portType,
                  portSequence: port.portSequence || 1
                });
                await queryRunner.manager.save(portOperation);
              }
            }
          }

          // 5. 创建或更新拖卡运输
          if (truckingData?.containerNumber) {
            // 转换拖车公司名称为代码
            if (truckingData.truckingCompanyId) {
              truckingData.truckingCompanyId = await this.validateTruckingCompany(queryRunner, truckingData.truckingCompanyId);
            }

            const existingTrucking = await queryRunner.manager.findOne(TruckingTransport, {
              where: { containerNumber: truckingData.containerNumber }
            });

            if (existingTrucking) {
              Object.assign(existingTrucking, truckingData);
              if (truckingData.pickupDate != null && truckingData.pickupDate !== undefined) {
                existingTrucking.pickupDateSource = PICKUP_DATE_SOURCE.BUSINESS;
              }
              await queryRunner.manager.save(existingTrucking);
            } else {
              const trucking = queryRunner.manager.create(TruckingTransport, truckingData);
              if (truckingData.pickupDate != null && truckingData.pickupDate !== undefined) {
                trucking.pickupDateSource = PICKUP_DATE_SOURCE.BUSINESS;
              }
              await queryRunner.manager.save(trucking);
            }
          }

          // 6. 创建或更新仓库操作
          if (warehouseData?.containerNumber) {
            const existingWarehouse = await queryRunner.manager.findOne(WarehouseOperation, {
              where: { containerNumber: warehouseData.containerNumber }
            });

            if (existingWarehouse) {
              Object.assign(existingWarehouse, warehouseData);
              await queryRunner.manager.save(existingWarehouse);
            } else {
              const warehouse = queryRunner.manager.create(WarehouseOperation, warehouseData);
              await queryRunner.manager.save(warehouse);
            }
          }

          // 7. 创建或更新还空箱
          if (returnData?.containerNumber) {
            const existingReturn = await queryRunner.manager.findOne(EmptyReturn, {
              where: { containerNumber: returnData.containerNumber }
            });

            if (existingReturn) {
              Object.assign(existingReturn, returnData);
              await queryRunner.manager.save(existingReturn);
            } else {
              const emptyReturn = queryRunner.manager.create(EmptyReturn, returnData);
              await queryRunner.manager.save(emptyReturn);
            }
          } else {
            // 还空箱数据缺失，记录警告
            if (containerData?.logisticsStatus === 'returned_empty') {
              logger.warn(`[Import] 第${i + 1}行: 货柜${containerData.containerNumber}状态为已还箱，但缺少还空箱数据`);
            }
          }

          await queryRunner.commitTransaction();
          logger.info(`[Import] 第${i + 1}行: 事务提交成功`);

          // 记录数据变更日志（批量导入）
          if (containerData?.containerNumber) {
            const batchId = `excel_batch_${Date.now()}_${i}`;
            await auditLogService.logChange({
              sourceType: 'excel_import',
              entityType: 'biz_containers',
              entityId: containerData.containerNumber,
              action: batchContainerExisted ? 'UPDATE' : 'INSERT',
              changedFields: null,
              batchId,
              remark: `Excel批量导入 第${i + 1}行`
            });
          }

          results.push({ success: true, ...resultData });

          // 收集需要更新状态的货柜号
          if (containerData?.containerNumber) {
            containersToUpdate.push(containerData.containerNumber);
          }

        } catch (error: any) {
          await queryRunner.rollbackTransaction();
          logger.error(`[Import] 第 ${i + 1} 行导入失败:`, error);
          errors.push({
            rowIndex: i + 1,
            error: error.message || '未知错误'
          });
          results.push({ success: false, rowIndex: i + 1 });
        }
      } catch (error: any) {
        logger.error(`[Import] 第 ${i + 1} 行处理异常:`, error);
        errors.push({
          rowIndex: i + 1,
          error: error.message || '系统错误'
        });
        results.push({ success: false, rowIndex: i + 1 });
      } finally {
        if (queryRunner && !queryRunner.isReleased) {
          try {
            await queryRunner.release();
          } catch (releaseError) {
            logger.error(`[Import] 第 ${i + 1} 行释放连接失败:`, releaseError);
          }
        }
      }
    }

    logger.info(`[Import] 批量导入完成: 成功 ${results.length - errors.length} 条，失败 ${errors.length} 条`);

    // 批量导入成功后，自动更新所有导入货柜的状态
    if (containersToUpdate.length > 0) {
      try {
        const { ContainerStatusService } = await import('../services/containerStatus.service');
        const statusService = new ContainerStatusService();
        const updatedCount = await statusService.updateStatusesForContainers(containersToUpdate);
        logger.info(`[Import] 批量自动更新状态: 更新了 ${updatedCount} 个货柜`);
      } catch (statusError) {
        logger.warn(`[Import] 批量自动更新货柜状态失败:`, statusError);
        // 不影响导入结果，只记录警告
      }

      // 导入更新 ATA 后触发滞港费批量写回（补齐 last_free_date）
      try {
        const { DemurrageService } = await import('../services/demurrage.service');
        const { ExtDemurrageRecord } = await import('../entities/ExtDemurrageRecord');
        const demurrageService = new DemurrageService(
          this.demurrageStandardRepository,
          this.containerRepository,
          this.portOperationRepository,
          this.seaFreightRepository,
          this.truckingRepository,
          this.emptyReturnRepository,
          this.orderRepository,
          AppDataSource.getRepository(ExtDemurrageRecord)
        );
        const wb = await demurrageService.batchWriteBackComputedDates({ limitLastFree: 30, limitLastReturn: 20 });
        if (wb.lastFreeWritten > 0 || wb.lastReturnWritten > 0) {
          logger.info(`[Import] 滞港费日期写回: last_free ${wb.lastFreeWritten}, last_return ${wb.lastReturnWritten}`);
        }
      } catch (wbError) {
        logger.warn(`[Import] 滞港费日期写回失败:`, wbError);
      }
    }

    // 随机抽取3条数据进行验证
    const successfulResults = results.filter(r => r.success);
    const verificationData = await this.verifyImportedData(successfulResults, 3);

    // 验证数据完整性：检查状态为已还箱的货柜是否有还空箱记录
    await this.validateEmptyReturnCompleteness(successfulResults);

    res.json({
      success: true,
      message: `批量导入完成: 成功 ${results.length - errors.length} 条，失败 ${errors.length} 条`,
      data: {
        total: results.length,
        success: results.length - errors.length,
        failed: errors.length,
        results,
        errors,
        verification: verificationData
      }
    });
  }

  /**
   * 验证已导入的数据，随机抽取指定数量的记录进行详细验证
   * @param successfulResults 成功导入的记录
   * @param sampleSize 抽样数量
   */
  private async verifyImportedData(successfulResults: any[], sampleSize: number = 3) {
    if (successfulResults.length === 0) {
      return { message: '没有成功导入的数据可供验证' };
    }

    // 随机抽取记录
    const sampled = successfulResults
      .sort(() => Math.random() - 0.5)
      .slice(0, sampleSize);

    const verificationResults = [];

    for (const item of sampled) {
      if (!item.tables || !item.tables.containers?.containerNumber) {
        continue;
      }

      const containerNumber = item.tables.containers.containerNumber;

      try {
        // 从数据库查询各表的数据
        // 先查询货柜
        const container = await this.containerRepository.findOne({ where: { containerNumber }, relations: [] });

        // 然后查询其他相关数据
        const [order, seaFreight, portOp, trucking, warehouse, emptyReturn] = await Promise.all([
          item.tables.replenishment_orders?.orderNumber
            ? this.orderRepository.findOne({ where: { orderNumber: item.tables.replenishment_orders.orderNumber } })
            : null,
          container?.billOfLadingNumber ? this.seaFreightRepository.findOne({ where: { billOfLadingNumber: container.billOfLadingNumber } }) : null,
          this.portOperationRepository.findOne({ where: { containerNumber } }),
          this.truckingRepository.findOne({ where: { containerNumber } }),
          this.warehouseRepository.findOne({ where: { containerNumber } }),
          this.emptyReturnRepository.findOne({ where: { containerNumber } })
        ]);

        verificationResults.push({
          containerNumber,
          verified: true,
          tables: {
            containers: this.maskSensitiveData(container),
            replenishment_orders: this.maskSensitiveData(order),
            sea_freight: this.maskSensitiveData(seaFreight),
            port_operations: this.maskSensitiveData(portOp),
            trucking_transports: this.maskSensitiveData(trucking),
            warehouse_operations: this.maskSensitiveData(warehouse),
            empty_returns: this.maskSensitiveData(emptyReturn)
          }
        });
      } catch (error) {
        logger.error(`[Import] 验证数据失败 (${containerNumber}):`, error);
        verificationResults.push({
          containerNumber,
          verified: false,
          error: '数据验证失败'
        });
      }
    }

    return {
      message: `随机抽取 ${verificationResults.length} 条数据进行验证`,
      sampleSize,
      samples: verificationResults
    };
  }

  /**
   * 脱敏处理敏感数据（如时间戳等），只保留关键字段
   */
  private maskSensitiveData(data: any): any {
    if (!data) return null;

    const result: any = {};
    const fieldsToShow = [
      'containerNumber', 'orderNumber', 'orderStatus', 'containerTypeCode',
      'billOfLadingNumber', 'vesselName', 'voyageNumber', 'portOfLoading', 'portOfDischarge',
      'customsStatus', 'etaDestPort', 'ataDestPort', 'pickupDate', 'deliveryDate',
      'unloadDate', 'warehouseArrivalDate', 'returnTime', 'plannedReturnDate'
    ];

    fieldsToShow.forEach(field => {
      if (data[field] !== undefined && data[field] !== null) {
        result[field] = data[field];
      }
    });

    return result;
  }

  /**
   * 根据名称解析四项匹配编码（口径统一）
   */
  private async resolveDemurrageCodesFromNames(row: Record<string, unknown>): Promise<Record<string, string>> {
    const resolved: Record<string, string> = {};
    const portRepo = AppDataSource.getRepository(Port);
    const shipRepo = AppDataSource.getRepository(ShippingCompany);
    const ffRepo = AppDataSource.getRepository(FreightForwarder);
    const ocRepo = AppDataSource.getRepository(OverseasCompany);

    const v = (key: string) => String(row[key] ?? '').trim();

    const portVal = v('destination_port_code') || v('destination_port_name');
    if (portVal) {
      const port = await portRepo
        .createQueryBuilder('p')
        .where('p.port_code = :v OR LOWER(TRIM(p.port_name)) = LOWER(:v) OR (p.port_name_en IS NOT NULL AND LOWER(TRIM(p.port_name_en)) = LOWER(:v))', { v: portVal })
        .getOne();
      if (port) resolved.destination_port_code = port.portCode;
    }

    const shipVal = v('shipping_company_code') || v('shipping_company_name');
    if (shipVal) {
      const ship = await shipRepo
        .createQueryBuilder('s')
        .where(
          's.company_code = :v OR LOWER(TRIM(s.company_name)) = LOWER(:v) OR (s.company_name_en IS NOT NULL AND LOWER(TRIM(s.company_name_en)) = LOWER(:v)) OR (s.scac_code IS NOT NULL AND LOWER(TRIM(s.scac_code)) = LOWER(:v))',
          { v: shipVal }
        )
        .getOne();
      if (ship) resolved.shipping_company_code = ship.companyCode;
    }

    const ffVal = v('origin_forwarder_code') || v('origin_forwarder_name');
    if (ffVal) {
      const ff = await ffRepo
        .createQueryBuilder('f')
        .where('f.forwarder_code = :v OR LOWER(TRIM(f.forwarder_name)) = LOWER(:v) OR (f.forwarder_name_en IS NOT NULL AND LOWER(TRIM(f.forwarder_name_en)) = LOWER(:v))', { v: ffVal })
        .getOne();
      if (ff) resolved.origin_forwarder_code = ff.forwarderCode;
    }

    const ocVal = v('foreign_company_code') || v('foreign_company_name');
    if (ocVal) {
      const oc = await ocRepo
        .createQueryBuilder('o')
        .where('o.company_code = :v OR LOWER(TRIM(o.company_name)) = LOWER(:v) OR (o.company_name_en IS NOT NULL AND LOWER(TRIM(o.company_name_en)) = LOWER(:v))', { v: ocVal })
        .getOne();
      if (oc) resolved.foreign_company_code = oc.companyCode;
    }

    return resolved;
  }

  /**
   * 批量导入滞港费标准
   * POST /api/v1/import/demurrage-standards
   * Body: { records: DemurrageStandardRow[] }
   * 导入时自动根据名称解析编码（口径统一）
   */
  async importDemurrageStandards(req: Request, res: Response): Promise<void> {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      res.status(400).json({
        success: false,
        message: '缺少 records 参数或为空数组'
      });
      return;
    }

    let successCount = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 1;

      try {
        const resolved = await this.resolveDemurrageCodesFromNames(row);
        const resolvedRow = { ...row };
        if (resolved.destination_port_code) resolvedRow.destination_port_code = resolved.destination_port_code;
        if (resolved.shipping_company_code) resolvedRow.shipping_company_code = resolved.shipping_company_code;
        if (resolved.origin_forwarder_code) resolvedRow.origin_forwarder_code = resolved.origin_forwarder_code;
        if (resolved.foreign_company_code) resolvedRow.foreign_company_code = resolved.foreign_company_code;

        const entity = this.demurrageStandardRepository.create({
          foreignCompanyCode: String(resolvedRow.foreign_company_code ?? ''),
          foreignCompanyName: resolvedRow.foreign_company_name ?? null,
          effectiveDate: resolvedRow.effective_date ? new Date(resolvedRow.effective_date) : null,
          expiryDate: resolvedRow.expiry_date ? new Date(resolvedRow.expiry_date) : null,
          destinationPortCode: String(resolvedRow.destination_port_code ?? ''),
          destinationPortName: resolvedRow.destination_port_name ?? null,
          shippingCompanyCode: String(resolvedRow.shipping_company_code ?? ''),
          shippingCompanyName: resolvedRow.shipping_company_name ?? null,
          terminal: resolvedRow.terminal ?? null,
          originForwarderCode: String(resolvedRow.origin_forwarder_code ?? ''),
          originForwarderName: resolvedRow.origin_forwarder_name ?? null,
          transportModeCode: resolvedRow.transport_mode_code ?? null,
          transportModeName: resolvedRow.transport_mode_name ?? null,
          chargeTypeCode: resolvedRow.charge_type_code ?? null,
          chargeName: resolvedRow.charge_name ?? null,
          isChargeable: (resolvedRow.is_chargeable as string) ?? 'Y',
          sequenceNumber: resolvedRow.sequence_number ?? null,
          portCondition: resolvedRow.port_condition ?? null,
          freeDaysBasis: resolvedRow.free_days_basis ?? '自然日',
          freeDays: resolveDemurrageFreeDays(
            resolvedRow.free_days,
            (resolvedRow.tiers as Record<string, unknown> | null | undefined) ?? null
          ),
          calculationBasis: resolvedRow.calculation_basis ?? '按卸船',
          ratePerDay: resolvedRow.rate_per_day ?? null,
          tiers: (resolvedRow.tiers as Record<string, unknown>) ?? null,
          currency: resolvedRow.currency ?? 'USD',
          processStatus: resolvedRow.process_status ?? null
        } as any);

        await this.demurrageStandardRepository.save(entity);
        successCount++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`[Import] 滞港费标准第 ${rowNum} 行导入失败: ${msg}`);
        errors.push({ row: rowNum, error: msg });
      }
    }

    res.json({
      success: successCount,
      failed: records.length - successCount,
      errors: errors.length > 0 ? errors : undefined
    });
  }

  /**
   * 验证还空箱记录完整性
   * 检查物流状态为"已还箱"的货柜是否有对应的还空箱记录
   */
  private async validateEmptyReturnCompleteness(successfulResults: any[]): Promise<void> {
    const warnings: string[] = [];

    for (const result of successfulResults) {
      if (!result.tables?.containers?.containerNumber) continue;

      const containerNumber = result.tables.containers.containerNumber;
      const logisticsStatus = result.tables.containers.logisticsStatus;

      // 只检查状态为已还箱的货柜
      if (logisticsStatus === 'returned_empty') {
        const hasEmptyReturn = await this.emptyReturnRepository.exists({
          where: { containerNumber }
        });

        if (!hasEmptyReturn) {
          const warning = `货柜 ${containerNumber} 状态为已还箱，但缺少还空箱记录`;
          logger.warn(`[Import] ${warning}`);
          warnings.push(warning);
        }
      }
    }

    if (warnings.length > 0) {
      logger.warn(`[Import] 数据完整性检查发现 ${warnings.length} 个问题：`);
      warnings.forEach(w => logger.warn(`[Import] - ${w}`));
    }
  }

  /**
   * 飞驼 Excel 导入
   * POST /api/v1/import/feituo-excel
   * Body: { tableType: 1|2, rows: Record[]|unknown[][], headers?: string[], fileName?: string }
   * 传 headers + rows 为 unknown[][] 时按分组存储，避免同名字段错位
   */
  importFeituoExcel = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tableType, rows, headers, fileName } = req.body;
      if (![1, 2].includes(Number(tableType))) {
        res.status(400).json({
          success: false,
          message: 'tableType 必须为 1（表一）或 2（表二）'
        });
        return;
      }
      if (!Array.isArray(rows) || rows.length === 0) {
        res.status(400).json({
          success: false,
          message: 'rows 必须为非空数组'
        });
        return;
      }

      const result = await feituoImportService.import(
        Number(tableType) as 1 | 2,
        rows,
        fileName,
        Array.isArray(headers) && headers.length > 0 ? headers : undefined
      );

      res.json({
        success: true,
        message: `导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`,
        data: result
      });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[Import] 飞驼导入失败:', err.message, err.stack);
      res.status(500).json({
        success: false,
        message: err.message || '飞驼导入失败'
      });
    }
  };
}
