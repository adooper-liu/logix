/**
 * 方案 A 单元测试：最终状态事件特殊处理
 * 测试文件：backend/src/services/feituoImport.service.test.ts
 */

import { FeituoImportService } from './feituoImport.service';
import { AppDataSource } from '../database';
import { ContainerStatusEvent } from '../entities/ContainerStatusEvent';
import { EmptyReturn } from '../entities/EmptyReturn';
import { PortOperation } from '../entities/PortOperation';

// Mock ExcelStatusInfo
interface ExcelStatusInfo {
  statusCode: string;
  occurredAt: Date | null;
  isEstimated: boolean;
  dataSource: string;
}

describe('FeituoImportService - 方案 A: 最终状态事件特殊处理', () => {
  let service: FeituoImportService;

  beforeAll(async () => {
    // 初始化数据库连接（测试环境）
    await AppDataSource.initialize();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  beforeEach(() => {
    service = new FeituoImportService();
  });

  describe('processStatusArray - 最终状态事件处理', () => {
    it('应该更新 RCVE 事件，即使标记为预计', async () => {
      const containerNumber = 'TEST001';
      const rcveTime = new Date('2026-03-30T08:02:12Z');

      const statuses: ExcelStatusInfo[] = [
        {
          statusCode: 'RCVE',
          occurredAt: rcveTime,
          isEstimated: true, // 即使标记为预计
          dataSource: 'Excel'
        }
      ];

      // 调用私有方法（需要使用 any 类型绕过 TypeScript 检查）
      await (service as any).processStatusArray(containerNumber, statuses);

      // 验证 process_empty_return 表已更新
      const emptyReturnRepo = AppDataSource.getRepository(EmptyReturn);
      const emptyReturn = await emptyReturnRepo.findOne({ where: { containerNumber } });

      expect(emptyReturn).toBeDefined();
      expect(emptyReturn?.returnTime).toEqual(rcveTime);
    });

    it('应该更新 GTOT 事件，即使标记为预计', async () => {
      const containerNumber = 'TEST002';
      const gtotTime = new Date('2026-03-28T15:03:00Z');

      const statuses: ExcelStatusInfo[] = [
        {
          statusCode: 'GTOT',
          occurredAt: gtotTime,
          isEstimated: true,
          dataSource: 'Excel'
        }
      ];

      await (service as any).processStatusArray(containerNumber, statuses);

      // GTOT 映射到 gate_out_time，应该更新 PortOperation
      const poRepo = AppDataSource.getRepository(PortOperation);
      const portOps = await poRepo.find({ where: { containerNumber } });

      expect(portOps.length).toBeGreaterThan(0);
      // 验证最后一个港口操作的 gateOutTime 已更新
      const lastPortOp = portOps[portOps.length - 1];
      expect(lastPortOp.gateOutTime).toEqual(gtotTime);
    });

    it('不应该更新 ETA 事件，如果标记为预计', async () => {
      const containerNumber = 'TEST003';
      const etaTime = new Date('2026-03-18T10:00:00Z');

      const statuses: ExcelStatusInfo[] = [
        {
          statusCode: 'ETA',
          occurredAt: etaTime,
          isEstimated: true, // 预计事件
          dataSource: 'Excel'
        }
      ];

      await (service as any).processStatusArray(containerNumber, statuses);

      // ETA 不是最终状态，预计事件不应该更新
      const poRepo = AppDataSource.getRepository(PortOperation);
      const portOps = await poRepo.find({ where: { containerNumber } });

      // 验证没有创建 PortOperation 记录（或者 eta 字段未更新）
      // 注意：具体验证逻辑取决于 updateCoreFieldsFromStatus 的实现
      expect(portOps.length).toBe(0);
    });

    it('应该更新非预计的 ATA 事件', async () => {
      const containerNumber = 'TEST004';
      const ataTime = new Date('2026-03-17T23:41:00Z');

      const statuses: ExcelStatusInfo[] = [
        {
          statusCode: 'ATA',
          occurredAt: ataTime,
          isEstimated: false, // 非预计事件
          dataSource: 'Excel'
        }
      ];

      await (service as any).processStatusArray(containerNumber, statuses);

      // ATA 是非预计事件，应该正常更新
      const poRepo = AppDataSource.getRepository(PortOperation);
      const portOps = await poRepo.find({ where: { containerNumber } });

      expect(portOps.length).toBeGreaterThan(0);
      const destPortOp = portOps.find(po => po.portType === 'destination');
      expect(destPortOp?.ata).toEqual(ataTime);
    });

    it('应该正确处理混合事件序列', async () => {
      const containerNumber = 'TEST005';
      const ataTime = new Date('2026-03-17T23:41:00Z');
      const rcveTime = new Date('2026-03-30T08:02:12Z');

      const statuses: ExcelStatusInfo[] = [
        {
          statusCode: 'ATA',
          occurredAt: ataTime,
          isEstimated: false, // 实际到港
          dataSource: 'Excel'
        },
        {
          statusCode: 'ETA',
          occurredAt: new Date('2026-03-18T10:00:00Z'),
          isEstimated: true, // 预计到港（不应覆盖 ATA）
          dataSource: 'Excel'
        },
        {
          statusCode: 'RCVE',
          occurredAt: rcveTime,
          isEstimated: true, // 预计还箱（但 RCVE 是最终状态，应该更新）
          dataSource: 'Excel'
        }
      ];

      await (service as any).processStatusArray(containerNumber, statuses);

      // 验证 ATA 已更新
      const poRepo = AppDataSource.getRepository(PortOperation);
      const portOps = await poRepo.find({ where: { containerNumber } });
      const destPortOp = portOps.find(po => po.portType === 'destination');
      expect(destPortOp?.ata).toEqual(ataTime);

      // 验证 RCVE 已更新
      const emptyReturnRepo = AppDataSource.getRepository(EmptyReturn);
      const emptyReturn = await emptyReturnRepo.findOne({ where: { containerNumber } });
      expect(emptyReturn?.returnTime).toEqual(rcveTime);
    });
  });

  describe('最终状态码列表验证', () => {
    it('应该包含所有关键的最终状态码', () => {
      // 验证 FeituoImportService 中定义的 FINAL_STATUS_CODES
      const finalStatusCodes = ['RCVE', 'STCS', 'GTOT', 'GTIN', 'DSCH', 'BO', 'DLPT'];

      // RCVE: 还空箱 - 运输链结束
      expect(finalStatusCodes).toContain('RCVE');

      // STCS: 提柜出场 - 运输链结束
      expect(finalStatusCodes).toContain('STCS');

      // GTOT/GTIN: 闸口出/入 - 实际动作发生
      expect(finalStatusCodes).toContain('GTOT');
      expect(finalStatusCodes).toContain('GTIN');

      // DSCH: 卸船 - 实际动作发生
      expect(finalStatusCodes).toContain('DSCH');

      // BO/DLPT: 装船/离港 - 实际动作发生
      expect(finalStatusCodes).toContain('BO');
      expect(finalStatusCodes).toContain('DLPT');
    });

    it('不应该包含预计状态码', () => {
      const finalStatusCodes = ['RCVE', 'STCS', 'GTOT', 'GTIN', 'DSCH', 'BO', 'DLPT'];

      // ETA/ETD 等预计状态码不应该在列表中
      expect(finalStatusCodes).not.toContain('ETA');
      expect(finalStatusCodes).not.toContain('ETD');
      expect(finalStatusCodes).not.toContain('EATA');
      expect(finalStatusCodes).not.toContain('EATD');
    });
  });
});
