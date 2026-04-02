/**
 * 智能排柜服务
 * Intelligent Scheduling Service
 *
 * 实现规则引擎（阶段一）：先到先得 + 约束校验
 */

import { In } from 'typeorm';
import {
  CONCURRENCY_CONFIG,
  DATE_CALCULATION_CONFIG,
  OCCUPANCY_CONFIG
} from '../config/scheduling.config';
import {
  getPartnershipLevelBonus,
  RELATIONSHIP_SCORING,
  SCHEDULING_RULES,
  SCORING_WEIGHTS
} from '../constants/SchedulingRules';
import { AppDataSource } from '../database';
import { Container } from '../entities/Container';
import { Country } from '../entities/Country';
import { Customer } from '../entities/Customer';
import { CustomsBroker } from '../entities/CustomsBroker';
import { DictSchedulingConfig } from '../entities/DictSchedulingConfig';
import { EmptyReturn } from '../entities/EmptyReturn';
import { ExtDemurrageRecord } from '../entities/ExtDemurrageRecord';
import { ExtDemurrageStandard } from '../entities/ExtDemurrageStandard';
import { ExtTruckingReturnSlotOccupancy } from '../entities/ExtTruckingReturnSlotOccupancy';
import { ExtTruckingSlotOccupancy } from '../entities/ExtTruckingSlotOccupancy';
import { ExtWarehouseDailyOccupancy } from '../entities/ExtWarehouseDailyOccupancy';
import { PortOperation } from '../entities/PortOperation';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { SeaFreight } from '../entities/SeaFreight';
import { TruckingCompany } from '../entities/TruckingCompany';
import { TruckingPortMapping } from '../entities/TruckingPortMapping';
import { TruckingTransport } from '../entities/TruckingTransport';
import { Warehouse } from '../entities/Warehouse';
import { WarehouseOperation } from '../entities/WarehouseOperation';
import { WarehouseTruckingMapping } from '../entities/WarehouseTruckingMapping';
import { normalizeCountryCode } from '../utils/countryCode';
import * as dateTimeUtils from '../utils/dateTimeUtils';
import { logger } from '../utils/logger';
import { ContainerFilterService } from './ContainerFilterService';
import { ContainerStatusService } from './containerStatus.service';
import { CostEstimationService } from './CostEstimationService';
import { DemurrageService } from './demurrage.service';
import { OccupancyCalculator } from './OccupancyCalculator';
import { ruleEngineService, RuleExecutionContext } from './RuleEngineService';
import { SchedulingCostOptimizerService } from './schedulingCostOptimizer.service';
import { SchedulingDateCalculator } from './SchedulingDateCalculator';
import { SchedulingSorter } from './SchedulingSorter';
import { TruckingSelectorService } from './TruckingSelectorService';
import { WarehouseSelectorService } from './WarehouseSelectorService';

/**
 * 批量优化结果接口
 */
interface BatchOptimizeResult {
  containerNumber: string;
  originalCost: number;
  optimizedCost: number;
  savings: number;
  suggestedPickupDate?: string;
  shouldOptimize: boolean;
}

/**
 * 未指定的清关公司编码
 */
const UNSPECIFIED_CUSTOMS_BROKER = 'UNSPECIFIED';

export interface ScheduleRequest {
  country?: string; // 国家过滤
  startDate?: string; // 开始日期
  endDate?: string; // 结束日期
  forceSchedule?: boolean; // 是否强制重排（忽略 schedule_status）
  containerNumbers?: string[]; // 指定柜号列表，仅排这些柜（用于单柜模拟）
  limit?: number; // 每批处理数量，用于分步排产
  skip?: number; // 跳过数量，用于分步排产
  dryRun?: boolean; // 是否为预览模式（true=只计算不保存）
  etaBufferDays?: number; // ETA 顺延天数（可选，前端传入，默认 0）

  // ✅ 新增：港口过滤
  portCode?: string; // 目的港代码（如 USLAX, USLGB）

  // ✅ 新增：手工指定仓库（可选）
  designatedWarehouseMode?: boolean; // 是否为手工指定模式
  designatedWarehouseCode?: string; // 手工指定的仓库代码
  designatedContainerNumbers?: string[]; // 手工指定仓库的柜号列表（可选，为空则全部）

  // ✅ 新增：卸柜方式（可选，优先于系统自动决策）
  unloadMode?: 'Drop off' | 'Live load'; // 用户指定的卸柜方式
}

export interface ScheduleResult {
  containerNumber: string;
  success: boolean;
  message?: string;
  // 货柜基本信息（用于前端展示）
  destinationPort?: string;
  destinationPortName?: string;
  warehouseName?: string;
  etaDestPort?: string;
  ataDestPort?: string;
  lastFreeDate?: string; // ✅ 最后免费日（提柜）
  lastReturnDate?: string; // ✅ 最晚还箱日（从 EmptyReturn 表获取）
  pickupFreeDays?: number; // ✅ 提柜免费天数（MIN(滞港，堆存，D&D)）
  returnFreeDays?: number; // ✅ 还箱免费天数（D&D 或 滞箱）
  freeDaysRemaining?: number; // ✅ 还箱免费天数（动态计算：最晚还箱日 - 提柜日）
  plannedData?: {
    // confirm 保存路径需要 plannedData 内也包含 containerNumber
    containerNumber?: string;
    plannedCustomsDate?: string;
    plannedPickupDate?: string;
    plannedDeliveryDate?: string;
    plannedUnloadDate?: string;
    plannedReturnDate?: string;
    truckingCompanyId?: string;
    truckingCompany?: string;
    warehouseId?: string;
    warehouseName?: string;
    warehouseCountry?: string; // ✅ 仓库国家代码，用于前端货币格式化
    unloadModePlan?: 'Drop off' | 'Live load'; // ✅ 与数据库字段 unload_mode_plan 一致
    customsBrokerCode?: string;
    /** 与 DemurrageService.calculateTotalCost 一致的费用分项 */
    estimatedCosts?: ScheduleResult['estimatedCosts'];
  };
  // 预估费用（dryRun 模式下计算；与 DemurrageService.calculateTotalCost / calculateEstimatedCosts 对齐）
  estimatedCosts?: {
    demurrageCost?: number;
    detentionCost?: number;
    storageCost?: number;
    ddCombinedCost?: number;
    transportationCost?: number;
    yardStorageCost?: number; // 外部堆场堆存费（Drop off 模式专属）
    handlingCost?: number;
    totalCost?: number;
    currency?: string;
  };
}

export interface BatchScheduleResponse {
  success: boolean;
  total: number;
  successCount: number;
  failedCount: number;
  results: ScheduleResult[];
  hasMore?: boolean; // 是否还有待排产货柜（分步排产时使用）
  totalOptimizationSavings?: number; // ✅ Task 2.1: 总优化节省金额
}

/**
 * 智能排柜服务
 */
export class IntelligentSchedulingService {
  private containerRepo = AppDataSource.getRepository(Container);
  private portOperationRepo = AppDataSource.getRepository(PortOperation);
  private truckingTransportRepo = AppDataSource.getRepository(TruckingTransport);
  private warehouseOperationRepo = AppDataSource.getRepository(WarehouseOperation);
  private emptyReturnRepo = AppDataSource.getRepository(EmptyReturn);
  private warehouseOccupancyRepo = AppDataSource.getRepository(ExtWarehouseDailyOccupancy);
  private truckingOccupancyRepo = AppDataSource.getRepository(ExtTruckingSlotOccupancy);
  private truckingPortMappingRepo = AppDataSource.getRepository(TruckingPortMapping);
  private warehouseTruckingMappingRepo = AppDataSource.getRepository(WarehouseTruckingMapping);
  private customerRepo = AppDataSource.getRepository(Customer);
  private customsBrokerRepo = AppDataSource.getRepository(CustomsBroker);
  private schedulingConfigRepo = AppDataSource.getRepository(DictSchedulingConfig);
  private warehouseRepo = AppDataSource.getRepository(Warehouse); // ✅ Task 2.1
  private truckingCompanyRepo = AppDataSource.getRepository(TruckingCompany); // ✅ Task 2.1
  private containerStatusService = new ContainerStatusService();
  private demurrageService = new DemurrageService(
    AppDataSource.getRepository(ExtDemurrageStandard),
    AppDataSource.getRepository(Container),
    AppDataSource.getRepository(PortOperation),
    AppDataSource.getRepository(SeaFreight),
    AppDataSource.getRepository(TruckingTransport),
    AppDataSource.getRepository(EmptyReturn),
    AppDataSource.getRepository(ReplenishmentOrder),
    AppDataSource.getRepository(Country),
    AppDataSource.getRepository(ExtDemurrageRecord)
  );

  // ✅ Task 2.1: 新增成本优化服务
  private costOptimizerService = new SchedulingCostOptimizerService();

  // ✅ Phase 3: 新增独立服务实例
  private containerFilterService = new ContainerFilterService();
  private schedulingSorter = new SchedulingSorter();
  private warehouseSelectorService = new WarehouseSelectorService();
  private truckingSelectorService = new TruckingSelectorService();
  private occupancyCalculator = new OccupancyCalculator();
  private costEstimationService = new CostEstimationService();
  private dateCalculator = new SchedulingDateCalculator();

