/**
 * 数据导入验证脚本
 * 用于验证导入的Excel数据是否正确存储到数据库
 *
 * 使用方法:
 * npx tsx scripts/verify-imported-data.ts <containerNumber|orderNumber>
 *
 * 示例:
 * npx tsx scripts/verify-imported-data.ts FANU3376528
 * npx tsx scripts/verify-imported-data.ts 24DSC4914
 */

import { AppDataSource } from '../src/database';
import {
  Container,
  ReplenishmentOrder,
  SeaFreight,
  PortOperation,
  TruckingTransport,
  WarehouseOperation,
  EmptyReturn
} from '../src/entities';
import { logger } from '../src/utils/logger';

interface VerificationResult {
  success: boolean;
  containerNumber?: string;
  orderNumber?: string;
  tables: {
    replenishment_orders?: any;
    containers?: any;
    sea_freight?: any;
    port_operations?: any;
    trucking_transports?: any;
    warehouse_operations?: any;
    empty_returns?: any;
  };
  issues: string[];
  summary: {
    totalTables: number;
    foundTables: number;
    missingFields: string[];
  };
}

/**
 * 验证单个货柜的数据
 */
async function verifyContainerData(containerNumber: string): Promise<VerificationResult> {
  const result: VerificationResult = {
    success: true,
    containerNumber,
    tables: {},
    issues: [],
    summary: {
      totalTables: 7,
      foundTables: 0,
      missingFields: []
    }
  };

  try {
    // 1. 查询货柜信息
    const container = await AppDataSource.getRepository(Container).findOne({
      where: { containerNumber }
    });

    if (container) {
      result.tables.containers = maskContainerData(container);
      result.summary.foundTables++;

      // 查询关联的备货单
      if (container.orderNumber) {
        const order = await AppDataSource.getRepository(ReplenishmentOrder).findOne({
          where: { orderNumber: container.orderNumber }
        });

        if (order) {
          result.tables.replenishment_orders = maskOrderData(order);
          result.summary.foundTables++;
          result.orderNumber = order.orderNumber;
        } else {
          result.issues.push(`备货单不存在: ${container.orderNumber}`);
          result.success = false;
        }
      }
    } else {
      result.issues.push(`货柜不存在: ${containerNumber}`);
      result.success = false;
    }

    // 2. 查询海运信息
    const seaFreight = await AppDataSource.getRepository(SeaFreight).findOne({
      where: { containerNumber }
    });

    if (seaFreight) {
      result.tables.sea_freight = maskSeaFreightData(seaFreight);
      result.summary.foundTables++;
    } else {
      result.issues.push('海运信息缺失');
      result.success = false;
    }

    // 3. 查询港口操作
    const portOp = await AppDataSource.getRepository(PortOperation).findOne({
      where: { containerNumber }
    });

    if (portOp) {
      result.tables.port_operations = maskPortOperationData(portOp);
      result.summary.foundTables++;
    } else {
      result.issues.push('港口操作信息缺失');
      result.success = false;
    }

    // 4. 查询拖车运输
    const trucking = await AppDataSource.getRepository(TruckingTransport).findOne({
      where: { containerNumber }
    });

    if (trucking) {
      result.tables.trucking_transports = maskTruckingData(trucking);
      result.summary.foundTables++;
    } else {
      result.issues.push('拖车运输信息缺失');
      result.success = false;
    }

    // 5. 查询仓库操作
    const warehouse = await AppDataSource.getRepository(WarehouseOperation).findOne({
      where: { containerNumber }
    });

    if (warehouse) {
      result.tables.warehouse_operations = maskWarehouseData(warehouse);
      result.summary.foundTables++;
    } else {
      result.issues.push('仓库操作信息缺失');
      result.success = false;
    }

    // 6. 查询还空箱
    const emptyReturn = await AppDataSource.getRepository(EmptyReturn).findOne({
      where: { containerNumber }
    });

    if (emptyReturn) {
      result.tables.empty_returns = maskEmptyReturnData(emptyReturn);
      result.summary.foundTables++;
    } else {
      result.issues.push('还空箱信息缺失');
      result.success = false;
    }

    // 7. 检查缺失的关键字段
    checkMissingFields(result);

  } catch (error) {
    result.success = false;
    result.issues.push(`查询失败: ${error}`);
  }

  return result;
}

