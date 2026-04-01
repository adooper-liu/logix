// @ts-nocheck
// TD-008：calculateLogisticsStatus 入参与 PortOperation 字段与实体一致后再移除
/**
 * 飞驼智能日期更新器
 * 负责根据物流状态机推理和验证ETA/ATA更新逻辑
 *
 * 遵循 SKILL: feituo-eta-ata-state-machine
 *
 * 核心原则：
 * 1. 优先接收并存储从可靠数据源获取的原始时间戳
 * 2. 校验应是"软"的，产生警告而非阻断
 * 3. 内部一致性校验：ATA必须晚于上一港的ATD
 * 4. 与ETA/ATA的合理性校验：差值是否在合理范围内
 */

import { AppDataSource } from '../../database';
import { Container } from '../../entities/Container';
import { SeaFreight } from '../../entities/SeaFreight';
import { PortOperation } from '../../entities/PortOperation';
import { calculateLogisticsStatus } from '../../utils/logisticsStatusMachine';
import { logger } from '../../utils/logger';

/** ETA验证结果 */
export interface ETAValidationResult {
  valid: boolean;
  warnings?: string[]; // 软警告，不阻断但需要人工复核
  reason?: string; // 硬错误原因
}

/** 日期验证结果 */
export interface DateValidationResult {
  valid: boolean;
  warnings?: string[]; // 软警告，不阻断但需要人工复核
  reason?: string; // 硬错误原因
}

/** 日期更新结果 */
export interface DateUpdateResult {
  updated: boolean;
  reason: string;
  warnings?: string[]; // 更新时产生的警告
}

/** ATA验证参数 - 增强版，包含港口操作链信息 */
export interface ATAValidationParams {
  ata: Date | null;
  eta: Date | null;
  shipDate: Date | null;
  logisticsStatus: string;
  portType: 'origin' | 'transit' | 'destination' | null;
  // 新增：港口操作链信息，用于内部一致性校验
  portOperations?: {
    portSequence: number;
    portType: 'origin' | 'transit' | 'destination';
    ata: Date | null; // 本港ATA
    atd: Date | null; // 本港ATD
    eta: Date | null; // 本港ETA
    etd: Date | null; // 本港ETD
  }[];
  // 上一港信息
  previousPort?: {
    portSequence: number;
    portType: 'origin' | 'transit' | 'destination';
    atd: Date | null; // 上一港ATD
    ata: Date | null; // 上一港ATA
  };
  // 拖卡运输信息（用于一致性校验）
  truckingTransport?: {
    pickupDate: Date | null; // 提柜日期
    deliveryDate: Date | null; // 送仓日期
    gateInTime: Date | null; // 进闸时间
  };
  // 仓库操作信息（用于一致性校验）
  warehouseOperation?: {
    wmsConfirmDate: Date | null; // WMS确认日期
    inboundDate: Date | null; // 入库日期
  };
}

/** ETA验证参数 - 增强版，包含拖卡运输和仓库操作信息 */
export interface ETAValidationParams {
  eta: Date;
  ata: Date | null;
  shipDate: Date | null;
  logisticsStatus: string;
  // 拖卡运输信息（用于一致性校验）
  truckingTransport?: {
    pickupDate: Date | null; // 计划提柜日
    plannedDeliveryDate: Date | null; // 计划送仓日
  };
  // 仓库信息（用于可用性校验）
  warehouseOperation?: {
    plannedUnloadDate: Date | null; // 计划卸柜日
  };
}

/**
 * 飞驼状态码优先级配置
 * 数字越大优先级越高，用于确定多条港口操作记录中哪个是最新的
 *
 * 优先级分层：
 * - 最终状态（最高）: 还箱、提货
 * - 关键节点: 装船、卸船、海关放行
 * - 运输状态: 抵港、离港
 * - 场站操作: 进场、出场
 * - 起始状态（最低）: 提空箱
 */
export const STATUS_CODE_PRIORITY: Record<string, number> = {
  // ===== 最终状态（最高优先级 80-100）=====
  RCVE: 100, // 还箱 - 运输结束
  STCS: 95, // 出闸 - 提货完成

  // ===== 关键节点（60-80）=====
  LOBD: 80, // 装船 - 海运开始
  DSCH: 80, // 卸船 - 海运结束/火车开始
  PASS: 78, // 海关放行 - 通关完成
  AVLE: 75, // 可提柜 - 待提货

  // ===== 火车/海铁联运专用 =====
  IRDS: 73, // 火车卸箱 - 火车运输结束
  IRAR: 72, // 火车到站
  IRDP: 70, // 火车离站
  IRLB: 65, // 火车装箱
  PLFD: 68, // 铁路免柜期/最后免费日
  RTNT: 90, // 铁路还箱（等同于RCVE）

  // ===== 运输状态（40-60）=====
  DLPT: 60, // 卸船（码头）
  BDAR: 58, // 靠泊
  ARRI: 55, // 到港
  DEPA: 50, // 离港

  // ===== 场站操作（30-45）=====
  GITM: 45, // 进闸
  DISC: 42, // 卸船（集装箱）
  LOAD: 40, // 装船（集装箱）
  GTOT: 38, // 提柜
  GTIN: 36, // 进柜

  // ===== 驳船专用 =====
  FDDP: 55, // 驳船卸货
  FDLB: 50, // 驳船装货
  FDBA: 48, // 驳船靠泊
  STSP: 45, // 驳船启航

  // ===== 中转操作 =====
  TSDP: 52, // 中转卸货
  TSBA: 48, // 中转开始

  // ===== 码头操作 =====
  POCA: 46, // 泊位
  CUIP: 35, // 查验开始
  CPI: 38, // 查验中
  CPI_I: 40 // 查验完成
};

