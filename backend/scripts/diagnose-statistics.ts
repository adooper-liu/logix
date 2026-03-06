/**
 * 统计诊断脚本
 * 用于检查各维度统计的一致性和准确性
 */

import { AppDataSource } from '../src/database'
import { Container } from '../src/entities/Container'

const today = new Date()
today.setHours(0, 0, 0, 0)
const todayStr = today.toISOString().split('T')[0]

console.log('='.repeat(80))
console.log('统计诊断报告')
console.log('='.repeat(80))
console.log(`当前日期: ${todayStr}`)
console.log('')

async function runDiagnostics() {
  try {
    await AppDataSource.initialize()
    console.log('✅ 数据库连接成功')
    console.log('')

    const containerRepo = AppDataSource.getRepository(Container)

    // 1. 检查基础数据
    console.log('1. 基础数据统计')
    console.log('-'.repeat(80))
    const totalContainers = await containerRepo
      .createQueryBuilder('c')
      .select('COUNT(DISTINCT c.containerNumber)', 'count')
      .getRawOne()
    console.log(`总货柜数: ${totalContainers.count}`)

    const shippedContainers = await containerRepo
      .createQueryBuilder('c')
      .select('COUNT(DISTINCT c.containerNumber)', 'count')
      .where('c.logisticsStatus IN (:...statuses)', {
        statuses: ['shipped', 'in_transit', 'at_port', 'picked_up', 'unloaded', 'returned_empty']
      })
      .getRawOne()
    console.log(`已出运货柜数: ${shippedContainers.count}`)
    console.log('')

    // 2. 检查到港相关数据
    console.log('2. 到港数据统计')
    console.log('-'.repeat(80))

    // 有ATA的货柜
    const withATA = await containerRepo
      .createQueryBuilder('c')
      .leftJoin('c.portOperations', 'po')
      .select('COUNT(DISTINCT c.containerNumber)', 'count')
      .where('po.portType = :portType', { portType: 'destination' })
      .andWhere('po.ataDestPort IS NOT NULL')
      .getRawOne()
    console.log(`有ATA的货柜数: ${withATA.count}`)

    // 今日到港
    const arrivedToday = await containerRepo
      .createQueryBuilder('c')
      .innerJoin(
        `(
          SELECT po1.container_number, MAX(po1.ata_dest_port) as latest_ata
          FROM process_port_operations po1
          WHERE po1.port_type = 'destination'
          AND po1.ata_dest_port IS NOT NULL
          GROUP BY po1.container_number
        )`,
        'latest_po',
        'latest_po.container_number = c.containerNumber'
      )
      .select('COUNT(DISTINCT c.containerNumber)', 'count')
      .where("DATE(latest_po.latest_ata) = :today", { today: todayStr })
      .getRawOne()
    console.log(`今日到港: ${arrivedToday.count}`)

    // 今日之前到港
    const arrivedBeforeToday = await containerRepo
      .createQueryBuilder('c')
      .innerJoin(
        `(
          SELECT po1.container_number, MAX(po1.ata_dest_port) as latest_ata
          FROM process_port_operations po1
          WHERE po1.port_type = 'destination'
          AND po1.ata_dest_port IS NOT NULL
          GROUP BY po1.container_number
        )`,
        'latest_po',
        'latest_po.container_number = c.containerNumber'
      )
      .select('COUNT(DISTINCT c.containerNumber)', 'count')
      .where("DATE(latest_po.latest_ata) < :today", { today: todayStr })
      .getRawOne()
    console.log(`今日之前到港: ${arrivedBeforeToday.count}`)

    // 今日之前到港未提柜
    const arrivedBeforeTodayNotPickedUp = await containerRepo
      .createQueryBuilder('c')
      .innerJoin(
        `(
          SELECT po1.container_number, MAX(po1.ata_dest_port) as latest_ata
          FROM process_port_operations po1
          WHERE po1.port_type = 'destination'
          AND po1.ata_dest_port IS NOT NULL
          GROUP BY po1.container_number
        )`,
        'latest_po',
        'latest_po.container_number = c.containerNumber'
      )
      .select('COUNT(DISTINCT c.containerNumber)', 'count')
      .where("DATE(latest_po.latest_ata) < :today", { today: todayStr })
      .andWhere('c.logisticsStatus NOT IN (:...statuses)', {
        statuses: ['picked_up', 'unloaded', 'returned_empty']
      })
      .getRawOne()
    console.log(`今日之前到港未提柜: ${arrivedBeforeTodayNotPickedUp.count}`)

    // 今日之前到港已提柜
    const arrivedBeforeTodayPickedUp = await containerRepo
      .createQueryBuilder('c')
      .innerJoin(
        `(
          SELECT po1.container_number, MAX(po1.ata_dest_port) as latest_ata
          FROM process_port_operations po1
          WHERE po1.port_type = 'destination'
          AND po1.ata_dest_port IS NOT NULL
          GROUP BY po1.container_number
        )`,
        'latest_po',
        'latest_po.container_number = c.containerNumber'
      )
      .select('COUNT(DISTINCT c.containerNumber)', 'count')
      .where("DATE(latest_po.latest_ata) < :today", { today: todayStr })
      .andWhere('c.logisticsStatus IN (:...statuses)', {
        statuses: ['picked_up', 'unloaded', 'returned_empty']
      })
      .getRawOne()
    console.log(`今日之前到港已提柜: ${arrivedBeforeTodayPickedUp.count}`)

    // 验证今日之前到港细分
    const sumBeforeToday = parseInt(arrivedBeforeTodayNotPickedUp.count) + parseInt(arrivedBeforeTodayPickedUp.count)
    console.log(`今日之前到港细分验证: ${arrivedBeforeToday.count} = ${sumBeforeToday}`)
    console.log(`  - 差异: ${parseInt(arrivedBeforeToday.count) - sumBeforeToday}`)
    console.log('')

    // 3. 检查ETA相关数据
    console.log('3. ETA数据统计')
    console.log('-'.repeat(80))

    const withETA = await containerRepo
      .createQueryBuilder('c')
      .leftJoin('c.portOperations', 'po')
      .select('COUNT(DISTINCT c.containerNumber)', 'count')
      .where('po.portType = :portType', { portType: 'destination' })
      .andWhere('po.etaDestPort IS NOT NULL')
      .getRawOne()
    console.log(`有ETA的货柜数: ${withETA.count}`)

    const threeDaysLater = new Date(today)
    threeDaysLater.setDate(threeDaysLater.getDate() + 3)
    const threeDaysStr = threeDaysLater.toISOString().split('T')[0]

    const sevenDaysLater = new Date(today)
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
    const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0]

    // 逾期未到港
    const overdueNotArrived = await containerRepo
      .createQueryBuilder('c')
      .innerJoin(
        `(
          SELECT po1.container_number
          FROM process_port_operations po1
          WHERE po1.port_type = 'destination'
          AND po1.ata_dest_port IS NULL
          AND (po1.eta_dest_port < '${todayStr}' OR po1.eta_correction < '${todayStr}')
        )`,
        'dest_po',
        'dest_po.container_number = c.containerNumber'
      )
      .select('COUNT(DISTINCT c.containerNumber)', 'count')
      .getRawOne()
    console.log(`逾期未到港: ${overdueNotArrived.count}`)

    // 3日内预计到港
    const within3Days = await containerRepo
      .createQueryBuilder('c')
      .innerJoin(
        `(
          SELECT po1.container_number
          FROM process_port_operations po1
          WHERE po1.port_type = 'destination'
          AND po1.ata_dest_port IS NULL
          AND po1.eta_dest_port >= '${todayStr}'
          AND po1.eta_dest_port <= '${threeDaysStr}'
        )`,
        'dest_po',
        'dest_po.container_number = c.containerNumber'
      )
      .select('COUNT(DISTINCT c.containerNumber)', 'count')
      .getRawOne()
    console.log(`3日内预计到港: ${within3Days.count}`)

    console.log('')
    console.log('='.repeat(80))
    console.log('诊断完成')
    console.log('='.repeat(80))

  } catch (error) {
    console.error('诊断失败:', error)
    process.exit(1)
  } finally {
    await AppDataSource.destroy()
  }
}

runDiagnostics()