/**
 * 验证备货单的数据
 */
async function verifyOrderData(orderNumber: string): Promise<VerificationResult> {
  const result: VerificationResult = {
    success: true,
    orderNumber,
    tables: {},
    issues: [],
    summary: {
      totalTables: 1,
      foundTables: 0,
      missingFields: []
    }
  };

  try {
    const order = await AppDataSource.getRepository(ReplenishmentOrder).findOne({
      where: { orderNumber }
    });

    if (order) {
      result.tables.replenishment_orders = maskOrderData(order);
      result.summary.foundTables++;
    } else {
      result.issues.push(`备货单不存在: ${orderNumber}`);
      result.success = false;
    }

  } catch (error) {
    result.success = false;
    result.issues.push(`查询失败: ${error}`);
  }

  return result;
}

/**
 * 检查缺失的关键字段
 */
function checkMissingFields(result: VerificationResult) {
  const { containers, sea_freight, port_operations, trucking_transports, warehouse_operations, empty_returns } = result.tables;

  if (containers) {
    if (!containers.containerTypeCode) result.summary.missingFields.push('货柜类型');
    if (!containers.logisticsStatus) result.summary.missingFields.push('物流状态');
  }

  if (sea_freight) {
    if (!sea_freight.vesselName) result.summary.missingFields.push('船名');
    if (!sea_freight.voyageNumber) result.summary.missingFields.push('航次');
    if (!sea_freight.eta) result.summary.missingFields.push('预计到港日期');
  }

  if (port_operations) {
    if (!port_operations.ataDestPort) result.summary.missingFields.push('目的港到达日期');
    if (!port_operations.customsStatus) result.summary.missingFields.push('清关状态');
  }
}

/**
 * 格式化输出验证结果
 */
