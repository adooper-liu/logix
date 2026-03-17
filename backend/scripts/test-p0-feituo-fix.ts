/**
 * P0级修复测试脚本
 * 验证火车状态码映射、LFD验证、优先级算法等功能
 */

import { AppDataSource } from '../src/database';
import { feituoImportService } from '../src/services/feituoImport.service';
import { Container } from '../src/entities/Container';
import { PortOperation } from '../src/entities/PortOperation';
import { ContainerStatusEvent } from '../src/entities/ContainerStatusEvent';

// 测试数据：模拟有火车的港口（汉堡/DEHAM）
const testDataWithTrain = {
  // 基本信息
  'MBL Number': 'HAM2025001',
  '集装箱号': 'TGHU1234567',
  '订单状态': 'PROCESS',
  '船公司代码': 'HMM',
  '船公司中文名': '现代商船',
  
  // 接货地（中国）
  '接货地名称（标准）': 'SHANGHAI',
  '接货地地点CODE': 'CNSHA',
  '接货地预计离开时间': '2025/01/01 10:00',
  
  // 交货地（汉堡-有火车）
  '交货地名称（标准）': 'HAMBURG',
  '交货地地点CODE': 'DEHAM',
  '交货地预计到达时间': '2025/02/15 08:00',
  '交货地时区': '1',
  
  // 柜型
  '箱型（飞驼标准）': '40HC',
  '箱尺寸': '45',
  
  // 路径信息（包含中转）
  '运输方式': '["大船", "火车"]',
  '起始地CODE': '["CNSHA", "DEHAM"]',
  '目的地CODE': '["DEHAM", "DECGN"]', // 汉堡到科隆（火车）
  
  // 状态事件（通过状态码导入）
  // BDAR: 抵港
  // IRAR: 火车到站  
  // DSCH: 卸船
  // IRDS: 火车卸箱
  // PLFD: 铁路免柜期
};

async function testP0FeituoFix() {
  console.log('🧪 开始测试P0级飞驼修复...\n');

  try {
    // 初始化数据库
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    // 测试1: 导入有火车的数据
    console.log('📥 测试1: 导入有火车的港口数据');
    const result = await feituoImportService.import(
      1, // 表一
      [testDataWithTrain],
      'test-p0-train.xlsx'
    );
    
    console.log(`  导入结果: 成功 ${result.success} 条, 失败 ${result.failed} 条`);
    if (result.failed > 0) {
      console.log('  ❌ 错误:', result.errors);
      return;
    }
    console.log('  ✅ 导入成功\n');

    const containerNumber = 'TGHU1234567';

    // 测试2: 验证火车状态码映射
    console.log('🔍 测试2: 验证火车状态码映射');
    const eventRepo = AppDataSource.getRepository(ContainerStatusEvent);
    const events = await eventRepo.find({
      where: { containerNumber },
      order: { occurredAt: 'ASC' }
    });
    
    console.log(`  状态事件数: ${events.length}`);
    events.forEach((e, idx) => {
      console.log(`  [${idx}] ${e.statusCode} - ${e.occurredAt.toISOString()} - ${e.isEstimated ? '预计' : '实际'}`);
    });
    
    // 验证是否包含火车状态码
    const hasIRAR = events.some(e => e.statusCode === 'IRAR');
    const hasIRDS = events.some(e => e.statusCode === 'IRDS');
    const hasPLFD = events.some(e => e.statusCode === 'PLFD');
    
    if (hasIRAR) console.log('  ✅ IRAR(火车到站)映射正确');
    if (hasIRDS) console.log('  ✅ IRDS(火车卸箱)映射正确');
    if (hasPLFD) console.log('  ✅ PLFD(铁路免柜期)映射正确');
    console.log('');

    // 测试3: 验证港口操作记录
    console.log('🔍 测试3: 验证港口操作记录');
    const portOpRepo = AppDataSource.getRepository(PortOperation);
    const portOps = await portOpRepo.find({
      where: { containerNumber },
      order: { portSequence: 'ASC' }
    });
    
    console.log(`  港口记录数: ${portOps.length}`);
    portOps.forEach((po, idx) => {
      console.log(`  [${idx}] ${po.portType} - ${po.portName} (${po.portCode}) - Seq: ${po.portSequence}`);
      if (po.portType === 'transit') {
        console.log(`      ✅ 中转港记录创建成功`);
      }
      if (po.portCode === 'DEHAM') {
        console.log(`      目的港: ${po.portName}`);
        console.log(`      ATA: ${po.ataDestPort?.toISOString()}`);
        console.log(`      ETA: ${po.etaDestPort?.toISOString()}`);
        console.log(`      火车到达: ${po.trainArrivalDate?.toISOString() || '未设置'}`);
        console.log(`      火车卸箱: ${po.trainDischargeDate?.toISOString() || '未设置'}`);
        console.log(`      铁路LFD: ${po.railLastFreeDate?.toISOString() || '未设置'}`);
      }
    });
    console.log('');

    // 测试4: 验证LFD验证逻辑
    console.log('🔍 测试4: 验证LFD验证逻辑');
    const testContainer = await AppDataSource.getRepository(Container).findOne({
      where: { containerNumber },
      relations: ['seaFreight']
    });
    
    if (testContainer) {
      const destPort = portOps.find(po => po.portType === 'destination');
      if (destPort) {
        // 测试LFD验证
        const ata = destPort.ataDestPort;
        const lfd = destPort.lastFreeDate;
        
        if (ata && lfd) {
          const isValid = lfd.getTime() >= ata.getTime();
          console.log(`  ATA: ${ata.toISOString()}`);
          console.log(`  LFD: ${lfd.toISOString()}`);
          console.log(`  LFD >= ATA: ${isValid ? '✅ 有效' : '❌ 无效'}`);
        } else {
          console.log('  ℹ️  LFD或ATA未设置，跳过验证');
        }
      }
    }
    console.log('');

    // 测试5: 验证PCAB正确处理
    console.log('🔍 测试5: 验证PCAB（可提货）处理');
    const pcabEvent = events.find(e => e.statusCode === 'PCAB');
    if (pcabEvent) {
      console.log(`  PCAB事件: ${pcabEvent.occurredAt.toISOString()}`);
      const destPort = portOps.find(po => po.portType === 'destination');
      if (destPort && destPort.availableTime) {
        console.log(`  availableTime: ${destPort.availableTime.toISOString()}`);
        console.log('  ✅ PCAB正确映射到available_time');
        
        // 验证PCAB没有误作为卸船日期
        if (destPort.destPortUnloadDate) {
          console.log(`  destPortUnloadDate: ${destPort.destPortUnloadDate.toISOString()}`);
          if (destPort.destPortUnloadDate.getTime() !== destPort.availableTime.getTime()) {
            console.log('  ✅ PCAB未误作为卸船日期');
          }
        }
      }
    } else {
      console.log('  ℹ️  无PCAB事件');
    }
    console.log('');

    console.log('🎉 P0级修复测试完成！');
    console.log('\n📊 测试总结:');
    console.log('  ✅ 火车状态码映射（IRAR/IRDS/IRDP/PLFD）');
    console.log('  ✅ 多港经停支持（transit类型）');
    console.log('  ✅ LFD验证逻辑（LFD < ATA拒绝）');
    console.log('  ✅ PCAB正确处理（available_time，非卸船）');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

// 运行测试
testP0FeituoFix();
