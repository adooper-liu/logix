/**
 * Feituo import date parsing and core-merge failure accounting
 */

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn()
    }))
  }
}));

jest.mock('./externalDataService', () => ({
  externalDataService: {
    getStatusEvents: jest.fn(),
    saveStatusRawData: jest.fn()
  },
  DataSource: {}
}));

import { parseDate, recordFeituoCoreMergeFailure } from './feituoImport.service';

describe('parseDate', () => {
  it('parses valid YYYY-MM-DD as UTC midnight', () => {
    const d = parseDate('2026-04-10');
    expect(d).not.toBeNull();
    expect(d!.toISOString()).toBe('2026-04-10T00:00:00.000Z');
  });

  it('parses valid datetime with milliseconds', () => {
    const d = parseDate('2026-04-10 08:30:15.123');
    expect(d).not.toBeNull();
    expect(d!.toISOString()).toBe('2026-04-10T08:30:15.123Z');
  });

  it('rejects invalid calendar day instead of rolling into the next month', () => {
    // JS Date.UTC(2026, 1, 31) becomes 2026-03-03 — must not persist that.
    expect(parseDate('2026-02-31')).toBeNull();
    expect(parseDate('2026-04-31')).toBeNull();
    expect(parseDate('2026-13-01')).toBeNull();
  });

  it('rejects impossible time components', () => {
    expect(parseDate('2026-04-10 24:00:00')).toBeNull();
    expect(parseDate('2026-04-10 12:60:00')).toBeNull();
  });

  it('returns null for empty values', () => {
    expect(parseDate(null)).toBeNull();
    expect(parseDate('')).toBeNull();
  });
});

describe('recordFeituoCoreMergeFailure', () => {
  it('decrements success and records errors for matched excel rows', () => {
    const errors: { row: number; error: string }[] = [];
    const successRef = { value: 2 };
    const items = [
      {
        excelIndex: 4,
        row: {
          当前状态信息_集装箱号: 'CNTR001',
          '基本信息_MBL Number': 'MBL1'
        } as any
      },
      {
        excelIndex: 5,
        row: {
          当前状态信息_集装箱号: 'CNTR001',
          '基本信息_MBL Number': 'MBL1'
        } as any
      }
    ];

    recordFeituoCoreMergeFailure({
      errors,
      items,
      key: 'MBL1||CNTR001',
      err: new Error('varchar too long'),
      successRef
    });

    expect(successRef.value).toBe(0);
    expect(errors).toEqual([
      { row: 5, error: '核心表合并失败: varchar too long' },
      { row: 6, error: '核心表合并失败: varchar too long' }
    ]);
  });

  it('records a fallback error when no excel rows match the merge key', () => {
    const errors: { row: number; error: string }[] = [];
    const successRef = { value: 1 };

    recordFeituoCoreMergeFailure({
      errors,
      items: [],
      key: 'MBL||CNTR',
      err: 'db constraint',
      successRef
    });

    expect(successRef.value).toBe(0);
    expect(errors).toEqual([{ row: 0, error: '核心表合并失败 (MBL||CNTR): db constraint' }]);
  });
});
