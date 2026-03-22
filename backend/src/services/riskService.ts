import { Container } from '../entities/Container';
import { SeaFreight } from '../entities/SeaFreight';
import { PortOperation } from '../entities/PortOperation';
import { TruckingTransport } from '../entities/TruckingTransport';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { EmptyReturn } from '../entities/EmptyReturn';
import { InspectionRecord } from '../entities/InspectionRecord';
import { ContainerRiskAssessment, RiskLevel } from '../entities/ContainerRiskAssessment';
import { AppDataSource } from '../database';
import { logger } from '../utils/logger';

export class RiskService {
  private containerRepository = AppDataSource.getRepository(Container);
  private seaFreightRepository = AppDataSource.getRepository(SeaFreight);
  private portOperationRepository = AppDataSource.getRepository(PortOperation);
  private truckingRepository = AppDataSource.getRepository(TruckingTransport);
  private warehouseRepository = AppDataSource.getRepository(WarehouseOperation);
  private emptyReturnRepository = AppDataSource.getRepository(EmptyReturn);
  private inspectionRepository = AppDataSource.getRepository(InspectionRecord);
  private riskRepository = AppDataSource.getRepository(ContainerRiskAssessment);

  // 获取货柜风险评估
  async getContainerRiskAssessment(containerNumber: string): Promise<ContainerRiskAssessment | null> {
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

    // 1. 查验风险
    const inspectionRisk = this.assessInspectionRisk(inspection);
    if (inspectionRisk.score > 0) {
      riskFactors.push(inspectionRisk);
      totalScore += inspectionRisk.score;
    }

    // 2. 拖卡风险
    const truckingRisk = this.assessTruckingRisk(trucking, container);
    if (truckingRisk.score > 0) {
      riskFactors.push(truckingRisk);
      totalScore += truckingRisk.score;
    }

    // 3. 卸柜风险
    const unloadingRisk = this.assessUnloadingRisk(warehouseOp, trucking);
    if (unloadingRisk.score > 0) {
      riskFactors.push(unloadingRisk);
      totalScore += unloadingRisk.score;
    }

    // 4. 还箱风险
    const returnRisk = this.assessReturnRisk(emptyReturn, warehouseOp, trucking);
    if (returnRisk.score > 0) {
      riskFactors.push(returnRisk);
      totalScore += returnRisk.score;
    }

    // 5. 滞港/滞箱风险
    const demurrageRisk = this.assessDemurrageRisk(container, trucking);
    if (demurrageRisk.score > 0) {
      riskFactors.push(demurrageRisk);
      totalScore += demurrageRisk.score;
    }

    // 计算风险等级
    const riskLevel = this.calculateRiskLevel(totalScore);

    // 生成建议
    const recommendation = this.generateRecommendation(riskLevel, riskFactors);

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
  private assessInspectionRisk(inspection: any): { factor: string; score: number; description: string } {
    if (!inspection) {
      return { factor: '查验风险', score: 0, description: '无查验记录' };
    }

    if (inspection.customsClearanceStatus && 
        inspection.customsClearanceStatus !== '全部放行' && 
        inspection.customsClearanceStatus !== '退运完成') {
      const inspectionDate = inspection.inspectionDate || inspection.inspectionNoticeDate;
      if (inspectionDate) {
        const daysSinceInspection = Math.ceil((new Date().getTime() - new Date(inspectionDate).getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceInspection > 7) {
          return { factor: '查验风险', score: 80, description: `查验已持续 ${daysSinceInspection} 天，仍未完成` };
        } else if (daysSinceInspection > 3) {
          return { factor: '查验风险', score: 50, description: `查验已持续 ${daysSinceInspection} 天` };
        }
      }
    }

    return { factor: '查验风险', score: 0, description: '查验正常' };
  }

  // 评估拖卡风险（提柜时间字段：process_trucking_transport.pickup_date → pickupDate）
  private assessTruckingRisk(trucking: any, container: Container): { factor: string; score: number; description: string } {
    if (trucking?.pickupDate) {
      return { factor: '拖卡风险', score: 0, description: '已提柜' };
    }

    if (container.portOperations) {
      const destinationPort = container.portOperations.find(op => op.portType === 'destination');
      if (destinationPort?.ata) {
        const ata = new Date(destinationPort.ata);
        const daysSinceArrival = Math.ceil((new Date().getTime() - ata.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceArrival > 7) {
          return { factor: '拖卡风险', score: 70, description: `已到港 ${daysSinceArrival} 天未提柜` };
        } else if (daysSinceArrival > 3) {
          return { factor: '拖卡风险', score: 40, description: `已到港 ${daysSinceArrival} 天未提柜` };
        }
      }
    }

    return { factor: '拖卡风险', score: 0, description: '正常' };
  }

  // 评估卸柜风险（卸柜：unload_date / unboxing_time）
  private assessUnloadingRisk(warehouseOp: any, trucking: any): { factor: string; score: number; description: string } {
    const unloadDone = warehouseOp?.unloadDate ?? warehouseOp?.unboxingTime;
    if (unloadDone) {
      return { factor: '卸柜风险', score: 0, description: '已卸柜' };
    }

    if (trucking?.pickupDate) {
      const pickupDate = new Date(trucking.pickupDate);
      const daysSincePickup = Math.ceil((new Date().getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSincePickup > 5) {
        return { factor: '卸柜风险', score: 60, description: `已提柜 ${daysSincePickup} 天未卸柜` };
      } else if (daysSincePickup > 3) {
        return { factor: '卸柜风险', score: 30, description: `已提柜 ${daysSincePickup} 天未卸柜` };
      }
    }

    return { factor: '卸柜风险', score: 0, description: '正常' };
  }

  // 评估还箱风险
  private assessReturnRisk(emptyReturn: any, warehouseOp: any, trucking: any): { factor: string; score: number; description: string } {
    if (emptyReturn?.returnTime) {
      return { factor: '还箱风险', score: 0, description: '已还箱' };
    }

    const unloadDone = warehouseOp?.unloadDate ?? warehouseOp?.unboxingTime;
    if (unloadDone) {
      const unloadingDate = new Date(unloadDone);
      const daysSinceUnloading = Math.ceil((new Date().getTime() - unloadingDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceUnloading > 7) {
        return { factor: '还箱风险', score: 75, description: `已卸柜 ${daysSinceUnloading} 天未还箱` };
      } else if (daysSinceUnloading > 4) {
        return { factor: '还箱风险', score: 45, description: `已卸柜 ${daysSinceUnloading} 天未还箱` };
      }
    } else if (trucking?.pickupDate) {
      const pickupDate = new Date(trucking.pickupDate);
      const daysSincePickup = Math.ceil((new Date().getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSincePickup > 10) {
        return { factor: '还箱风险', score: 65, description: `已提柜 ${daysSincePickup} 天未还箱` };
      }
    }

    return { factor: '还箱风险', score: 0, description: '正常' };
  }

  // 评估滞港/滞箱风险
  private assessDemurrageRisk(container: Container, trucking: any): { factor: string; score: number; description: string } {
    let score = 0;
    let description = '正常';

    // 滞港费风险
    if (container.portOperations) {
      const destinationPort = container.portOperations.find(op => op.portType === 'destination');
      if (destinationPort?.ata) {
        const ata = new Date(destinationPort.ata);
        const freeDays = 7; // 假设免费期为7天
        const latestPickupDate = new Date(ata);
        latestPickupDate.setDate(latestPickupDate.getDate() + freeDays);
        
        const daysOverdue = Math.ceil((new Date().getTime() - latestPickupDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysOverdue > 0) {
          score += Math.min(daysOverdue * 5, 50);
          description = `已产生 ${daysOverdue} 天滞港费`;
        }
      }
    }

    // 滞箱费风险
    if (trucking?.pickupDate) {
      const pickupDate = new Date(trucking.pickupDate);
      const freeDays = 7; // 假设免费用箱期为7天
      const latestReturnDate = new Date(pickupDate);
      latestReturnDate.setDate(latestReturnDate.getDate() + freeDays);
      
      const daysOverdue = Math.ceil((new Date().getTime() - latestReturnDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysOverdue > 0) {
        score += Math.min(daysOverdue * 5, 50);
        if (description !== '正常') {
          description += `，已产生 ${daysOverdue} 天滞箱费`;
        } else {
          description = `已产生 ${daysOverdue} 天滞箱费`;
        }
      }
    }

    return { factor: '滞港/滞箱风险', score, description };
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

  // 生成建议
  private generateRecommendation(riskLevel: RiskLevel, riskFactors: Array<{ factor: string; score: number; description: string }>): string {
    const highRiskFactors = riskFactors.filter(factor => factor.score > 50);
    
    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        return `紧急：${highRiskFactors.map(f => f.description).join('；')}，请立即处理`;
      case RiskLevel.HIGH:
        return `高风险：${highRiskFactors.map(f => f.description).join('；')}，请尽快处理`;
      case RiskLevel.MEDIUM:
        return `中风险：${highRiskFactors.map(f => f.description).join('；')}，请关注处理`;
      case RiskLevel.LOW:
        return '低风险，正常监控即可';
      default:
        return '风险评估正常';
    }
  }
}
