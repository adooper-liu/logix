/**
 * 飞驼地点分析器
 * 负责解析发生地信息数组，区分海港目的港和火车目的地
 */

import { AppDataSource } from '../../database';
import { SeaFreight } from '../../entities/SeaFreight';
import { parseDate } from '../feituoImport.service';

/** 发生地信息数组类型 (Excel导入) */
export interface PlaceInfo {
  code: string;
  nameEn?: string;
  nameCn?: string;
  placeType?: string;
  eta?: Date | null;
  ata?: Date | null;
  etd?: Date | null;
  atd?: Date | null;
  actualLoading?: Date | null;
  actualDischarge?: Date | null;
  terminal?: string;
  sequence: number;
}

/** 港口分析结果 */
export interface PortAnalysisResult {
  /** 起运港/起始地 */
  originPlace: PlaceInfo | undefined;
  /** 海港目的港（用于滞港费计算） */
  seaDestPlace: PlaceInfo | undefined;
  /** 火车目的地（用于海铁联运跟踪） */
  railDestPlace: PlaceInfo | undefined;
  /** 所有目的地列表 */
  destPlaces: PlaceInfo[];
}

/** 从行中取值，支持多列名；与 feituoImport 一致扫描 _rawDataByGroup（分组扁平化后键可能在子对象） */
function getVal(row: Record<string, any>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && v !== '') return String(v).trim();
  }
  const byG = row._rawDataByGroup;
  if (byG && typeof byG === 'object') {
    for (const g of Object.values(byG)) {
      if (!g || typeof g !== 'object') continue;
      const gr = g as Record<string, unknown>;
      for (const k of keys) {
        const v = gr[k];
        if (v !== undefined && v !== null && v !== '') return String(v).trim();
      }
    }
  }
  return null;
}

export class FeituoPlaceAnalyzer {
  private seaFreightRepo = AppDataSource.getRepository(SeaFreight);

  /**
   * 解析发生地信息数组
   * 支持三种格式：
   * 1) 接货地信息_ + 交货地信息_（飞驼 Excel 宽表）
   * 2) 发生地信息_* 后缀列
   * 3) 发生地信息 JSON 数组
   * 1 与 2 按港口 CODE 合并，发生地可补全接货地/交货地缺失的 ETA/ATA。
   */
  parsePlaceArray(row: Record<string, any>): PlaceInfo[] {
    const primary: PlaceInfo[] = [];
    const originPlace = this.parseOriginPlace(row);
    const destPlace = this.parseDestPlace(row);
    if (originPlace) primary.push(originPlace);
    if (destPlace) primary.push(destPlace);

    const suffixPlaces = this.parseOccurrencePlaceSuffixes(row);
    const jsonPlaces = this.parseJsonPlaces(row);

    const merged = this.mergePlacesByCode(primary, suffixPlaces, jsonPlaces);
    if (merged.length > 0) return merged;

    return suffixPlaces.length > 0 ? suffixPlaces : jsonPlaces;
  }

  /** 发生地信息_* 后缀列 */
  private parseOccurrencePlaceSuffixes(row: Record<string, any>): PlaceInfo[] {
    const places: PlaceInfo[] = [];
    const suffixes = ['', '_2', '_3', '_4', '_5', '_6', '_7', '_8', '_9', '_10'];
    for (let i = 0; i < suffixes.length; i++) {
      const suffix = suffixes[i];
      const code = getVal(row, `发生地信息_地点CODE${suffix}`);
      if (!code) break;
      places.push({
        code,
        nameEn: getVal(row, `发生地信息_地点名称英文（标准）${suffix}`) || undefined,
        nameCn: getVal(row, `发生地信息_地点名称中文（标准）${suffix}`) || undefined,
        placeType: getVal(row, `发生地信息_地点类型${suffix}`) || undefined,
        eta: parseDate(getVal(row, `发生地信息_预计到达时间${suffix}`)),
        ata: parseDate(getVal(row, `发生地信息_实际到达时间${suffix}`)),
        etd: parseDate(getVal(row, `发生地信息_预计离开时间${suffix}`)),
        atd: parseDate(getVal(row, `发生地信息_实际离开时间${suffix}`)),
        actualLoading: parseDate(getVal(row, `发生地信息_实际装船时间${suffix}`)),
        actualDischarge: parseDate(getVal(row, `发生地信息_实际卸船时间${suffix}`)),
        terminal: getVal(row, `发生地信息_码头名称${suffix}`) || undefined,
        sequence: i + 1,
      });
    }
    return places;
  }

