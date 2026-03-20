/**
 * 数据库初始化
 * Database Initialization
 */

import { DataSource, DataSourceOptions } from 'typeorm';
import { databaseConfig } from '../config/database.config';
import { SnakeNamingStrategy } from '../config/SnakeNamingStrategy';
import { Country } from '../entities/Country';
import { CustomerType } from '../entities/CustomerType';
import { Customer } from '../entities/Customer';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { Container } from '../entities/Container';
import { ContainerSku } from '../entities/ContainerSku';
import { SeaFreight } from '../entities/SeaFreight';
import { PortOperation } from '../entities/PortOperation';
import { ContainerType } from '../entities/ContainerType';
import { TruckingTransport } from '../entities/TruckingTransport';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { EmptyReturn } from '../entities/EmptyReturn';
import { Warehouse } from '../entities/Warehouse';
import { ContainerStatusEvent } from '../entities/ContainerStatusEvent';
import { ContainerLoadingRecord } from '../entities/ContainerLoadingRecord';
import { ContainerHoldRecord } from '../entities/ContainerHoldRecord';
import { ContainerCharge } from '../entities/ContainerCharge';
import { ExtDemurrageStandard } from '../entities/ExtDemurrageStandard';
import { ExtDemurrageRecord } from '../entities/ExtDemurrageRecord';
import { ExtFeituoImportBatch } from '../entities/ExtFeituoImportBatch';
import { ExtFeituoImportTable1 } from '../entities/ExtFeituoImportTable1';
import { ExtFeituoImportTable2 } from '../entities/ExtFeituoImportTable2';
import { ExtFeituoPlace } from '../entities/ExtFeituoPlace';
import { ExtFeituoStatusEvent } from '../entities/ExtFeituoStatusEvent';
import { SysDataChangeLog } from '../entities/SysDataChangeLog';
import { Port } from '../entities/Port';
import { ShippingCompany } from '../entities/ShippingCompany';
import { FreightForwarder } from '../entities/FreightForwarder';
import { CustomsBroker } from '../entities/CustomsBroker';
import { TruckingCompany } from '../entities/TruckingCompany';
import { OverseasCompany } from '../entities/OverseasCompany';
import { TruckingPortMapping } from '../entities/TruckingPortMapping';
import { WarehouseTruckingMapping } from '../entities/WarehouseTruckingMapping';
import { PortWarehouseMapping } from '../entities/PortWarehouseMapping';
import { ExtWarehouseDailyOccupancy } from '../entities/ExtWarehouseDailyOccupancy';
import { ExtTruckingSlotOccupancy } from '../entities/ExtTruckingSlotOccupancy';
import { ExtYardDailyOccupancy } from '../entities/ExtYardDailyOccupancy';
import { Yard } from '../entities/Yard';
import { InspectionRecord } from '../entities/InspectionRecord';
import { InspectionEvent } from '../entities/InspectionEvent';
import { FlowDefinition } from '../entities/FlowDefinition';
import { FlowInstance } from '../entities/FlowInstance';
import { ContainerAlert } from '../entities/ContainerAlert';
import { ContainerRiskAssessment } from '../entities/ContainerRiskAssessment';
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

    // 系统审计表 (System Audit Tables)
    SysDataChangeLog,
    
    // 查验相关表 (Inspection Tables)
    InspectionRecord,
    InspectionEvent,

    // 智能排柜资源占用表 (Intelligent Scheduling Resource Tables)
    ExtWarehouseDailyOccupancy,
    ExtTruckingSlotOccupancy,
    ExtYardDailyOccupancy,
    Yard,

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
export { ContainerStatusEvent, Container };

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
