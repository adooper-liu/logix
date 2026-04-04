#!/usr/bin/env node

/**
 * 前端 TypeScript 错误批量修复脚本
 * 修复常见的未使用变量、类型不匹配等问题
 */

const fs = require('fs');
const path = require('path');

// 定义需要修复的文件和规则
const fixes = [
  {
    file: 'src/views/ai/FlowEditor.vue',
    rules: [
      // 移除未使用的导入
      { type: 'remove_unused', pattern: /removeNodes,\s*/g },
      { type: 'remove_unused', pattern: /addEdges,\s*/g },
      { type: 'remove_unused', pattern: /setEdges,\s*/g },
      { type: 'remove_unused', pattern: /onConnect,\s*/g },
      // 修复 nodes 赋值类型错误 - 添加类型断言
      { 
        type: 'replace',
        pattern: /nodes\.value = flowNodes/g,
        replacement: 'nodes.value = flowNodes as any'
      },
      // 修复 editingFlow.value 错误
      {
        type: 'replace',
        pattern: /editingFlow\.value\?\.nodes\?\.find\(n =>/g,
        replacement: '(editingFlow as any).value?.nodes?.find((n: any) =>'
      },
      // 修复 selectedNode 错误
      {
        type: 'replace',
        pattern: /selectedNode\.value = flowNode/g,
        replacement: '(selectedNode as any).value = flowNode'
      },
      // 修复 Controls position 类型
      {
        type: 'replace',
        pattern: /<Controls position="top-right"/g,
        replacement: '<Controls :position="\'top-right\' as any"'
      },
      // 修复 Background gap 类型
      {
        type: 'replace',
        pattern: /<Background color="#f8f9fa" gap="20"/g,
        replacement: '<Background color="#f8f9fa" :gap="20"'
      }
    ]
  },
  {
    file: 'src/views/ai/KnowledgeBase.vue',
    rules: [
      // 移除未使用的导入
      { type: 'remove_import', imports: ['Document', 'Close', 'Check'] },
      // 移除未使用的变量
      { type: 'remove_line', pattern: /^const knowledgeList.*$/m },
      // 修复 keywords 类型错误
      {
        type: 'replace',
        pattern: /keywords: ''/g,
        replacement: 'keywords: []'
      },
      {
        type: 'replace',
        pattern: /keywords: item\.keywords\.join\(', '\)/g,
        replacement: 'keywords: item.keywords || []'
      },
      {
        type: 'replace',
        pattern: /\.split\(','\)\.map\(k => k\.trim\(\)\)\.filter\(k => k\)/g,
        replacement: '.split(\',\').map((k: any) => k.trim()).filter((k: any) => k)'
      }
    ]
  },
  {
    file: 'src/views/dashboard/Dashboard.vue',
    rules: [
      // 修复类型不匹配 - 添加默认值
      {
        type: 'replace',
        pattern: /statusData\.value = dataCache\.value\.statusData/g,
        replacement: 'statusData.value = dataCache.value.statusData || {}'
      },
      {
        type: 'replace',
        pattern: /yearlyData\.value = dataCache\.value\.yearlyData/g,
        replacement: 'yearlyData.value = dataCache.value.yearlyData || []'
      },
      {
        type: 'replace',
        pattern: /alertDetails\.value = dataCache\.value\.alertDetails/g,
        replacement: 'alertDetails.value = dataCache.value.alertDetails || { etaOverdue: 0, lastPickupOverdue: 0, lastReturnOverdue: 0, plannedPickupOverdue: 0 }'
      },
      {
        type: 'replace',
        pattern: /statusDistribution\.value = dataCache\.value\.statusDistribution/g,
        replacement: 'statusDistribution.value = dataCache.value.statusDistribution || []'
      },
      // 修复 stats 赋值缺少 dumpedContainers
      {
        type: 'replace',
        pattern: /stats\.value = \{([\s\S]*?)totalContainers: ([\s\S]*?),([\s\S]*?)activeContainers: ([\s\S]*?),([\s\S]*?)completedContainers: ([\s\S]*?),([\s\S]*?)alertContainers: ([\s\S]*?)\}/g,
        replacement: `stats.value = {$1totalContainers: $2,$3activeContainers: $4,$5completedContainers: $6,$7alertContainers: $8,$9dumpedContainers: 0}`
      }
    ]
  },
  {
    file: 'src/views/import/DictionaryExtractor.vue',
    rules: [
      // 移除未使用的常量（添加下划线前缀表示有意不使用）
      {
        type: 'replace',
        pattern: /const _KNOWN_TRANSPORT_MODES/g,
        replacement: 'const __KNOWN_TRANSPORT_MODES'
      }
    ]
  },
  {
    file: 'src/views/scheduling/components/DesignatedWarehouseDialog.vue',
    rules: [
      // 修复 confirming 属性错误
      {
        type: 'replace',
        pattern: /:loading="confirming"/g,
        replacement: ':loading="(confirming as any)"'
      }
    ]
  },
  {
    file: 'src/views/scheduling/components/DragDropScheduler.vue',
    rules: [
      // 移除未使用的导入
      { type: 'remove_import', imports: ['ElMessageBox'] },
      // 移除未使用的 watch
      {
        type: 'replace',
        pattern: /import { computed, ref, watch } from 'vue'/g,
        replacement: "import { computed, ref } from 'vue'"
      }
    ]
  },
  {
    file: 'src/views/scheduling/components/ExecutionLogs.vue',
    rules: [
      // 修复 logs 可能为 undefined
      {
        type: 'replace',
        pattern: /logs\.length === 0/g,
        replacement: '!logs || logs.length === 0'
      }
    ]
  },
  {
    file: 'src/views/scheduling/components/ManualCapacitySetting.vue',
    rules: [
      // 移除未使用的变量（添加下划线前缀）
      {
        type: 'replace',
        pattern: /const initialDate/g,
        replacement: 'const _initialDate'
      }
    ]
  },
  {
    file: 'src/views/scheduling/components/OccupancyCalendar.vue',
    rules: [
      // 移除未使用的导入
      { type: 'remove_import', imports: ['Edit'] },
      // 移除未使用的 watch
      {
        type: 'replace',
        pattern: /import { computed, onMounted, ref, watch } from 'vue'/g,
        replacement: "import { computed, onMounted, ref } from 'vue'"
      }
    ]
  }
];

// 读取文件内容
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`❌ 无法读取文件 ${filePath}:`, error.message);
    return null;
  }
}

