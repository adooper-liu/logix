/**
 * 数据库初始化
 * Database Initialization
 */

import { DataSource, DataSourceOptions } from 'typeorm';
import { databaseConfig } from '../config/database.config';
import { Country } from '../entities/Country';
import { CustomerType } from '../entities/CustomerType';
import { Customer } from '../entities/Customer';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { Container } from '../entities/Container';
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
import { Port } from '../entities/Port';
import { ShippingCompany } from '../entities/ShippingCompany';
import { FreightForwarder } from '../entities/FreightForwarder';
import { CustomsBroker } from '../entities/CustomsBroker';
import { TruckingCompany } from '../entities/TruckingCompany';
import { logger } from '../utils/logger';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: databaseConfig.host,
  port: databaseConfig.port,
  username: databaseConfig.username,
  password: databaseConfig.password,
  database: databaseConfig.database,
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

    // 业务表 (Business Tables)
    Customer,
    ReplenishmentOrder,
    Container,

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
    ContainerCharge
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
