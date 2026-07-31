/**
 * 验证货柜状态调度器跨次轮转 offset，覆盖 > batchSize 的货柜。
 */

import { ContainerStatusScheduler } from './containerStatus.scheduler';
import type { ContainerStatusService } from '../services/containerStatus.service';

function createScheduler(batchUpdateStatuses: jest.Mock): ContainerStatusScheduler {
  const statusService = { batchUpdateStatuses } as unknown as ContainerStatusService;
  return new ContainerStatusScheduler(statusService);
}

function withBatchSize(size: string, run: () => Promise<void>): Promise<void> {
  const original = process.env.STATUS_BATCH_SIZE;
  process.env.STATUS_BATCH_SIZE = size;
  return run().finally(() => {
    if (original === undefined) {
      delete process.env.STATUS_BATCH_SIZE;
    } else {
      process.env.STATUS_BATCH_SIZE = original;
    }
  });
}

describe('ContainerStatusScheduler rotating batch', () => {
  it('advances offset when a full page is processed', async () => {
    await withBatchSize('2', async () => {
      const batchUpdateStatuses = jest
        .fn()
        .mockResolvedValueOnce({ updatedCount: 1, processedCount: 2 })
        .mockResolvedValueOnce({ updatedCount: 0, processedCount: 2 });
      const scheduler = createScheduler(batchUpdateStatuses);

      await scheduler.triggerManualUpdate();
      expect(batchUpdateStatuses).toHaveBeenLastCalledWith(2, 0);
      expect(scheduler.getNextOffset()).toBe(2);

      await scheduler.triggerManualUpdate();
      expect(batchUpdateStatuses).toHaveBeenLastCalledWith(2, 2);
      expect(scheduler.getNextOffset()).toBe(4);
    });
  });

  it('resets offset after a short final page', async () => {
    await withBatchSize('2', async () => {
      const batchUpdateStatuses = jest
        .fn()
        .mockResolvedValueOnce({ updatedCount: 1, processedCount: 2 })
        .mockResolvedValueOnce({ updatedCount: 1, processedCount: 1 });
      const scheduler = createScheduler(batchUpdateStatuses);

      await scheduler.triggerManualUpdate();
      expect(scheduler.getNextOffset()).toBe(2);

      await scheduler.triggerManualUpdate();
      expect(batchUpdateStatuses).toHaveBeenLastCalledWith(2, 2);
      expect(scheduler.getNextOffset()).toBe(0);
    });
  });

  it('retries from offset 0 when current offset is past the end', async () => {
    await withBatchSize('2', async () => {
      const batchUpdateStatuses = jest
        .fn()
        .mockResolvedValueOnce({ updatedCount: 0, processedCount: 2 })
        .mockResolvedValueOnce({ updatedCount: 0, processedCount: 0 })
        .mockResolvedValueOnce({ updatedCount: 1, processedCount: 2 });
      const scheduler = createScheduler(batchUpdateStatuses);

      await scheduler.triggerManualUpdate();
      expect(scheduler.getNextOffset()).toBe(2);

      await scheduler.triggerManualUpdate();
      expect(batchUpdateStatuses.mock.calls.slice(-2)).toEqual([
        [2, 2],
        [2, 0]
      ]);
      expect(scheduler.getNextOffset()).toBe(2);
    });
  });
});
