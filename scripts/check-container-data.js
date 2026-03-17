const { AppDataSource } = require('../backend/dist/database');
const { Container } = require('../backend/dist/entities/Container');
const { PortOperation } = require('../backend/dist/entities/PortOperation');
const { TruckingTransport } = require('../backend/dist/entities/TruckingTransport');

async function checkContainerData(containerNumber) {
  console.log(`\n========== 查询货柜: ${containerNumber} ==========\n`);
  
  await AppDataSource.initialize();
  
  try {
    // 查询港口操作记录
    console.log('1. 港口操作记录 (process_port_operations):');
    const portOps = await AppDataSource.getRepository(PortOperation).find({
      where: { containerNumber },
      order: { portSequence: 'ASC' }
    });
    
    if (portOps.length === 0) {
      console.log('   ❌ 无港口操作记录');
    } else {
      portOps.forEach((po, i) => {
        console.log(`   [${i + 1}] port_type: ${po.portType}, port_sequence: ${po.portSequence}`);
        console.log(`       port_name: ${po.portName}, port_code: ${po.portCode}`);
        console.log(`       ata_dest_port: ${po.ataDestPort}`);
        console.log(`       dest_port_unload_date: ${po.destPortUnloadDate}`);
        console.log(`       available_time: ${po.availableTime}`);
        console.log(`       gate_out_time: ${po.gateOutTime}`);
        console.log(`       last_free_date: ${po.lastFreeDate}`);
        console.log('');
      });
    }
    
    // 查询拖卡运输记录
    console.log('2. 拖卡运输记录 (process_trucking_transport):');
    const trucking = await AppDataSource.getRepository(TruckingTransport).find({
      where: { containerNumber }
    });
    
    if (trucking.length === 0) {
      console.log('   ❌ 无拖卡运输记录');
    } else {
      trucking.forEach((tt, i) => {
        console.log(`   [${i + 1}] pickup_date: ${tt.pickupDate}`);
        console.log(`       gate_out_time: ${tt.gateOutTime}`);
        console.log('');
      });
    }
    
    // 分析抵港和提柜时间
    const destPortOp = portOps.find(po => po.portType === 'destination');
    const ataDestPort = destPortOp?.ataDestPort;
    const gateOutTime = destPortOp?.gateOutTime || trucking[0]?.gateOutTime || trucking[0]?.pickupDate;
    
    console.log('3. 时间分析:');
    console.log(`   抵港时间 (ATA): ${ataDestPort}`);
    console.log(`   提柜时间 (Gate Out): ${gateOutTime}`);
    
    if (ataDestPort && gateOutTime) {
      const ataTime = new Date(ataDestPort).getTime();
      const gateTime = new Date(gateOutTime).getTime();
      const diffHours = (gateTime - ataTime) / (1000 * 60 * 60);
      
      console.log(`   时间差: ${diffHours.toFixed(2)} 小时`);
      
      if (gateTime <= ataTime) {
        console.log(`   ⚠️  警告: 提柜时间不晚于抵港时间！`);
      } else {
        console.log(`   ✅ 正常: 提柜时间晚于抵港时间`);
      }
    }
    
  } catch (error) {
    console.error('查询错误:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

// 从命令行参数获取 containerNumber
const containerNumber = process.argv[2];
if (!containerNumber) {
  console.log('用法: node scripts/check-container-data.js <container_number>');
  process.exit(1);
}

checkContainerData(containerNumber).catch(console.error);