  /**
   * 批量排产
   * 对 schedule_status = initial 的货柜进行智能排产
   */
  async batchSchedule(request: ScheduleRequest): Promise<BatchScheduleResponse> {
    const results: ScheduleResult[] = [];

    try {
      // ✅ 记录是否为预览模式
      logger.info(
        `[IntelligentScheduling] Starting ${request.dryRun ? 'Preview' : 'Production'} scheduling for country: ${request.country}`
      );

      // 1. 查询待排产的货柜
      const containers = await this.getContainersToSchedule(request);
      logger.info(`[IntelligentScheduling] Found ${containers.length} containers to schedule`);

      // 2. 按清关可放行日排序（先到先得，使用 DB 已有 lastFreeDate）
      // ✅ Phase 3: 使用 SchedulingSorter 服务
      const sortedContainers = this.schedulingSorter.sortByClearanceDate(containers);

      // 分步排产：limit/skip
      const skip = Math.max(0, request.skip ?? 0);
      const limit =
        request.limit != null && request.limit > 0 ? request.limit : sortedContainers.length;
      const toProcess = sortedContainers.slice(skip, skip + limit);
      const hasMore = skip + limit < sortedContainers.length;

      // 3. 仅对本批货柜做滞港费相关计算/（正式排产时）写回
      // 预览（dryRun）会额外计算真实费用，为避免压垮后端并导致其他 API 超时，降低并发
      const CONCURRENCY = request.dryRun
        ? Math.max(1, Math.min(2, CONCURRENCY_CONFIG.BATCH_OPERATIONS))
        : CONCURRENCY_CONFIG.BATCH_OPERATIONS; // 配置化：默认值为 5
      const lastFreeByCn: Record<string, Date> = {};
      const pickupFreeDaysByCn: Record<string, number> = {}; // ✅ 提柜免费天数
      const returnFreeDaysByCn: Record<string, number> = {}; // ✅ 还箱免费天数
      try {
        const numbers = toProcess.map((c) => c.containerNumber);
        for (let i = 0; i < numbers.length; i += CONCURRENCY) {
          const batch = numbers.slice(i, i + CONCURRENCY);
          const settled = await Promise.allSettled(
            batch.map((cn) =>
              this.demurrageService.calculateForContainer(cn, {
                // 预览不写库；正式排产仍按 batch 规则写回计算免费日
                freeDateWriteMode: request.dryRun ? 'none' : 'batch'
              })
            )
          );
          for (let j = 0; j < batch.length; j++) {
            const s = settled[j];
            const computed =
              s.status === 'fulfilled'
                ? s.value?.result?.calculationDates?.lastPickupDateComputed
                : null;
            if (computed) lastFreeByCn[batch[j]] = new Date(computed);

            // ✅ 分类提取免费天数（确保口径一致）
            if (s.status === 'fulfilled' && s.value?.result) {
              const standards = s.value.result.matchedStandards || [];

              // ✅ 提取各类免费天数（参考 riskService.ts 标准方法）
              const isCombined = (std: any) => {
                const code = (std.chargeTypeCode ?? '').toUpperCase();
                const name = (std.chargeName ?? '').toLowerCase();
                const hasDem =
                  code.includes('DEMURRAGE') || name.includes('demurrage') || name.includes('滞港');
                const hasDet =
                  code.includes('DETENTION') || name.includes('detention') || name.includes('滞箱');
                return hasDem && hasDet;
              };

              const isDetention = (std: any) => {
                if (isCombined(std)) return false;
                const code = (std.chargeTypeCode ?? '').toUpperCase();
                const name = (std.chargeName ?? '').toLowerCase();
                return (
                  code.includes('DETENTION') || name.includes('detention') || name.includes('滞箱')
                );
              };

              const isStorage = (std: any) => {
                if (isCombined(std)) return false;
                if (isDetention(std)) return false;
                const code = (std.chargeTypeCode ?? '').toUpperCase();
                const name = (std.chargeName ?? '').toLowerCase();
                return (
                  code.includes('STORAGE') || name.includes('storage') || name.includes('堆存')
                );
              };

              const isDemurrage = (std: any) => {
                if (isCombined(std)) return false;
                if (isDetention(std)) return false;
                if (isStorage(std)) return false;
                const code = (std.chargeTypeCode ?? '').toUpperCase();
                const name = (std.chargeName ?? '').toLowerCase();
                return (
                  code.includes('DEMURRAGE') || name.includes('demurrage') || name.includes('滞港')
                );
              };

              // 根据费用类型分类提取
              const demurrageStandard = standards.find(isDemurrage);
              const storageStandard = standards.find(isStorage);
              const detentionStandard = standards.find(isDetention);
              const dndStandard = standards.find(isCombined);

              const demurrageFreeDays = demurrageStandard?.freeDays;
              const storageFreeDays = storageStandard?.freeDays;
              const detentionFreeDays = detentionStandard?.freeDays;
              const dnDFreeDays = dndStandard?.freeDays;

              // ✅ 调试：打印提取的免费天数
              logger.info(
                `[IntelligentScheduling] Container ${batch[j]}: demurrage=${demurrageFreeDays} (${demurrageStandard?.chargeName}), storage=${storageFreeDays} (${storageStandard?.chargeName}), detention=${detentionFreeDays} (${detentionStandard?.chargeName}), dnd=${dnDFreeDays} (${dndStandard?.chargeName})`
              );

              // ✅ 强制转换确保 freeDays 是数字
              const demurrageFreeDaysNum =
                typeof demurrageFreeDays === 'number' ? demurrageFreeDays : undefined;
              const storageFreeDaysNum =
                typeof storageFreeDays === 'number' ? storageFreeDays : undefined;
              const detentionFreeDaysNum =
                typeof detentionFreeDays === 'number' ? detentionFreeDays : undefined;
              const dnDFreeDaysNum = typeof dnDFreeDays === 'number' ? dnDFreeDays : undefined;

              // 提柜免费天数 = MIN(滞港，堆存，D&D)
              const pickupFreeDaysCandidates = [
                demurrageFreeDaysNum,
                storageFreeDaysNum,
                dnDFreeDaysNum
              ].filter((d) => d !== undefined);
              const pickupFreeDays =
                pickupFreeDaysCandidates.length > 0
                  ? Math.min(...pickupFreeDaysCandidates)
                  : undefined;

              // 还箱免费天数 = D&D 或 滞箱
              const returnFreeDays = dnDFreeDaysNum ?? detentionFreeDaysNum;

              // 保存结果
              if (pickupFreeDays !== undefined) {
                pickupFreeDaysByCn[batch[j]] = pickupFreeDays;
              }
              if (returnFreeDays !== undefined) {
                returnFreeDaysByCn[batch[j]] = returnFreeDays;
              }
            }
          }
        }
        for (const c of toProcess) {
          const destPo = c.portOperations?.find((po: any) => po.portType === 'destination');
          if (destPo && lastFreeByCn[c.containerNumber]) {
            (destPo as any).lastFreeDate = lastFreeByCn[c.containerNumber];
          }
          // ✅ 设置提柜免费天数（用于 LFD 计算）
          if (destPo && pickupFreeDaysByCn[c.containerNumber] !== undefined) {
            (destPo as any).pickupFreeDays = pickupFreeDaysByCn[c.containerNumber];
          }
          // ✅ 设置还箱免费天数（用于 LRD 计算）
          if (destPo && returnFreeDaysByCn[c.containerNumber] !== undefined) {
            (destPo as any).returnFreeDays = returnFreeDaysByCn[c.containerNumber];
          }
        }
      } catch (e) {
        logger.warn('[IntelligentScheduling] Pre-schedule write-back failed (continuing):', e);
      }

      // 4. ✅ 批量预加载货柜关联数据（减少 N+1 查询）
      const containerNumbers = toProcess.map((c) => c.containerNumber);
      const [truckingTransports, emptyReturns] = await Promise.all([
        this.truckingTransportRepo.find({ where: { containerNumber: In(containerNumbers) } }),
        this.emptyReturnRepo.find({ where: { containerNumber: In(containerNumbers) } })
      ]);
      const truckingTransportMap = new Map(truckingTransports.map((t) => [t.containerNumber, t]));
      const emptyReturnMap = new Map(emptyReturns.map((e) => [e.containerNumber, e]));

      // 5. 并行排产（使用 CONCURRENCY 控制并发数）
      const scheduleResults: Promise<ScheduleResult>[] = [];
      for (const container of toProcess) {
        const truckingTransport = truckingTransportMap.get(container.containerNumber);
        const emptyReturn = emptyReturnMap.get(container.containerNumber);
        scheduleResults.push(
          this.scheduleSingleContainerWithCache(
            container,
            request,
            truckingTransport || null,
            emptyReturn || null
          )
        );
      }

      // 分批并发执行，避免一次性创建过多 Promise
      for (let i = 0; i < scheduleResults.length; i += CONCURRENCY) {
        const batch = scheduleResults.slice(i, i + CONCURRENCY);
        const settled = await Promise.allSettled(batch);
        for (const s of settled) {
          if (s.status === 'fulfilled') {
            results.push(s.value);
          } else {
            logger.error('[IntelligentScheduling] Container scheduling failed:', s.reason);
          }
        }
      }

      // ✅ Task 2.1: 正式排产附加优化建议。预览已在方案中计算真实费用，跳过以免重复调用 calculateTotalCost
      let totalOptimizationSavings = 0;
      if (!request.dryRun) {
        const successfulResults = results.filter((r) => r.success && r.plannedData);
        for (const result of successfulResults) {
          try {
            const plannedData = result.plannedData!;
            const warehouseCode = plannedData.warehouseId; // ✅ warehouseId 就是 warehouseCode
            const truckingCompanyId = plannedData.truckingCompanyId;

            if (!warehouseCode || !truckingCompanyId || !plannedData.plannedPickupDate) {
              continue; // 缺少必要参数，跳过优化
            }

            // 获取仓库和车队信息
            const warehouse = await this.warehouseRepo.findOne({ where: { warehouseCode } });
            const truckingCompany = await this.truckingCompanyRepo.findOne({
              where: { companyCode: truckingCompanyId }
            });

            if (!warehouse || !truckingCompany) {
              continue; // 找不到实体，跳过优化
            }

            // 调用成本优化服务
            const optimization = await this.costOptimizerService.suggestOptimalUnloadDate(
              result.containerNumber,
              warehouse,
              truckingCompany,
              new Date(plannedData.plannedPickupDate)
            );

            // 附加优化建议
            (result as any).optimizationSuggestions = {
              originalCost: optimization.originalCost,
              optimizedCost: optimization.optimizedCost,
              savings: optimization.savings,
              suggestedPickupDate: optimization.suggestedPickupDate.toISOString().split('T')[0],
              suggestedStrategy: optimization.suggestedStrategy,
              shouldOptimize: optimization.savings > 0
            };
          } catch (error: any) {
            logger.warn(
              `[IntelligentScheduling] Cost optimization suggestion failed for ${result.containerNumber}:`,
              error.message
            );
            // 优化失败不影响排产结果，继续处理下一个
          }
        }

        totalOptimizationSavings = successfulResults.reduce((sum, r: any) => {
          return sum + (r.optimizationSuggestions?.savings || 0);
        }, 0);
      }

      const successCount = results.filter((r) => r.success).length;

      return {
        success: true,
        total: containers.length,
        successCount,
        failedCount: results.length - successCount,
        results,
        hasMore,
        totalOptimizationSavings // ✅ 新增：总优化节省金额
      };
    } catch (error: any) {
      logger.error('[IntelligentScheduling] batchSchedule error:', error);
      return {
        success: false,
        total: results.length,
        successCount: results.filter((r) => r.success).length,
        failedCount: results.length - results.filter((r) => r.success).length,
        results
      };
    }
  }

  /**
   * 获取待排产的货柜
   * 过滤条件：schedule_status = initial，且有 ATA 或 ETA
   * 加载 customer 以便取 country（国家代码），见 12-国家概念统一约定.md
   */
  private async getContainersToSchedule(request: ScheduleRequest): Promise<Container[]> {
    const query = this.containerRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.portOperations', 'po')
      .leftJoinAndSelect('c.seaFreight', 'sf')
      .leftJoinAndSelect('c.replenishmentOrders', 'o')
      .leftJoinAndSelect('o.customer', 'cust')
      .where('c.scheduleStatus IN (:...statuses)', { statuses: ['initial', 'issued'] });

    if (request.startDate) {
      query.andWhere('(po.ata >= :startDate OR po.eta >= :startDate)', {
        startDate: request.startDate
      });
    }
    if (request.endDate) {
      query.andWhere('(po.ata <= :endDate OR po.eta <= :endDate)', {
        endDate: request.endDate
      });
    }
    if (request.containerNumbers && request.containerNumbers.length > 0) {
      query.andWhere('c.containerNumber IN (:...containerNumbers)', {
        containerNumbers: request.containerNumbers
      });
    }
    if (request.country?.trim()) {
      query.andWhere('cust.country = :country', { country: request.country.trim() });
    }

    // ✅ 新增：港口过滤
    if (request.portCode?.trim()) {
      query.andWhere('po.portCode = :portCode', { portCode: request.portCode.trim() });
    }

    return query.getMany();
  }

  /**
   * 按清关可放行日排序（先到先得）
   * 优先：ATA > ETA，同日内按 last_free_date 升序
   */
  private sortByClearanceDate(containers: Container[]): Container[] {
    return containers.sort((a, b) => {
      // 获取目的港操作记录
      const aDestPo = a.portOperations?.find((po: any) => po.portType === 'destination');
      const bDestPo = b.portOperations?.find((po: any) => po.portType === 'destination');

      const aDate = aDestPo?.ata || aDestPo?.eta || a.seaFreight?.eta;
      const bDate = bDestPo?.ata || bDestPo?.eta || b.seaFreight?.eta;

      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;

      // 按日期升序
      const dateCompare = new Date(aDate).getTime() - new Date(bDate).getTime();
      if (dateCompare !== 0) return dateCompare;

      // 同日内按 last_free_date 升序
      const aLastFree = aDestPo?.lastFreeDate ? new Date(aDestPo.lastFreeDate).getTime() : 0;
      const bLastFree = bDestPo?.lastFreeDate ? new Date(bDestPo.lastFreeDate).getTime() : 0;
      return aLastFree - bLastFree;
    });
  }

  /**
   * ✅ 新增：使用预加载数据的单个货柜排产
   * 减少数据库查询，提升批量排产性能
   */
  private async scheduleSingleContainerWithCache(
    container: Container,
    request: ScheduleRequest,
    truckingTransport: TruckingTransport | null,
    emptyReturn: EmptyReturn | null
  ): Promise<ScheduleResult> {
    try {
      // ✅ 业务规则检查①：如果已有实际还箱日，不参与排产（使用预加载数据）
      const actualPickupDate = truckingTransport?.pickupDate || null;
      const actualReturnDate = emptyReturn?.returnTime || null;

      if (actualReturnDate) {
        logger.info(
          `[IntelligentScheduling] Skip scheduling for ${container.containerNumber}: already returned (actual return date: ${actualReturnDate.toISOString()})`
        );
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '货柜已还箱，无需排产',
          destinationPort: '',
          destinationPortName: '',
          etaDestPort: '',
          ataDestPort: ''
        };
      }

      // ✅ 业务规则检查②：如果已有实际提柜日，锁定提/送/卸日期，只计算还箱日
      if (actualPickupDate) {
        logger.info(
          `[IntelligentScheduling] Scheduling with actual pickup date for ${container.containerNumber}: pickup=${actualPickupDate.toISOString()}`
        );
      }

      // ✅ 检查是否为手工指定仓库模式
      if (request.designatedWarehouseMode && request.designatedWarehouseCode) {
        const destPo = container.portOperations?.find((po: any) => po.portType === 'destination');
        if (!destPo) {
          return {
            containerNumber: container.containerNumber,
            success: false,
            message: '无目的港操作记录',
            destinationPort: '',
            destinationPortName: '',
            etaDestPort: '',
            ataDestPort: ''
          };
        }

        // 使用手工指定仓库逻辑
        return this.scheduleWithDesignatedWarehouse(
          container,
          destPo,
          request.designatedWarehouseCode,
          request
        );
      }

      // 原有智能排产逻辑...
      // 获取目的港操作记录
      const destPo = container.portOperations?.find((po: any) => po.portType === 'destination');

      // 提取货柜基本信息用于前端展示
      const containerInfo = {
        destinationPort: destPo?.portCode || '',
        destinationPortName: destPo?.portName || '',
        etaDestPort: destPo?.eta ? new Date(destPo.eta).toISOString().split('T')[0] : '',
        ataDestPort: destPo?.ata ? new Date(destPo.ata).toISOString().split('T')[0] : ''
      };

      if (!destPo) {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '无目的港操作记录',
          ...containerInfo
        };
      }

