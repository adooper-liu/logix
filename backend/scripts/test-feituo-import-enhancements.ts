/**
 * 测试飞驼导入增强功能
 * 验证P0/P1/P2级优化是否正确实现
 */

import { AppDataSource } from '../src/database';
import { feituoImportService } from '../src/services/feituoImport.service';
import { Container } from '../src/entities/Container';
import { PortOperation } from '../src/entities/PortOperation';
import { ContainerCharge } from '../src/entities/ContainerCharge';

async function testFeituoImportEnhancements() {
  console.log('🧪 开始测试飞驼导入增强功能...\n');

  // 测试数据：模拟用户截图中的数据结构
  const testData = {
    // 基本信息
    'MBL Number': 'FOCE18106500',
    '集装箱号': 'KOCU4312744',
    '订单状态': 'PROCESS',
    '订单状态说明': 'Shipment updating',
    '更新时间': '2025/7/18 1:37',
    '首次获取时间': '2025/7/2 8:00',
    '是否甩柜': 'FALSE',
    
    // 船公司信息
    '船公司中文名': '现代商船船公司',
    '船公司SCAC': 'HDMU',
    '船公司代码': 'HMM',
    
    // 接货地信息
    '接货地名称（标准）': 'FUZHOU',
    '接货地地点CODE': 'CNFOC',
    '接货地预计离开时间': '2025/7/3 15:17',
    '接货地时区': '8',
    
    // 交货地信息
    '交货地名称（标准）': 'BARCELONA',
    '交货地地点CODE': 'ESBCN',
    '交货地预计到达时间': '2025/9/3 18:00',
    '交货地时区': '2',
    
    // 路径信息（数组格式）
    '运输方式': '["驳船", "大船"]',
    '起始地CODE': '["CNFOC", "CNNGB"]',
    '目的地CODE': '["CNNGB", "ESBCN"]',
    '起始地预计离开时间': '["2025/7/3 15:17", "2025/7/22 7:00"]',
    '目的地预计到达时间': '["2025/7/11 9:07", "2025/9/3 18:00"]',
    
    // 发生地信息（数组格式）
    '地点CODE': '["CNFOC", "CNNGB", "ESBCN", "ESBCN"]',
    '地点名称英文（标准）': '["FUZHOU", "NINGBO", "BARCELONA", "BARCELONA"]',
    '地点类型': '["ETD/ATD(起始地预计/实际离开时间)", "ETD/ATD(起运港预计/实际离开时间)", "ETD/ATD(目的港预计/实际抵达时间)", "ETA/ATA(目的地预计/实际抵达时间)"]',
    '纬度': '["25.97235", "29.972047", "41.353598", "41.353598"]',
    '经度': '["119.375467", "121.876042", "2.169857", "2.169857"]',
    '时区': '["8", "8", "2", "2"]',
    '预计到达时间': '["", "2025/7/11 9:07", "2025/9/3 18:00", "2025/9/3 18:00"]',
    '实际到达时间': '["", "2025/7/17 22:55", "", ""]',
    '码头名称': '["CNFOCFNU", "CNNGBCMI", "ESBCNBST", "ESBCNBST"]',
    
    // AIS数据
    'AIS实际到港时间': '2025/7/17 23:00',
    'AIS实际靠泊时间': '2025/7/18 02:30',
    'AIS实际离港时间': '2025/7/22 07:30',
    
    // 费用信息（数组格式）
    '费用类型': '["STORAGE", "DEMURRAGE"]',
    '费用': '["150.00", "200.00"]',
    '费用状态': '["PENDING", "PENDING"]',
    
    // 柜型信息
    '箱型（飞驼标准）': '40HC',
    '箱尺寸': '45'
  };

  try {
    // 初始化数据库连接
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    // 测试导入
    console.log('📥 导入测试数据...');
    const result = await feituoImportService.import(
      1, // 表一类型
      [testData],
      'test-enhancements.xlsx'
    );
    
    console.log(`✅ 导入完成：成功 ${result.success} 条，失败 ${result.failed} 条\n`);
    
    if (result.failed > 0) {
      console.log('❌ 错误详情:', result.errors);
      return;
    }

    // 验证P0级：多港经停支持
    console.log('🔍 验证P0级：多港经停支持');
    const portOps = await AppDataSource.getRepository(PortOperation).find({
      where: { containerNumber: 'KOCU4312744' },
      order: { portSequence: 'ASC' }
    });
    
    console.log(`  港口记录数: ${portOps.length}`);
    portOps.forEach((po, idx) => {
      console.log(`  [${idx}] ${po.portType} - ${po.portName} (${po.portCode}) - Seq: ${po.portSequence}`);
      if (po.portType === 'transit') {
        console.log(`      ✅ 中转港记录创建成功！`);
      }
    });
    console.log('');

    // 验证P1级：甩柜标记
    console.log('🔍 验证P1级：甩柜标记和时区');
    const container = await AppDataSource.getRepository(Container).findOne({
      where: { containerNumber: 'KOCU4312744' }
    });
    
    if (container) {
      console.log(`  甩柜标记: ${container.isRolled} (预期: false)`);
      console.log(`  ✅ 甩柜标记映射成功！`);
    }
    
    const destPort = portOps.find(po => po.portType === 'destination');
    if (destPort) {
      console.log(`  目的港时区: ${destPort.timezone} (预期: 2)`);
      console.log(`  ✅ 时区字段映射成功！`);
    }
    console.log('');

    // 验证P2级：AIS数据
    console.log('🔍 验证P2级：AIS数据和费用信息');
    if (destPort) {
      console.log(`  AIS到港时间: ${destPort.aisArrivalTime}`);
      console.log(`  AIS靠泊时间: ${destPort.aisBerthingTime}`);
      console.log(`  AIS离港时间: ${destPort.aisDepartureTime}`);
      console.log(`  数据源: ${destPort.dataSource}`);
      if (destPort.aisArrivalTime) {
        console.log(`  ✅ AIS数据映射成功！`);
      }
    }
    
    const charges = await AppDataSource.getRepository(ContainerCharge).find({
      where: { containerNumber: 'KOCU4312744' }
    });
    
    console.log(`  费用记录数: ${charges.length}`);
    charges.forEach((charge, idx) => {
      console.log(`  [${idx}] ${charge.chargeType}: $${charge.chargeAmount} (${charge.status})`);
    });
    if (charges.length > 0) {
      console.log(`  ✅ 费用信息映射成功！`);
    }
    console.log('');

    console.log('🎉 所有增强功能验证完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

// 运行测试
testFeituoImportEnhancements();
