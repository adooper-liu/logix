import { Container } from '../entities/Container';
import { SeaFreight } from '../entities/SeaFreight';
import { PortOperation } from '../entities/PortOperation';
import { TruckingTransport } from '../entities/TruckingTransport';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { EmptyReturn } from '../entities/EmptyReturn';
import { InspectionRecord } from '../entities/InspectionRecord';
import { ContainerRiskAssessment, RiskLevel } from '../entities/ContainerRiskAssessment';
import { ExtDemurrageStandard } from '../entities/ExtDemurrageStandard';
import { ExtDemurrageRecord } from '../entities/ExtDemurrageRecord';
import { Country } from '../entities/Country';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { AppDataSource } from '../database';
import { logger } from '../utils/logger';
import {
  calculateLogisticsStatus,
  getSimplifiedStatusText,
  SimplifiedStatus,
  type LogisticsStatusResult
} from '../utils/logisticsStatusMachine';
import { DemurrageService } from './demurrage.service';

/** 与 demurrage.service 一致，用于分项汇总计费天数 */
function isCombinedDemurrageDetention(std: {
  chargeTypeCode?: string | null;
  chargeName?: string | null;
}): boolean {
  const code = (std.chargeTypeCode ?? '').toUpperCase();
  const name = (std.chargeName ?? '').toLowerCase();
  const hasDem = code.includes('DEMURRAGE') || name.includes('demurrage') || name.includes('滞港');
  const hasDet = code.includes('DETENTION') || name.includes('detention') || name.includes('滞箱');
  return hasDem && hasDet;
}

function isDetentionCharge(std: {
  chargeTypeCode?: string | null;
  chargeName?: string | null;
}): boolean {
  if (isCombinedDemurrageDetention(std)) return false;
  const code = (std.chargeTypeCode ?? '').toUpperCase();
  const name = (std.chargeName ?? '').toLowerCase();
  return code.includes('DETENTION') || name.includes('detention') || name.includes('滞箱');
}

function isStorageCharge(std: {
  chargeTypeCode?: string | null;
  chargeName?: string | null;
}): boolean {
  if (isDetentionCharge(std)) return false;
  if (isCombinedDemurrageDetention(std)) return false;
  const code = (std.chargeTypeCode ?? '').toUpperCase();
  const name = (std.chargeName ?? '').toLowerCase();
  return code.includes('STORAGE') || name.includes('storage') || name.includes('堆存');
}

export class RiskService {
  private containerRepository = AppDataSource.getRepository(Container);
  private portOperationRepository = AppDataSource.getRepository(PortOperation);
  private truckingRepository = AppDataSource.getRepository(TruckingTransport);
  private warehouseRepository = AppDataSource.getRepository(WarehouseOperation);
  private emptyReturnRepository = AppDataSource.getRepository(EmptyReturn);
  private inspectionRepository = AppDataSource.getRepository(InspectionRecord);
  private riskRepository = AppDataSource.getRepository(ContainerRiskAssessment);
  private demurrageService = new DemurrageService(
    AppDataSource.getRepository (ExtDemurrageStandard),
    AppDataSource.getRepository (Container),
    AppDataSource.getRepository (PortOperation),
    AppDataSource.getRepository (SeaFreight),
    AppDataSource.getRepository (TruckingTransport),
    AppDataSource.getRepository (EmptyReturn),
    AppDataSource.getRepository (ReplenishmentOrder),
    AppDataSource.getRepository (Country), // 使用 Country repository
    AppDataSource.getRepository (ExtDemurrageRecord)
  );

  // 获取货柜风险评估
  async getContainerRiskAssessment(
    containerNumber: string
  ): Promise<ContainerRiskAssessment | null> {
    try {
      // 加载货柜及其关联实体
      const container = await this.containerRepository.findOne({
        where: { containerNumber },
        relations: ['seaFreight', 'portOperations']
      });

      if (!container) {
        return null;
      }

      // 加载拖卡、卸柜、还箱、查验记录
      const trucking = await this.truckingRepository.findOne({
        where: { containerNumber },
        order: { createdAt: 'DESC' }
      });

      const warehouseOp = await this.warehouseRepository.findOne({
        where: { containerNumber },
        order: { createdAt: 'DESC' }
      });

      const emptyReturn = await this.emptyReturnRepository.findOne({
        where: { containerNumber },
        order: { createdAt: 'DESC' }
      });

      const inspection = await this.inspectionRepository.findOne({
        where: { containerNumber }
      });

      // 评估风险
      const riskAssessment = await this.assessContainerRisk(
        container,
        trucking,
        warehouseOp,
        emptyReturn,
        inspection
      );

      // 保存风险评估到数据库
      await this.riskRepository.save(riskAssessment);

      return riskAssessment;
    } catch (error) {
      logger.error('[RiskService] 获取风险评估失败', error);
      throw error;
    }
  }