export class FeituoSmartDateUpdater {
  private containerRepo = AppDataSource.getRepository(Container);
  private seaFreightRepo = AppDataSource.getRepository(SeaFreight);
  private portOpRepo = AppDataSource.getRepository(PortOperation);

  // ==================== 状态码优先级算法 ====================

  /**
   * 获取状态码优先级
   * @param statusCode 状态码
   * @returns 优先级数值（越大越高），未知状态码返回0
   */
  getStatusCodePriority(statusCode: string | null | undefined): number {
    if (!statusCode) return 0;
    return STATUS_CODE_PRIORITY[statusCode] ?? 0;
  }

  // 最终状态码列表（特殊规则）
  private readonly FINAL_STATUS_CODES = ['RCVE', 'STCS', 'RTNT', 'EMTY'];

  /**
   * 从多条港口操作记录中找出最新的记录
   *
   * 算法逻辑：
   * 1. 特殊规则：如果存在最终状态（还箱/完结），在最终状态中按港口+时间选择
   * 2. 常规规则：港口顺序 → 状态优先级 → 时间戳
   *
   * 业务逻辑：
   * - 物流的核心是"货物在哪"，port_sequence代表物理位置
   * - 但最终状态（RCVE/STCS/RTNT/EMTY）代表运输链结束，需要特殊处理
   * - 同状态内，运输路径更靠后的优先
   * - 同港口内，时间最新的优先
   *
   * @param portOps 港口操作记录数组
   * @param portType 可选：按港口类型过滤
   * @returns 最新的港口操作记录
   */
  findLatestPortOperation<
    T extends {
      statusCode?: string | null;
      statusOccurredAt?: Date | null;
      portSequence?: number;
      portType?: string | null;
    }
  >(portOps: T[], portType?: 'origin' | 'transit' | 'destination'): T | null {
    if (!portOps || portOps.length === 0) {
      return null;
    }

    // 第0层：数据清洗 - 过滤不合理数据
    const cleaned = this.cleanPortOperationRecords(portOps);
    if (cleaned.length === 0) {
      logger.debug(
        `[FeituoSmartDateUpdater] findLatestPortOperation: all records filtered by data cleaning`
      );
      return null;
    }

    // 按港口类型过滤
    const filtered = portType ? cleaned.filter((po) => po.portType === portType) : cleaned;

    if (filtered.length === 0) {
      return null;
    }

    // 特殊规则：如果存在最终状态，优先在最终状态中选择
    const finalRecords = filtered.filter((r) =>
      this.FINAL_STATUS_CODES.includes(r.statusCode || '')
    );

    if (finalRecords.length > 0) {
      // 在最终状态中，按港口顺序→时间选择
      const sorted = [...finalRecords].sort((a, b) => {
        const portDiff = (b.portSequence ?? 0) - (a.portSequence ?? 0);
        if (portDiff !== 0) return portDiff;

        const timeA = a.statusOccurredAt ? new Date(a.statusOccurredAt).getTime() : 0;
        const timeB = b.statusOccurredAt ? new Date(b.statusOccurredAt).getTime() : 0;
        return timeB - timeA;
      });

      logger.debug(
        `[FeituoSmartDateUpdater] findLatestPortOperation: selected final status - portSequence=${sorted[0].portSequence}, statusCode=${sorted[0].statusCode}`
      );
      return sorted[0];
    }

    // 常规规则：港口顺序 → 状态优先级 → 时间戳

    // 阶段1: 按港口顺序倒序（port_sequence大的优先）
    const sortedBySequence = [...filtered].sort(
      (a, b) => (b.portSequence ?? 0) - (a.portSequence ?? 0)
    );

    const maxSequence = sortedBySequence[0].portSequence ?? 0;
    const samePortRecords = sortedBySequence.filter((r) => (r.portSequence ?? 0) === maxSequence);

    if (samePortRecords.length === 1) {
      logger.debug(
        `[FeituoSmartDateUpdater] findLatestPortOperation: selected by port sequence - portSequence=${samePortRecords[0].portSequence}, statusCode=${samePortRecords[0].statusCode}`
      );
      return samePortRecords[0];
    }

    // 阶段2: 同港口内按状态码优先级倒序
    const sortedByStatus = [...samePortRecords].sort(
      (a, b) => this.getStatusCodePriority(b.statusCode) - this.getStatusCodePriority(a.statusCode)
    );

    const maxStatusPriority = this.getStatusCodePriority(sortedByStatus[0].statusCode);
    const sameStatusRecords = sortedByStatus.filter(
      (r) => this.getStatusCodePriority(r.statusCode) === maxStatusPriority
    );

    if (sameStatusRecords.length === 1) {
      logger.debug(
        `[FeituoSmartDateUpdater] findLatestPortOperation: selected by status priority - portSequence=${sameStatusRecords[0].portSequence}, statusCode=${sameStatusRecords[0].statusCode}`
      );
      return sameStatusRecords[0];
    }

    // 阶段3: 同港口同状态内按时间戳倒序
    const sortedByTime = [...sameStatusRecords].sort((a, b) => {
      const timeA = a.statusOccurredAt ? new Date(a.statusOccurredAt).getTime() : 0;
      const timeB = b.statusOccurredAt ? new Date(b.statusOccurredAt).getTime() : 0;
      return timeB - timeA;
    });

    const latest = sortedByTime[0];

    logger.debug(
      `[FeituoSmartDateUpdater] findLatestPortOperation: selected by timestamp - portSequence=${latest.portSequence}, statusCode=${latest.statusCode}, time=${latest.statusOccurredAt}`
    );

    return latest;
  }