      // 1. 清关计划日默认等于 ETA（无 ETA 时回退 ATA）
      const clearanceDate = destPo.eta || destPo.ata;
      if (!clearanceDate) {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '无到港日期（ATA/ETA），无法排产',
          ...containerInfo
        };
      }

      // 2. 计算计划清关日、提柜日（若 ATA/ETA 已过，提柜日至少为今天）
      let plannedCustomsDate: Date;

      if (clearanceDate instanceof Date) {
        plannedCustomsDate = new Date(clearanceDate);
      } else if (typeof clearanceDate === 'string') {
        plannedCustomsDate = new Date(`${clearanceDate}T00:00:00`);
      } else {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '到港日期类型错误',
          ...containerInfo
        };
      }

      if (!plannedCustomsDate || isNaN(plannedCustomsDate.getTime())) {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '清关日期解析失败',
          ...containerInfo
        };
      }

      // ✅ 新增：ETA 顺延天数
      const etaBufferDays = request.etaBufferDays || 0;
      if (etaBufferDays > 0) {
        plannedCustomsDate.setDate(plannedCustomsDate.getDate() + etaBufferDays);
      }

      let plannedPickupDate = await this.dateCalculator.calculatePlannedPickupDate(
        plannedCustomsDate,
        destPo.lastFreeDate
      );

      if (!plannedPickupDate || isNaN(plannedPickupDate.getTime())) {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '计算提柜日失败',
          ...containerInfo
        };
      }

      // ✅ 业务规则：如果已有实际提柜日，锁定计划提柜日=实际提柜日
      if (actualPickupDate) {
        plannedPickupDate = new Date(actualPickupDate);
        plannedCustomsDate = new Date(plannedPickupDate);
        plannedCustomsDate.setUTCDate(plannedCustomsDate.getUTCDate() - 1);
      }

      // ✅ 使用 UTC 日期比较
      const today = new Date();
      const todayStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
      const pickupDateStr = `${plannedPickupDate.getUTCFullYear()}-${String(plannedPickupDate.getUTCMonth() + 1).padStart(2, '0')}-${String(plannedPickupDate.getUTCDate()).padStart(2, '0')}`;

      if (pickupDateStr <= todayStr) {
        const tomorrow = new Date(`${todayStr}T00:00:00Z`);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        plannedPickupDate = tomorrow;
        plannedCustomsDate.setTime(plannedPickupDate.getTime());
        plannedCustomsDate.setUTCDate(plannedCustomsDate.getUTCDate() - 1);
      }

      // 4. 确定候选仓库
      const countryCode = await this.resolveCountryCode(container.replenishmentOrders?.[0] as any);
      const warehouses = await this.warehouseSelectorService.getCandidateWarehouses(
        countryCode,
        destPo.portCode
      );
      if (warehouses.length === 0) {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '无映射关系中的仓库',
          ...containerInfo
        };
      }

      // 5. 找最早可用的仓库和卸柜日
      const { warehouse, plannedUnloadDate } = await this.findEarliestAvailableWarehouse(
        warehouses,
        plannedPickupDate
      );

      if (!warehouse || !plannedUnloadDate) {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '仓库产能不足，无法排产',
          ...containerInfo
        };
      }

      // 6. 判断卸柜模式偏好
      let preferredUnloadMode: 'Drop off' | 'Live load' | 'any' = 'any';
      if (destPo.lastFreeDate) {
        const lastFreeDate = new Date(destPo.lastFreeDate);
        const daysDiff = Math.ceil(
          (lastFreeDate.getTime() - plannedPickupDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff > 1) {
          preferredUnloadMode = 'Drop off';
        } else if (plannedPickupDate > lastFreeDate) {
          preferredUnloadMode = 'Drop off';
        }
      }

      // 6.1 选择车队
      const truckingCompany = await this.truckingSelectorService.selectTruckingCompany({
        warehouseCode: warehouse.warehouseCode,
        portCode: destPo.portCode,
        countryCode: warehouse.country,
        plannedDate: plannedPickupDate,
        preferredUnloadMode,
        lastFreeDate: destPo.lastFreeDate ? new Date(destPo.lastFreeDate) : undefined,
        basePickupDate: plannedPickupDate
      });

      if (!truckingCompany) {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '无映射关系中的车队',
          ...containerInfo
        };
      }

      // 7. 确定卸柜方式
      let unloadMode: 'Drop off' | 'Live load';
      if (request.unloadMode) {
        unloadMode = request.unloadMode;
      } else {
        unloadMode = truckingCompany.hasYard ? 'Drop off' : 'Live load';
      }

      // 8. dryRun：返回方案 + 真实费用（复用 DemurrageService.calculateTotalCost，见 calculateEstimatedCosts）
      if (request.dryRun) {
        return await this.buildScheduleResultWithRealCosts(
          container,
          warehouse as Warehouse,
          truckingCompany as TruckingCompany,
          plannedCustomsDate,
          plannedPickupDate,
          plannedUnloadDate,
          unloadMode,
          containerInfo,
          emptyReturn
        );
      }

      // 9. 非 dryRun 模式，保存到数据库
      return await this.saveScheduleToDatabase(
        container,
        warehouse,
        truckingCompany,
        plannedCustomsDate,
        plannedPickupDate,
        plannedUnloadDate,
        unloadMode
      );
    } catch (error: any) {
      logger.error(
        `[IntelligentScheduling] scheduleSingleContainerWithCache error for ${container.containerNumber}:`,
        error
      );
      return {
        containerNumber: container.containerNumber,
        success: false,
        message: `排产失败: ${error.message}`,
        destinationPort: '',
        destinationPortName: '',
        etaDestPort: '',
        ataDestPort: ''
      };
    }
  }

  /**
   * 构建预览排产结果（dryRun）：计划日期 + 与详情页一致的滞港/滞箱/堆存/D&D/运输等费用
   * 统一复用 calculateEstimatedCosts → DemurrageService.calculateTotalCost（plannedDates 覆盖）
   */
  private async buildScheduleResultWithRealCosts(
    container: Container,
    warehouse: Warehouse,
    truckingCompany: TruckingCompany,
    plannedCustomsDate: Date,
    plannedPickupDate: Date,
    plannedUnloadDate: Date,
    unloadMode: 'Drop off' | 'Live load',
    containerInfo: Record<string, unknown>,
    emptyReturn: EmptyReturn | null
  ): Promise<ScheduleResult> {
    const destPo = container.portOperations?.find((po: any) => po.portType === 'destination');

    const plannedDeliveryDate = this.dateCalculator.calculatePlannedDeliveryDate(
      plannedPickupDate,
      unloadMode,
      plannedUnloadDate
    );

    let lastReturnDateHint: Date | undefined;
    if (emptyReturn?.lastReturnDate) {
      lastReturnDateHint = new Date(emptyReturn.lastReturnDate);
    } else if (destPo?.lastFreeDate) {
      lastReturnDateHint = new Date(destPo.lastFreeDate);
      lastReturnDateHint.setDate(lastReturnDateHint.getDate() + 7);
    }

    const returnDateResult = await this.dateCalculator.calculatePlannedReturnDate(
      plannedUnloadDate,
      unloadMode,
      truckingCompany.companyCode,
      lastReturnDateHint,
      plannedPickupDate
    );

    let effectiveUnloadDate = plannedUnloadDate;
    if (returnDateResult.adjustedUnloadDate) {
      effectiveUnloadDate = returnDateResult.adjustedUnloadDate;
    }

    const plannedReturnDate = returnDateResult.returnDate;

    const costBreakdown = await this.calculateEstimatedCosts(
      container.containerNumber,
      plannedPickupDate,
      effectiveUnloadDate,
      plannedReturnDate,
      unloadMode,
      warehouse,
      truckingCompany
    );

    const estimatedCosts: NonNullable<ScheduleResult['estimatedCosts']> = {
      demurrageCost: costBreakdown.demurrageCost ?? 0,
      detentionCost: costBreakdown.detentionCost ?? 0,
      storageCost: costBreakdown.storageCost ?? 0,
      ddCombinedCost: costBreakdown.ddCombinedCost ?? 0,
      transportationCost: costBreakdown.transportationCost ?? 0,
      yardStorageCost: costBreakdown.yardStorageCost ?? 0,
      handlingCost: costBreakdown.handlingCost ?? 0,
      totalCost: costBreakdown.totalCost ?? 0,
      currency: costBreakdown.currency ?? 'USD'
    };

    const lfdStr = destPo?.lastFreeDate
      ? new Date(destPo.lastFreeDate).toISOString().split('T')[0]
      : undefined;

    return {
      containerNumber: container.containerNumber,
      success: true,
      message: '排产成功',
      ...containerInfo,
      lastFreeDate: lfdStr,
      lastReturnDate: plannedReturnDate.toISOString().split('T')[0],
      plannedData: {
        // confirm 保存路径需要 plannedData 内也包含 containerNumber
        containerNumber: container.containerNumber,
        plannedCustomsDate: plannedCustomsDate.toISOString().split('T')[0],
        plannedPickupDate: plannedPickupDate.toISOString().split('T')[0],
        plannedDeliveryDate: plannedDeliveryDate.toISOString().split('T')[0],
        plannedUnloadDate: effectiveUnloadDate.toISOString().split('T')[0],
        plannedReturnDate: plannedReturnDate.toISOString().split('T')[0],
        truckingCompanyId: truckingCompany.companyCode,
        truckingCompany: truckingCompany.companyName,
        warehouseId: warehouse.warehouseCode,
        warehouseName: warehouse.warehouseName,
        warehouseCountry: warehouse.country,
        unloadModePlan: unloadMode, // ✅ 与数据库字段 unload_mode_plan 一致
        estimatedCosts: { ...estimatedCosts }
      },
      estimatedCosts: { ...estimatedCosts }
    };
  }

  /**
   * 保存排产到数据库
   */
  private async saveScheduleToDatabase(
    container: Container,
    warehouse: any,
    truckingCompany: any,
    plannedCustomsDate: Date,
    plannedPickupDate: Date,
    plannedUnloadDate: Date,
    unloadMode: 'Drop off' | 'Live load'
  ): Promise<ScheduleResult> {
    // 保存拖卡运输记录
    await this.saveTruckingTransport(
      container,
      truckingCompany,
      plannedPickupDate,
      plannedCustomsDate
    );

    // 保存仓库操作记录
    await this.saveWarehouseOperation(container, warehouse, plannedUnloadDate);

    // 更新货柜状态
    await this.updateContainerStatus(container, warehouse);

    return {
      containerNumber: container.containerNumber,
      success: true,
      message: '排产成功'
    };
  }

  private async saveTruckingTransport(
    container: Container,
    truckingCompany: any,
    plannedPickupDate: Date,
    plannedCustomsDate: Date
  ): Promise<void> {
    let trucking = await this.truckingTransportRepo.findOne({
      where: { containerNumber: container.containerNumber }
    });
    if (!trucking) {
      trucking = new TruckingTransport();
      trucking.containerNumber = container.containerNumber;
    }
    trucking.truckingCompanyId = truckingCompany.companyCode;
    trucking.plannedPickupDate = plannedPickupDate;
    trucking.plannedDeliveryDate = plannedPickupDate;
    trucking.scheduleStatus = 'issued'; // 使用正确的枚举值
    await this.truckingTransportRepo.save(trucking);
  }

  private async saveWarehouseOperation(
    container: Container,
    warehouse: any,
    plannedUnloadDate: Date
  ): Promise<void> {
    let warehouseOp = await this.warehouseOperationRepo.findOne({
      where: { containerNumber: container.containerNumber }
    });
    if (!warehouseOp) {
      warehouseOp = new WarehouseOperation();
      warehouseOp.containerNumber = container.containerNumber;
    }
    warehouseOp.warehouseId = warehouse.warehouseCode; // 使用 warehouseId 而非 warehouseCode
    warehouseOp.plannedUnloadDate = plannedUnloadDate;
    await this.warehouseOperationRepo.save(warehouseOp);
  }

  private async updateContainerStatus(container: Container, warehouse: any): Promise<void> {
    container.scheduleStatus = 'issued'; // 使用正确的枚举值
    // 移除 assignedWarehouseCode，因为 Container 实体没有这个字段
    await this.containerRepo.save(container);
  }

  /**
   * 对单个货柜进行排产
   * 规则引擎（阶段一）：先到先得 + 约束校验
   */
  private async scheduleSingleContainer(
    container: Container,
    request: ScheduleRequest
  ): Promise<ScheduleResult> {
    try {
      // ✅ 业务规则检查①：如果已有实际还箱日，不参与排产
      // 查询实际提柜日和实际还箱日（Container 实体未定义 OneToMany 关系，需手动查询）
      const [truckingTransport, emptyReturn] = await Promise.all([
        this.truckingTransportRepo.findOne({
          where: { containerNumber: container.containerNumber }
        }),
        this.emptyReturnRepo.findOne({ where: { containerNumber: container.containerNumber } })
      ]);

      const actualPickupDate = truckingTransport?.pickupDate || null;
      const actualReturnDate = emptyReturn?.returnTime || null;

      if (actualReturnDate) {
        logger.info(
          `[IntelligentScheduling] Skip scheduling for ${container.containerNumber}: already returned (actual return date: ${actualReturnDate.toISOString()})`
        );
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '货柜已还箱，无需排产',
          destinationPort: '',
          destinationPortName: '',
          etaDestPort: '',
          ataDestPort: ''
        };
      }

      // ✅ 业务规则检查②：如果已有实际提柜日，锁定提/送/卸日期，只计算还箱日
      if (actualPickupDate) {
        logger.info(
          `[IntelligentScheduling] Scheduling with actual pickup date for ${container.containerNumber}: pickup=${actualPickupDate.toISOString()}`
        );
        // 使用实际提柜日进行后续计算（在下方逻辑中处理）
      }

      // ✅ 检查是否为手工指定仓库模式
      if (request.designatedWarehouseMode && request.designatedWarehouseCode) {
        const destPo = container.portOperations?.find((po: any) => po.portType === 'destination');
        if (!destPo) {
          return {
            containerNumber: container.containerNumber,
            success: false,
            message: '无目的港操作记录',
            destinationPort: '',
            destinationPortName: '',
            etaDestPort: '',
            ataDestPort: ''
          };
        }

        // 使用手工指定仓库逻辑
        return this.scheduleWithDesignatedWarehouse(
          container,
          destPo,
          request.designatedWarehouseCode,
          request
        );
      }

      // 原有智能排产逻辑...
      // 获取目的港操作记录
      const destPo = container.portOperations?.find((po: any) => po.portType === 'destination');

      // 提取货柜基本信息用于前端展示
      const containerInfo = {
        destinationPort: destPo?.portCode || '',
        destinationPortName: destPo?.portName || '',
        etaDestPort: destPo?.eta ? new Date(destPo.eta).toISOString().split('T')[0] : '',
        ataDestPort: destPo?.ata ? new Date(destPo.ata).toISOString().split('T')[0] : ''
      };

      if (!destPo) {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '无目的港操作记录',
          ...containerInfo
        };
      }

      // 1. 清关计划日默认等于 ETA（无 ETA 时回退 ATA）
      const clearanceDate = destPo.eta || destPo.ata;
      if (!clearanceDate) {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '无到港日期（ATA/ETA），无法排产',
          ...containerInfo
        };
      }

      // 2. 计算计划清关日、提柜日（若 ATA/ETA 已过，提柜日至少为今天）
      // ✅ 修复：确保 clearanceDate 是 Date 对象，然后格式化为 YYYY-MM-DD 字符串
      let plannedCustomsDate: Date;

      if (clearanceDate instanceof Date) {
        // 如果已经是 Date 对象，直接使用（避免字符串拼接导致的格式错误）
        plannedCustomsDate = new Date(clearanceDate);
        logger.debug(
          `[IntelligentScheduling] ETA/ATA is Date object for ${container.containerNumber}`
        );
      } else if (typeof clearanceDate === 'string') {
        // 如果是字符串，添加时间部分并解析
        plannedCustomsDate = new Date(`${clearanceDate}T00:00:00`);
        logger.debug(`[IntelligentScheduling] ETA/ATA is string for ${container.containerNumber}`);
      } else {
        logger.error(
          `[IntelligentScheduling] Invalid clearanceDate type: ${typeof clearanceDate} for ${container.containerNumber}`
        );
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '到港日期类型错误',
          ...containerInfo
        };
      }

      // ✅ 立即验证 plannedCustomsDate 有效性
      if (!plannedCustomsDate || isNaN(plannedCustomsDate.getTime())) {
        logger.error(
          `[IntelligentScheduling] Failed to parse clearanceDate to valid Date for ${container.containerNumber}`
        );
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '清关日期解析失败',
          ...containerInfo
        };
      }

      // ✅ 新增：ETA 顺延天数（从请求参数读取，前端传入，不保存）
      // 业务场景：给清关预留足够时间，避免排产计划从一开始就过期
      const etaBufferDays = request.etaBufferDays || 0;
      if (etaBufferDays > 0) {
        plannedCustomsDate.setDate(plannedCustomsDate.getDate() + etaBufferDays);
        logger.debug(
          `[IntelligentScheduling] ETA buffer applied: +${etaBufferDays} days for ${container.containerNumber}`
        );
      }

      let plannedPickupDate = await this.dateCalculator.calculatePlannedPickupDate(
        plannedCustomsDate,
        destPo.lastFreeDate
      );

      // ✅ 验证日期有效性
      if (!plannedPickupDate || isNaN(plannedPickupDate.getTime())) {
        logger.warn(
          `[IntelligentScheduling] Invalid pickup date calculated for ${container.containerNumber}`
        );
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '计算提柜日失败',
          ...containerInfo
        };
      }

      // ✅ 业务规则：如果已有实际提柜日，锁定计划提柜日=实际提柜日
      if (actualPickupDate) {
        plannedPickupDate = new Date(actualPickupDate);
        plannedCustomsDate = new Date(plannedPickupDate);
        plannedCustomsDate.setUTCDate(plannedCustomsDate.getUTCDate() - 1); // 清关日=提柜日 -1
        logger.info(
          `[IntelligentScheduling] Locked pickup date to actual pickup date: ${plannedPickupDate.toISOString()} for ${container.containerNumber}`
        );
      }

      // ✅ 修复：使用纯日期比较（忽略时区），避免跨国业务场景下的日期混乱
      // 业务场景：英国货柜的 ETA 是英国本地日期，应该用英国日期判断，而不是服务器所在时区
      const today = new Date();
      // ✅ 使用 UTC 日期字符串，忽略时区差异（只比较日期部分）
      const todayStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(
        2,
        '0'
      )}-${String(today.getUTCDate()).padStart(2, '0')}`; // "2026-03-26"

      const pickupDateStr = `${plannedPickupDate.getUTCFullYear()}-${String(
        plannedPickupDate.getUTCMonth() + 1
      ).padStart(2, '0')}-${String(plannedPickupDate.getUTCDate()).padStart(2, '0')}`; // "2026-03-26"

      if (pickupDateStr <= todayStr) {
        // 提柜日是过去日期或今天，调整为明天（UTC 日期）
        const tomorrow = new Date(`${todayStr}T00:00:00Z`); // 强制使用 UTC 时间
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        plannedPickupDate = tomorrow;
        plannedCustomsDate.setTime(plannedPickupDate.getTime());
        // ✅ 修复：使用 UTC 方法计算清关日期，避免时区问题
        plannedCustomsDate.setUTCDate(plannedCustomsDate.getUTCDate() - 1); // 保持 提=清关 +1

        const tomorrowStr = `${tomorrow.getUTCFullYear()}-${String(
          tomorrow.getUTCMonth() + 1
        ).padStart(2, '0')}-${String(tomorrow.getUTCDate()).padStart(2, '0')}`;
        logger.debug(
          `[IntelligentScheduling] Pickup date adjusted from ${pickupDateStr} to tomorrow (${tomorrowStr}) for ${container.containerNumber}`
        );
      }

      // 4. 确定候选仓库（根据该国分公司 → 国家代码，见 12-国家概念统一约定.md）
      // ✅ Phase 3: 使用 WarehouseSelectorService
      const countryCode = await this.resolveCountryCode(container.replenishmentOrders?.[0] as any);
      const warehouses = await this.warehouseSelectorService.getCandidateWarehouses(
        countryCode,
        destPo.portCode
      );
      if (warehouses.length === 0) {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message:
            '无映射关系中的仓库（请配置 dict_trucking_port_mapping、dict_warehouse_trucking_mapping）',
          ...containerInfo
        };
      }

      // 5. 找最早可用的仓库和卸柜日（从提柜日起查，按仓库日产能）
      const { warehouse, plannedUnloadDate } = await this.findEarliestAvailableWarehouse(
        warehouses,
        plannedPickupDate
      );

      if (!warehouse || !plannedUnloadDate) {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '仓库产能不足，无法排产',
          ...containerInfo
        };
      }

      // 6. ✅ 2026-04-01: 提前判断卸柜模式偏好，传递给车队选择器
      // 判断逻辑：
      // - 如果 plannedPickupDate > lastFreeDate（超期），需要 Drop off 模式
      // - 如果 daysDiff > 1 且有堆场，Drop off 可能更优
      // - 否则，Live load 和 Drop off 都可
      let preferredUnloadMode: 'Drop off' | 'Live load' | 'any' = 'any';
      if (destPo.lastFreeDate) {
        const lastFreeDate = new Date(destPo.lastFreeDate);
        const daysDiff = Math.ceil(
          (lastFreeDate.getTime() - plannedPickupDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff > 1) {
          // 延迟超过1天，优先选择有堆场的车队（支持 Drop off）
          preferredUnloadMode = 'Drop off';
        } else if (plannedPickupDate > lastFreeDate) {
          // 已超期，强烈需要 Drop off 模式
          preferredUnloadMode = 'Drop off';
        }
      }

      // 6.1 先选择车队（以便根据 has_yard 决定卸柜方式）
      // ✅ Phase 3: 使用 TruckingSelectorService（含卸柜模式兼容度评分）
      const truckingCompany = await this.truckingSelectorService.selectTruckingCompany({
        warehouseCode: warehouse.warehouseCode,
        portCode: destPo.portCode,
        countryCode: warehouse.country,
        plannedDate: plannedPickupDate,
        preferredUnloadMode,
        lastFreeDate: destPo.lastFreeDate ? new Date(destPo.lastFreeDate) : undefined,
        basePickupDate: plannedPickupDate
      });

      if (!truckingCompany) {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message:
            '无映射关系中的车队（请配置 dict_warehouse_trucking_mapping 中该仓库对应的车队）',
          ...containerInfo
        };
      }

      // 7. 确定卸柜方式（优先级：用户指定 > 系统自动决策）
      // ✅ 新增：支持用户手动指定卸柜方式
      let unloadMode: 'Drop off' | 'Live load';
      if (request.unloadMode) {
        // 用户指定了卸柜方式，直接使用
        unloadMode = request.unloadMode;
        logger.info(
          `[Scheduling] Container ${container.containerNumber}: Using user-specified unloadMode: ${unloadMode}`
        );
      } else {
        // 系统自动决策：根据车队是否有堆场决定
        // has_yard = true → 支持 Drop off（提<送=卸）
        // has_yard = false → 必须 Live load（提=送=卸）
        unloadMode = truckingCompany.hasYard ? 'Drop off' : 'Live load';
        logger.info(
          `[Scheduling] Container ${container.containerNumber}: Auto-determined unloadMode: ${unloadMode} (hasYard=${truckingCompany.hasYard})`
        );
      }

      // ✅ Fast Path: 检查是否需要进行成本优化
      // 只有在可能出现成本问题时才调用成本优化算法
      // 2026-04-01: 条件2已修复，仅在 hasYard=true 时评估堆场费
      const needsOptimization = this.checkIfOptimizationNeeded(
        plannedPickupDate,
        destPo.lastFreeDate,
        plannedUnloadDate,
        truckingCompany.hasYard
      );

      if (needsOptimization) {
        // ✅ Phase 1: 实时成本优化（仅在需要时调用）
        // 在确定仓库、车队、基础提柜日后，评估成本优化方案
        const optimization = await this.costOptimizerService.suggestOptimalUnloadDate(
          container.containerNumber,
          warehouse,
          truckingCompany,
          plannedPickupDate,
          destPo.lastFreeDate
        );

        // 使用优化后的提柜日（如果找到更优方案）
        if (
          optimization.suggestedPickupDate &&
          optimization.optimizedCost < optimization.originalCost
        ) {
          logger.info(
            `[IntelligentScheduling] Cost optimization applied for ${container.containerNumber}: ${optimization.originalCost} -> ${optimization.optimizedCost}`
          );
          plannedPickupDate = optimization.suggestedPickupDate;
          // 注意：plannedUnloadDate 和 plannedReturnDate 会在后面重新计算
        }
      } else {
        logger.debug(
          `[IntelligentScheduling] Fast path for ${container.containerNumber}: Current plan is optimal`
        );
      }

      // ✅ 验证 plannedUnloadDate 有效性
      if (!plannedUnloadDate || isNaN(plannedUnloadDate.getTime())) {
        logger.warn(`[IntelligentScheduling] Invalid unload date for ${container.containerNumber}`);
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '计算卸柜日失败',
          ...containerInfo
        };
      }

      // 验证并调整：如果无堆场但提≠卸，需要调整为 Live load
      // ✅ 使用 UTC 纯日期字符串，避免时区转换
      const pickupDayStr = `${plannedPickupDate.getUTCFullYear()}-${String(
        plannedPickupDate.getUTCMonth() + 1
      ).padStart(2, '0')}-${String(plannedPickupDate.getUTCDate()).padStart(2, '0')}`;
      let unloadDate = plannedUnloadDate;
      const unloadDayStr = `${unloadDate.getUTCFullYear()}-${String(
        unloadDate.getUTCMonth() + 1
      ).padStart(2, '0')}-${String(unloadDate.getUTCDate()).padStart(2, '0')}`;

      // ✅ 业务规则：如果已有实际提柜日，强制计划送仓日=计划卸柜日=实际提柜日
      if (actualPickupDate) {
        unloadDate = new Date(actualPickupDate);
        logger.info(
          `[IntelligentScheduling] Locked unload date to actual pickup date: ${unloadDate.toISOString()} for ${container.containerNumber}`
        );
      } else if (!truckingCompany.hasYard && pickupDayStr !== unloadDayStr) {
        // 无堆场只能 Live load，需要找卸柜日 = 提柜日
        const availableDate = await this.findEarliestAvailableDay(
          warehouse.warehouseCode,
          plannedPickupDate
        );
        if (availableDate) {
          unloadDate = availableDate;
        } else {
          // 如果提柜日当天仓库已满，尝试往后找最近可用日
          const futureDate = await this.findEarliestAvailableDay(
            warehouse.warehouseCode,
            new Date(plannedPickupDate)
          );
          if (futureDate) {
            unloadDate = futureDate;
            // 同时调整提柜日以匹配卸柜日（保持 Live load）
            // ✅ 修复：使用 UTC 方法复制日期
            plannedPickupDate = new Date(
              futureDate.getUTCFullYear(),
              futureDate.getUTCMonth(),
              futureDate.getUTCDate(),
              0,
              0,
              0,
              0
            );
          }
        }
      }

      let plannedDeliveryDate = this.dateCalculator.calculatePlannedDeliveryDate(
        plannedPickupDate,
        unloadMode,
        unloadDate
      );

      // ✅ 业务规则：如果已有实际提柜日，强制计划送仓日=实际提柜日
      if (actualPickupDate) {
        plannedDeliveryDate = new Date(actualPickupDate);
        logger.info(
          `[IntelligentScheduling] Locked delivery date to actual pickup date: ${plannedDeliveryDate.toISOString()} for ${container.containerNumber}`
        );
      }

      // ✅ 验证 plannedDeliveryDate 有效性
      if (!plannedDeliveryDate || isNaN(plannedDeliveryDate.getTime())) {
        logger.warn(
          `[IntelligentScheduling] Invalid delivery date for ${container.containerNumber}`
        );
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '计算送仓日失败',
          ...containerInfo
        };
      }

      // 8. 计算计划还箱日（从 EmptyReturn 表获取最晚还箱日）
      let lastReturnDate: Date | undefined;
      const existingEmptyReturn = await this.emptyReturnRepo.findOne({
        where: { containerNumber: container.containerNumber }
      });
      if (existingEmptyReturn?.lastReturnDate) {
        lastReturnDate = new Date(existingEmptyReturn.lastReturnDate);
      } else if (destPo.lastFreeDate) {
        //  fallback: 从 lastFreeDate + 免费用箱天数计算（默认 7 天）
        lastReturnDate = new Date(destPo.lastFreeDate);
        lastReturnDate.setDate(lastReturnDate.getDate() + 7);
      }

      // ✅ 新的还箱日计算逻辑：考虑车队还箱能力
      const returnDateResult = await this.dateCalculator.calculatePlannedReturnDate(
        unloadDate,
        unloadMode,
        truckingCompany.companyCode,
        lastReturnDate,
        plannedPickupDate
      );

      const plannedReturnDate = returnDateResult.returnDate;

      // 如果卸柜日需要调整（Live load 模式下还箱能力不足）
      if (returnDateResult.adjustedUnloadDate) {
        unloadDate = returnDateResult.adjustedUnloadDate;
        // 同时调整送仓日（送 = 卸）
        plannedDeliveryDate = new Date(unloadDate);
        logger.info(
          `[IntelligentScheduling] Adjusted unload date from ${unloadDate.toISOString()} to ${returnDateResult.adjustedUnloadDate.toISOString()} for ${container.containerNumber} due to return capacity`
        );
      }

      // ✅ 验证 plannedReturnDate 有效性
      if (!plannedReturnDate || isNaN(plannedReturnDate.getTime())) {
        logger.warn(`[IntelligentScheduling] Invalid return date for ${container.containerNumber}`);
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '计算还箱日失败',
          ...containerInfo
        };
      }

      // 9. 选择清关公司（根据国家匹配，无匹配时使用"未指定"）
      const customsBrokerCode = await this.selectCustomsBroker(countryCode, destPo.portCode);

      // 10. 计算预估费用（dryRun 模式）
      const estimatedCosts = request.dryRun
        ? await this.calculateEstimatedCosts(
            container.containerNumber,
            plannedPickupDate,
            unloadDate,
            plannedReturnDate,
            unloadMode,
            warehouse,
            truckingCompany
          )
        : undefined;

      // ✅ 11. 最终验证：所有日期字段必须有效
      const allDates = {
        plannedCustomsDate,
        plannedPickupDate,
        plannedDeliveryDate,
        unloadDate,
        plannedReturnDate
      };

      for (const [dateName, dateValue] of Object.entries(allDates)) {
        if (!dateValue || isNaN(dateValue.getTime())) {
          logger.error(
            `[IntelligentScheduling] Critical: ${dateName} is invalid for ${container.containerNumber}`
          );
          return {
            containerNumber: container.containerNumber,
            success: false,
            message: `排产失败：${dateName} 计算错误`,
            ...containerInfo
          };
        }
      }

      // 12. 更新数据库（dryRun 模式下跳过）
      const plannedData = {
        plannedCustomsDate: plannedCustomsDate.toISOString().split('T')[0],
        plannedPickupDate: plannedPickupDate.toISOString().split('T')[0],
        plannedDeliveryDate: plannedDeliveryDate.toISOString().split('T')[0],
        plannedUnloadDate: unloadDate.toISOString().split('T')[0],
        plannedReturnDate: plannedReturnDate.toISOString().split('T')[0],
        truckingCompanyId: truckingCompany.companyCode,
        truckingCompany: truckingCompany.companyName || truckingCompany.companyCode,
        warehouseId: warehouse.warehouseCode,
        warehouseName: warehouse.warehouseName || warehouse.warehouseCode,
        warehouseCountry: warehouse.country || countryCode, // ✅ 添加仓库国家信息，用于前端货币格式化
        unloadModePlan: unloadMode, // ✅ 与数据库字段 unload_mode_plan 一致
        customsBrokerCode,
        lastFreeDate: destPo.lastFreeDate
          ? new Date(destPo.lastFreeDate).toISOString().split('T')[0]
          : null, // ✅ 添加最后免费日
        // 还箱码头信息（使用仓库作为还箱地点）
        returnTerminalCode: warehouse.warehouseCode,
        returnTerminalName: warehouse.warehouseName || warehouse.warehouseCode
      };

      if (!request.dryRun) {
        await this.updateContainerSchedule(container.containerNumber, plannedData);

        // 与 biz_containers.gantt_derived / logistics_status 对齐（流程表已更新）
        try {
          await this.containerStatusService.updateStatus(container.containerNumber);
        } catch (syncErr) {
          logger.warn(
            `[IntelligentScheduling] updateStatus after schedule failed for ${container.containerNumber}:`,
            syncErr
          );
        }

        // 扣减仓库日产能
        // ✅ Phase 3: 使用 OccupancyCalculator
        await this.occupancyCalculator.decrementWarehouseOccupancy(
          warehouse.warehouseCode,
          unloadDate
        );

        // 扣减拖车档期（送柜）
        // ✅ Phase 3: 使用 OccupancyCalculator
        await this.occupancyCalculator.decrementTruckingOccupancy({
          truckingCompanyId: truckingCompany.companyCode,
          date: plannedPickupDate,
          portCode: destPo.portCode,
          warehouseCode: warehouse.warehouseCode
        });

        // 扣减还箱档期（Drop off 模式需要）
        if (unloadMode === 'Drop off') {
          await this.decrementFleetReturnOccupancy(
            truckingCompany.companyCode,
            plannedReturnDate,
            warehouse.warehouseCode,
            destPo.portCode
          );
        }
      }

      // 计算还箱免费天数（动态计算：最晚还箱日 - 提柜日）
      const freeDaysRemaining =
        lastReturnDate && plannedPickupDate
          ? Math.floor(
              (lastReturnDate.getTime() - plannedPickupDate.getTime()) / (1000 * 60 * 60 * 24)
            )
          : undefined;

      // ✅ 获取免费天数（区分提柜和还箱）
      const pickupFreeDays = (destPo as any).pickupFreeDays ?? undefined; // 提柜免费天数
      const returnFreeDays = (destPo as any).returnFreeDays ?? undefined; // 还箱免费天数

      // ✅ 调试日志：记录免费天数（使用 info 确保输出）
      logger.info(
        `[IntelligentScheduling] Container ${container.containerNumber}: pickupFreeDays=${pickupFreeDays}, returnFreeDays=${returnFreeDays}`
      );

      // ✅ 调试：打印 destPo 对象，检查免费天数是否存在
      logger.info(
        `[IntelligentScheduling] Container ${container.containerNumber}: destPo.pickupFreeDays=${(destPo as any).pickupFreeDays}, destPo.returnFreeDays=${(destPo as any).returnFreeDays}`
      );

      return {
        containerNumber: container.containerNumber,
        success: true,
        message: '排产成功',
        lastFreeDate: destPo.lastFreeDate
          ? new Date(destPo.lastFreeDate).toISOString().split('T')[0]
          : undefined, // ✅ 最后免费日（提柜）
        lastReturnDate: lastReturnDate ? lastReturnDate.toISOString().split('T')[0] : undefined, // ✅ 最晚还箱日
        pickupFreeDays, // ✅ 提柜免费天数（MIN(滞港，堆存，D&D)）
        returnFreeDays, // ✅ 还箱免费天数（D&D 或 滞箱）
        freeDaysRemaining, // ✅ 还箱免费天数（动态计算）
        plannedData,
        estimatedCosts, // dryRun 模式下的预估费用
        ...containerInfo,
        warehouseName: warehouse.warehouseName || warehouse.warehouseCode
      };
    } catch (error: any) {
      logger.error(
        `[IntelligentScheduling] Error scheduling container ${container.containerNumber}:`,
        error
      );
      // 获取目的港操作记录用于错误返回
      const destPo = container.portOperations?.find((po: any) => po.portType === 'destination');
      const errorContainerInfo = {
        destinationPort: destPo?.portCode || '',
        destinationPortName: destPo?.portName || '',
        etaDestPort: destPo?.eta ? new Date(destPo.eta).toISOString().split('T')[0] : '',
        ataDestPort: destPo?.ata ? new Date(destPo.ata).toISOString().split('T')[0] : ''
      };
      return {
        containerNumber: container.containerNumber,
        success: false,
        message: error.message || '排产失败',
        ...errorContainerInfo
      };
    }
  }

  /**
   * 将备货单的销往信息解析为国家代码（dict_countries.code）
   * 约定：country 字段存国家代码；sell_to_country 存子公司名称，需通过 customer 取 country
   * @see frontend/public/docs/11-project/12-国家概念统一约定.md
   */
  private async resolveCountryCode(
    order:
      | { customer?: { country?: string }; customerCode?: string; sellToCountry?: string }
      | undefined
  ): Promise<string | undefined> {
    if (!order) return undefined;
    // 优先：通过 customer 关联取 country（国家代码）
    if (order.customer?.country) return order.customer.country;
    const v = (order.sellToCountry || '').trim();
    if (!v) return undefined;
    // 已是国家代码格式（2-3 位大写，如 US/CA/GB/UK），规范化别名 UK->GB
    if (/^[A-Z]{2,3}$/.test(v)) return normalizeCountryCode(v);
    // 回退：sell_to_country 为子公司名称，通过 customer_name 查 country
    const cust = await this.customerRepo.findOne({
      where: { customerName: v },
      select: ['country']
    });
    return cust?.country ?? undefined;
  }

  /**
   * 找到最早可用的仓库和卸柜日
   */
  private async findEarliestAvailableWarehouse(
    warehouses: Warehouse[],
    earliestDate: Date
  ): Promise<{ warehouse: Warehouse | null; plannedUnloadDate: Date | null }> {
    for (const warehouse of warehouses) {
      // 查找该仓库从 earliestDate 起的可用日
      const availableDate = await this.findEarliestAvailableDay(
        warehouse.warehouseCode,
        earliestDate
      );
      if (availableDate) {
        return { warehouse, plannedUnloadDate: availableDate };
      }
    }
    return { warehouse: null, plannedUnloadDate: null };
  }

  /**
   * 找到某仓库 earliestDate 起首个有产能的日期
   */
  private async findEarliestAvailableDay(
    warehouseCode: string,
    earliestDate: Date
  ): Promise<Date | null> {
    // 向前查找最多 30 天
    for (let i = 0; i < 30; i++) {
      const date = new Date(earliestDate);
      // 使用 UTC 方法，避免时区问题
      date.setUTCDate(date.getUTCDate() + i);
      date.setUTCHours(0, 0, 0, 0); // 去除时间部分，只保留日期

      // 使用日期字符串查询，避免时区转换问题
      const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
        2,
        '0'
      )}-${String(date.getUTCDate()).padStart(2, '0')}`;

      // 查找或创建当日占用记录
      const occupancy = await this.warehouseOccupancyRepo.findOne({
        where: {
          warehouseCode,
          date: dateStr as any
        }
      });

      if (!occupancy) {
        // 使用仓库默认产能
        await AppDataSource.getRepository(Warehouse).findOne({
          where: { warehouseCode }
        });
        return date;
      }

      if (occupancy.plannedCount < occupancy.capacity) {
        return date;
      }
    }
    return null;
  }

  /**
   * ✅ Fast Path: 检查是否需要进行成本优化
   *
   * **设计原则**: Lazy Evaluation（惰性计算）
   * - 如果默认方案已经是最优的（提柜日在免费期内、仓库能快速卸货），就不需要额外计算
   * - 只有在可能出现成本问题时才调用成本优化算法
   *
   * @param plannedPickupDate 计划提柜日
   * @param lastFreeDate 最后免费日
   * @param plannedUnloadDate 计划卸柜日
   * @param hasYard 车队是否有堆场
   * @returns true=需要优化，false=快速路径（跳过优化）
   */
  private checkIfOptimizationNeeded(
    plannedPickupDate: Date,
    lastFreeDate: Date | undefined,
    plannedUnloadDate: Date | null,
    hasYard: boolean
  ): boolean {
    // 条件1: 提柜日是否在免费期内
    // 如果提柜日已超期（> lastFreeDate），必须优化
    if (lastFreeDate) {
      const pickupDateOnly = new Date(plannedPickupDate);
      pickupDateOnly.setHours(0, 0, 0, 0);
      const lastFreeOnly = new Date(lastFreeDate);
      lastFreeOnly.setHours(0, 0, 0, 0);

      if (pickupDateOnly > lastFreeOnly) {
        logger.debug(
          `[IntelligentScheduling] Optimization needed: pickupDate ${pickupDateOnly.toISOString().split('T')[0]} > lastFreeDate ${lastFreeOnly.toISOString().split('T')[0]}`
        );
        return true;
      }
    }

    // 条件 2: 卸柜延迟天数（仅适用于有堆场的车队）
    // 如果提柜日和卸柜日相差超过 1 天，可能产生堆场费，需要优化
    // 注意：Live load 模式（hasYard=false）提=卸=送，daysDiff 永远是 0，无需评估堆场费
    if (plannedUnloadDate && hasYard) {
      const pickupDateOnly = new Date(plannedPickupDate);
      pickupDateOnly.setHours(0, 0, 0, 0);
      const unloadDateOnly = new Date(plannedUnloadDate);
      unloadDateOnly.setHours(0, 0, 0, 0);
      const daysDiff = Math.ceil(
        (unloadDateOnly.getTime() - pickupDateOnly.getTime()) / (1000 * 60 * 60 * 24)
      );

      // 如果延迟超过1天，可能产生堆场费，需要优化
      if (daysDiff > 1) {
        logger.debug(
          `[IntelligentScheduling] Optimization needed: ${daysDiff} days delay with yard`
        );
        return true;
      }
    }

    // 条件3: Happy Path - 当前方案已是最优，跳过成本优化
    logger.debug(
      `[IntelligentScheduling] Fast path: No optimization needed. pickup=${plannedPickupDate.toISOString().split('T')[0]}, lastFree=${lastFreeDate?.toISOString().split('T')[0]}, delay=${plannedUnloadDate ? Math.ceil((new Date(plannedUnloadDate).getTime() - new Date(plannedPickupDate).getTime()) / (1000 * 60 * 60 * 24)) : 0}d, hasYard=${hasYard}`
    );
    return false;
  }

  /**
   * 获取候选仓库列表（基于港口 + 车队 + 仓库映射链）
   * @param countryCode 国家代码
   * @param portCode 港口代码
   * @returns 候选仓库列表
   */
  async getCandidateWarehouses(countryCode?: string, portCode?: string): Promise<Warehouse[]> {
    // 委托给 WarehouseSelectorService
    return this.warehouseSelectorService.getCandidateWarehouses(countryCode, portCode);
  }

  /**
   * 选择车队（严格匹配映射关系）
   * 仅从 dict_warehouse_trucking_mapping 中选择，且车队须在 dict_trucking_port_mapping 中服务该港口
   * 不再回退到仅港口映射的车队，确保 (仓库，车队) 在 warehouse_trucking_mapping 中存在
   *
   * ✅ 新增：综合考虑成本、能力、关系维护的多目标优化
   */
  private async selectTruckingCompany(
    warehouseCode: string,
    portCode?: string,
    plannedPickupDate?: Date,
    countryCode?: string
  ): Promise<TruckingCompany | null> {
    const checkDate = plannedPickupDate || new Date();
    const dateOnly = new Date(checkDate);
    dateOnly.setHours(0, 0, 0, 0);

    // ========== 阶段 1: 筛选候选车队 ==========
    const candidateFilters = await this.filterCandidateTruckingCompanies({
      warehouseCode,
      portCode,
      countryCode,
      plannedDate: dateOnly
    });

    if (candidateFilters.length === 0) {
      return null;
    }

    // ========== 阶段 2: 综合评分 ==========
    // 对每个候选车队进行评分
    const scoredCandidates = await this.scoreTruckingCompanies(
      candidateFilters,
      warehouseCode,
      portCode
    );

    // ========== 阶段 3: 决策优化 ==========
    // 按综合得分排序，选择最优车队
    const sortedCandidates = scoredCandidates.sort((a, b) => b.totalScore - a.totalScore);

    if (sortedCandidates.length > 0) {
      const bestCandidate = sortedCandidates[0];
      logger.debug(
        `[IntelligentScheduling] Selected trucking company: ${bestCandidate.truckingCompanyId}, ` +
          `score=${bestCandidate.totalScore.toFixed(2)}, cost=${bestCandidate.transportCost}`
      );

      return AppDataSource.getRepository(TruckingCompany).findOne({
        where: { companyCode: bestCandidate.truckingCompanyId }
      });
    }

    return null;
  }

  /**
   * 根据国家、港口匹配清关公司
   * 匹配规则：
   * 1. 优先匹配 国家 + 港口 都匹配的清关公司
   * 2. 如果没有精确匹配，只匹配国家
   * 3. 如果都没有匹配，返回 "UNSPECIFIED"（未指定）
   */
  private async selectCustomsBroker(countryCode?: string, _portCode?: string): Promise<string> {
    try {
      // 优先尝试精确匹配（国家 + 港口）
      // 注意：目前 dict_customs_brokers 表没有 port_code 字段，
      // 后续可能需要创建 dict_customs_port_mapping 表来实现更精细的匹配
      // 暂时只基于国家匹配

      if (!countryCode) {
        return UNSPECIFIED_CUSTOMS_BROKER;
      }

      // 根据国家匹配清关公司
      const brokers = await this.customsBrokerRepo.find({
        where: {
          country: countryCode
        },
        order: { brokerCode: 'ASC' },
        take: 1
      });

      if (brokers.length > 0) {
        return brokers[0].brokerCode;
      }

      // 如果没有匹配到，返回"未指定"
      logger.info(
        `[IntelligentScheduling] No customs broker found for country: ${countryCode}, using UNSPECIFIED`
      );
      return UNSPECIFIED_CUSTOMS_BROKER;
    } catch (error) {
      logger.warn('[IntelligentScheduling] Error selecting customs broker:', error);
      return UNSPECIFIED_CUSTOMS_BROKER;
    }
  }

  /**
   * 更新货柜计划
   */
  private async updateContainerSchedule(containerNumber: string, plannedData: any): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.startTransaction();

      // 更新或创建拖卡运输记录
      let truckingTransport = await this.truckingTransportRepo.findOne({
        where: { containerNumber }
      });
      if (truckingTransport) {
        await queryRunner.manager.update(
          TruckingTransport,
          { containerNumber },
          {
            plannedPickupDate: plannedData.plannedPickupDate,
            plannedDeliveryDate: plannedData.plannedDeliveryDate,
            truckingCompanyId: plannedData.truckingCompanyId,
            unloadModePlan: plannedData.unloadMode, // 数据库字段是 unload_mode_plan
            scheduleStatus: 'issued'
          }
        );
      } else {
        // 创建新记录
        truckingTransport = this.truckingTransportRepo.create({
          containerNumber,
          plannedPickupDate: plannedData.plannedPickupDate,
          plannedDeliveryDate: plannedData.plannedDeliveryDate,
          truckingCompanyId: plannedData.truckingCompanyId,
          unloadModePlan: plannedData.unloadMode, // 数据库字段是 unload_mode_plan
          scheduleStatus: 'issued'
        });
        await queryRunner.manager.save(TruckingTransport, truckingTransport);
      }

      // 更新或创建仓库操作记录
      let warehouseOperation = await this.warehouseOperationRepo.findOne({
        where: { containerNumber }
      });
      if (warehouseOperation) {
        await queryRunner.manager.update(
          WarehouseOperation,
          { containerNumber },
          {
            plannedUnloadDate: plannedData.plannedUnloadDate,
            warehouseId: plannedData.warehouseId
          }
        );
      } else {
        warehouseOperation = this.warehouseOperationRepo.create({
          containerNumber,
          plannedUnloadDate: plannedData.plannedUnloadDate,
          warehouseId: plannedData.warehouseId
        });
        await queryRunner.manager.save(WarehouseOperation, warehouseOperation);
      }

      // 更新港口操作记录
      const portOperation = await this.portOperationRepo.findOne({
        where: { containerNumber, portType: 'destination' }
      });
      if (portOperation) {
        await queryRunner.manager.update(
          PortOperation,
          { id: portOperation.id },
          {
            plannedCustomsDate: plannedData.plannedCustomsDate,
            customsBrokerCode: plannedData.customsBrokerCode
          }
        );
      }

      // 更新或创建还箱记录
      let emptyReturn = await this.emptyReturnRepo.findOne({
        where: { containerNumber }
      });
      if (emptyReturn) {
        await queryRunner.manager.update(
          EmptyReturn,
          { containerNumber },
          {
            plannedReturnDate: plannedData.plannedReturnDate,
            returnTerminalCode: plannedData.returnTerminalCode,
            returnTerminalName: plannedData.returnTerminalName
          }
        );
      } else {
        emptyReturn = this.emptyReturnRepo.create({
          containerNumber,
          plannedReturnDate: plannedData.plannedReturnDate,
          returnTerminalCode: plannedData.returnTerminalCode,
          returnTerminalName: plannedData.returnTerminalName
        });
        await queryRunner.manager.save(EmptyReturn, emptyReturn);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 扣减仓库日产能
   */
  private async decrementWarehouseOccupancy(warehouseCode: string, date: Date): Promise<void> {
    const occupancy = await this.warehouseOccupancyRepo.findOne({
      where: { warehouseCode, date }
    });

    if (occupancy) {
      occupancy.plannedCount += 1;
      await this.warehouseOccupancyRepo.save(occupancy);
    } else {
      // 创建新记录
      const warehouse = await AppDataSource.getRepository(Warehouse).findOne({
        where: { warehouseCode }
      });
      await this.warehouseOccupancyRepo.save({
        warehouseCode,
        date,
        plannedCount: 1,
        capacity: warehouse?.dailyUnloadCapacity || 10
      });
    }
  }

  /**
   * 扣减拖车档期
   */
  private async decrementTruckingOccupancy(
    truckingCompanyId: string,
    date: Date,
    portCode?: string,
    warehouseCode?: string
  ): Promise<void> {
    const occupancy = await this.truckingOccupancyRepo.findOne({
      where: { truckingCompanyId, date, portCode, warehouseCode }
    });

    if (occupancy) {
      occupancy.plannedTrips += 1;
      await this.truckingOccupancyRepo.save(occupancy);
    } else {
      const trucking = await AppDataSource.getRepository(TruckingCompany).findOne({
        where: { companyCode: truckingCompanyId },
        select: ['dailyCapacity']
      });
      const capacity = trucking?.dailyCapacity ?? OCCUPANCY_CONFIG.DEFAULT_TRUCKING_DAILY_CAPACITY; // 配置化：默认日操作能力
      await this.truckingOccupancyRepo.save({
        truckingCompanyId,
        date,
        portCode,
        warehouseCode,
        plannedTrips: 1,
        capacity
      });
    }
  }

  /**
   * 扣减车队还箱档期（Drop off 模式使用）
   */
  private async decrementFleetReturnOccupancy(
    truckingCompanyId: string,
    returnDate: Date,
    _warehouseCode?: string,
    _portCode?: string
  ): Promise<void> {
    const repo = AppDataSource.getRepository(ExtTruckingReturnSlotOccupancy);
    const returnDateOnly = new Date(returnDate);
    returnDateOnly.setHours(0, 0, 0, 0);

    const occupancy = await repo.findOne({
      where: { truckingCompanyId, slotDate: returnDateOnly }
    });

    if (occupancy) {
      // 更新现有记录
      occupancy.plannedCount += 1;
      occupancy.remaining -= 1;
      await repo.save(occupancy);
    } else {
      // 创建新记录，从车队配置读取容量
      const trucking = await AppDataSource.getRepository(TruckingCompany).findOne({
        where: { companyCode: truckingCompanyId },
        select: ['dailyReturnCapacity', 'dailyCapacity']
      });
      // 优先使用 daily_return_capacity，若无则使用 daily_capacity（配置化）
      const capacity =
        trucking?.dailyReturnCapacity ??
        trucking?.dailyCapacity ??
        OCCUPANCY_CONFIG.DEFAULT_TRUCKING_RETURN_CAPACITY;

      await repo.save({
        truckingCompanyId,
        slotDate: returnDateOnly,
        plannedCount: 1,
        capacity,
        remaining: capacity - 1
      });
    }

    logger.info(
      `[IntelligentScheduling] Decremented fleet return occupancy: ${truckingCompanyId} on ${returnDateOnly.toISOString()}`
    );
  }

  /**
   * 计算预估费用（dryRun 模式下使用）
   */
  private async calculateEstimatedCosts(
    containerNumber: string,
    plannedPickupDate: Date,
    plannedUnloadDate: Date,
    plannedReturnDate: Date,
    unloadMode: string,
    warehouse: Warehouse,
    truckingCompany: TruckingCompany
  ): Promise<{
    demurrageCost?: number;
    detentionCost?: number;
    storageCost?: number;
    ddCombinedCost?: number; // D&D 合并费用
    transportationCost?: number;
    yardStorageCost?: number; // 外部堆场堆存费（Drop off 模式专属）
    handlingCost?: number; // 操作费/加急费（Expedited 模式专属）
    totalCost?: number;
    currency?: string;
  }> {
    try {
      // ✅ 新增：检查是否为手工指定仓库模式，如果是，跳过成本优化建议
      logger.debug(`[IntelligentScheduling] Calculating estimated costs for ${containerNumber}`);

      // ✅ 调试日志：查看传入的计划日期
      logger.info(`[IntelligentScheduling] Planned dates for ${containerNumber}:`, {
        plannedPickupDate,
        plannedUnloadDate,
        plannedReturnDate
      });

      // 使用统一的 calculateTotalCost 方法计算所有 D&D 费用和运输费
      const totalCostResult = await this.demurrageService.calculateTotalCost(containerNumber, {
        mode: 'forecast',
        plannedDates: {
          plannedPickupDate,
          plannedUnloadDate,
          plannedReturnDate
        },
        includeTransport: true,
        warehouse,
        truckingCompany,
        unloadMode
      });

      // ✅ 调试日志：查看各项费用
      logger.info(`[IntelligentScheduling] Cost breakdown for ${containerNumber}:`, {
        demurrageCost: totalCostResult.demurrageCost,
        detentionCost: totalCostResult.detentionCost,
        storageCost: totalCostResult.storageCost,
        ddCombinedCost: totalCostResult.ddCombinedCost,
        transportationCost: totalCostResult.transportationCost,
        totalCost: totalCostResult.totalCost,
        currency: totalCostResult.currency,
        items: totalCostResult.items?.map((item) => ({
          chargeName: item.chargeName,
          chargeTypeCode: item.chargeTypeCode,
          freeDays: item.freeDays,
          chargeDays: item.chargeDays,
          amount: item.amount,
          tierBreakdown: item.tierBreakdown
        }))
      });

      // 计算外部堆场堆存费（仅在 Drop off 模式、车队有堆场且实际使用时）
      let yardStorageCost = 0;
      if (unloadMode === 'Drop off' && truckingCompany.hasYard) {
        try {
          // ✅ 关键修复：判断是否实际使用了堆场：提柜日 < 送仓日
          // 送仓日计算：Drop off 模式下，送仓日 = 卸柜日
          const plannedDeliveryDate = plannedUnloadDate; // Drop off: 送 = 卸

          // 判断是否实际使用了堆场：提柜日 < 送仓日
          const pickupDayStr = plannedPickupDate.toISOString().split('T')[0];
          const deliveryDayStr = plannedDeliveryDate.toISOString().split('T')[0];

          if (pickupDayStr !== deliveryDayStr) {
            // ✅ 提 < 送，说明货柜在堆场存放了
            // ✅ 预计堆场存放天数（从提柜日到送仓日）
            const yardStorageDays = dateTimeUtils.daysBetween(
              plannedPickupDate,
              plannedDeliveryDate
            );

            // 获取货柜的目的港信息
            const container = await this.containerRepo.findOne({
              where: { containerNumber },
              relations: ['portOperations']
            });

            if (container) {
              const destPo = container.portOperations?.find(
                (po: any) => po.portType === 'destination'
              );
              const portCode = destPo?.portCode || 'USLAX';
              const countryCode = warehouse.country || 'US';

              // 从 TruckingPortMapping 获取堆场费率
              const truckingPortMapping = await this.truckingPortMappingRepo.findOne({
                where: {
                  country: countryCode,
                  portCode,
                  truckingCompanyId: truckingCompany.companyCode,
                  isActive: true
                }
              });

              if (truckingPortMapping) {
                // 计算外部堆场堆存费 = 每日费率 × 天数 + 操作费
                // ✅ 关键修复：TypeORM 的 decimal 类型返回字符串，需要显式转换为数字
                const standardRate = Number(truckingPortMapping.standardRate) || 0;
                const yardOperationFee = Number(truckingPortMapping.yardOperationFee) || 0;
                yardStorageCost = standardRate * yardStorageDays + yardOperationFee;
              }
            }
          } // ← 添加闭合括号
        } catch (error) {
          logger.error(`[IntelligentScheduling] Yard storage cost calculation failed:`, error);
          // 计算失败不影响整体，yardStorageCost 保持为 0
        }
      }

      // 加急费单独计算（仅在 Expedited 模式下收取）
      let handlingCost = 0;
      if (unloadMode === 'Expedited') {
        try {
          const config = await this.schedulingConfigRepo.findOne({
            where: { configKey: 'expedited_handling_fee' }
          });
          handlingCost = config?.configValue ? parseFloat(config.configValue) : 50;
        } catch (error) {
          logger.warn('[IntelligentScheduling] Get expedited handling fee failed:', error);
          handlingCost = 50; // 默认$50
        }
      }

      // ✅ 关键修复：完整返回所有费用项，包括 ddCombinedCost
      // ✅ 确保所有数值都是 number 类型，避免字符串拼接
      return {
        demurrageCost: Number(totalCostResult.demurrageCost) || 0,
        detentionCost: Number(totalCostResult.detentionCost) || 0,
        storageCost: Number(totalCostResult.storageCost) || 0,
        ddCombinedCost: Number(totalCostResult.ddCombinedCost) || 0, // ✅ 新增：D&D 合并费用
        transportationCost: Number(totalCostResult.transportationCost) || 0,
        yardStorageCost: Number(yardStorageCost) || 0, // 外部堆场堆存费（如有）
        handlingCost: Number(handlingCost) || 0, // 加急费（如有）
        totalCost:
          Number(totalCostResult.totalCost) + Number(yardStorageCost) + Number(handlingCost), // 总计包含两种堆存费和加急费
        currency: totalCostResult.currency
      };
    } catch (error) {
      logger.error(`[IntelligentScheduling] calculateEstimatedCosts error:`, error);
      return {
        totalCost: 0,
        currency: 'USD'
      };
    }
  }

  /**
   * 阶段 1: 筛选候选车队
   * 基于映射关系和能力约束
   */
  private async filterCandidateTruckingCompanies(filter: {
    warehouseCode: string;
    portCode?: string;
    countryCode?: string;
    plannedDate: Date;
  }): Promise<Array<{ truckingCompanyId: string; hasCapacity: boolean }>> {
    const candidates: Array<{ truckingCompanyId: string; hasCapacity: boolean }> = [];

    // 1. 从 warehouse_trucking_mapping 获取仓库映射的车队
    const mappingWhere: any = { warehouseCode: filter.warehouseCode, isActive: true };
    if (filter.countryCode) mappingWhere.country = filter.countryCode;

    const mappings = await this.warehouseTruckingMappingRepo.find({
      where: mappingWhere,
      take: 20
    });

    let candidateIds = mappings.map((m) => m.truckingCompanyId);

    // 2. 如果指定了港口，进一步过滤（trucking_port_mapping）
    if (filter.portCode && filter.countryCode) {
      const portMappings = await this.truckingPortMappingRepo.find({
        where: { portCode: filter.portCode, country: filter.countryCode, isActive: true }
      });
      const portTruckingIds = new Set(portMappings.map((pm) => pm.truckingCompanyId));
      candidateIds = candidateIds.filter((id) => portTruckingIds.has(id));
    }

    // 3. 批量查询所有候选车队的档期占用情况（N+1优化）
    const occupancyWhere: any = {
      date: filter.plannedDate,
      isActive: true
    };
    if (filter.portCode) occupancyWhere.portCode = filter.portCode;
    if (filter.warehouseCode) occupancyWhere.warehouseCode = filter.warehouseCode;

    const allOccupancies =
      candidateIds.length > 0
        ? await this.truckingOccupancyRepo.find({
            where: occupancyWhere
          })
        : [];

    // 构建 Map 用于快速查找
    const occupancyMap = new Map<string, ExtTruckingSlotOccupancy>();
    allOccupancies.forEach((o) => {
      const key = `${o.truckingCompanyId}`;
      occupancyMap.set(key, o);
    });

    // 筛选有可用能力的车队
    for (const truckingId of candidateIds) {
      const occupancy = occupancyMap.get(truckingId);
      const hasCapacity = !occupancy || occupancy.plannedTrips < occupancy.capacity;

      if (hasCapacity) {
        candidates.push({
          truckingCompanyId: truckingId,
          hasCapacity
        });
      }
    }

    return candidates;
  }

  /**
   * 阶段 2: 综合评分（N+1优化版）
   * 对候选车队进行成本、能力、关系多维度评分
   * 优化：批量加载所有数据，避免循环内查询
   */
  private async scoreTruckingCompanies(
    candidates: Array<{ truckingCompanyId: string; hasCapacity: boolean }>,
    warehouseCode: string,
    portCode?: string
  ): Promise<
    Array<{
      truckingCompanyId: string;
      costScore: number;
      capacityScore: number;
      relationshipScore: number;
      totalScore: number;
      transportCost: number;
    }>
  > {
    if (candidates.length === 0) return [];

    const truckingIds = candidates.map((c) => c.truckingCompanyId);

    // ========== 批量加载阶段：一次查询所有数据 ==========

    // 1. 批量查询 warehouse-trucking 映射关系
    const warehouseTruckingMappings = await this.warehouseTruckingMappingRepo.find({
      where: { warehouseCode, isActive: true }
    });
    const wtMappingMap = new Map<string, WarehouseTruckingMapping>();
    warehouseTruckingMappings.forEach((m) => wtMappingMap.set(m.truckingCompanyId, m));

    // 2. 批量查询 trucking-port 映射关系（如果指定了港口）
    const truckingPortMappings: TruckingPortMapping[] = [];
    if (portCode) {
      const foundMappings = await this.truckingPortMappingRepo.find({
        where: { portCode, isActive: true }
      });
      // 只保留候选车队相关的映射
      const portTruckingIds = new Set(foundMappings.map((m) => m.truckingCompanyId));
      truckingPortMappings.push(
        ...foundMappings.filter((m) => portTruckingIds.has(m.truckingCompanyId))
      );
    }
    const tpMappingMap = new Map<string, TruckingPortMapping>();
    truckingPortMappings.forEach((m) => tpMappingMap.set(m.truckingCompanyId, m));

    // 3. 批量查询车队信息
    const truckingCompanies = await AppDataSource.getRepository(TruckingCompany)
      .createQueryBuilder('tc')
      .where('tc.company_code IN (:...ids)', { ids: truckingIds })
      .select(['tc.company_code', 'tc.has_yard', 'tc.daily_capacity', 'tc.partnership_level'])
      .getRawMany();

    const truckingMap = new Map<
      string,
      { hasYard: boolean; dailyCapacity: number; partnershipLevel: string }
    >();
    truckingCompanies.forEach((tc) => {
      truckingMap.set(tc.tc_company_code, {
        hasYard: tc.tc_has_yard || false,
        dailyCapacity: Number(tc.tc_daily_capacity) || 0,
        partnershipLevel: tc.tc_partnership_level || 'NORMAL'
      });
    });

    // 4. 批量查询历史合作数据
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RELATIONSHIP_SCORING.COLLABORATION_DAYS);

    const collaborationCounts = await AppDataSource.getRepository(Container)
      .createQueryBuilder('container')
      .select('container.trucking_company_id', 'truckingCompanyId')
      .addSelect('COUNT(*)', 'count')
      .where('container.trucking_company_id IN (:...ids)', { ids: truckingIds })
      .andWhere('container.created_at >= :cutoffDate', { cutoffDate: cutoffDate.toISOString() })
      .groupBy('container.trucking_company_id')
      .getRawMany();

    const collaborationMap = new Map<string, number>();
    collaborationCounts.forEach((cc) => {
      collaborationMap.set(cc.truckingCompanyId, parseInt(cc.count) || 0);
    });

    // ========== 内存计算阶段：使用 Map 进行高效计算 ==========

    // 计算成本 Map
    const costMap = new Map<string, number>();
    for (const candidate of candidates) {
      const cost = this.calculateTruckingCostFromCache(
        candidate.truckingCompanyId,
        warehouseCode,
        portCode,
        wtMappingMap,
        truckingMap,
        tpMappingMap
      );
      costMap.set(candidate.truckingCompanyId, cost);
    }

    // 归一化成本评分（最低成本=100 分）
    const costs = Array.from(costMap.values());
    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    const costRange = maxCost - minCost || 1;

    // 计算关系评分 Map
    const relationshipScoreMap = new Map<string, number>();
    for (const candidate of candidates) {
      const score = this.calculateRelationshipScoreFromCache(
        candidate.truckingCompanyId,
        collaborationMap,
        truckingMap
      );
      relationshipScoreMap.set(candidate.truckingCompanyId, score);
    }

    // ========== 获取动态评分权重（规则引擎） ==========
    const scoringWeights = await this.getScoringWeights(warehouseCode, portCode);

    // ========== 最终评分阶段 ==========
    const scoredCandidates = candidates.map((candidate) => {
      const cost = costMap.get(candidate.truckingCompanyId) || 100;
      const costScore = ((maxCost - cost) / costRange) * 100;
      const capacityScore = candidate.hasCapacity ? scoringWeights.capacity * 100 : 0;
      const relationshipScore =
        relationshipScoreMap.get(candidate.truckingCompanyId) || RELATIONSHIP_SCORING.BASE_SCORE;
      const totalScore =
        costScore * scoringWeights.cost +
        capacityScore +
        relationshipScore * scoringWeights.relationship;

      return {
        truckingCompanyId: candidate.truckingCompanyId,
        costScore,
        capacityScore,
        relationshipScore,
        totalScore,
        transportCost: cost
      };
    });

    return scoredCandidates;
  }

  /**
   * 从缓存数据计算单个车队的运输成本
   */
  private calculateTruckingCostFromCache(
    truckingCompanyId: string,
    warehouseCode: string,
    portCode: string | undefined,
    wtMappingMap: Map<string, WarehouseTruckingMapping>,
    truckingMap: Map<string, { hasYard: boolean; dailyCapacity: number; partnershipLevel: string }>,
    tpMappingMap: Map<string, TruckingPortMapping>
  ): number {
    // 从缓存获取 warehouse-trucking 映射
    const wtMapping = wtMappingMap.get(truckingCompanyId);
    let transportFee = Number(wtMapping?.transportFee || 100);

    // 如果车队有堆场且指定了港口，计算堆场费
    if (portCode) {
      const trucking = truckingMap.get(truckingCompanyId);
      if (trucking?.hasYard) {
        const tpMapping = tpMappingMap.get(truckingCompanyId);
        const yardOperationFee = Number(tpMapping?.yardOperationFee || 0);
        const dailyYardRate = Number(tpMapping?.standardRate || 0);
        const estimatedYardDays = DATE_CALCULATION_CONFIG.DEFAULT_ESTIMATED_YARD_DAYS;
        const yardStorageCost = dailyYardRate * estimatedYardDays;
        transportFee += yardOperationFee + yardStorageCost;
      }
    }

    return transportFee;
  }

  /**
   * 从缓存数据计算单个车队的关系评分
   */
  private calculateRelationshipScoreFromCache(
    truckingCompanyId: string,
    collaborationMap: Map<string, number>,
    truckingMap: Map<string, { hasYard: boolean; dailyCapacity: number; partnershipLevel: string }>
  ): number {
    let score = RELATIONSHIP_SCORING.BASE_SCORE;

    // 1. 历史合作加分
    const recentCollaboration = collaborationMap.get(truckingCompanyId) || 0;
    const collaborationBonus = Math.min(
      recentCollaboration * RELATIONSHIP_SCORING.COLLABORATION_BONUS_FACTOR,
      RELATIONSHIP_SCORING.COLLABORATION_BONUS_MAX
    );
    score += collaborationBonus;

    // 2. 合作关系级别加分（使用配置化规则）
    const trucking = truckingMap.get(truckingCompanyId);
    const levelBonus = getPartnershipLevelBonus(trucking?.partnershipLevel);
    score += levelBonus;

    // 3. 大运力加分
    if (
      (trucking?.dailyCapacity || 0) >= SCHEDULING_RULES.CAPACITY_SCORING.LARGE_CAPACITY_THRESHOLD
    ) {
      score += SCHEDULING_RULES.CAPACITY_SCORING.LARGE_CAPACITY_BONUS;
    }

    // 4. 服务质量加分
    score += RELATIONSHIP_SCORING.SERVICE_QUALITY_BONUS;

    // 确保分数在 0-100 范围内
    return Math.max(0, Math.min(100, score));
  }

  /**
   * 获取动态评分权重（规则引擎集成）
   * 优先从规则引擎获取，fallback 到静态配置
   */
  private async getScoringWeights(
    warehouseCode: string,
    portCode?: string
  ): Promise<{
    cost: number;
    capacity: number;
    relationship: number;
  }> {
    try {
      // 构建执行上下文
      const context: RuleExecutionContext = {
        executionId: `weight-${Date.now()}`,
        warehouseCode,
        portCode,
        executionDate: new Date()
      };

      // 调用规则引擎
      const result = await ruleEngineService.executeRules(context);

      if (result.matchedRule?.actions) {
        const weights = result.adjustedScores.weights;
        if (
          weights?.cost !== undefined &&
          weights?.capacity !== undefined &&
          weights?.relationship !== undefined
        ) {
          logger.debug(
            `[RuleEngine] Using dynamic weights: cost=${weights.cost}, capacity=${weights.capacity}, relationship=${weights.relationship}`
          );
          return {
            cost: weights.cost,
            capacity: weights.capacity,
            relationship: weights.relationship
          };
        }
      }
    } catch (error) {
      logger.warn(`[RuleEngine] Failed to get dynamic weights, using static config:`, error);
    }

    // Fallback 到静态配置
    return {
      cost: SCORING_WEIGHTS.COST,
      capacity: SCORING_WEIGHTS.CAPACITY,
      relationship: SCORING_WEIGHTS.RELATIONSHIP
    };
  }

  /**
   * 使用手工指定的仓库进行排产
   * @param container 货柜
   * @param destPo 港口操作
   * @param designatedWarehouseCode 手工指定的仓库代码
   * @param request 排产请求
   * @returns 排产结果
   */
  private async scheduleWithDesignatedWarehouse(
    container: Container,
    destPo: PortOperation,
    designatedWarehouseCode: string,
    _request: ScheduleRequest
  ): Promise<ScheduleResult> {
    try {
      logger.info(
        `[IntelligentScheduling] Using designated warehouse: ${designatedWarehouseCode} for ${container.containerNumber}`
      );

      // 1. 验证仓库是否存在且可用
      const warehouse = await AppDataSource.getRepository(Warehouse).findOne({
        where: {
          warehouseCode: designatedWarehouseCode,
          status: 'ACTIVE'
        }
      });

      if (!warehouse) {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: `指定的仓库 ${designatedWarehouseCode} 不存在或已停用`,
          destinationPort: destPo.portCode || '',
          destinationPortName: destPo.portName || '',
          etaDestPort: '',
          ataDestPort: ''
        };
      }

      // 2. 验证仓库是否在映射关系中（确保有车队服务）
      // ✅ Phase 3: 使用 WarehouseSelectorService
      const countryCode = await this.resolveCountryCode(container.replenishmentOrders?.[0]);
      const candidateWarehouses = await this.warehouseSelectorService.getCandidateWarehouses(
        countryCode,
        destPo.portCode
      );

      const isWarehouseInMapping = candidateWarehouses.some(
        (w) => w.warehouseCode === designatedWarehouseCode
      );

      if (!isWarehouseInMapping) {
        logger.warn(
          `[IntelligentScheduling] Designated warehouse ${designatedWarehouseCode} not in mapping for port ${destPo.portCode}`
        );
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: `指定的仓库 ${designatedWarehouseCode} 不可用于该港口 ${destPo.portCode}（请配置映射关系）`,
          destinationPort: destPo.portCode || '',
          destinationPortName: destPo.portName || '',
          etaDestPort: '',
          ataDestPort: ''
        };
      }

      // 3. 计算清关日和提柜日 - 复用现有逻辑
      const clearanceDate = destPo.eta || destPo.ata;
      if (!clearanceDate) {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: '无到港日期（ATA/ETA），无法排产',
          destinationPort: destPo.portCode || '',
          destinationPortName: destPo.portName || '',
          etaDestPort: '',
          ataDestPort: ''
        };
      }

      const plannedCustomsDate = new Date(clearanceDate);
      const plannedPickupDate = await this.dateCalculator.calculatePlannedPickupDate(
        plannedCustomsDate,
        destPo.lastFreeDate
      );

      // 4. 查找仓库最早可用日期
      const plannedUnloadDate = await this.findEarliestAvailableDay(
        designatedWarehouseCode,
        plannedPickupDate
      );

      if (!plannedUnloadDate) {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: `指定的仓库 ${designatedWarehouseCode} 在可预见的时间内无产能`,
          destinationPort: destPo.portCode || '',
          destinationPortName: destPo.portName || '',
          etaDestPort: '',
          ataDestPort: ''
        };
      }

      // 5. 选择车队（基于仓库和港口）
      // ✅ Phase 3: 使用 TruckingSelectorService
      const truckingCompany = await this.truckingSelectorService.selectTruckingCompany({
        warehouseCode: designatedWarehouseCode,
        portCode: destPo.portCode,
        countryCode: warehouse.country,
        plannedDate: plannedUnloadDate
      });

      if (!truckingCompany) {
        return {
          containerNumber: container.containerNumber,
          success: false,
          message: `无法为仓库 ${designatedWarehouseCode} 找到合适的车队`,
          destinationPort: destPo.portCode || '',
          destinationPortName: destPo.portName || '',
          etaDestPort: '',
          ataDestPort: ''
        };
      }

      // 6. 确定卸柜方式（优先级：用户指定 > 系统自动决策）
      // ✅ 新增：支持用户手动指定卸柜方式
      let unloadMode: 'Drop off' | 'Live load';
      if (_request.unloadMode) {
        // 用户指定了卸柜方式，直接使用
        unloadMode = _request.unloadMode;
        logger.info(
          `[Scheduling] Container ${container.containerNumber}: Using user-specified unloadMode: ${unloadMode}`
        );
      } else {
        // 系统自动决策：根据车队是否有堆场决定
        unloadMode = truckingCompany.hasYard ? 'Drop off' : 'Live load';
        logger.info(
          `[Scheduling] Container ${container.containerNumber}: Auto-determined unloadMode: ${unloadMode} (hasYard=${truckingCompany.hasYard})`
        );
      }

      // 7. 计算送仓日
      const plannedDeliveryDate = this.dateCalculator.calculatePlannedDeliveryDate(
        plannedPickupDate,
        unloadMode,
        plannedUnloadDate
      );

      // 8. 计算还箱日
      let lastReturnDate: Date | undefined;
      const emptyReturn = await this.emptyReturnRepo.findOne({
        where: { containerNumber: container.containerNumber }
      });
      if (emptyReturn?.lastReturnDate) {
        lastReturnDate = new Date(emptyReturn.lastReturnDate);
      } else if (destPo.lastFreeDate) {
        lastReturnDate = new Date(destPo.lastFreeDate);
        lastReturnDate.setDate(lastReturnDate.getDate() + 7);
      }

      const returnDateResult = await this.dateCalculator.calculatePlannedReturnDate(
        plannedUnloadDate,
        unloadMode,
        truckingCompany.companyCode,
        lastReturnDate,
        plannedPickupDate
      );

      // ✅ 获取免费天数（区分提柜和还箱）
      const pickupFreeDays = (destPo as any).pickupFreeDays ?? undefined; // 提柜免费天数
      const returnFreeDays = (destPo as any).returnFreeDays ?? undefined; // 还箱免费天数

      const effectiveUnloadDate = returnDateResult.adjustedUnloadDate ?? plannedUnloadDate;

      // 预览：与智能排产主路径一致，复用 calculateEstimatedCosts → DemurrageService.calculateTotalCost
      let plannedEstimated: ScheduleResult['estimatedCosts'] | undefined;
      if (_request.dryRun) {
        const cb = await this.calculateEstimatedCosts(
          container.containerNumber,
          plannedPickupDate,
          effectiveUnloadDate,
          returnDateResult.returnDate,
          unloadMode,
          warehouse,
          truckingCompany
        );
        plannedEstimated = {
          demurrageCost: cb.demurrageCost ?? 0,
          detentionCost: cb.detentionCost ?? 0,
          storageCost: cb.storageCost ?? 0,
          ddCombinedCost: cb.ddCombinedCost ?? 0,
          transportationCost: cb.transportationCost ?? 0,
          yardStorageCost: cb.yardStorageCost ?? 0,
          handlingCost: cb.handlingCost ?? 0,
          totalCost: cb.totalCost ?? 0,
          currency: cb.currency ?? 'USD'
        };
      }

      // 9. 构建结果
      return {
        containerNumber: container.containerNumber,
        success: true,
        message: `使用指定仓库 ${warehouse.warehouseName} 排产成功`,
        destinationPort: destPo.portCode || '',
        destinationPortName: destPo.portName || '',
        warehouseName: warehouse.warehouseName,
        etaDestPort:
          (container.portOperations?.find((po: any) => po.portType === 'destination')?.eta as Date)
            ?.toISOString()
            .split('T')[0] || '',
        ataDestPort:
          (container.portOperations?.find((po: any) => po.portType === 'destination')?.ata as Date)
            ?.toISOString()
            .split('T')[0] || '',
        lastFreeDate: destPo.lastFreeDate
          ? new Date(destPo.lastFreeDate).toISOString().split('T')[0]
          : undefined,
        lastReturnDate: returnDateResult.returnDate.toISOString().split('T')[0],
        pickupFreeDays, // ✅ 提柜免费天数
        returnFreeDays, // ✅ 还箱免费天数
        ...(plannedEstimated ? { estimatedCosts: plannedEstimated } : {}),
        plannedData: {
          // confirm 保存路径需要 plannedData 内也包含 containerNumber
          containerNumber: container.containerNumber,
          plannedCustomsDate: plannedCustomsDate.toISOString().split('T')[0],
          plannedPickupDate: plannedPickupDate.toISOString().split('T')[0],
          plannedDeliveryDate: plannedDeliveryDate.toISOString().split('T')[0],
          plannedUnloadDate: effectiveUnloadDate.toISOString().split('T')[0],
          plannedReturnDate: returnDateResult.returnDate.toISOString().split('T')[0],
          truckingCompanyId: truckingCompany.companyCode,
          truckingCompany: truckingCompany.companyName,
          warehouseId: warehouse.warehouseCode,
          warehouseName: warehouse.warehouseName,
          warehouseCountry: warehouse.country,
          unloadModePlan: unloadMode, // ✅ 与数据库字段 unload_mode_plan 一致
          ...(plannedEstimated ? { estimatedCosts: plannedEstimated } : {})
        }
      };
    } catch (error) {
      logger.error(
        `[IntelligentScheduling] Error scheduling with designated warehouse for ${container.containerNumber}:`,
        error
      );
      return {
        containerNumber: container.containerNumber,
        success: false,
        message: `手工指定仓库排产失败：${error instanceof Error ? error.message : '未知错误'}`,
        destinationPort: destPo.portCode || '',
        destinationPortName: destPo.portName || '',
        etaDestPort: '',
        ataDestPort: ''
      };
    }
  }

  // ==================== Task 8.1.1: 批量性能优化 ====================

  /**
   * 批量成本优化（Task 8.1.1）
   *
   * ✅ SKILL 原则:
   * - Leverage: 复用 SchedulingCostOptimizerService.suggestOptimalUnloadDate()
   * - Incremental: 分批处理，控制并发
   * - Knowledge: 共享缓存减少 DB 查询
   *
   * @param containerNumbers 柜号列表
   * @param options 优化选项
   * @returns 批量优化结果
   */
  async batchOptimizeContainers(
    containerNumbers: string[],
    options?: { forceRefresh?: boolean }
  ): Promise<BatchOptimizeResult[]> {
    const startTime = Date.now();
    logger.info(`[BatchOptimizer] Starting for ${containerNumbers.length} containers`);

    try {
      // 1. 读取配置
      const config = await this.schedulingConfigRepo.findOne({
        where: { configKey: 'batch_size_limit' }
      });
      const batchSize = parseInt(config?.configValue || '50');
      const _options = options;

      // 2. 分批处理
      const batches = this.chunkArray(containerNumbers, batchSize);
      const allResults: BatchOptimizeResult[] = [];

      // 3. 构建共享缓存（避免重复查询）
      const warehouseCache = new Map<string, Warehouse>();
      const truckingCache = new Map<string, TruckingCompany>();

      // 4. 并发处理每个批次
      for (const batch of batches) {
        const batchStartTime = Date.now();

        const batchPromises = batch.map((number) =>
          this.optimizeSingleContainer(number, warehouseCache, truckingCache)
        );

        const batchResults = await Promise.all(batchPromises);
        allResults.push(...batchResults.filter((r): r is BatchOptimizeResult => r !== null));

        logger.debug(`[BatchOptimizer] Batch completed in ${Date.now() - batchStartTime}ms`);
      }

      const totalTime = Date.now() - startTime;
      logger.info(`[BatchOptimizer] Completed:`, {
        totalContainers: containerNumbers.length,
        resultsCount: allResults.length,
        totalTimeMs: totalTime,
        avgTimePerContainer: (totalTime / containerNumbers.length).toFixed(2)
      });

      return allResults;
    } catch (error) {
      logger.error('[BatchOptimizer] Error:', error);
      return [];
    }
  }

  /**
   * 优化单个货柜（内部方法）
   */
  private async optimizeSingleContainer(
    containerNumber: string,
    warehouseCache: Map<string, Warehouse>,
    truckingCache: Map<string, TruckingCompany>
  ): Promise<BatchOptimizeResult | null> {
    try {
      // 1. 获取货柜（带关联）
      const container = await this.containerRepo.findOne({
        where: { containerNumber },
        relations: ['portOperations', 'seaFreight', 'replenishmentOrders']
      });

      if (!container) {
        logger.warn(`[BatchOptimizer] Container not found: ${containerNumber}`);
        return null;
      }

      // 2. 从 gantt_derived 或排产状态中获取仓库和车队信息
      // 注意：Container 表没有直接的 warehouseId/truckingCompanyId 字段
      // 需要通过其他表关联查询
      const warehouseOp = await this.warehouseOperationRepo.findOne({
        where: { containerNumber }
      });

      const truckingTrans = await this.truckingTransportRepo.findOne({
        where: { containerNumber }
      });

      const warehouseCode = warehouseOp?.warehouseId;
      const truckingCompanyId = truckingTrans?.truckingCompanyId;

      if (!warehouseCode || !truckingCompanyId) {
        logger.warn(`[BatchOptimizer] No schedule data for ${containerNumber}`);
        return null;
      }

      // 3. 使用缓存查找仓库和车队
      let warehouse = warehouseCache.get(warehouseCode);
      if (!warehouse) {
        const foundWarehouse = await this.warehouseRepo.findOne({ where: { warehouseCode } });
        if (foundWarehouse) {
          warehouseCache.set(warehouseCode, foundWarehouse);
          warehouse = foundWarehouse;
        }
      }

      let truckingCompany = truckingCache.get(truckingCompanyId);
      if (!truckingCompany) {
        const foundTrucking = await this.truckingCompanyRepo.findOne({
          where: { companyCode: truckingCompanyId }
        });
        if (foundTrucking) {
          truckingCache.set(truckingCompanyId, foundTrucking);
          truckingCompany = foundTrucking;
        }
      }

      if (!warehouse || !truckingCompany) {
        logger.warn(
          `[BatchOptimizer] Missing warehouse or trucking company for ${containerNumber}`
        );
        return null;
      }

      // 4. 复用现有的成本优化服务
      const plannedPickupDate = truckingTrans.plannedPickupDate
        ? new Date(truckingTrans.plannedPickupDate)
        : new Date();

      const optimization = await this.costOptimizerService.suggestOptimalUnloadDate(
        containerNumber,
        warehouse,
        truckingCompany,
        plannedPickupDate
      );

      // 5. 构建结果
      return {
        containerNumber,
        originalCost: optimization.originalCost,
        optimizedCost: optimization.optimizedCost,
        savings: optimization.savings,
        suggestedPickupDate: optimization.suggestedPickupDate?.toISOString().split('T')[0],
        shouldOptimize: optimization.savings > 0
      };
    } catch (error) {
      logger.error(`[BatchOptimizer] Error for ${containerNumber}:`, error);
      return null;
    }
  }

  /**
   * 数组长分块工具方法
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

export const intelligentSchedulingService = new IntelligentSchedulingService();
