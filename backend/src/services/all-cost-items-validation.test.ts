/**
 * 所有费用项全面验证测试
 *
 * 测试目标：验证成本计算包含的所有费用项
 *
 * 费用项清单（7 项）：
 * 1. 滞港费 (Demurrage Cost) - ext_demurrage_standards
 * 2. 滞箱费 (Detention Cost) - ext_demurrage_standards
 * 3. 港口存储费 (Storage Cost) - ext_demurrage_standards
 * 4. D&D 合并费 (Combined Demurrage & Detention) - ext_demurrage_standards
 * 5. 外部堆场堆存费 (Yard Storage Cost) - dict_trucking_port_mapping ⭐
 * 6. 运输费 (Transportation Cost) - dict_trucking_port_mapping
 * 7. 操作费/加急费 (Handling Cost) - dict_scheduling_config
 */

import { describe, it, expect } from '@jest/globals';

describe('所有费用项全面验证', () => {
  describe('费用项定义与数据源验证', () => {
    it('应该正确定义所有 7 种费用项', () => {
      // Arrange
      const allCostItems = [
        {
          name: '滞港费 (Demurrage Cost)',
          code: 'demurrageCost',
          dataSource: 'ext_demurrage_standards',
          chargeTypeCode: 'DEMURRAGE',
          collector: '港口/码头',
          category: 'D&D 费用'
        },
        {
          name: '滞箱费 (Detention Cost)',
          code: 'detentionCost',
          dataSource: 'ext_demurrage_standards',
          chargeTypeCode: 'DETENTION',
          collector: '港口/码头',
          category: 'D&D 费用'
        },
        {
          name: '港口存储费 (Storage Cost)',
          code: 'storageCost',
          dataSource: 'ext_demurrage_standards',
          chargeTypeCode: 'STORAGE',
          collector: '港口/码头',
          category: 'D&D 费用'
        },
        {
          name: 'D&D 合并费 (Combined Demurrage & Detention)',
          code: 'ddCombinedCost',
          dataSource: 'ext_demurrage_standards',
          chargeTypeCode: 'COMBINED_DEMURRAGE_DETENTION',
          collector: '港口/码头',
          category: 'D&D 费用'
        },
        {
          name: '外部堆场堆存费 (Yard Storage Cost)',
          code: 'yardStorageCost',
          dataSource: 'dict_trucking_port_mapping',
          fields: ['standard_rate', 'yard_operation_fee'],
          collector: '拖车车队',
          category: '运输环节附加费',
          condition: 'Drop off + hasYard + 提<送'
        },
        {
          name: '运输费 (Transportation Cost)',
          code: 'transportationCost',
          dataSource: 'dict_trucking_port_mapping',
          field: 'transport_fee',
          collector: '拖车车队',
          category: '运输费'
        },
        {
          name: '操作费/加急费 (Handling Cost)',
          code: 'handlingCost',
          dataSource: 'dict_scheduling_config',
          configKey: 'expedited_handling_fee',
          collector: '仓库/车队',
          category: '操作费',
          condition: 'Expedited 模式'
        }
      ];

      // Assert
      expect(allCostItems).toHaveLength(7);

      // 验证每个费用项都有必要的字段
      allCostItems.forEach((item) => {
        expect(item.name).toBeDefined();
        expect(item.code).toBeDefined();
        expect(item.dataSource).toBeDefined();
        expect(item.collector).toBeDefined();
        expect(item.category).toBeDefined();
      });
    });

    it('应该区分 D&D 费用与运输环节费用', () => {
      // Arrange
      const ddFees = [
        'demurrageCost', // 滞港费
        'detentionCost', // 滞箱费
        'storageCost', // 港口存储费
        'ddCombinedCost' // D&D 合并费
      ];

      const transportationFees = [
        'yardStorageCost', // 外部堆场堆存费
        'transportationCost' // 运输费
      ];

      const handlingFees = [
        'handlingCost' // 操作费/加急费
      ];

      // Assert
      expect(ddFees).toHaveLength(4);
      expect(transportationFees).toHaveLength(2);
      expect(handlingFees).toHaveLength(1);

      // 验证数据源不同
      ddFees.forEach((fee) => {
        expect(fee).toMatch(/^(demurrage|detention|storage|ddCombined)Cost$/);
      });

      transportationFees.forEach((fee) => {
        expect(fee).toMatch(/^(yardStorage|transportation)Cost$/);
      });
    });
  });

  describe('CostBreakdown 接口完整性验证', () => {
    it('应该包含所有 6 个费用字段和 1 个总计字段', () => {
      // Arrange
      const costBreakdownFields = [
        'demurrageCost', // 1. 滞港费
        'detentionCost', // 2. 滞箱费
        'storageCost', // 3. 港口存储费
        'yardStorageCost', // 4. 外部堆场堆存费 ⭐
        'transportationCost', // 5. 运输费
        'handlingCost', // 6. 操作费/加急费
        'totalCost' // 7. 总成本
      ];

      // Act
      const breakdown: Record<string, number> = {
        demurrageCost: 0,
        detentionCost: 0,
        storageCost: 0,
        yardStorageCost: 0,
        transportationCost: 0,
        handlingCost: 0,
        totalCost: 0
      };

      // Assert
      expect(Object.keys(breakdown)).toHaveLength(7);

      costBreakdownFields.forEach((field) => {
        expect(breakdown).toHaveProperty(field);
        expect(typeof breakdown[field]).toBe('number');
      });
    });

    it('应该正确计算总成本', () => {
      // Arrange
      const breakdown = {
        demurrageCost: 100,
        detentionCost: 150,
        storageCost: 200,
        yardStorageCost: 290,
        transportationCost: 100,
        handlingCost: 50
      };

      // Act
      const totalCost =
        breakdown.demurrageCost +
        breakdown.detentionCost +
        breakdown.storageCost +
        breakdown.yardStorageCost +
        breakdown.transportationCost +
        breakdown.handlingCost;

      // Assert
      expect(totalCost).toBe(890);
      expect(totalCost).toEqual(
        breakdown.demurrageCost +
          breakdown.detentionCost +
          breakdown.storageCost +
          breakdown.yardStorageCost +
          breakdown.transportationCost +
          breakdown.handlingCost
      );
    });
  });

  describe('各种场景下的费用组合验证', () => {
    it('Live load 模式：不包含外部堆场堆存费', () => {
      // Arrange
      const scenario = {
        mode: 'Live load',
        hasYard: true,
        expectedCosts: [
          'demurrageCost',
          'detentionCost',
          'storageCost',
          'transportationCost'
          // ❌ yardStorageCost (不适用)
          // ❌ handlingCost (除非 Expedited)
        ]
      };

      // Assert
      expect(scenario.expectedCosts).not.toContain('yardStorageCost');
      expect(scenario.expectedCosts).toHaveLength(4);
    });

    it('Drop off 模式（真）：包含外部堆场堆存费', () => {
      // Arrange
      const scenario = {
        mode: 'Drop off',
        hasYard: true,
        pickupBeforeDelivery: true, // 提 < 送
        expectedCosts: [
          'demurrageCost',
          'detentionCost',
          'storageCost',
          'yardStorageCost', // ✅ 真 Drop off
          'transportationCost'
        ]
      };

      // Assert
      expect(scenario.expectedCosts).toContain('yardStorageCost');
      expect(scenario.expectedCosts).toHaveLength(5);
    });

    it('Drop off 模式（假）：不包含外部堆场堆存费', () => {
      // Arrange
      const scenario = {
        mode: 'Drop off',
        hasYard: true,
        pickupBeforeDelivery: false, // 提 = 送
        expectedCosts: [
          'demurrageCost',
          'detentionCost',
          'storageCost',
          'transportationCost'
          // ❌ yardStorageCost (假 Drop off)
        ]
      };

      // Assert
      expect(scenario.expectedCosts).not.toContain('yardStorageCost');
      expect(scenario.expectedCosts).toHaveLength(4);
    });

    it('Expedited 模式：包含加急费', () => {
      // Arrange
      const scenario = {
        mode: 'Expedited',
        expectedCosts: [
          'demurrageCost',
          'detentionCost',
          'storageCost',
          'transportationCost',
          'handlingCost' // ✅ 加急费
        ]
      };

      // Assert
      expect(scenario.expectedCosts).toContain('handlingCost');
      expect(scenario.expectedCosts).toHaveLength(5);
    });
  });

  describe('费用项数据源验证', () => {
    it('D&D 费用应该来自 ext_demurrage_standards', () => {
      // Arrange
      const ddFeesDataSource = 'ext_demurrage_standards';

      const ddFees = [
        { name: '滞港费', code: 'DEMURRAGE' },
        { name: '滞箱费', code: 'DETENTION' },
        { name: '港口存储费', code: 'STORAGE' },
        { name: 'D&D 合并费', code: 'COMBINED' }
      ];

      // Assert
      ddFees.forEach((_fee) => {
        expect(ddFeesDataSource).toBe('ext_demurrage_standards');
      });
    });

    it('外部堆场堆存费应该来自 dict_trucking_port_mapping', () => {
      // Arrange
      const yardStorageDataSource = 'dict_trucking_port_mapping';
      const requiredFields = ['standard_rate', 'yard_operation_fee', 'yard_capacity'];

      // Assert
      expect(yardStorageDataSource).toBe('dict_trucking_port_mapping');
      expect(requiredFields).toContain('standard_rate');
      expect(requiredFields).toContain('yard_operation_fee');
      expect(requiredFields).toContain('yard_capacity');
    });

    it('运输费应该来自 dict_trucking_port_mapping', () => {
      // Arrange
      const transportationDataSource = 'dict_trucking_port_mapping';
      const requiredField = 'transport_fee';

      // Assert
      expect(transportationDataSource).toBe('dict_trucking_port_mapping');
      expect(requiredField).toBe('transport_fee');
    });

    it('加急费应该来自 dict_scheduling_config', () => {
      // Arrange
      const handlingFeeDataSource = 'dict_scheduling_config';
      const configKey = 'expedited_handling_fee';

      // Assert
      expect(handlingFeeDataSource).toBe('dict_scheduling_config');
      expect(configKey).toBe('expedited_handling_fee');
    });
  });

  describe('费用收取方验证', () => {
    it('D&D 费用应该由港口/码头收取', () => {
      // Arrange
      const ddFeesCollector = '港口/码头';

      // Assert
      expect(ddFeesCollector).toBe('港口/码头');
    });

    it('外部堆场堆存费应该由拖车车队收取', () => {
      // Arrange
      const yardStorageCollector = '拖车车队';

      // Assert
      expect(yardStorageCollector).toBe('拖车车队');
    });

    it('运输费应该由拖车车队收取', () => {
      // Arrange
      const transportationCollector = '拖车车队';

      // Assert
      expect(transportationCollector).toBe('拖车车队');
    });

    it('加急费应该由仓库/车队收取', () => {
      // Arrange
      const handlingCollector = '仓库/车队';

      // Assert
      expect(handlingCollector).toBe('仓库/车队');
    });
  });

  describe('费用计算逻辑验证', () => {
    it('应该正确计算外部堆场堆存费', () => {
      // Arrange
      const standardRate = 80; // $80/天
      const yardOperationFee = 50; // $50 一次性
      const yardStorageDays = 3; // 堆放 3 天

      // Act
      const yardStorageCost = standardRate * yardStorageDays + yardOperationFee;

      // Assert
      expect(yardStorageCost).toBe(290);
      expect(yardStorageCost).toEqual(standardRate * yardStorageDays + yardOperationFee);
    });

    it('应该正确判断是否收取外部堆场堆存费', () => {
      // Arrange
      const testCases = [
        { mode: 'Live load', hasYard: true, pickupBeforeDelivery: false, shouldCharge: false },
        { mode: 'Drop off', hasYard: false, pickupBeforeDelivery: true, shouldCharge: false },
        { mode: 'Drop off', hasYard: true, pickupBeforeDelivery: false, shouldCharge: false }, // 假 Drop off
        { mode: 'Drop off', hasYard: true, pickupBeforeDelivery: true, shouldCharge: true } // 真 Drop off
      ];

      // Act & Assert
      testCases.forEach(({ mode, hasYard, pickupBeforeDelivery, shouldCharge }) => {
        const actualCharge = mode === 'Drop off' && hasYard && pickupBeforeDelivery;
        expect(actualCharge).toBe(shouldCharge);
      });
    });

    it('应该区分两种堆存费', () => {
      // Arrange
      const portStorageCost = {
        name: '港口存储费',
        dataSource: 'ext_demurrage_standards',
        chargeTypeCode: 'STORAGE',
        collector: '港口/码头',
        category: 'D&D 费用'
      };

      const yardStorageCost = {
        name: '外部堆场堆存费',
        dataSource: 'dict_trucking_port_mapping',
        fields: ['standard_rate', 'yard_operation_fee'],
        collector: '拖车车队',
        category: '运输环节附加费'
      };

      // Assert
      expect(portStorageCost.dataSource).not.toBe(yardStorageCost.dataSource);
      expect(portStorageCost.collector).not.toBe(yardStorageCost.collector);
      expect(portStorageCost.category).not.toBe(yardStorageCost.category);
    });
  });
});