function formatVerificationResult(result: VerificationResult): void {
  console.log('\n' + '='.repeat(80));
  console.log('数据验证结果');
  console.log('='.repeat(80));

  console.log('\n✅ 已正确存在的数据：\n');

  // 备货单
  if (result.tables.replenishment_orders) {
    const order = result.tables.replenishment_orders;
    console.log('备货单 (biz_replenishment_orders):');
    console.log(`  订单号: ${order.orderNumber} ✓`);
    if (order.sellToCountry) console.log(`  销往国家: ${order.sellToCountry} ✓`);
    if (order.customerName) console.log(`  客户名称: ${order.customerName} ✓`);
    if (order.orderStatus) console.log(`  备货单状态: ${order.orderStatus} ✓`);
    if (order.totalBoxes) console.log(`  箱数合计: ${order.totalBoxes} ✓`);
    if (order.totalCbm) console.log(`  体积合计: ${order.totalCbm} ✓`);
    if (order.totalGrossWeight) console.log(`  毛重合计: ${order.totalGrossWeight} ✓`);
    if (order.shipmentTotalValue) console.log(`  出运总价: ${order.shipmentTotalValue} ✓`);
    if (order.fobAmount) console.log(`  议付金额FOB: ${order.fobAmount} ✓`);
    if (order.cifAmount) console.log(`  议付金额CIF: ${order.cifAmount} ✓`);
    if (order.negotiationAmount) console.log(`  议付金额: ${order.negotiationAmount} ✓`);
    console.log();
  }

  // 货柜
  if (result.tables.containers) {
    const container = result.tables.containers;
    console.log('货柜 (biz_containers):');
    console.log(`  集装箱号: ${container.containerNumber} ✓`);
    if (container.containerTypeCode) console.log(`  柜型: ${container.containerTypeCode} ✓`);
    if (container.logisticsStatus) console.log(`  物流状态: ${container.logisticsStatus} ✓`);
    if (container.inspectionRequired !== undefined) {
      console.log(`  是否查验: ${container.inspectionRequired ? '是' : '否'} ✓`);
    }
    if (container.isUnboxing !== undefined) {
      console.log(`  是否开箱: ${container.isUnboxing ? '是' : '否'} ✓`);
    }
    console.log();
  }

  // 海运
  if (result.tables.sea_freight) {
    const sea = result.tables.sea_freight;
    console.log('海运信息 (process_sea_freight):');
    if (sea.billOfLadingNumber) console.log(`  提单号: ${sea.billOfLadingNumber} ✓`);
    if (sea.vesselName) console.log(`  船名: ${sea.vesselName} ✓`);
    if (sea.voyageNumber) console.log(`  航次: ${sea.voyageNumber} ✓`);
    if (sea.shippingCompanyId) console.log(`  船公司: ${sea.shippingCompanyId} ✓`);
    if (sea.portOfLoading) console.log(`  起运港: ${sea.portOfLoading} ✓`);
    if (sea.portOfDischarge) console.log(`  目的港: ${sea.portOfDischarge} ✓`);
    if (sea.eta) console.log(`  预计到港日期: ${formatDate(sea.eta)} ✓`);
    if (sea.ata) console.log(`  实际到港日期: ${formatDate(sea.ata)} ✓`);
    console.log();
  }

  // 港口操作
  if (result.tables.port_operations) {
    const port = result.tables.port_operations;
    console.log('港口操作 (process_port_operations):');
    if (port.portName) console.log(`  目的港码头: ${port.portName} ✓`);
    if (port.etaDestPort) console.log(`  预计到港日期: ${formatDate(port.etaDestPort)} ✓`);
    if (port.ataDestPort) console.log(`  目的港到达日期: ${formatDate(port.ataDestPort)} ✓`);
    if (port.customsStatus) console.log(`  清关状态: ${port.customsStatus} ✓`);
    console.log();
  }

  // 拖车
  if (result.tables.trucking_transports) {
    const trucking = result.tables.trucking_transports;
    console.log('拖车运输 (process_trucking_transports):');
    if (trucking.carrierCompany) console.log(`  目的港卡车: ${trucking.carrierCompany} ✓`);
    if (trucking.plannedPickupDate) console.log(`  计划提柜日期: ${formatDate(trucking.plannedPickupDate)} ✓`);
    if (trucking.pickupDate) console.log(`  提柜日期: ${formatDate(trucking.pickupDate)} ✓`);
    if (trucking.deliveryDate) console.log(`  送仓日期: ${formatDate(trucking.deliveryDate)} ✓`);
    console.log();
  }

  // 仓库
  if (result.tables.warehouse_operations) {
    const warehouse = result.tables.warehouse_operations;
    console.log('仓库操作 (process_warehouse_operations):');
    if (warehouse.plannedWarehouse) console.log(`  计划仓库: ${warehouse.plannedWarehouse} ✓`);
    if (warehouse.actualWarehouse) console.log(`  实际仓库: ${warehouse.actualWarehouse} ✓`);
    if (warehouse.unloadDate) console.log(`  卸柜日期: ${formatDate(warehouse.unloadDate)} ✓`);
    if (warehouse.warehouseArrivalDate) console.log(`  入库日期: ${formatDate(warehouse.warehouseArrivalDate)} ✓`);
    if (warehouse.wmsStatus) console.log(`  WMS状态: ${warehouse.wmsStatus} ✓`);
    console.log();
  }

  // 还空箱
  if (result.tables.empty_returns) {
    const empty = result.tables.empty_returns;
    console.log('还空箱 (process_empty_returns):');
    if (empty.plannedReturnDate) console.log(`  计划还箱日期: ${formatDate(empty.plannedReturnDate)} ✓`);
    if (empty.returnTime) console.log(`  还箱日期: ${formatDate(empty.returnTime)} ✓`);
    console.log();
  }

  // 问题汇总
  if (result.issues.length > 0) {
    console.log('❌ 缺失或错误的数据：\n');
    result.issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });
    console.log();
  }

  // 统计信息
  console.log('统计信息：');
  console.log(`  总表数: ${result.summary.totalTables}`);
  console.log(`  已找到: ${result.summary.foundTables}`);
  console.log(`  缺失率: ${((1 - result.summary.foundTables / result.summary.totalTables) * 100).toFixed(1)}%`);

  if (result.summary.missingFields.length > 0) {
    console.log(`  缺失关键字段: ${result.summary.missingFields.join(', ')}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log(`验证结果: ${result.success ? '✅ 通过' : '❌ 失败'}`);
  console.log('='.repeat(80) + '\n');
}

/**
 * 脱敏货柜数据
 */
function maskContainerData(data: any): any {
  return {
    containerNumber: data.containerNumber,
    containerTypeCode: data.containerTypeCode,
    logisticsStatus: data.logisticsStatus,
    inspectionRequired: data.inspectionRequired,
    isUnboxing: data.isUnboxing
  };
}

/**
 * 脱敏备货单数据
 */
function maskOrderData(data: any): any {
  return {
    orderNumber: data.orderNumber,
    mainOrderNumber: data.mainOrderNumber,
    sellToCountry: data.sellToCountry,
    customerName: data.customerName,
    orderStatus: data.orderStatus,
    totalBoxes: data.totalBoxes,
    totalCbm: data.totalCbm,
    totalGrossWeight: data.totalGrossWeight,
    shipmentTotalValue: data.shipmentTotalValue,
    fobAmount: data.fobAmount,
    cifAmount: data.cifAmount,
    negotiationAmount: data.negotiationAmount
  };
}

/**
 * 脱敏海运数据
 */
function maskSeaFreightData(data: any): any {
  return {
    containerNumber: data.containerNumber,
    billOfLadingNumber: data.billOfLadingNumber,
    vesselName: data.vesselName,
    voyageNumber: data.voyageNumber,
    shippingCompanyId: data.shippingCompanyId,
    portOfLoading: data.portOfLoading,
    portOfDischarge: data.portOfDischarge,
    eta: data.eta,
    ata: data.ata,
    freightCurrency: data.freightCurrency,
    standardFreightAmount: data.standardFreightAmount
  };
}

/**
 * 脱敏港口操作数据
 */
function maskPortOperationData(data: any): any {
  return {
    containerNumber: data.containerNumber,
    portCode: data.portCode,
    portName: data.portName,
    etaDestPort: data.etaDestPort,
    ataDestPort: data.ataDestPort,
    customsStatus: data.customsStatus
  };
}

/**
 * 脱敏拖车数据
 */
function maskTruckingData(data: any): any {
  return {
    containerNumber: data.containerNumber,
    carrierCompany: data.carrierCompany,
    plannedPickupDate: data.plannedPickupDate,
    pickupDate: data.pickupDate,
    deliveryDate: data.deliveryDate
  };
}

/**
 * 脱敏仓库数据
 */
function maskWarehouseData(data: any): any {
  return {
    containerNumber: data.containerNumber,
    plannedWarehouse: data.plannedWarehouse,
    actualWarehouse: data.actualWarehouse,
    unloadDate: data.unloadDate,
    warehouseArrivalDate: data.warehouseArrivalDate,
    wmsStatus: data.wmsStatus,
    ebsStatus: data.ebsStatus
  };
}

/**
 * 脱敏还空箱数据
 */
function maskEmptyReturnData(data: any): any {
  return {
    containerNumber: data.containerNumber,
    plannedReturnDate: data.plannedReturnDate,
    returnTime: data.returnTime,
    returnTerminalName: data.returnTerminalName
  };
}

/**
 * 格式化日期
 */
function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('使用方法:');
    console.log('  npx tsx scripts/verify-imported-data.ts <containerNumber|orderNumber>');
    console.log('');
    console.log('示例:');
    console.log('  npx tsx scripts/verify-imported-data.ts FANU3376528');
    console.log('  npx tsx scripts/verify-imported-data.ts 24DSC4914');
    process.exit(1);
  }

  const identifier = args[0];

  try {
    // 初始化数据库连接
    await AppDataSource.initialize();
    logger.info('数据库连接成功');

    let result: VerificationResult;

    // 判断是货柜号还是订单号
    if (identifier.match(/^[A-Z]{4}\d{7}$/i)) {
      // 货柜号格式: 4字母+7数字
      result = await verifyContainerData(identifier);
    } else {
      // 订单号
      result = await verifyOrderData(identifier);
    }

    // 输出验证结果
    formatVerificationResult(result);

    // 根据验证结果设置退出码
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    logger.error('验证失败:', error);
    console.error('错误:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

// 运行主函数
main();
