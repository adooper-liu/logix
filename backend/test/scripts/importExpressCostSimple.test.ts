import * as fs from 'fs';
import * as path from 'path';
import { buildDbConfig, validateRequiredRows } from '../../scripts/import-express-cost-simple';

describe('import-express-cost-simple script safeguards', () => {
  const originalPassword = process.env.DB_PASSWORD;

  afterEach(() => {
    if (originalPassword === undefined) {
      delete process.env.DB_PASSWORD;
    } else {
      process.env.DB_PASSWORD = originalPassword;
    }
  });

  it('refuses to use a hardcoded database password default', () => {
    delete process.env.DB_PASSWORD;

    expect(() => buildDbConfig()).toThrow('缺少 DB_PASSWORD 环境变量');
  });

  it('rejects non-empty rows that would otherwise be silently skipped', () => {
    expect(() =>
      validateRequiredRows([
        ['US', 'FedEx Ground', 'AHS Dimension'],
        ['US', '', 'AHS Weight']
      ])
    ).toThrow('第 3 行');
  });

  it('clears only target-version rule and policy rows', () => {
    const scriptPath = path.resolve(__dirname, '../../scripts/import-express-cost-simple.ts');
    const script = fs.readFileSync(scriptPath, 'utf8');

    expect(script).toContain('DELETE FROM dict_express_stack_policy WHERE version_id = $1');
    expect(script).toContain('DELETE FROM dict_express_surcharge_rule WHERE version_id = $1');
    expect(script).not.toContain('DELETE FROM dict_express_carrier_service');
    expect(script).not.toContain('LogiX@2024!Secure');
  });
});
