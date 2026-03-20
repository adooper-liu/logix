import { DemurrageService } from '../src/services/demurrage.service';
import { getConnection } from '../src/database';
import { Container } from '../src/entities/Container';
import { ExtDemurrageStandard } from '../src/entities/ExtDemurrageStandard';
import { PortOperation } from '../src/entities/PortOperation';

async function testPredictionMethods() {
  try {
    // 初始化数据库连接
    const connection = await getConnection();
    console.log('Database connected successfully');

    // 模拟 demurrageService
    const demurrageService = new DemurrageService(
      connection.getRepository(Container),
      connection.getRepository(ExtDemurrageStandard),
      connection.getRepository(PortOperation),
      connection.getRepository(require('../src/entities/EmptyReturn').EmptyReturn),
      connection.getRepository(require('../src/entities/TruckingTransport').TruckingTransport),
      connection.getRepository(require('../src/entities/ExtYardDailyOccupancy').ExtYardDailyOccupancy),
      connection.getRepository(require('../src/entities/DictSchedulingConfig').DictSchedulingConfig)
    );

    console.log('DemurrageService initialized');

    // 测试 predictDemurrageForUnloadDate 方法
    console.log('\n=== Testing predictDemurrageForUnloadDate ===');
    try {
      const containerNumber = 'TEST123';
      const proposedUnloadDate = new Date();
      proposedUnloadDate.setDate(proposedUnloadDate.getDate() + 10); // 10 天后

      const result = await demurrageService.predictDemurrageForUnloadDate(containerNumber, proposedUnloadDate);
      console.log('Prediction result:', result);
    } catch (error) {
      console.log('Expected error (no test data):', error.message);
    }

    // 测试 predictDetentionForReturnDate 方法
    console.log('\n=== Testing predictDetentionForReturnDate ===');
    try {
      const containerNumber = 'TEST123';
      const proposedReturnDate = new Date();
      proposedReturnDate.setDate(proposedReturnDate.getDate() + 15); // 15 天后

      const result = await demurrageService.predictDetentionForReturnDate(containerNumber, proposedReturnDate);
      console.log('Prediction result:', result);
    } catch (error) {
      console.log('Expected error (no test data):', error.message);
    }

    console.log('\n=== Test completed ===');
    await connection.close();

  } catch (error) {
    console.error('Error during test:', error);
  }
}

testPredictionMethods();
