import { DemurrageService } from '../src/services/demurrage.service';

// 简单的模拟存储库
class MockRepository {
  findOne = (options: any) => Promise.resolve({
    containerNumber: 'TEST123',
    shippingCompany: 'MAERSK',
    destinationPort: 'Shanghai'
  });
  
  find = (options: any) => Promise.resolve([
    {
      containerNumber: 'TEST123',
      shippingCompanyCode: 'MAERSK',
      destinationPortCode: 'SHA',
      freeDays: 7,
      ratePerDay: 100,
      currency: 'USD',
      freeDaysBasis: '自然日',
      isChargeable: true,
      chargeType: 'demurrage',
      calculationBasis: 'ATA'
    },
    {
      containerNumber: 'TEST123',
      shippingCompanyCode: 'MAERSK',
      destinationPortCode: 'SHA',
      freeDays: 5,
      ratePerDay: 80,
      currency: 'USD',
      freeDaysBasis: '自然日',
      isChargeable: true,
      chargeType: 'detention',
      calculationBasis: 'Pickup'
    }
  ]);
  
  save = (entity: any) => Promise.resolve(entity);
  update = (criteria: any, update: any) => Promise.resolve();
  create = (entity: any) => entity;
}

// 模拟日期工具函数
const mockDateTimeUtils = {
  addDays: (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },
  addWorkingDays: (date: Date, days: number) => {
    const result = new Date(date);
    let remaining = days;
    while (remaining > 0) {
      result.setDate(result.getDate() + 1);
      if (result.getDay() !== 0 && result.getDay() !== 6) {
        remaining--;
      }
    }
    return result;
  },
  daysBetween: (start: Date, end: Date) => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  },
  workingDaysBetween: (start: Date, end: Date) => {
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  },
  toDateOnly: (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
};

// 模拟计算函数
const mockCalculateSingleDemurrage = (startDate: Date, endDate: Date, freeDays: number, ratePerDay: number, tiers: any, currency: string, freeDaysBasis: string) => {
  return {
    totalAmount: 200,
    tierBreakdown: [{
      fromDay: 1,
      toDay: 2,
      days: 2,
      ratePerDay: 100,
      subtotal: 200
    }]
  };
};

// 模拟其他工具函数
const mockFreePeriodUsesWorkingDays = (freeDaysBasis: string) => false;
const mockChargePeriodUsesWorkingDays = (freeDaysBasis: string) => false;
const mockIsDetentionCharge = (standard: any) => standard.chargeType === 'detention';
const mockIsCombinedDemurrageDetention = () => false;
const mockNormalizeTiers = () => null;

// 替换模块
import * as dateTimeUtils from '../src/utils/dateTimeUtils';
import * as demurrageServiceModule from '../src/services/demurrage.service';

// 模拟日期工具函数
(Object as any).assign(dateTimeUtils, mockDateTimeUtils);

// 模拟计算函数
(Object as any).assign(demurrageServiceModule, {
  calculateSingleDemurrage: mockCalculateSingleDemurrage,
  freePeriodUsesWorkingDays: mockFreePeriodUsesWorkingDays,
  chargePeriodUsesWorkingDays: mockChargePeriodUsesWorkingDays,
  isDetentionCharge: mockIsDetentionCharge,
  isCombinedDemurrageDetention: mockIsCombinedDemurrageDetention,
  normalizeTiers: mockNormalizeTiers
});

async function testDemurrageMethods() {
  try {
    console.log('=== Simple Test: Demurrage Prediction Methods ===');

    // 创建模拟存储库
    const containerRepo = new MockRepository();
    const standardRepo = new MockRepository();
    const portOpRepo = new MockRepository();
    const emptyReturnRepo = new MockRepository();
    const truckingRepo = new MockRepository();
    const yardRepo = new MockRepository();
    const configRepo = new MockRepository();

    // 模拟 portOpRepo.findOne
    portOpRepo.findOne = (options: any) => Promise.resolve({
      containerNumber: 'TEST123',
      portType: 'destination',
      portCode: 'SHA',
      ataDestPort: new Date('2026-03-18'),
      etaDestPort: new Date('2026-03-20'),
      lastFreeDate: new Date('2026-03-25')
    });

    // 创建 DemurrageService 实例
    const demurrageService = new DemurrageService(
      containerRepo,
      standardRepo,
      portOpRepo,
      emptyReturnRepo,
      truckingRepo,
      yardRepo,
      configRepo
    );

    console.log('\n1. Testing predictDemurrageForUnloadDate');
    try {
      const result = await demurrageService.predictDemurrageForUnloadDate(
        'TEST123',
        new Date('2026-03-30') // 超出免费期
      );
      console.log('   ✅ Test passed');
      console.log('   Result:', result);
    } catch (error) {
      console.log('   ❌ Test failed:', (error as Error).message);
    }

    console.log('\n2. Testing predictDetentionForReturnDate');
    try {
      const result = await demurrageService.predictDetentionForReturnDate(
        'TEST123',
        new Date('2026-03-30'), // 超出免费期
        new Date('2026-03-20') // 实际提柜日
      );
      console.log('   ✅ Test passed');
      console.log('   Result:', result);
    } catch (error) {
      console.log('   ❌ Test failed:', (error as Error).message);
    }

    console.log('\n3. Testing predictDetentionForReturnDate (no pickup date)');
    try {
      const result = await demurrageService.predictDetentionForReturnDate(
        'TEST123',
        new Date('2026-03-30') // 超出免费期
        // 未提供实际提柜日
      );
      console.log('   ✅ Test passed');
      console.log('   Result:', result);
    } catch (error) {
      console.log('   ❌ Test failed:', (error as Error).message);
    }

    console.log('\n=== Test Completed ===');

  } catch (error) {
    console.error('Error during test:', error);
  }
}

testDemurrageMethods();