  /** 发生地信息 JSON 数组 */
  private parseJsonPlaces(row: Record<string, any>): PlaceInfo[] {
    const places: PlaceInfo[] = [];
    const rawPlaces = row['发生地信息'];
    if (!rawPlaces) return places;

    let placeArray: any[] | null = null;
    if (typeof rawPlaces === 'string') {
      try {
        placeArray = JSON.parse(rawPlaces);
      } catch {
        placeArray = null;
      }
    } else if (Array.isArray(rawPlaces)) {
      placeArray = rawPlaces;
    }

    if (!placeArray || !Array.isArray(placeArray)) return places;

    for (let i = 0; i < placeArray.length; i++) {
      const p = placeArray[i];
      if (!p) continue;
      places.push({
        code: p['地点CODE'] || p['code'] || '',
        nameEn: p['地点英文名'] || p['nameEn'] || p['name_en'] || '',
        nameCn: p['地点中文名'] || p['nameCn'] || p['name_cn'] || '',
        placeType: p['地点类型'] || p['placeType'] || p['place_type'] || '',
        eta: parseDate(p['预计到达时间'] || p['eta']),
        ata: parseDate(p['实际到达时间'] || p['ata']),
        etd: parseDate(p['预计离开时间'] || p['etd']),
        atd: parseDate(p['实际离开时间'] || p['atd']),
        actualLoading: parseDate(p['实际装船时间'] || p['actualLoading']),
        actualDischarge: parseDate(p['实际卸船时间'] || p['actualDischarge']),
        terminal: p['码头名称'] || p['terminal'],
        sequence: p['序号'] || p['sequence'] || i + 1,
      });
    }
    return places;
  }

