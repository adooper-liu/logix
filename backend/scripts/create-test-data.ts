import { AppDataSource, initDatabase, closeDatabase } from '../src/database';
import { Container } from '../src/entities/Container';
import { ExtDemurrageStandard } from '../src/entities/ExtDemurrageStandard';
import { PortOperation } from '../src/entities/PortOperation';
import { EmptyReturn } from '../src/entities/EmptyReturn';

async function createTestData() {
  try {
    await initDatabase();
    console.log('Database connected successfully');

    // 创建测试货柜
    const containerRepo = AppDataSource.getRepository(Container);
    const testContainer = containerRepo.create({
      containerNumber: 'TEST123',
      containerType: '20GP',
      status: 'at_port',
      shippingCompany: 'MAERSK',
      destinationPort: 'Shanghai',
      estimatedArrivalDate: new Date('2026-03-20'),
      actualArrivalDate: new Date('2026-03-18'),
      lastFreeDate: new Date('2026-03-25'),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await containerRepo.save(testContainer);
    console.log('Test container created:', testContainer.containerNumber);

    // 创建测试滞港费标准
    const standardRepo = AppDataSource.getRepository(ExtDemurrageStandard);
    const demurrageStandard = standardRepo.create({
      containerNumber: 'TEST123',
      shippingCompanyCode: 'MAERSK',
      destinationPortCode: 'SHA',
      freeDays: 7,
      ratePerDay: 100,
      currency: 'USD',
      freeDaysBasis: '自然日',
      isChargeable: true,
      chargeType: 'demurrage',
      calculationBasis: 'ATA',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await standardRepo.save(demurrageStandard);
    console.log('Demurrage standard created');

    // 创建测试滞箱费标准
    const detentionStandard = standardRepo.create({
      containerNumber: 'TEST123',
      shippingCompanyCode: 'MAERSK',
      destinationPortCode: 'SHA',
      freeDays: 5,
      ratePerDay: 80,
      currency: 'USD',
      freeDaysBasis: '自然日',
      isChargeable: true,
      chargeType: 'detention',
      calculationBasis: 'Pickup',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await standardRepo.save(detentionStandard);
    console.log('Detention standard created');

    // 创建测试港口操作记录
    const portOpRepo = AppDataSource.getRepository(PortOperation);
    const portOperation = portOpRepo.create({
      containerNumber: 'TEST123',
      portType: 'destination',
      portCode: 'SHA',
      portName: 'Shanghai',
      ataDestPort: new Date('2026-03-18'),
      etaDestPort: new Date('2026-03-20'),
      lastFreeDate: new Date('2026-03-25'),
      lastFreeDateMode: 'actual',
      portSequence: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await portOpRepo.save(portOperation);
    console.log('Port operation created');

    // 创建测试空箱返回记录
    const emptyReturnRepo = AppDataSource.getRepository(EmptyReturn);
    const emptyReturn = emptyReturnRepo.create({
      containerNumber: 'TEST123',
      lastReturnDate: new Date('2026-03-30'),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await emptyReturnRepo.save(emptyReturn);
    console.log('Empty return record created');

    console.log('\n=== Test data creation completed ===');
    console.log('Container:', testContainer.containerNumber);
    console.log('Demurrage standard:', demurrageStandard.id);
    console.log('Detention standard:', detentionStandard.id);
    console.log('Port operation:', portOperation.id);
    console.log('Empty return:', emptyReturn.id);

    await closeDatabase();

  } catch (error) {
    console.error('Error creating test data:', error);
  }
}

createTestData();
