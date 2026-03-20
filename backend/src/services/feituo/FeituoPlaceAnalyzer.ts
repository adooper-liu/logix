/**
 * 飞驼地点分析器
 * 负责解析发生地信息数组，区分海港目的港和火车目的地
 */

import { AppDataSource } from '../../database';
import { SeaFreight } from '../../entities/SeaFreight';
import { logger } from '../../utils/logger';
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

/** 从行中取值，支持多列名 */
function getVal(row: Record<string, any>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && v !== '') return String(v).trim();
  }
  return null;
}

export class FeituoPlaceAnalyzer {
  private seaFreightRepo = AppDataSource.getRepository(SeaFreight);

  /**
   * 解析发生地信息数组
   * 支持两种格式：1) JSON数组格式 2) 后缀列格式(发生地信息_地点CODE_2)
   */
  parsePlaceArray(row: Record<string, any>): PlaceInfo[] {
    // 方式1: 尝试JSON数组格式
    const rawPlaces = row['发生地信息'];
    if (rawPlaces) {
      let placeArray: any[];
      if (typeof rawPlaces === 'string') {
        try {
          placeArray = JSON.parse(rawPlaces);
        } catch {
          // JSON解析失败，尝试后缀列格式
          placeArray = null;
        }
      } else if (Array.isArray(rawPlaces)) {
        placeArray = rawPlaces;
      } else {
        placeArray = null;
      }

      if (placeArray && Array.isArray(placeArray)) {
        const places: PlaceInfo[] = [];
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
            sequence: p['序号'] || p['sequence'] || i + 1
          });
        }
        return places;
      }
    }

    // 方式2: 后缀列格式（兼容旧格式）
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
      p.placeType?.includes('目的地') || p.placeType?.includes('交货地')
    );
    
    // 海港目的港：不是交货地的目的地（用于滞港费计算）
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

    // 火车目的地兜底：找最后一个目的地
    if (!railDestPlace && destPlaces.length > 0) {
      railDestPlace = destPlaces[destPlaces.length - 1];
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
