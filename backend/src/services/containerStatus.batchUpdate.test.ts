/**
 * 验证批量状态更新使用稳定排序 + offset，避免定时任务饥饿。
 */

import { AppDataSource } from '../database';
import { ContainerStatusService } from './containerStatus.service';

describe('ContainerStatusService.batchUpdateStatuses pagination', () => {
  let service: ContainerStatusService;
  let findMock: jest.Mock;

  beforeEach(() => {
    findMock = jest.fn().mockResolvedValue([]);
    (AppDataSource.getRepository as jest.Mock).mockReturnValue({
      find: findMock,
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn()
    });
    service = new ContainerStatusService();
  });

  it('queries with containerNumber ASC, take, and skip', async () => {
    const result = await service.batchUpdateStatuses(200, 400);

    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 200,
        skip: 400,
        order: { containerNumber: 'ASC' },
        relations: ['seaFreight']
      })
    );
    expect(result).toEqual({ updatedCount: 0, processedCount: 0 });
  });

  it('coerces invalid limit/offset to safe defaults', async () => {
    await service.batchUpdateStatuses(Number.NaN, -10);

    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 1000,
        skip: 0,
        order: { containerNumber: 'ASC' }
      })
    );
  });
});