  /** 按港口 CODE 合并，后序来源仅填补前者为空的日期/名称 */
  private mergePlacesByCode(...groups: PlaceInfo[][]): PlaceInfo[] {
    const map = new Map<string, PlaceInfo>();

    const fillNull = (base: PlaceInfo, inc: PlaceInfo): PlaceInfo => {
      const m = { ...base };
      const take = <K extends keyof PlaceInfo>(k: K) => {
        const a = m[k];
        const b = inc[k];
        if ((a === undefined || a === null || a === '') && b !== undefined && b !== null && b !== '') {
          (m as any)[k] = b;
        }
      };
      take('eta');
      take('ata');
      take('etd');
      take('atd');
      take('actualLoading');
      take('actualDischarge');
      take('terminal');
      take('nameCn');
      take('nameEn');
      take('placeType');
      m.sequence = Math.min(m.sequence, inc.sequence);
      return m;
    };

    for (const group of groups) {
      for (const p of group) {
        const key = (p.code || '').trim().toUpperCase();
        if (!key) continue;
        const ex = map.get(key);
        if (!ex) {
          map.set(key, { ...p });
        } else {
          map.set(key, fillNull(ex, p));
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => a.sequence - b.sequence);
  }

  /**
   * 解析接货地信息（起运港）
   * placeType需要匹配analyzePorts的判断逻辑
   */
  private parseOriginPlace(row: Record<string, any>): PlaceInfo | undefined {
    const code = getVal(row, '接货地信息_地点CODE', '接货地信息_CODE');
    if (!code) return undefined;

    return {
      code,
      nameEn: getVal(row, '接货地信息_地点名称英文（标准）', '接货地信息_地点名称（英文）') || undefined,
      nameCn: getVal(row, '接货地信息_地点名称中文（标准）', '接货地信息_地点名称（中文）', '接货地信息_地点名称（原始）') || undefined,
      placeType: '起运港', // 匹配analyzePorts中的判断
      eta: parseDate(getVal(row, '接货地信息_预计到达时间')),
      ata: parseDate(getVal(row, '接货地信息_实际到达时间')),
      etd: parseDate(getVal(row, '接货地信息_预计离开时间')),
      atd: parseDate(getVal(row, '接货地信息_实际离开时间')),
      actualLoading: parseDate(getVal(row, '接货地信息_实际装船时间')),
      terminal: getVal(row, '接货地信息_码头名称') || undefined,
      sequence: 1,
    };
  }

  /**
   * 解析交货地信息（目的港）
   * placeType需要匹配analyzePorts的判断逻辑
   */
  private parseDestPlace(row: Record<string, any>): PlaceInfo | undefined {
    const code = getVal(row, '交货地信息_地点CODE', '交货地信息_CODE');
    if (!code) return undefined;

    return {
      code,
      nameEn: getVal(row, '交货地信息_地点名称英文（标准）', '交货地信息_地点名称（英文）') || undefined,
      nameCn: getVal(row, '交货地信息_地点名称中文（标准）', '交货地信息_地点名称（中文）', '交货地信息_地点名称（原始）') || undefined,
      // 使用「目的港」：analyzePorts 中 seaDestPlace = 非「交货地」的目的地；原「交货地」会导致 seaDestPlace 为空、ETA/ATA 不落库
      placeType: '目的港',
      eta: parseDate(getVal(row, '交货地信息_预计到达时间')),
      ata: parseDate(getVal(row, '交货地信息_实际到达时间')),
      etd: parseDate(getVal(row, '交货地信息_预计离开时间')),
      atd: parseDate(getVal(row, '交货地信息_实际离开时间')),
      terminal: getVal(row, '交货地信息_码头名称') || undefined,
      sequence: 2,
    };
  }

  /**
   * 分析港口类型，区分海港目的港和火车目的地
   * @param places 解析后的地点数组
   * @param existingSeaFreight 可选的已存在海运信息（用于兜底匹配）
   */
  analyzePorts(places: PlaceInfo[], existingSeaFreight?: SeaFreight | null): PortAnalysisResult {
    // 优先：根据 placeType 判断港口类型
    const originPlace = places.find(p =>
      p.placeType?.includes('起始地') || p.placeType?.includes('起运港')
    );

    // 目的地可能有多个：海港目的港 + 火车目的地（交货地）
    const destPlaces = places.filter(p =>
      p.placeType?.includes('目的地') ||
      p.placeType?.includes('交货地') ||
      p.placeType?.includes('目的港')
    );

    // 海港目的港：不是铁路「交货地」的目的地（用于滞港费计算）；「目的港」类型计入海港目的港
    let seaDestPlace = destPlaces.find(p => !p.placeType?.includes('交货地'));

    // 火车目的地：交货地类型的地点（用于海铁联运跟踪）
    let railDestPlace = destPlaces.find(p => p.placeType?.includes('交货地'));

    // 兜底：用已存在的港口名称匹配（如果 placeType 未找到）
    if (!seaDestPlace && existingSeaFreight?.portOfDischarge) {
      seaDestPlace = places.find(p =>
        p.code === existingSeaFreight.portOfDischarge ||
        p.nameCn === existingSeaFreight.portOfDischarge ||
        p.nameEn === existingSeaFreight.portOfDischarge ||
        (existingSeaFreight.portOfDischarge.includes(p.code))
      );
    }

    // 火车目的地兜底：仅当最后一个目的地明确为「交货地」时（避免纯海运单目的港被当成铁路）
    if (!railDestPlace && destPlaces.length > 0) {
      const last = destPlaces[destPlaces.length - 1];
      if (last.placeType?.includes('交货地')) {
        railDestPlace = last;
      }
    }

    // 起运港兜底
    if (!originPlace && existingSeaFreight?.portOfLoading) {
      const matchedOrigin = places.find(p =>
        p.code === existingSeaFreight.portOfLoading ||
        p.nameCn === existingSeaFreight.portOfLoading ||
        p.nameEn === existingSeaFreight.portOfLoading ||
        (existingSeaFreight.portOfLoading.includes(p.code))
      );
      if (matchedOrigin) {
        // 注意：这里不能修改originPlace，因为它已经是const
        return {
          originPlace: matchedOrigin,
          seaDestPlace,
          railDestPlace,
          destPlaces
        };
      }
    }

    return {
      originPlace,
      seaDestPlace,
      railDestPlace,
      destPlaces
    };
  }

  /**
   * 获取用于海运表更新的目的港信息
   * 简化版：返回第一个非交货地的目的地
   */
  getMainDestPlace(destPlaces: PlaceInfo[]): PlaceInfo | undefined {
    return destPlaces.find(p => !p.placeType?.includes('交货地'));
  }
}

export const feituoPlaceAnalyzer = new FeituoPlaceAnalyzer();
