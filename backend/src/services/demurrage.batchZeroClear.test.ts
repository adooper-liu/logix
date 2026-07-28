/**
 * Regression: batchComputeAndSaveRecords must clear stale charge rows when
 * recalculation yields totalAmount === 0 (previously skipped and left old positives).
 */

import { DemurrageService } from './demurrage.service';

describe('DemurrageService.batchComputeAndSaveRecords zero clear', () => {
  it('deletes existing records when recalculation total is zero', async () => {
    const deleteMock = jest.fn().mockResolvedValue({ affected: 2 });
    const service = Object.create(DemurrageService.prototype) as DemurrageService;

    (service as any).recordRepo = { delete: deleteMock };
    (service as any).containerRepo = { findOne: jest.fn() };
    (service as any).getContainerNumbersInDateRange = jest
      .fn()
      .mockResolvedValue(['TEST0000001']);
    (service as any).getDestinationPortsForContainers = jest.fn().mockResolvedValue(new Map());
    (service as any).calculateForContainer = jest.fn().mockResolvedValue({
      result: { containerNumber: 'TEST0000001', totalAmount: 0, items: [] }
    });
    (service as any).saveCalculationToRecords = jest.fn();

    const out = await service.batchComputeAndSaveRecords({ limit: 10 });

    expect(deleteMock).toHaveBeenCalledWith({ containerNumber: 'TEST0000001' });
    expect((service as any).saveCalculationToRecords).not.toHaveBeenCalled();
    expect(out).toEqual({ computed: 1, saved: 0, finalized: 0 });
  });

  it('does not delete when calculation returns null', async () => {
    const deleteMock = jest.fn();
    const service = Object.create(DemurrageService.prototype) as DemurrageService;

    (service as any).recordRepo = { delete: deleteMock };
    (service as any).getContainerNumbersInDateRange = jest
      .fn()
      .mockResolvedValue(['TEST0000002']);
    (service as any).getDestinationPortsForContainers = jest.fn().mockResolvedValue(new Map());
    (service as any).calculateForContainer = jest.fn().mockResolvedValue({ result: null });
    (service as any).saveCalculationToRecords = jest.fn();

    await service.batchComputeAndSaveRecords({ limit: 10 });

    expect(deleteMock).not.toHaveBeenCalled();
    expect((service as any).saveCalculationToRecords).not.toHaveBeenCalled();
  });

  it('still saves when recalculation total is positive', async () => {
    const deleteMock = jest.fn();
    const service = Object.create(DemurrageService.prototype) as DemurrageService;

    (service as any).recordRepo = { delete: deleteMock };
    (service as any).containerRepo = {
      findOne: jest.fn().mockResolvedValue({ logisticsStatus: 'at_port' })
    };
    (service as any).getContainerNumbersInDateRange = jest
      .fn()
      .mockResolvedValue(['TEST0000003']);
    (service as any).getDestinationPortsForContainers = jest
      .fn()
      .mockResolvedValue(new Map([['TEST0000003', 'USLAX']]));
    (service as any).calculateForContainer = jest.fn().mockResolvedValue({
      result: {
        containerNumber: 'TEST0000003',
        totalAmount: 120,
        items: [{ amount: 120 }]
      }
    });
    (service as any).saveCalculationToRecords = jest.fn().mockResolvedValue(1);

    const out = await service.batchComputeAndSaveRecords({ limit: 10 });

    expect(deleteMock).not.toHaveBeenCalled();
    expect((service as any).saveCalculationToRecords).toHaveBeenCalled();
    expect(out.saved).toBe(1);
  });
});
