#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excel导入字段映射修复脚本
Field Mapping Fix Script

说明: 修复前端Excel导入的字段映射配置
"""

import re
import shutil
from datetime import datetime
from pathlib import Path

# 文件路径
FRONTEND_FILE = Path("d:/Gihub/logix/frontend/src/views/import/ExcelImport.vue")
FIXED_MAPPINGS_FILE = Path("d:/Gihub/logix/docs/FIXED_FIELD_MAPPINGS.ts")

def main():
    print("=" * 50)
    print("Excel导入字段映射修复")
    print("=" * 50)

    # 检查文件是否存在
    if not FRONTEND_FILE.exists():
        print(f"错误: 前端文件不存在 {FRONTEND_FILE}")
        return 1

    if not FIXED_MAPPINGS_FILE.exists():
        print(f"错误: 修复后的映射文件不存在 {FIXED_MAPPINGS_FILE}")
        return 1

    print("✓ 文件检查通过")

    # 备份原文件
    backup_file = FRONTEND_FILE.with_suffix(f".vue.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
    shutil.copy2(FRONTEND_FILE, backup_file)
    print(f"✓ 原文件已备份到: {backup_file.name}")

    # 读取文件内容
    with open(FRONTEND_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # 读取修复后的映射
    with open(FIXED_MAPPINGS_FILE, 'r', encoding='utf-8') as f:
        fixed_mappings_content = f.read()

    # 提取FIXED_FIELD_MAPPINGS数组内容
    match = re.search(r'FIXED_FIELD_MAPPINGS: FieldMapping\[\] = \[(.*?)\];', fixed_mappings_content, re.DOTALL)
    if not match:
        print("错误: 无法从FIXED_MAPPINGS文件中提取数组内容")
        return 1

    new_mappings = match.group(1).strip()

    # 替换FIELD_MAPPINGS数组定义
    pattern = r'(const FIELD_MAPPINGS: FieldMapping\[\] = \[)(.*?)(\])'

    new_content = re.sub(pattern, f'\\1\\n  {new_mappings}\\n', content, flags=re.DOTALL)

    # 检查是否需要添加transformBoolean函数
    if 'function transformBoolean' not in new_content:
        transform_boolean_func = '''
function transformBoolean(value: any): boolean {
  if (value === null || value === undefined || value === '') return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    return ['是', 'yes', 'true', '1', 'y'].includes(value.toLowerCase().trim())
  }
  return false
}
'''
        # 在transformLogisticsStatus之前插入
        new_content = re.sub(
            r'(function transformLogisticsStatus)',
            f'{transform_boolean_func}\\n\\n\\1',
            new_content
        )

    # 写入文件
    with open(FRONTEND_FILE, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print("✓ 字段映射已更新")
    print("\\n修复内容:")
    print("  1. 添加了缺失的字段映射")
    print("  2. 修正了字段名不匹配的问题")
    print("  3. 修正了字段错位问题")
    print("  4. 添加了transformBoolean工具函数")

    print("\\n" + "=" * 50)
    print("修复完成!")
    print("=" * 50)
    print("\\n下一步操作:")
    print("  1. 检查修复后的文件")
    print("  2. 重启前端服务以应用更改")
    print("  3. 重新导入Excel数据")

    return 0

if __name__ == '__main__':
    exit(main())