  /**
   * 数据清洗层 - 过滤不合理的记录
   * 规则：
   * 1. 还箱后不应有其他操作（状态RCVE/RTNT后的记录应被过滤）
   * 2. 状态必须符合港口类型
   * 3. 时间不能为未来
   *
   * @param records 港口操作记录数组
   * @returns 清洗后的记录
   */
  private cleanPortOperationRecords<
    T extends { statusCode?: string | null; statusOccurredAt?: Date | null; portSequence?: number }
  >(records: T[]): T[] {
    if (!records || records.length === 0) {
      return [];
    }

    // 规则1: 查找最终状态记录（还箱）
    const returnStatusCodes = ['RCVE', 'RTNT']; // 还箱状态码
    let hasReturn = false;
    let returnTime: number | null = null;

    for (const record of records) {
      if (returnStatusCodes.includes(record.statusCode || '')) {
        hasReturn = true;
        if (record.statusOccurredAt) {
          const time = new Date(record.statusOccurredAt).getTime();
          if (!returnTime || time > returnTime) {
            returnTime = time;
          }
        }
      }
    }

    // 如果有还箱记录，过滤掉还箱之后的无效记录
    if (hasReturn && returnTime) {
      const filtered = records.filter((record) => {
        if (returnStatusCodes.includes(record.statusCode || '')) {
          return true; // 保留还箱记录本身
        }
        if (record.statusOccurredAt) {
          const recordTime = new Date(record.statusOccurredAt).getTime();
          // 还箱后的记录（时间戳相同或更晚）应被过滤
          if (recordTime >= returnTime) {
            logger.debug(
              `[FeituoSmartDateUpdater] cleanPortOperationRecords: filtered record with statusCode=${record.statusCode}, time=${record.statusOccurredAt} (after return)`
            );
            return false;
          }
        }
        return true;
      });
      return filtered;
    }

    // 规则2: 过滤时间戳为未来的记录（允许少量误差）
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    return records.filter((record) => {
      if (record.statusOccurredAt) {
        const recordTime = new Date(record.statusOccurredAt).getTime();
        // 未来超过1天的记录可能是错误数据
        if (recordTime > now + oneDayMs) {
          logger.debug(
            `[FeituoSmartDateUpdater] cleanPortOperationRecords: filtered future record with statusCode=${record.statusCode}, time=${record.statusOccurredAt}`
          );
          return false;
        }
      }
      return true;
    });
  }

  /**
   * 旧版优先级计算方法（保留用于兼容）
   * @deprecated 使用 findLatestPortOperation 代替
   */
  calculatePortOpPriority(portOp: {
    statusCode?: string | null;
    statusOccurredAt?: Date | null;
    portSequence?: number;
  }): number {
    const statusPriority = this.getStatusCodePriority(portOp.statusCode);
    const timeScore = portOp.statusOccurredAt
      ? new Date(portOp.statusOccurredAt).getTime() / 1000
      : 0;
    const sequenceScore = (portOp.portSequence ?? 0) * 100000;

    return statusPriority + timeScore + sequenceScore;
  }

