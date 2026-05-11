/**
 * 分析全球快递费拒收超标标准 Excel 文件结构
 */
import * as XLSX from 'xlsx';

const filePath = process.argv[2] || 'D:/aosom/Downloads/全球快递费拒收超标标准20260214.xlsx';

console.log('正在读取文件:', filePath);
console.log('');

try {
  const workbook = XLSX.readFile(filePath);

  console.log('=== 工作簿信息 ===');
  console.log('Sheet 数量:', workbook.SheetNames.length);
  console.log('Sheet 名称:', workbook.SheetNames.join(', '));
  console.log('');

  // 遍历每个 Sheet
  workbook.SheetNames.forEach((sheetName, index) => {
    console.log(`\n=== Sheet ${index + 1}: ${sheetName} ===`);

    const worksheet = workbook.Sheets[sheetName];

    // 转换为 JSON（保留原始格式）
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null
    });

    if (jsonData.length === 0) {
      console.log('(空 Sheet)');
      return;
    }

    console.log('总行数:', jsonData.length);

    // 显示前 5 行作为示例
    const displayRows = Math.min(5, jsonData.length);
    console.log(`\n前 ${displayRows} 行数据:`);

    for (let i = 0; i < displayRows; i++) {
      const row = jsonData[i];
      console.log(`  第 ${i + 1} 行:`, row);
    }

    // 如果有标题行，显示列名
    if (jsonData.length > 0) {
      const headers = jsonData[0] as any[];
      console.log('\n列名:');
      headers.forEach((header: any, colIndex: number) => {
        console.log(`  列 ${colIndex + 1}: ${header}`);
      });

      console.log('\n总列数:', headers.length);
    }
  });

  console.log('\n\n=== 分析完成 ===');
  console.log('请根据以上输出确定字段映射关系');
} catch (error: any) {
  console.error('错误:', error.message);
  process.exit(1);
}
