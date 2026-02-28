#!/usr/bin/env node

/**
 * 🔧 批量修复 SCSS 变量导入脚本
 *
 * 为使用 SCSS 变量的 Vue 文件添加变量导入
 * 用法：node scripts/fix-scss-imports.cjs
 */

const fs = require('fs')
const path = require('path')

// 需要添加导入的文件列表（手动验证后添加）
const filesToFix = [
  'src/views/shipments/Shipments.vue',
  'src/views/shipments/ContainerDetailRefactored.vue',
  'src/views/shipments/components/WarehouseOperations.vue',
  'src/views/shipments/components/TruckingTransport.vue',
  'src/views/shipments/components/StatusEventsTimeline.vue',
  'src/views/shipments/components/SeaFreightInfo.vue',
  'src/views/shipments/components/PortOperations.vue',
  'src/views/shipments/components/KeyDatesTimeline.vue',
  'src/views/shipments/components/EmptyReturn.vue',
  'src/views/shipments/components/ContainerSummary.vue',
  'src/views/shipments/components/ContainerHeader.vue',
  'src/views/settings/Settings.vue',
  'src/views/Login.vue',
  'src/views/import/ExcelImport.vue',
  'src/views/dashboard/Dashboard.vue',
  'src/views/About.vue',
  'src/components/CountdownCard.vue',
]

// 统计
let fixedCount = 0
let skippedCount = 0

/**
 * 修复单个文件
 */
function fixFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const relativePath = path.relative(process.cwd(), filePath)

    // 检查是否已经有导入
    if (content.includes("@use '@/assets/styles/variables' as *")) {
      console.log(`⏭️  跳过（已有导入）: ${relativePath}`)
      skippedCount++
      return
    }

    // 检查是否有 SCSS 样式块
    if (!content.includes('<style')) {
      console.log(`⏭️  跳过（无样式块）: ${relativePath}`)
      skippedCount++
      return
    }

    // 检查是否使用了 SCSS 变量
    const hasVariables = /\$[\w-]+/.test(content)
    if (!hasVariables) {
      console.log(`⏭️  跳过（无变量使用）: ${relativePath}`)
      skippedCount++
      return
    }

    // 在 <style> 后面添加导入
    const newContent = content.replace(
      /(<style[^>]*lang=["']scss["'][^>]*>)/g,
      '$1\n@use \'@/assets/styles/variables\' as *;\n'
    )

    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent)
      console.log(`✅ 已修复: ${relativePath}`)
      fixedCount++
    } else {
      console.log(`⏭️  跳过: ${relativePath}`)
      skippedCount++
    }
  } catch (error) {
    console.error(`❌ 修复失败: ${filePath}`, error.message)
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🔧 开始批量修复 SCSS 变量导入...\n')

  filesToFix.forEach(file => {
    const fullPath = path.join(__dirname, '..', file)
    if (fs.existsSync(fullPath)) {
      fixFile(fullPath)
    } else {
      console.log(`⚠️  文件不存在: ${file}`)
    }
  })

  console.log('\n' + '='.repeat(50))
  console.log('📊 修复完成！')
  console.log('='.repeat(50))
  console.log(`修复文件数: ${fixedCount}`)
  console.log(`跳过文件数: ${skippedCount}`)
  console.log('='.repeat(50))
}

// 运行主函数
main()
