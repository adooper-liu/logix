/**
 * 飞驼智能日期更新器
 * 负责根据物流状态机推理和验证ETA/ATA更新逻辑
 */

import { AppDataSource } from '../../database';
import { Container } from '../../entities/Container';
import { SeaFreight } from '../../entities/SeaFreight';
import { PortOperation } from '../../entities/PortOperation';
import { calculateLogisticsStatus } from '../../utils/logisticsStatusMachine';
import { logger } from '../../utils/logger';

/** 日期验证结果 */
export interface DateValidationResult {
  valid: boolean;
  reason?: string;
}

/** 日期更新结果 */
export interface DateUpdateResult {
  updated: boolean;
  reason: string;
}

export class FeituoSmartDateUpdater {
  private containerRepo = AppDataSource.getRepository(Container);
  private seaFreightRepo = AppDataSource.getRepository(SeaFreight);
  private portOpRepo = AppDataSource.getRepository(PortOperation);

  /**
   * 智能ETA更新（带状态机推理和验证）
   * 根据物流状态决定ETA更新策略，并验证时间逻辑
   */
  async smartUpdateETA(
    containerNumber: string,
    newEta: Date | null,
    newAta: Date | null
  ): Promise<DateUpdateResult> {
    try {
      // 1. 获取当前物流状态
      const container = await this.containerRepo.findOne({
        where: { containerNumber },
        relations: ['seaFreight']
      });
      if (!container) {
        return { updated: false, reason: 'Container not found' };
      }

      const portOps = await this.portOpRepo
        .createQueryBuilder('p')
        .where('p.container_number = :cn', { cn: containerNumber })
        .orderBy('p.port_sequence', 'DESC')
        .getMany();

      const seaFreight = container.seaFreight;
      const destPo = portOps.find(po => po.portType === 'destination');

      // 获取当前物流状态
      const statusResult = calculateLogisticsStatus(
        container,
        portOps,
        seaFreight ?? undefined
      );
      const currentStatus = statusResult.status;

      // 2. 根据状态决定更新策略
      let updateReason = '';

      switch (currentStatus) {
        case 'not_shipped':
          // 未出运：不更新ETA
          return { updated: false, reason: 'not_shipped status, skip ETA update' };

        case 'shipped':
        case 'in_transit':
          // 在途：ETA可以更新，ATA不更新
          if (newEta) {
            const validation = this.validateETA(newEta, newAta, seaFreight?.shipmentDate || null, currentStatus);
            if (validation.valid) {
              if (seaFreight) {
                seaFreight.eta = newEta;
                await this.seaFreightRepo.save(seaFreight);
              }
              if (destPo) {
                destPo.eta = newEta;
                await this.portOpRepo.save(destPo);
              }
              updateReason = `Updated ETA in ${currentStatus} status`;
            } else {
              return { updated: false, reason: `ETA validation failed: ${validation.reason}` };
            }
          }
          break;

        case 'at_port':
          // 已到港：ETA可能需要修正（但ATA已确定）
          if (newEta && destPo?.ataDestPort) {
            // ATA已确定，ETA应该 <= ATA
            if (newEta > destPo.ataDestPort) {
              // ETA晚于ATA，需要验证或修正
              const validation = this.validateETA(newEta, destPo.ataDestPort, seaFreight?.shipmentDate || null, currentStatus);
              if (!validation.valid) {
                return { updated: false, reason: `ETA validation failed: ${validation.reason}` };
              }
            }
          }
          if (newEta && seaFreight) {
            seaFreight.eta = newEta;
            await this.seaFreightRepo.save(seaFreight);
          }
          updateReason = 'Updated ETA in at_port status';
          break;

        case 'picked_up':
        case 'unloaded':
        case 'returned_empty':
          // 已完成物流：ETA应该稳定，不建议更新
          if (newEta && !seaFreight?.eta) {
            seaFreight.eta = newEta;
            await this.seaFreightRepo.save(seaFreight);
            updateReason = `Updated ETA in ${currentStatus} status (was empty)`;
          } else {
            return { updated: false, reason: `${currentStatus} status, ETA should be stable` };
          }
          break;
      }

      return { updated: !!updateReason, reason: updateReason || 'No update needed' };
    } catch (e) {
      logger.warn('[FeituoSmartDateUpdater] smartUpdateETA failed:', e);
      return { updated: false, reason: 'Error in smartUpdateETA' };
    }
  }

  /**
   * 验证ETA是否有效
   * 规则：
   * 1. ETA不能是未来太久（shipped状态允许90天内，其他最多60天）
   * 2. ETA不能早于出运日期
   * 3. ETA不能在ATA之后
   */
  validateETA(
    eta: Date,
    ata: Date | null,
    shipDate: Date | null,
    logisticsStatus: string
  ): DateValidationResult {
    const now = new Date();

    // 规则1: ETA不能是未来太久（shipped状态允许90天内，其他最多60天）
    const maxDaysAhead = logisticsStatus === 'shipped' ? 90 : 60;
    const maxFutureDate = new Date(now.getTime() + maxDaysAhead * 24 * 60 * 60 * 1000);
    if (eta > maxFutureDate) {
      return { valid: false, reason: `ETA is too far in future (${maxDaysAhead} days)` };
    }

    // 规则2: ETA不能早于出运日期
    if (shipDate && eta < shipDate) {
      return { valid: false, reason: 'ETA is before ship date' };
    }

    // 规则3: ETA不能在ATA之后
    if (ata && eta > ata) {
      return { valid: false, reason: 'ETA is after ATA' };
    }

    return { valid: true };
  }
}

export const feituoSmartDateUpdater = new FeituoSmartDateUpdater();
