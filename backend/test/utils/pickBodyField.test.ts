import {
  firstMissingRequiredBodyString,
  pickBodyField,
  pickBodyNumber
} from '../../src/utils/pickBodyField';

describe('pickBodyField', () => {
  it('prefers camelCase and falls back to snake_case', () => {
    expect(pickBodyField({ warehouseCode: 'WH1' }, 'warehouseCode')).toBe('WH1');
    expect(pickBodyField({ warehouse_code: 'WH2' }, 'warehouseCode')).toBe('WH2');
    expect(pickBodyField({ warehouseCode: 'WH1', warehouse_code: 'WH2' }, 'warehouseCode')).toBe(
      'WH1'
    );
  });

  it('rejects missing/blank required strings that would wipe mappings', () => {
    expect(firstMissingRequiredBodyString({}, ['warehouseCode'])).toBe('warehouseCode');
    expect(firstMissingRequiredBodyString({ warehouse_code: '  ' }, ['warehouseCode'])).toBe(
      'warehouseCode'
    );
    expect(firstMissingRequiredBodyString({ warehouse_code: 'WH01' }, ['warehouseCode'])).toBe(
      undefined
    );
  });

  it('preserves transport/yard fees from snake_case bodies', () => {
    expect(pickBodyNumber({ transport_fee: 125.5 }, 'transportFee', 0)).toBe(125.5);
    expect(pickBodyNumber({ standard_rate: '80.25' }, 'standardRate', 0)).toBe(80.25);
    expect(pickBodyNumber({}, 'yardOperationFee', 0)).toBe(0);
  });
});
