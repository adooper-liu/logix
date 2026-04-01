/**
 * 数据库初始化
 * Database Initialization
 */

import { DataSource, DataSourceOptions } from 'typeorm';
import { databaseConfig } from '../config/database.config';
import { SnakeNamingStrategy } from '../config/SnakeNamingStrategy';
import { Container } from '../entities/Container';
import { ContainerAlert } from '../entities/ContainerAlert';
import { ContainerCharge } from '../entities/ContainerCharge';
import { ContainerHoldRecord } from '../entities/ContainerHoldRecord';
import { ContainerLoadingRecord } from '../entities/ContainerLoadingRecord';
import { ContainerRiskAssessment } from '../entities/ContainerRiskAssessment';
import { ContainerSku } from '../entities/ContainerSku';
import { ContainerStatusEvent } from '../entities/ContainerStatusEvent';
import { ContainerType } from '../entities/ContainerType';
import { Country } from '../entities/Country';
import { Customer } from '../entities/Customer';
import { CustomerType } from '../entities/CustomerType';
import { CustomsBroker } from '../entities/CustomsBroker';
import { DictHoliday } from '../entities/DictHoliday'; // ✅ Phase 2 Task 2: 新增
import { DictSchedulingConfig } from '../entities/DictSchedulingConfig';
import { EmptyReturn } from '../entities/EmptyReturn';
import { ExtDemurrageRecord } from '../entities/ExtDemurrageRecord';
import { ExtDemurrageStandard } from '../entities/ExtDemurrageStandard';
import { ExtFeituoImportBatch } from '../entities/ExtFeituoImportBatch';
import { ExtFeituoImportTable1 } from '../entities/ExtFeituoImportTable1';
import { ExtFeituoImportTable2 } from '../entities/ExtFeituoImportTable2';
import { ExtFeituoPlace } from '../entities/ExtFeituoPlace';
import { ExtFeituoStatusEvent } from '../entities/ExtFeituoStatusEvent';
import { ExtFeituoVessel } from '../entities/ExtFeituoVessel';
import { ExtTruckingReturnSlotOccupancy } from '../entities/ExtTruckingReturnSlotOccupancy';
import { ExtTruckingSlotOccupancy } from '../entities/ExtTruckingSlotOccupancy';
import { ExtWarehouseDailyOccupancy } from '../entities/ExtWarehouseDailyOccupancy';
import { ExtYardDailyOccupancy } from '../entities/ExtYardDailyOccupancy';
import { FlowDefinition } from '../entities/FlowDefinition';
import { FlowInstance } from '../entities/FlowInstance';
import { FreightForwarder } from '../entities/FreightForwarder';
import { InspectionEvent } from '../entities/InspectionEvent';
import { InspectionRecord } from '../entities/InspectionRecord';
import { OverseasCompany } from '../entities/OverseasCompany';
import { Port } from '../entities/Port';
import { PortOperation } from '../entities/PortOperation';
import { PortWarehouseMapping } from '../entities/PortWarehouseMapping';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { SeaFreight } from '../entities/SeaFreight';
import { ShippingCompany } from '../entities/ShippingCompany';
import { SysDataChangeLog } from '../entities/SysDataChangeLog';
import { TruckingCompany } from '../entities/TruckingCompany';
import { TruckingPortMapping } from '../entities/TruckingPortMapping';
import { TruckingTransport } from '../entities/TruckingTransport';
import { Warehouse } from '../entities/Warehouse';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { WarehouseTruckingMapping } from '../entities/WarehouseTruckingMapping';
import { Yard } from '../entities/Yard';
import { SchedulingHistory } from '../entities/SchedulingHistory'; // ✅ Phase 3: 排产历史表
import { logger } from '../utils/logger';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: databaseConfig.host,
  port: databaseConfig.port,
  username: databaseConfig.username,
  password: databaseConfig.password,
  database: databaseConfig.database,
  namingStrategy: new SnakeNamingStrategy(),
  entities: [
    // 字典表 (Dictionary Tables)
    Country,
    CustomerType,
    Port,
    ShippingCompany,
    FreightForwarder,
    CustomsBroker,
    TruckingCompany,
    ContainerType,
    Warehouse,
    OverseasCompany,
    TruckingPortMapping,
    WarehouseTruckingMapping,
    PortWarehouseMapping,
    DictSchedulingConfig, // ✅ 注册智能排柜配置字典表

    // 业务表 (Business Tables)
    Customer,
    ReplenishmentOrder,
    Container,
    ContainerSku,

    // 流程表 (Process Tables)
    SeaFreight,
    PortOperation,
    TruckingTransport,
    WarehouseOperation,
    EmptyReturn,

    // 飞驼扩展表 (FeiTuo Extension Tables)
    ContainerStatusEvent,
    ContainerLoadingRecord,
    ContainerHoldRecord,
    ContainerCharge,

    // 滞港费扩展表 (Demurrage Extension Tables)
    ExtDemurrageStandard,
    ExtDemurrageRecord,

    // 飞驼导入扩展表 (Feituo Import Extension Tables)
    ExtFeituoImportBatch,
    ExtFeituoImportTable1,
    ExtFeituoImportTable2,
    ExtFeituoPlace,
    ExtFeituoStatusEvent,
    ExtFeituoVessel,

    // 系统审计表 (System Audit Tables)
    SysDataChangeLog,

    // 节假日字典表 (Holiday Dictionary Table) - ✅ Phase 2 Task 2
    DictHoliday,

    // 查验相关表 (Inspection Tables)
    InspectionRecord,
    InspectionEvent,

    // 智能排柜资源占用表 (Intelligent Scheduling Resource Tables)
    ExtWarehouseDailyOccupancy,
    ExtTruckingSlotOccupancy,
    ExtTruckingReturnSlotOccupancy,
    ExtYardDailyOccupancy,
    Yard,

    // 排产历史表 (Scheduling History Table) - ✅ Phase 3
    SchedulingHistory,

    // 流程管理表 (Flow Management Tables)
    FlowDefinition,
    FlowInstance,

    // 智能处理表 (Intelligent Processing Tables)
    ContainerAlert,
    ContainerRiskAssessment
  ],
  synchronize: databaseConfig.synchronize,
  logging: databaseConfig.logging,
  ssl: databaseConfig.ssl,
  poolSize: databaseConfig.poolMax,
  extra: {
    max: databaseConfig.poolMax,
    min: databaseConfig.poolMin
  }
};

export const AppDataSource = new DataSource(dataSourceOptions);
export { Container, ContainerStatusEvent };

/**
 * 初始化数据库连接
 */
export const initDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    logger.info('✅ Database connected successfully', {
      host: databaseConfig.host,
      port: databaseConfig.port,
      database: databaseConfig.database
    });

    // 验证命名策略是否生效
    const namingStrategy = AppDataSource.options.namingStrategy;
    if (namingStrategy) {
      const testColumnName = namingStrategy.columnName('orderNumber', '', []);
      logger.info('✅ Naming strategy verified', {
        testField: 'orderNumber',
        mappedColumn: testColumnName
      });
    }
  } catch (error) {
    logger.error('❌ Database connection failed', error);
    throw error;
  }
};

/**
 * 关闭数据库连接
 */
export const closeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.destroy();
    logger.info('✅ Database connection closed');
  } catch (error) {
    logger.error('❌ Failed to close database connection', error);
    throw error;
  }
};
