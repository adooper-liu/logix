/**
 * 验证滞港费预计算调度器跨次轮转 offset，覆盖 > batchSize 的货柜。
 */

import type { DemurrageService } from '../services/demurrage.service';
import { DemurrageWriteBackScheduler } from './demurrageWriteBack.scheduler';

function createScheduler(batchComputeAndSaveRecords: jest.Mock): DemurrageWriteBackScheduler {
  const demurrageService = {
    batchComputeAndSaveRecords,
    runManualFreeDateUpdate: jest.fn(),
    runScheduledFreeDateUpdate: jest.fn()
  } as unknown as DemurrageService;
  return new DemurrageWriteBackScheduler(demurrageService);
}

async function withBatchSize(size: string, run: () => Promise<void>): Promise<void> {
  const original = process.env.DEMURRAGE_BATCH_SIZE;
  process.env.DEMURRAGE_BATCH_SIZE = size;
  try {
    await run();
  } finally {
    if (original === undefined) delete process.env.DEMURRAGE_BATCH_SIZE;
    else process.env.DEMURRAGE_BATCH_SIZE = original;
  }
}

describe('DemurrageWriteBackScheduler rotating compute batch', () => {
  it('advances offset when a full page is processed', async () => {
    await withBatchSize('2', async () => {
      const batch = jest
        .fn()
        .mockResolvedValueOnce({ computed: 2, saved: 1, finalized: 0, processedCount: 2 })
        .mockResolvedValueOnce({ computed: 2, saved: 0, finalized: 0, processedCount: 2 });
      const scheduler = createScheduler(batch);

      await scheduler.triggerManualComputeBatch();
      expect(batch).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 2, offset: 0 }));
      expect(scheduler.getNextOffset()).toBe(2);

      await scheduler.triggerManualComputeBatch();
      expect(batch).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 2, offset: 2 }));
      expect(scheduler.getNextOffset()).toBe(4);
    });
  });

  it('resets offset after a short final page', async () => {
    await withBatchSize('2', async () => {
      const batch = jest
        .fn()
        .mockResolvedValueOnce({ computed: 2, saved: 1, finalized: 0, processedCount: 2 })
        .mockResolvedValueOnce({ computed: 1, saved: 1, finalized: 0, processedCount: 1 });
      const scheduler = createScheduler(batch);

      await scheduler.triggerManualComputeBatch();
      expect(scheduler.getNextOffset()).toBe(2);
      await scheduler.triggerManualComputeBatch();
      expect(batch).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 2, offset: 2 }));
      expect(scheduler.getNextOffset()).toBe(0);
    });
  });

  it('retries from offset 0 when current offset is past the end', async () => {
    await withBatchSize('2', async () => {
      const batch = jest
        .fn()
        .mockResolvedValueOnce({ computed: 2, saved: 0, finalized: 0, processedCount: 2 })
        .mockResolvedValueOnce({ computed: 0, saved: 0, finalized: 0, processedCount: 0 })
        .mockResolvedValueOnce({ computed: 2, saved: 1, finalized: 0, processedCount: 2 });
      const scheduler = createScheduler(batch);

      await scheduler.triggerManualComputeBatch();
      expect(scheduler.getNextOffset()).toBe(2);
      await scheduler.triggerManualComputeBatch();
      expect(batch.mock.calls.slice(-2)).toEqual([
        [expect.objectContaining({ limit: 2, offset: 2 })],
        [expect.objectContaining({ limit: 2, offset: 0 })]
      ]);
      expect(scheduler.getNextOffset()).toBe(2);
    });
  });
});