  // 评估货柜风险
  private async assessContainerRisk(
    container: Container,
    trucking: any,
    warehouseOp: any,
    emptyReturn: any,
    inspection: any
  ): Promise<ContainerRiskAssessment> {
    const riskFactors: Array<{ factor: string; score: number; description: string }> = [];
    let totalScore = 0;

    const portOps = container.portOperations ?? [];
    const seaFreight = container.seaFreight ?? undefined;
    const logistics = calculateLogisticsStatus(
      container,
      portOps,
      seaFreight,
      trucking ?? undefined,
      warehouseOp ?? undefined,
      emptyReturn ?? undefined
    );
    const ls = logistics.status;

    // 1. 查验风险
    const inspectionRisk = this.assessInspectionRisk(inspection);
    if (inspectionRisk.score > 0) {
      riskFactors.push(inspectionRisk);
      totalScore += inspectionRisk.score;
    }

    // 2. 拖卡风险（与状态机一致：已提柜/已卸柜/已还箱不再报「到港未提柜」）
    const truckingRisk = this.assessTruckingRisk(trucking, container, ls);
    if (truckingRisk.score > 0) {
      riskFactors.push(truckingRisk);
      totalScore += truckingRisk.score;
    }

    // 3. 卸柜风险（unloaded / returned_empty 不再报「未卸柜」）
    const unloadingRisk = this.assessUnloadingRisk(warehouseOp, trucking, ls);
    if (unloadingRisk.score > 0) {
      riskFactors.push(unloadingRisk);
      totalScore += unloadingRisk.score;
    }

    // 4. 还箱风险（已还箱则不再报）
    const returnRisk = this.assessReturnRisk(emptyReturn, warehouseOp, trucking, ls);
    if (returnRisk.score > 0) {
      riskFactors.push(returnRisk);
      totalScore += returnRisk.score;
    }

    // 5. 滞港/滞箱：与 DemurrageService.calculateForContainer 一致（last_free_date、标准阶梯等）
    const demurrageRisk = await this.assessDemurrageRiskFromService(container.containerNumber, ls);
    if (demurrageRisk.score > 0) {
      riskFactors.push(demurrageRisk);
      totalScore += demurrageRisk.score;
    }

    // 计算风险等级
    const riskLevel = this.calculateRiskLevel(totalScore);

    // 生成建议
    const recommendation = this.generateRecommendation(riskLevel, riskFactors, logistics);

    // 创建风险评估记录
    return this.riskRepository.create({
      containerNumber: container.containerNumber,
      riskScore: totalScore,
      riskLevel,
      riskFactors: riskFactors.length > 0 ? riskFactors : undefined,
      recommendation: recommendation || undefined
    });
  }

  // 评估查验风险
  private assessInspectionRisk(inspection: any): {
    factor: string;
    score: number;
    description: string;
  } {
    if (!inspection) {
      return { factor: '查验风险', score: 0, description: '无查验记录' };
    }

    if (
      inspection.customsClearanceStatus &&
      inspection.customsClearanceStatus !== '全部放行' &&
      inspection.customsClearanceStatus !== '退运完成'
    ) {
      const inspectionDate = inspection.inspectionDate || inspection.inspectionNoticeDate;
      if (inspectionDate) {
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysSinceInspection = Math.ceil(
          (new Date().getTime() - new Date(inspectionDate).getTime()) / msPerDay
        );

        if (daysSinceInspection > 7) {
          return {
            factor: '查验风险',
            score: 80,
            description: `查验已持续 ${daysSinceInspection} 天，仍未完成`
          };
        } else if (daysSinceInspection > 3) {
          return {
            factor: '查验风险',
            score: 50,
            description: `查验已持续 ${daysSinceInspection} 天`
          };
        }
      }
    }

    return { factor: '查验风险', score: 0, description: '查验正常' };
  }

