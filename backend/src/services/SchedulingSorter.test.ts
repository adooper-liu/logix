/**
 * SchedulingSorter 单元测试
 */

import { Container } from '../entities/Container';
import { Warehouse } from '../entities/Warehouse';
import { WarehouseTruckingMapping } from '../entities/WarehouseTruckingMapping';
import { SchedulingSorter } from './SchedulingSorter';

describe('SchedulingSorter', () => {
  let sorter: SchedulingSorter;

  beforeEach(() => {
    sorter = new SchedulingSorter();
  });

  describe('sortByClearanceDate', () => {
    it('should sort containers by ATA/ETA date ascending', () => {
      // Arrange
      const containers: Container[] = [
        {
          containerNumber: 'CNTR003',
          portOperations: [
            {
              portType: 'destination',
              eta: new Date('2026-03-30')
            } as any
          ]
        } as any,
        {
          containerNumber: 'CNTR001',
          portOperations: [
            {
              portType: 'destination',
              eta: new Date('2026-03-28')
            } as any
          ]
        } as any,
        {
          containerNumber: 'CNTR002',
          portOperations: [
            {
              portType: 'destination',
              eta: new Date('2026-03-29')
            } as any
          ]
        } as any
      ];

      // Act
      const sorted = sorter.sortByClearanceDate(containers);

      // Assert
      expect(sorted.length).toBe(3);
      expect(sorted[0].containerNumber).toBe('CNTR001'); // 最早
      expect(sorted[1].containerNumber).toBe('CNTR002');
      expect(sorted[2].containerNumber).toBe('CNTR003'); // 最晚
    });

    it('should prioritize ATA over ETA', () => {
      // Arrange
      const containers: Container[] = [
        {
          containerNumber: 'CNTR001',
          portOperations: [
            {
              portType: 'destination',
              ata: new Date('2026-03-28'), // 实际到港
              eta: new Date('2026-04-01') // 预计到港（更晚）
            } as any
          ]
        } as any,
        {
          containerNumber: 'CNTR002',
          portOperations: [
            {
              portType: 'destination',
              eta: new Date('2026-03-29') // 只有 ETA
            } as any
          ]
        } as any
      ];

      // Act
      const sorted = sorter.sortByClearanceDate(containers);

      // Assert
      expect(sorted[0].containerNumber).toBe('CNTR001'); // ATA 优先
      expect(sorted[1].containerNumber).toBe('CNTR002');
    });

    it('should sort by last_free_date when same day', () => {
      // Arrange
      const containers: Container[] = [
        {
          containerNumber: 'CNTR001',
          portOperations: [
            {
              portType: 'destination',
              eta: new Date('2026-03-28'),
              lastFreeDate: new Date('2026-03-31') // 免租期更晚
            } as any
          ]
        } as any,
        {
          containerNumber: 'CNTR002',
          portOperations: [
            {
              portType: 'destination',
              eta: new Date('2026-03-28'),
              lastFreeDate: new Date('2026-03-30') // 免租期更早
            } as any
          ]
        } as any
      ];

      // Act
      const sorted = sorter.sortByClearanceDate(containers);

      // Assert
      expect(sorted[0].containerNumber).toBe('CNTR002'); // 免租期早的优先
      expect(sorted[1].containerNumber).toBe('CNTR001');
    });

    it('should handle containers without dates', () => {
      // Arrange
      const containers: Container[] = [
        {
          containerNumber: 'CNTR001',
          portOperations: [
            {
              portType: 'destination',
              eta: new Date('2026-03-28')
            } as any
          ]
        } as any,
        {
          containerNumber: 'CNTR002',
          portOperations: [
            {
              portType: 'destination'
            } as any
          ] // 没有日期
        } as any
      ];

      // Act
      const sorted = sorter.sortByClearanceDate(containers);

      // Assert
      expect(sorted[0].containerNumber).toBe('CNTR001'); // 有日期的优先
      expect(sorted[1].containerNumber).toBe('CNTR002');
    });

    it('should return empty array for empty input', () => {
      // Act
      const sorted = sorter.sortByClearanceDate([]);

      // Assert
      expect(sorted).toEqual([]);
    });
  });

  describe('sortWarehousesByPriority', () => {
    it('should sort warehouses by priority correctly', () => {
      // Arrange
      const warehouses: Warehouse[] = [
        { warehouseCode: 'WH003', propertyType: '第三方仓' } as any,
        { warehouseCode: 'WH001', propertyType: '自营仓' } as any,
        { warehouseCode: 'WH002', propertyType: '平台仓' } as any
      ];

      const mappings: WarehouseTruckingMapping[] = [];

      // Act
      const sorted = sorter.sortWarehousesByPriority(warehouses, mappings);

      // Assert
      expect(sorted.length).toBe(3);
      expect(sorted[0].warehouseCode).toBe('WH001'); // 自营仓
      expect(sorted[1].warehouseCode).toBe('WH002'); // 平台仓
      expect(sorted[2].warehouseCode).toBe('WH003'); // 第三方仓
    });

    it('should prioritize default warehouses', () => {
      // Arrange
      const warehouses: Warehouse[] = [
        { warehouseCode: 'WH001', propertyType: '自营仓' } as any,
        { warehouseCode: 'WH002', propertyType: '自营仓' } as any
      ];

      const mappings: WarehouseTruckingMapping[] = [
        { warehouseCode: 'WH002', isDefault: true } as any // WH002 是默认仓库
      ];

      // Act
      const sorted = sorter.sortWarehousesByPriority(warehouses, mappings);

      // Assert
      expect(sorted[0].warehouseCode).toBe('WH002'); // 默认仓库优先
      expect(sorted[1].warehouseCode).toBe('WH001');
    });

    it('should sort by warehouse code when same priority', () => {
      // Arrange
      const warehouses: Warehouse[] = [
        { warehouseCode: 'WH003', propertyType: '自营仓' } as any,
        { warehouseCode: 'WH001', propertyType: '自营仓' } as any,
        { warehouseCode: 'WH002', propertyType: '自营仓' } as any
      ];

      const mappings: WarehouseTruckingMapping[] = [];

      // Act
      const sorted = sorter.sortWarehousesByPriority(warehouses, mappings);

      // Assert
      expect(sorted[0].warehouseCode).toBe('WH001');
      expect(sorted[1].warehouseCode).toBe('WH002');
      expect(sorted[2].warehouseCode).toBe('WH003');
    });

    it('should use DEFAULT_PROPERTY_PRIORITY for unknown types', () => {
      // Arrange
      const warehouses: Warehouse[] = [
        { warehouseCode: 'WH001', propertyType: '自营仓' } as any,
        { warehouseCode: 'WH002', propertyType: '未知类型' } as any
      ];

      const mappings: WarehouseTruckingMapping[] = [];

      // Act
      const sorted = sorter.sortWarehousesByPriority(warehouses, mappings);

      // Assert
      expect(sorted[0].warehouseCode).toBe('WH001'); // 已知类型优先
      expect(sorted[1].warehouseCode).toBe('WH002');
    });

    it('should return empty array for empty input', () => {
      // Act
      const sorted = sorter.sortWarehousesByPriority([], []);

      // Assert
      expect(sorted).toEqual([]);
    });
  });
});