  /**
   * 获取货柜的最新港口操作记录
   *
   * @param containerNumber 集装箱号
   * @param portType 可选：按港口类型过滤
   * @returns 最新的港口操作记录
   */
  async getLatestPortOperation(
    containerNumber: string,
    portType?: 'origin' | 'transit' | 'destination'
  ): Promise<PortOperation | null> {
    const portOps = await this.portOpRepo
      .createQueryBuilder('po')
      .where('po.container_number = :cn', { cn: containerNumber })
      .orderBy('po.port_sequence', 'DESC')
      .getMany();

    return this.findLatestPortOperation(portOps, portType);
  }

  // ==================== ETA/ATA智能更新 ====================

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
      const destPo = portOps.find((po) => po.portType === 'destination');

      // 获取当前物流状态
      const statusResult = calculateLogisticsStatus(container, portOps, seaFreight ?? undefined);
      const currentStatus = statusResult.status;

      // 2. 根据状态决定更新策略
      let updateReason = '';
      const warnings: string[] = [];

      switch (currentStatus) {
        case 'not_shipped':
          // 未出运：不更新ETA
          return { updated: false, reason: 'not_shipped status, skip ETA update' };

        case 'shipped':
        case 'in_transit':
          // 在途：ETA可以更新，ATA不更新
          if (newEta) {
            const validation = this.validateETA(
              newEta,
              newAta,
              seaFreight?.shipmentDate || null,
              currentStatus
            );
            // 硬错误才阻断
            if (!validation.valid) {
              return { updated: false, reason: `ETA validation failed: ${validation.reason}` };
            }
            // 软警告记录但继续处理
            if (validation.warnings) {
              warnings.push(...validation.warnings);
            }
            if (seaFreight) {
              seaFreight.eta = newEta;
              await this.seaFreightRepo.save(seaFreight);
            }
            if (destPo) {
              destPo.eta = newEta;
              await this.portOpRepo.save(destPo);
            }
            updateReason = `Updated ETA in ${currentStatus} status`;
          }
          break;

        case 'at_port':
          // 已到港：ETA可能需要修正（但ATA已确定）
          if (newEta && destPo?.ataDestPort) {
            // ATA已确定，ETA应该 <= ATA
            if (newEta > destPo.ataDestPort) {
              // ETA晚于ATA，需要验证
              const validation = this.validateETA(
                newEta,
                destPo.ataDestPort,
                seaFreight?.shipmentDate || null,
                currentStatus
              );
              if (!validation.valid) {
                return { updated: false, reason: `ETA validation failed: ${validation.reason}` };
              }
              if (validation.warnings) {
                warnings.push(...validation.warnings);
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

      return {
        updated: !!updateReason,
        reason: updateReason || 'No update needed',
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (e) {
      logger.warn('[FeituoSmartDateUpdater] smartUpdateETA failed:', e);
      return { updated: false, reason: 'Error in smartUpdateETA' };
    }
  }

  /**
   * 验证ETA是否有效 - 正确的业务规则
   *
   * 核心原则：
   * 1. 优先接收并存储从可靠数据源获取的原始时间戳
   * 2. 校验应是"软"的，产生警告而非阻断
   * 3. ETA可以早于、等于或晚于ATA（正常业务现象）
   *
   * 验证维度：
   * A. 内部一致性校验：ETA必须晚于出运日期
   * B. 与ATA的合理性校验：ETA与ATA的差值是否在合理范围内
   * C. 极端值校验：年份是否在有效范围内
   * D. 关联校验：ETA与拖卡运输/仓库操作的关联性
   */
  validateETA(params: ETAValidationParams): ETAValidationResult {
    const {
      eta,
      ata,
      shipDate,
      logisticsStatus: _logisticsStatus,
      truckingTransport,
      warehouseOperation
    } = params;
    const warnings: string[] = [];

    // ==================== A. 内部一致性校验 ====================

    // A1. ETA不能早于出运日期
    if (shipDate && eta < shipDate) {
      warnings.push(
        `ETA早于出运日期，ETA: ${eta.toISOString()}, 出运日: ${shipDate.toISOString()}`
      );
    }

    // ==================== B. 与ATA的合理性校验 ====================

    // B1. 如果已有ATA，ETA比ATA异常提早（超过30天）- 警告
    if (ata) {
      const diffMs = eta.getTime() - ata.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays > 30) {
        warnings.push(`ETA比ATA提早${Math.round(diffDays)}天，可能ETA预测有误`);
      }

      // B2. ETA为过去时间且无ATA - 警告
      const now = new Date();
      if (eta < now && !ata) {
        warnings.push(`ETA为过去时间但尚未记录ATA，请确认ETA是否需要更新`);
      }
    }

    // ==================== C. 极端值校验 ====================

    // C1. 年份超出合理范围
    const currentYear = new Date().getFullYear();
    if (eta.getFullYear() < 2000 || eta.getFullYear() > currentYear + 2) {
      return {
        valid: false,
        reason: `ETA年份${eta.getFullYear()}超出有效范围(2000-${currentYear + 2})`
      };
    }

    // ==================== D. 关联校验：ETA与拖卡运输/仓库操作的关联性 ====================

    // D1. ETA与计划提柜日的校验
    // 正常流程：ETA → ATA → 提柜(pickupDate)
    // 如果已有计划提柜日，ETA应该早于提柜日
    if (truckingTransport?.pickupDate && eta > truckingTransport.pickupDate) {
      const diffDays = Math.floor(
        (truckingTransport.pickupDate.getTime() - eta.getTime()) / (1000 * 60 * 60 * 24)
      );
      warnings.push(`ETA晚于计划提柜日${Math.abs(diffDays)}天，请确认物流计划是否需要更新`);
    }

    // D2. ETA与计划送仓日的校验
    // 正常流程：ETA → ATA → 提柜 → 送仓
    // 如果已有计划送仓日，ETA应该早于送仓日
    if (truckingTransport?.plannedDeliveryDate && eta > truckingTransport.plannedDeliveryDate) {
      const diffDays = Math.floor(
        (truckingTransport.plannedDeliveryDate.getTime() - eta.getTime()) / (1000 * 60 * 60 * 24)
      );
      warnings.push(`ETA晚于计划送仓日${Math.abs(diffDays)}天，请确认物流计划是否需要更新`);
    }

    // D3. ETA与计划卸柜日的校验
    // 正常流程：ETA → ATA → 卸柜
    // 如果已有计划卸柜日，ETA应该早于卸柜日
    if (warehouseOperation?.plannedUnloadDate && eta > warehouseOperation.plannedUnloadDate) {
      const diffDays = Math.floor(
        (warehouseOperation.plannedUnloadDate.getTime() - eta.getTime()) / (1000 * 60 * 60 * 24)
      );
      warnings.push(`ETA晚于计划卸柜日${Math.abs(diffDays)}天，请确认仓库排程是否需要更新`);
    }

    // ==================== 结论 ====================
    // 注意：移除"ETA不能是未来太久"的硬阻断规则
    // 因为：远洋航程可能超过90天，船舶可能因天气、拥堵等原因延误数月

    // 注意：不校验"ETA必须在ATA之前"
    // 因为ETA是预测时间，ATA是实际时间，船舶可能提前到达(ATA早于ETA)

    if (warnings.length > 0) {
      return { valid: true, warnings };
    }

    return { valid: true };
  }

  /**
   * 兼容旧签名 - 保留向后兼容
   * @deprecated 请使用 validateETA(params: ETAValidationParams) 替代
   */
  validateEtaOld(
    eta: Date,
    ata: Date | null,
    shipDate: Date | null,
    logisticsStatus: string
  ): ETAValidationResult {
    return this.validateETA({ eta, ata, shipDate, logisticsStatus });
  }

  /**
   * 智能ATA更新（带状态机推理和验证）
   * 根据物流状态决定ATA更新策略，并验证时间逻辑
   *
   * 正确的业务规则：
   * 1. ATA只能更新空值（不覆盖已有值）
   * 2. 内部一致性校验：ATA必须晚于上一港的ATD
   * 3. 与ETA的合理性校验：ATA与ETA的差值是否在合理范围内
   *
   * 核心原则：
   * - 优先接收并存储从可靠数据源获取的原始时间戳
   * - 校验产生警告而非阻断（软校验）
   * - ATA可以早于、等于或晚于ETA（正常业务现象）
   * - 移除"ATA不能是未来日期"这个错误的验证规则
   */
  async smartUpdateATA(
    containerNumber: string,
    newAta: Date | null,
    portType: 'origin' | 'transit' | 'destination' = 'destination'
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
      const destPo = portOps.find((po) => po.portType === 'destination');
      // 多港经停：按port_sequence倒序排列，优先选择最靠后的中转港
      const transitPoList = portOps
        .filter((po) => po.portType === 'transit')
        .sort((a, b) => (b.portSequence ?? 0) - (a.portSequence ?? 0));

      // 获取最新到达的中转港（port_sequence最大的）
      const latestTransitPo = transitPoList.length > 0 ? transitPoList[0] : null;

      // 获取当前物流状态
      const statusResult = calculateLogisticsStatus(container, portOps, seaFreight ?? undefined);
      const currentStatus = statusResult.status;

      // 2. 构建港口操作链信息，用于内部一致性校验
      const portOperationsForValidation = portOps.map((po) => ({
        portSequence: po.portSequence,
        portType: po.portType,
        ata: po.ataDestPort,
        atd: po.atdDestPort,
        eta: po.eta,
        etd: po.etd
      }));

      // 获取上一港信息（portSequence比当前小且最大的）
      const sortedAsc = [...portOps].sort((a, b) => a.portSequence - b.portSequence);
      const currentIndex = sortedAsc.findIndex((po) => po.portType === portType);
      let previousPortForValidation = null;
      if (currentIndex > 0) {
        const previousPo = sortedAsc[currentIndex - 1];
        previousPortForValidation = {
          portSequence: previousPo.portSequence,
          portType: previousPo.portType,
          atd: previousPo.atdDestPort,
          ata: previousPo.ataDestPort
        };
      }

      // 3. 根据状态决定更新策略
      let updateReason = '';
      let updated = false;
      const warnings: string[] = [];

      switch (currentStatus) {
        case 'not_shipped':
          // 未出运：不应有ATA，直接跳过
          return { updated: false, reason: 'not_shipped status, skip ATA update' };

        case 'shipped':
        case 'in_transit':
          // 在途：ATA不应存在，如果存在需验证有效性
          // 注意：移除"ATA不能是未来日期"的错误校验
          if (newAta) {
            // 验证ATA
            const validation = this.validateATA({
              ata: newAta,
              eta: seaFreight?.eta || null,
              shipDate: seaFreight?.shipmentDate || null,
              logisticsStatus: currentStatus,
              portType,
              portOperations: portOperationsForValidation,
              previousPort: previousPortForValidation
            });

            // 硬错误才阻断
            if (!validation.valid) {
              return { updated: false, reason: `ATA validation failed: ${validation.reason}` };
            }

            // 软警告记录但继续处理
            if (validation.warnings) {
              warnings.push(...validation.warnings);
            }
          }

          // 在途状态只更新空值
          if (newAta) {
            if (seaFreight && !seaFreight.ata) {
              seaFreight.ata = newAta;
              await this.seaFreightRepo.save(seaFreight);
              updated = true;
            }
            // 更新目的港或中转港ATA
            if (portType === 'destination' && destPo && !destPo.ataDestPort) {
              destPo.ataDestPort = newAta;
              await this.portOpRepo.save(destPo);
              updated = true;

              // LFD验证：ATA更新后检查LFD是否有效
              if (destPo.lastFreeDate && !this.validateLFD(destPo.lastFreeDate, newAta)) {
                const lfdResult = this.getLFDValidationResult(destPo.lastFreeDate, newAta);
                warnings.push(`LFD无效：${lfdResult.reason}`);
                // 标记LFD为无效
                destPo.lastFreeDateInvalid = true;
                destPo.lastFreeDateRemark = lfdResult.reason || 'LFD早于ATA';
                await this.portOpRepo.save(destPo);
              }
            } else if (portType === 'transit' && latestTransitPo) {
              if (!latestTransitPo.ataDestPort) {
                latestTransitPo.ataDestPort = newAta;
                await this.portOpRepo.save(latestTransitPo);
                updated = true;
              }
            }
            updateReason = `Updated ATA in ${currentStatus} status (was empty)`;
          } else {
            return { updated: false, reason: 'No ATA to update in shipped/in_transit status' };
          }
          break;

        case 'at_port':
          // 已到港：ATA应该存在，验证并更新空值
          if (newAta) {
            const validation = this.validateATA({
              ata: newAta,
              eta: seaFreight?.eta || null,
              shipDate: seaFreight?.shipmentDate || null,
              logisticsStatus: currentStatus,
              portType,
              portOperations: portOperationsForValidation,
              previousPort: previousPortForValidation
            });

            // 硬错误才阻断
            if (!validation.valid) {
              return { updated: false, reason: `ATA validation failed: ${validation.reason}` };
            }

            // 软警告记录但继续处理
            if (validation.warnings) {
              warnings.push(...validation.warnings);
            }

            // 只更新空值
            if (seaFreight && !seaFreight.ata) {
              seaFreight.ata = newAta;
              await this.seaFreightRepo.save(seaFreight);
              updated = true;
            }

            if (portType === 'destination' && destPo && !destPo.ataDestPort) {
              destPo.ataDestPort = newAta;
              await this.portOpRepo.save(destPo);
              updated = true;

              // LFD验证：ATA更新后检查LFD是否有效
              if (destPo.lastFreeDate && !this.validateLFD(destPo.lastFreeDate, newAta)) {
                const lfdResult = this.getLFDValidationResult(destPo.lastFreeDate, newAta);
                warnings.push(`LFD无效：${lfdResult.reason}`);
                destPo.lastFreeDateInvalid = true;
                destPo.lastFreeDateRemark = lfdResult.reason || 'LFD早于ATA';
                await this.portOpRepo.save(destPo);
              }
            } else if (portType === 'transit' && latestTransitPo) {
              if (!latestTransitPo.ataDestPort) {
                latestTransitPo.ataDestPort = newAta;
                await this.portOpRepo.save(latestTransitPo);
                updated = true;
              }
            }

            updateReason = `Updated ATA in at_port status (portType: ${portType})`;
          } else {
            return { updated: false, reason: 'No ATA to update in at_port status' };
          }
          break;

        case 'picked_up':
        case 'unloaded':
        case 'returned_empty':
          // 已完成物流：ATA应该稳定，只在为空时更新
          if (newAta && !seaFreight?.ata) {
            const validation = this.validateATA({
              ata: newAta,
              eta: seaFreight?.eta || null,
              shipDate: seaFreight?.shipmentDate || null,
              logisticsStatus: currentStatus,
              portType,
              portOperations: portOperationsForValidation,
              previousPort: previousPortForValidation
            });

            // 硬错误才阻断
            if (!validation.valid) {
              return { updated: false, reason: `ATA validation failed: ${validation.reason}` };
            }

            // 软警告记录但继续处理
            if (validation.warnings) {
              warnings.push(...validation.warnings);
            }

            seaFreight.ata = newAta;
            await this.seaFreightRepo.save(seaFreight);

            if (destPo && !destPo.ataDestPort) {
              destPo.ataDestPort = newAta;
              await this.portOpRepo.save(destPo);

              // LFD验证：ATA更新后检查LFD是否有效
              if (destPo.lastFreeDate && !this.validateLFD(destPo.lastFreeDate, newAta)) {
                const lfdResult = this.getLFDValidationResult(destPo.lastFreeDate, newAta);
                warnings.push(`LFD无效：${lfdResult.reason}`);
                destPo.lastFreeDateInvalid = true;
                destPo.lastFreeDateRemark = lfdResult.reason || 'LFD早于ATA';
                await this.portOpRepo.save(destPo);
              }
            }

            updated = true;
            updateReason = `Updated ATA in ${currentStatus} status (was empty)`;
          } else {
            return { updated: false, reason: `${currentStatus} status, ATA should be stable` };
          }
          break;
      }

      return {
        updated,
        reason: updateReason || 'No update needed',
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (e) {
      logger.warn('[FeituoSmartDateUpdater] smartUpdateATA failed:', e);
      return { updated: false, reason: 'Error in smartUpdateATA' };
    }
  }

  /**
   * 验证ATA是否有效 - 正确的业务规则
   *
   * 核心原则：
   * 1. 优先接收并存储从可靠数据源获取的原始时间戳
   * 2. 校验应是"软"的，产生警告而非阻断
   * 3. ATA可以早于、等于或晚于ETA（正常业务现象）
   *
   * 验证维度：
   * A. 内部一致性校验（最重要！）：ATA必须晚于上一港的ATD
   * B. 与ETA的合理性校验：ATA与ETA的差值是否在合理范围内
   * C. 极端值/技术性校验：年份是否在有效范围内
   * D. 关联校验：ATA与拖卡运输/仓库操作的关联性
   */
  validateATA(params: ATAValidationParams): DateValidationResult {
    const {
      ata,
      eta,
      shipDate,
      logisticsStatus,
      portType,
      portOperations,
      previousPort,
      truckingTransport,
      warehouseOperation
    } = params;
    const warnings: string[] = [];

    // 规则0: 未出运状态不应有ATA（硬错误）
    if (logisticsStatus === 'not_shipped' && ata) {
      return { valid: false, reason: 'not_shipped should not have ATA' };
    }

    if (!ata) {
      return { valid: true }; // 空ATA不验证
    }

    // ==================== A. 内部一致性校验（最重要！）====================

    // A1. ATA必须晚于上一港的ATD（如果有）
    if (previousPort?.atd && ata < previousPort.atd) {
      warnings.push(
        `ATA早于上一港的ATD，逻辑矛盾！ATA: ${ata.toISOString()}, 上一港ATD: ${previousPort.atd.toISOString()}`
      );
    }

    // A2. ATA不能早于同地点的ETD（同港先有离港才能有到港）
    // 查找当前港的ETD
    if (portOperations && portOperations.length > 0) {
      const currentPort = portOperations.find((po) => po.portType === portType);
      if (currentPort?.etd && ata < currentPort.etd) {
        warnings.push(
          `ATA早于本港ETD，逻辑矛盾！ATA: ${ata.toISOString()}, ETD: ${currentPort.etd.toISOString()}`
        );
      }
    }

    // A3. ATA不能早于出运日期
    if (shipDate && ata < shipDate) {
      warnings.push(
        `ATA早于出运日期，ATA: ${ata.toISOString()}, 出运日: ${shipDate.toISOString()}`
      );
    }

    // ==================== B. 与ETA的合理性校验 ====================

    // B1. ATA比ETA异常提早（超过7天）- 警告而非阻断
    if (eta) {
      const diffMs = eta.getTime() - ata.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays > 7) {
        warnings.push(`ATA比ETA异常提早${Math.round(diffDays)}天，请确认数据准确性`);
      }

      // B2. ATA比ETA异常延迟（超过30天）- 警告而非阻断
      if (diffDays < -30) {
        warnings.push(`ATA比ETA延迟${Math.round(Math.abs(diffDays))}天，延迟较大，请确认`);
      }
    }

    // ==================== C. 极端值/技术性校验 ====================

    // C1. 年份超出合理范围
    const currentYear = new Date().getFullYear();
    if (ata.getFullYear() < 2000 || ata.getFullYear() > currentYear + 1) {
      return {
        valid: false,
        reason: `ATA年份${ata.getFullYear()}超出有效范围(2000-${currentYear + 1})`
      };
    }

    // ==================== D. 关联校验：ATA与拖卡运输/仓库操作的关联性 ====================

    // D1. 目的港ATA与拖卡提柜日期的校验
    // 正常流程：先到港(ATA) → 后提柜(pickupDate)
    // 如果提柜日期早于ATA，可能存在数据问题（预提柜/船边直提等特殊场景除外）
    if (portType === 'destination' && truckingTransport?.pickupDate) {
      if (truckingTransport.pickupDate < ata) {
        const diffDays = Math.floor(
          (ata.getTime() - truckingTransport.pickupDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        // 允许1天内的差异（可能是时区或日期精度问题），超过1天则警告
        if (diffDays > 1) {
          warnings.push(`提柜日早于到港日${diffDays}天，请确认是否为预提柜或船边直提`);
        }
      }
    }

    // D2. 目的港ATA与送仓日期的校验
    // 正常流程：先到港(ATA) → 提柜 → 送仓(deliveryDate)
    // 送仓日期不能早于ATA
    if (portType === 'destination' && truckingTransport?.deliveryDate) {
      if (truckingTransport.deliveryDate < ata) {
        warnings.push(
          `送仓日期早于到港日期，逻辑矛盾！ATA: ${ata.toISOString()}, 送仓日: ${truckingTransport.deliveryDate.toISOString()}`
        );
      }
    }

    // D3. 目的港ATA与仓库入库日期的校验
    // 正常流程：先到港(ATA) → 提柜 → 送仓 → 入库(inboundDate/wmsConfirmDate)
    // 入库日期不能早于ATA
    if (warehouseOperation) {
      if (warehouseOperation.inboundDate && warehouseOperation.inboundDate < ata) {
        warnings.push(
          `入库日期早于到港日期，逻辑矛盾！ATA: ${ata.toISOString()}, 入库日: ${warehouseOperation.inboundDate.toISOString()}`
        );
      }
      if (warehouseOperation.wmsConfirmDate && warehouseOperation.wmsConfirmDate < ata) {
        warnings.push(
          `WMS确认日期早于到港日期，逻辑矛盾！ATA: ${ata.toISOString()}, WMS确认日: ${warehouseOperation.wmsConfirmDate.toISOString()}`
        );
      }
    }

    // ==================== 结论 ====================
    // 注意：不校验"ATA不能是未来日期"
    // 因为存在数据录入延迟、跨时区问题、批量补录等情况
    // ATA是已发生事件的真实时间戳，应该被无条件信任和存储

    // 注意：不校验"ATA必须在ETA之后"
    // 船舶可能提前到达(ATA早于ETA)或延迟到达(ATA晚于ETA)，都是正常业务现象

    if (warnings.length > 0) {
      return { valid: true, warnings };
    }

    return { valid: true };
  }

  /**
   * LFD（最后免费日）验证
   *
   * 规则：LFD必须 >= ATA（目的港到达日期）
   * - LFD是船公司给予的免费用箱期截止日
   * - LFD不能早于ATA，因为船到港后才能开始计算免费期
   *
   * @param lfd 最后免费日
   * @param ataDestPort 目的港实际到达日期
   * @returns true表示LFD有效（>= ATA），false表示无效（< ATA）
   */
  validateLFD(lfd: Date | null | undefined, ataDestPort: Date | null | undefined): boolean {
    if (!lfd || !ataDestPort) {
      return true; // 空值不验证
    }

    // LFD必须 >= ATA
    return lfd.getTime() >= ataDestPort.getTime();
  }

  /**
   * 获取LFD验证的详细结果（用于日志和调试）
   *
   * @param lfd 最后免费日
   * @param ataDestPort 目的港实际到达日期
   * @returns 验证结果对象
   */
  getLFDValidationResult(
    lfd: Date | null | undefined,
    ataDestPort: Date | null | undefined
  ): {
    valid: boolean;
    lfd?: Date;
    ata?: Date;
    diffDays?: number;
    reason?: string;
  } {
    if (!lfd) {
      return { valid: true };
    }

    if (!ataDestPort) {
      return {
        valid: true,
        lfd,
        reason: '无ATA，不验证LFD'
      };
    }

    const isValid = this.validateLFD(lfd, ataDestPort);
    const diffMs = lfd.getTime() - ataDestPort.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return {
      valid: isValid,
      lfd,
      ata: ataDestPort,
      diffDays,
      reason: isValid
        ? `LFD晚于ATA ${diffDays}天`
        : `LFD早于ATA ${Math.abs(diffDays)}天，逻辑矛盾！`
    };
  }
}

export const feituoSmartDateUpdater = new FeituoSmartDateUpdater();
