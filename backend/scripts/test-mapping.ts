// 测试脚本：直接测试状态码映射
import { shouldUpdateCoreField, getCoreFieldName, getPortTypeForStatusCode } from '../src/constants/FeiTuoStatusMapping';

const testCodes = ['BDAR', 'DSCH', 'STCS', 'STSP', 'GITM', 'DLPT', 'RCVE', 'FETA'];

console.log('=== 状态码映射测试 ===\n');

for (const code of testCodes) {
  const shouldUpdate = shouldUpdateCoreField(code, true);
  const fieldName = getCoreFieldName(code);
  const portType = getPortTypeForStatusCode(code);

  console.log(`${code}:`);
  console.log(`  shouldUpdateCoreField: ${shouldUpdate}`);
  console.log(`  getCoreFieldName: ${fieldName}`);
  console.log(`  getPortTypeForStatusCode: ${portType}`);
  console.log();
}