  // 评估拖卡风险（提柜时间字段：process_trucking_transport.pickup_date → pickupDate）
  private assessTruckingRisk(
    trucking: any,
    container: Container,
    logisticsStatus: string
  ): { factor: string; score: number; description: string } {
    if (
      logisticsStatus === SimplifiedStatus.PICKED_UP ||
      logisticsStatus === SimplifiedStatus.UNLOADED ||
      logisticsStatus === SimplifiedStatus.RETURNED_EMPTY
    ) {
      return {
        factor: '拖卡风险',
        score: 0,
        description: trucking?.pickupDate ? '已提柜' : '已进入提柜后环节（状态机）'
      };
    }

    if (trucking?.pickupDate) {
      return { factor: '拖卡风险', score: 0, description: '已提柜' };
    }

    if (container.portOperations) {
      const destinationPort = container.portOperations.find((op) => op.portType === 'destination');
      if (destinationPort?.ata) {
        const ata = new Date(destinationPort.ata);
        const daysSinceArrival = Math.ceil(
          (new Date().getTime() - ata.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceArrival > 7) {
          return {
            factor: '拖卡风险',
            score: 70,
            description: `已到港 ${daysSinceArrival} 天未提柜`
          };
        } else if (daysSinceArrival > 3) {
          return {
            factor: '拖卡风险',
            score: 40,
            description: `已到港 ${daysSinceArrival} 天未提柜`
          };
        }
      }
    }

    return { factor: '拖卡风险', score: 0, description: '正常' };
  }

  // 评估卸柜风险（卸柜：unload_date / unboxing_time；与 calculateLogisticsStatus 的 unloaded 对齐）
  private assessUnloadingRisk(
    warehouseOp: any,
    trucking: any,
    logisticsStatus: string
  ): { factor: string; score: number; description: string } {
    if (
      logisticsStatus === SimplifiedStatus.UNLOADED ||
      logisticsStatus === SimplifiedStatus.RETURNED_EMPTY
    ) {
      return { factor: '卸柜风险', score: 0, description: '已卸柜或已还箱（状态机）' };
    }

    const unloadDone = warehouseOp?.unloadDate ?? warehouseOp?.unboxingTime;
    if (unloadDone) {
      return { factor: '卸柜风险', score: 0, description: '已卸柜' };
    }

    if (trucking?.pickupDate) {
      const pickupDate = new Date(trucking.pickupDate);
      const daysSincePickup = Math.ceil(
        (new Date().getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const statusLabel = getSimplifiedStatusText(SimplifiedStatus.PICKED_UP);

      if (daysSincePickup > 5) {
        return {
          factor: '卸柜风险',
          score: 60,
          description: `当前「${statusLabel}」：提柜后 ${daysSincePickup} 天仍未卸柜`
        };
      } else if (daysSincePickup > 3) {
        return {
          factor: '卸柜风险',
          score: 30,
          description: `当前「${statusLabel}」：提柜后 ${daysSincePickup} 天仍未卸柜`
        };
      }
    }

    return { factor: '卸柜风险', score: 0, description: '正常' };
  }

  // 评估还箱风险
  private assessReturnRisk(
    emptyReturn: any,
    warehouseOp: any,
    trucking: any,
    logisticsStatus: string
  ): { factor: string; score: number; description: string } {
    if (logisticsStatus === SimplifiedStatus.RETURNED_EMPTY) {
      return { factor: '还箱风险', score: 0, description: '已还箱（状态机）' };
    }

    if (emptyReturn?.returnTime) {
      return { factor: '还箱风险', score: 0, description: '已还箱' };
    }

    const unloadDone = warehouseOp?.unloadDate ?? warehouseOp?.unboxingTime;
    if (unloadDone) {
      const unloadingDate = new Date(unloadDone);
      const daysSinceUnloading = Math.ceil(
        (new Date().getTime() - unloadingDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const statusLabel = getSimplifiedStatusText(SimplifiedStatus.UNLOADED);

      if (daysSinceUnloading > 7) {
        return {
          factor: '还箱风险',
          score: 75,
          description: `当前「${statusLabel}」：卸柜后 ${daysSinceUnloading} 天仍未还箱`
        };
      } else if (daysSinceUnloading > 4) {
        return {
          factor: '还箱风险',
          score: 45,
          description: `当前「${statusLabel}」：卸柜后 ${daysSinceUnloading} 天仍未还箱`
        };
      }
    } else if (trucking?.pickupDate) {
      // 状态机为「已提柜」时，下一环节是卸柜，还箱风险待卸柜完成后再评估，避免与卸柜风险重复提示
      if (logisticsStatus === SimplifiedStatus.PICKED_UP) {
        return { factor: '还箱风险', score: 0, description: '待卸柜后关注还箱' };
      }

      const pickupDate = new Date(trucking.pickupDate);
      const daysSincePickup = Math.ceil(
        (new Date().getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSincePickup > 10) {
        return {
          factor: '还箱风险',
          score: 65,
          description: `已提柜 ${daysSincePickup} 天未还箱`
        };
      }
    }

    return { factor: '还箱风险', score: 0, description: '正常' };
  }

  /**
   * 滞港/滞箱风险：复用 DemurrageService.calculateForContainer（含 last_free_date、标准匹配、阶梯费率）
   * 已还箱：不再累计在途滞箱类风险（费用历史仍可能在 result 中，此处不展示为高优先级）
   */
  private async assessDemurrageRiskFromService(
    containerNumber: string,
    logisticsStatus: string
  ): Promise<{ factor: string; score: number; description: string }> {
    if (logisticsStatus === SimplifiedStatus.RETURNED_EMPTY) {
      return { factor: '滞港/滞箱风险', score: 0, description: '已还箱（状态机）' };
    }

    try {
      const { result, message } =
        await this.demurrageService.calculateForContainer(containerNumber);

      if (!result?.items?.length) {
        return {
          factor: '滞港/滞箱风险',
          score: 0,
          description: message ?? '暂无滞港/滞箱计费项或未匹配标准'
        };
      }

      let portChargeDays = 0;
      let boxChargeDays = 0;
      let storageChargeDays = 0;

      for (const item of result.items) {
        if (!item.chargeDays || item.chargeDays <= 0) continue;
        const std = { chargeTypeCode: item.chargeTypeCode, chargeName: item.chargeName };
        const d = item.chargeDays;
        if (isStorageCharge(std)) {
          storageChargeDays += d;
        } else if (isCombinedDemurrageDetention(std)) {
          portChargeDays += d / 2;
          boxChargeDays += d / 2;
        } else if (isDetentionCharge(std)) {
          boxChargeDays += d;
        } else {
          portChargeDays += d;
        }
      }

      const portScore = Math.min(Math.round(portChargeDays) * 5, 50);
      const boxScore = Math.min(Math.round(boxChargeDays) * 5, 50);
      const storageScore = Math.min(Math.round(storageChargeDays) * 3, 25);
      let score = Math.min(100, portScore + boxScore + storageScore);

      const parts: string[] = [];
      if (portChargeDays > 0) {
        parts.push(`港区超期计费约 ${Math.round(portChargeDays)} 天`);
      }
      if (boxChargeDays > 0) {
        parts.push(`用箱超期计费约 ${Math.round(boxChargeDays)} 天`);
      }
      if (storageChargeDays > 0) {
        parts.push(`堆存计费约 ${Math.round(storageChargeDays)} 天`);
      }
      if (result.totalAmount > 0) {
        parts.push(`预计费用合计 ${result.currency} ${Number(result.totalAmount).toFixed(2)}`);
      }

      if (parts.length === 0) {
        score = 0;
      }

      return {
        factor: '滞港/滞箱风险',
        score,
        description: parts.length > 0 ? parts.join('；') : (message ?? '无超期计费天数')
      };
    } catch (e) {
      logger.warn('[RiskService] assessDemurrageRiskFromService failed', e);
      return { factor: '滞港/滞箱风险', score: 0, description: '滞港费计算暂不可用' };
    }
  }

  // 计算风险等级
  private calculateRiskLevel(score: number): RiskLevel {
    if (score >= 150) {
      return RiskLevel.CRITICAL;
    } else if (score >= 100) {
      return RiskLevel.HIGH;
    } else if (score >= 50) {
      return RiskLevel.MEDIUM;
    } else {
      return RiskLevel.LOW;
    }
  }

  // 生成建议（前缀：状态机当前状态与 reason，便于与「卸柜/还箱」等因子对齐）
  private generateRecommendation(
    riskLevel: RiskLevel,
    riskFactors: Array<{ factor: string; score: number; description: string }>,
    logistics: LogisticsStatusResult
  ): string {
    const statusLine = `当前物流状态：「${getSimplifiedStatusText(logistics.status)}」${
      logistics.reason ? ` — ${logistics.reason}` : ''
    }。`;

    const highRiskFactors = riskFactors.filter((factor) => factor.score > 50);

    let body: string;
    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        body = `紧急：${highRiskFactors.map((f) => f.description).join('；')}，请立即处理`;
        break;
      case RiskLevel.HIGH:
        body = `高风险：${highRiskFactors.map((f) => f.description).join('；')}，请尽快处理`;
        break;
      case RiskLevel.MEDIUM:
        body = `中风险：${highRiskFactors.map((f) => f.description).join('；')}，请关注处理`;
        break;
      case RiskLevel.LOW:
        body = '低风险，正常监控即可';
        break;
      default:
        body = '风险评估正常';
    }
    return statusLine + body;
  }
}