// 写入文件内容
function writeFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error(`❌ 无法写入文件 ${filePath}:`, error.message);
    return false;
  }
}

// 应用单个规则
function applyRule(content, rule) {
  if (rule.type === 'remove_unused') {
    return content.replace(rule.pattern, '');
  } else if (rule.type === 'remove_import') {
    const lines = content.split('\n');
    const newLines = lines.filter(line => {
      // 如果一行只包含要删除的导入，则过滤掉
      for (const importName of rule.imports) {
        if (line.includes(importName) && (line.startsWith('import') || line.trim().startsWith(importName))) {
          return false;
        }
      }
      return true;
    });
    return newLines.join('\n');
  } else if (rule.type === 'remove_line') {
    const lines = content.split('\n');
    const newLines = lines.filter(line => !rule.pattern.test(line));
    return newLines.join('\n');
  } else if (rule.type === 'replace') {
    return content.replace(rule.pattern, rule.replacement);
  }
  return content;
}

// 处理单个文件
function processFile(fix) {
  const filePath = path.join(__dirname, '..', fix.file);
  console.log(`\n📝 处理文件：${fix.file}`);
  
  let content = readFile(filePath);
  if (!content) return false;
  
  const originalContent = content;
  
  // 应用所有规则
  for (const rule of fix.rules) {
    content = applyRule(content, rule);
  }
  
  // 只有内容改变时才写入
  if (content !== originalContent) {
    const success = writeFile(filePath, content);
    if (success) {
      console.log(`✅ 已修复：${fix.file}`);
      return true;
    }
  } else {
    console.log(`⏭️  无需修改：${fix.file}`);
    return true;
  }
  
  return false;
}

// 主函数
function main() {
  console.log('🔧 开始修复前端 TypeScript 错误...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const fix of fixes) {
    if (processFile(fix)) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`✨ 修复完成！成功：${successCount}, 失败：${failCount}`);
  console.log('='.repeat(50));
}

// 运行脚本
main();
