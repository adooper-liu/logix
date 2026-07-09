import { AppDataSource } from '../../src/database';
import {
  isExpressCostImportApiEnabled,
  requireExpressCostImportApiEnabled
} from '../../src/routes/express-cost.routes';
import { costEngineService } from '../../src/services/costEngine.service';

const baseInput = {
  countryCode: 'DE',
  carrierServiceId: 1,
  longestIn: 50,
  secondIn: 40,
  shortestIn: 30,
  grossWeightLbs: 10
};

const baseRule = {
  longestIn: null,
  secondIn: null,
  shortestIn: null,
  girthIn: null,
  lPlusSIn: null,
  threeSidesSumIn: null,
  diagonalIn: null,
  volM3Threshold: null,
  grossWtValue: null,
  rateWtSingle: null,
  rateWtMulti: null,
  minBillableLbs: null,
  conditionsJson: null
};

describe('Express cost critical correctness guards', () => {
  afterEach(() => {
    delete process.env.ENABLE_EXPRESS_COST_IMPORT_API;
  });

  it('triggers imported volume cubic-meter thresholds', () => {
    const svc = costEngineService as any;
    const rule = {
      ...baseRule,
      longestIn: 120,
      volM3Threshold: 0.15
    };

    const triggered = svc.checkRuleTriggered(rule, baseInput, 432);

    expect(triggered).toBe(true);
  });

  it('uses only currently effective surcharge versions by default', async () => {
    (AppDataSource as any).query = jest.fn().mockResolvedValue([{ id: 42 }]);

    const versionId = await (costEngineService as any).getVersionId();

    expect(versionId).toBe(42);
    expect((AppDataSource as any).query).toHaveBeenCalledWith(
      expect.stringContaining('effective_from IS NULL OR effective_from <= CURRENT_DATE')
    );
    expect((AppDataSource as any).query).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY effective_from DESC NULLS LAST, created_at DESC')
    );
  });

  it('does not pick future pricing versions by default', async () => {
    const svc = costEngineService as any;
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 7 })
    };
    jest.spyOn(svc.pricingVersionRepo, 'createQueryBuilder').mockReturnValue(queryBuilder);

    const version = await svc.getPricingVersion();

    expect(version).toEqual({ id: 7 });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('v.effective_from <= NOW()');
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      '(v.effective_to IS NULL OR v.effective_to >= NOW())'
    );
  });

  it('disables the express cost Excel import write API unless explicitly enabled', () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    requireExpressCostImportApiEnabled({} as any, res as any, next);

    expect(isExpressCostImportApiEnabled()).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Express cost Excel import API is disabled'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows the express cost Excel import write API when explicitly enabled', () => {
    process.env.ENABLE_EXPRESS_COST_IMPORT_API = 'true';
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    requireExpressCostImportApiEnabled({} as any, res as any, next);

    expect(isExpressCostImportApiEnabled()).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
