/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest'
import {
  escapeHtml,
  formatAlertTypeBadge,
  formatCostItemName,
  formatCostModeText,
  getCostDetailsText,
  getCustomsStatusText,
  getDateTagType,
  getDestinationPortDisplay,
  getEtaCorrection,
  getFiveNodeKinds,
  getFiveNodeRows,
  getRowCurrencyPrefix,
  getUtcDayNumber,
} from '../containerDisplay'

describe('containerDisplay utils', () => {
  // ==================== getUtcDayNumber ====================
  describe('getUtcDayNumber', () => {
    it('should convert date string to UTC day number', () => {
      const result = getUtcDayNumber('2024-03-15')
      expect(result).toBe(19796)
    })

    it('should convert Date object to UTC day number', () => {
      const date = new Date('2024-03-15T00:00:00Z')
      const result = getUtcDayNumber(date)
      expect(result).toBe(19796)
    })

    it('should return null for invalid input', () => {
      expect(getUtcDayNumber(null)).toBeNull()
      expect(getUtcDayNumber(undefined)).toBeNull()
      expect(getUtcDayNumber('')).toBeNull()
      expect(getUtcDayNumber('invalid')).toBeNull()
    })
  })

  // ==================== getDateTagType ====================
  describe('getDateTagType', () => {
    it('should return info when date is null', () => {
      expect(getDateTagType(null)).toBe('info')
      expect(getDateTagType(undefined)).toBe('info')
    })

    it('should return success when date is before lastDate', () => {
      const result = getDateTagType('2024-03-10', undefined, 'pickup', '2024-03-15')
      expect(result).toBe('success')
    })

    it('should return success when date equals lastDate', () => {
      const result = getDateTagType('2024-03-15', undefined, 'pickup', '2024-03-15')
      expect(result).toBe('success')
    })

    it('should return warning when date is 1-3 days after lastDate', () => {
      const result = getDateTagType('2024-03-17', undefined, 'return', '2024-03-15')
      expect(result).toBe('warning')
    })

    it('should return danger when date is more than 3 days after lastDate', () => {
      const result = getDateTagType('2024-03-20', undefined, 'pickup', '2024-03-15')
      expect(result).toBe('danger')
    })

    it('should return info for non-pickup/return types', () => {
      const result = getDateTagType('2024-03-15', undefined, 'eta')
      expect(result).toBe('info')
    })
  })

  // ==================== getDestinationPortDisplay ====================
  describe('getDestinationPortDisplay', () => {
    it('should return port name when available', () => {
      const row = { destinationPortName: '洛杉矶港', destinationPort: 'USLAX' }
      expect(getDestinationPortDisplay(row)).toBe('洛杉矶港')
    })

    it('should return port code when name is not available', () => {
      const row = { destinationPort: 'USLAX' }
      expect(getDestinationPortDisplay(row)).toBe('USLAX')
    })

    it('should return dash when no port info', () => {
      expect(getDestinationPortDisplay({})).toBe('-')
      expect(getDestinationPortDisplay({ destinationPortName: null })).toBe('-')
    })
  })

  // ==================== getCustomsStatusText ====================
  describe('getCustomsStatusText', () => {
    it('should map customs status to Chinese text', () => {
      expect(getCustomsStatusText('COMPLETED')).toBe('已完成')
      expect(getCustomsStatusText('IN_PROGRESS')).toBe('清关中')
      expect(getCustomsStatusText('FAILED')).toBe('失败')
      expect(getCustomsStatusText('PENDING')).toBe('待清关')
    })

    it('should return default text for unknown status', () => {
      expect(getCustomsStatusText('UNKNOWN')).toBe('未知状态')
      expect(getCustomsStatusText()).toBe('未清关')
    })
  })

  // ==================== formatAlertTypeBadge ====================
  describe('formatAlertTypeBadge', () => {
    it('should map alert type to Chinese text', () => {
      expect(formatAlertTypeBadge('customs')).toBe('清关')
      expect(formatAlertTypeBadge('demurrage')).toBe('滞港')
      expect(formatAlertTypeBadge('detention')).toBe('滞箱')
      expect(formatAlertTypeBadge('inspection')).toBe('查验')
    })

    it('should return em dash for undefined', () => {
      expect(formatAlertTypeBadge(undefined)).toBe('—')
    })

    it('should return original value for unknown type', () => {
      expect(formatAlertTypeBadge('unknown')).toBe('unknown')
    })
  })

  // ==================== formatCostModeText ====================
  describe('formatCostModeText', () => {
    it('should map cost mode to Chinese text', () => {
      expect(formatCostModeText('actual')).toBe('实际')
      expect(formatCostModeText('forecast')).toBe('预计')
    })

    it('should default to forecast for unknown', () => {
      expect(formatCostModeText('unknown')).toBe('预计')
      expect(formatCostModeText()).toBe('预计')
    })
  })

  // ==================== formatCostItemName ====================
  describe('formatCostItemName', () => {
    it('should use chargeName when available', () => {
      const item = { chargeName: '码头操作费', chargeType: 'THC' }
      expect(formatCostItemName(item)).toBe('码头操作费')
    })

    it('should map chargeType to standard name', () => {
      expect(formatCostItemName({ chargeType: 'DEMURRAGE' })).toBe('滞港费')
      expect(formatCostItemName({ chargeType: 'DETENTION' })).toBe('滞箱费')
      expect(formatCostItemName({ chargeType: 'STORAGE' })).toBe('堆存费')
      expect(formatCostItemName({ chargeType: 'D_AND_D' })).toBe('D&D')
    })

    it('should return default name for unknown type', () => {
      expect(formatCostItemName({ chargeType: 'UNKNOWN' })).toBe('费用项')
      expect(formatCostItemName({})).toBe('费用项')
    })
  })

  // ==================== getRowCurrencyPrefix ====================
  describe('getRowCurrencyPrefix', () => {
    it('should use countryCurrency first', () => {
      expect(getRowCurrencyPrefix({ countryCurrency: 'USD' })).toBe('$')
      expect(getRowCurrencyPrefix({ countryCurrency: 'EUR' })).toBe('€')
      expect(getRowCurrencyPrefix({ countryCurrency: 'CNY' })).toBe('¥')
    })

    it('should use sellToCountry when countryCurrency not available', () => {
      expect(getRowCurrencyPrefix({ sellToCountry: 'CN' })).toBe('¥')
      expect(getRowCurrencyPrefix({ sellToCountry: 'US' })).toBe('$')
      expect(getRowCurrencyPrefix({ sellToCountry: 'DE' })).toBe('€')
    })

    it('should use costBreakdown.currency as fallback', () => {
      expect(getRowCurrencyPrefix({ costBreakdown: { currency: 'JPY' } })).toBe('¥')
      expect(getRowCurrencyPrefix({ costBreakdown: { currency: 'GBP' } })).toBe('£')
    })

    it('should default to dollar sign', () => {
      expect(getRowCurrencyPrefix({})).toBe('$')
    })
  })

  // ==================== escapeHtml ====================
  describe('escapeHtml', () => {
    it('should escape special HTML characters', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry')
      expect(escapeHtml('He said "Hello"')).toBe('He said &quot;Hello&quot;')
      expect(escapeHtml("It's a test")).toBe('It&#39;s a test')
    })

    it('should handle multiple special characters', () => {
      const input = '<div onclick="alert(\'XSS\')">Click me</div>'
      const expected = '&lt;div onclick=&quot;alert(&#39;XSS&#39;)&quot;&gt;Click me&lt;/div&gt;'
      expect(escapeHtml(input)).toBe(expected)
    })
  })

  // ==================== getFiveNodeKinds ====================
  describe('getFiveNodeKinds', () => {
    it('should return all ok status', () => {
      const row = {
        customsStatus: 'COMPLETED',
        plannedPickupDate: '2024-03-15',
        logisticsStatus: 'unloaded',
        returnTime: '2024-03-20',
        inspectionRequired: false,
      }
      const result = getFiveNodeKinds(row)
      expect(result).toEqual({
        customs: 'ok',
        pickup: 'ok',
        unload: 'ok',
        emptyReturn: 'ok',
        inspection: 'ok',
      })
    })

    it('should return bad status when data missing', () => {
      const row = {}
      const result = getFiveNodeKinds(row)
      expect(result).toEqual({
        customs: 'bad',
        pickup: 'bad',
        unload: 'bad',
        emptyReturn: 'bad',
        inspection: 'ok',
      })
    })

    it('should handle various logistics statuses', () => {
      const row1 = { logisticsStatus: 'at_port' }
      expect(getFiveNodeKinds(row1).unload).toBe('warn')

      const row2 = { logisticsStatus: 'picked_up' }
      expect(getFiveNodeKinds(row2).emptyReturn).toBe('warn')
    })
  })

  // ==================== getFiveNodeRows ====================
  describe('getFiveNodeRows', () => {
    it('should generate five node rows with complete data', () => {
      const row = {
        customsStatus: 'COMPLETED',
        plannedPickupDate: '2024-03-15',
        logisticsStatus: 'unloaded',
        returnTime: '2024-03-20',
        inspectionRequired: false,
      }
      const result = getFiveNodeRows(row)
      expect(result).toHaveLength(5)
      expect(result[0]).toEqual({ kind: 'ok', type: 'info', text: '已完成' })
      expect(result[1]).toEqual({ kind: 'ok', type: 'warning', text: '已计划提柜' })
      expect(result[2]).toEqual({ kind: 'ok', type: 'primary', text: '已卸柜' })
      expect(result[3]).toEqual({ kind: 'ok', type: 'success', text: '已还箱' })
      expect(result[4]).toEqual({ kind: 'ok', type: 'info', text: '免查验' })
    })

    it('should handle inspection required', () => {
      const row = {
        customsStatus: 'COMPLETED',
        plannedPickupDate: '2024-03-15',
        logisticsStatus: 'unloaded',
        returnTime: '2024-03-20',
        inspectionRequired: true,
      }
      const result = getFiveNodeRows(row)
      expect(result[4]).toEqual({ kind: 'warn', type: 'warning', text: '需查验' })
    })
  })

  // ==================== getEtaCorrection ====================
  describe('getEtaCorrection', () => {
    it('should extract etaCorrection from portOperations', () => {
      const container = {
        portOperations: [
          { portType: 'origin', etaCorrection: null },
          { portType: 'destination', etaCorrection: '2024-03-20' },
        ],
      }
      const result = getEtaCorrection(container as any)
      expect(result).toBe('2024-03-20')
    })

    it('should use portOperations parameter when provided', () => {
      const portOps: any = [{ portType: 'destination', etaCorrection: '2024-03-25' }]
      const result = getEtaCorrection(null, portOps)
      expect(result).toBe('2024-03-25')
    })

    it('should return null when no destination port operation', () => {
      const container = {
        portOperations: [{ portType: 'origin', etaCorrection: '2024-03-15' }],
      }
      const result = getEtaCorrection(container as any)
      expect(result).toBeNull()
    })

    it('should return null when portOperations is empty', () => {
      expect(getEtaCorrection({ portOperations: [] } as any)).toBeNull()
      expect(getEtaCorrection({} as any)).toBeNull()
    })
  })

  // ==================== getCostDetailsText ====================
  describe('getCostDetailsText', () => {
    it('should generate HTML formatted cost details', () => {
      const row = {
        costBreakdown: {
          items: [
            { chargeType: 'DEMURRAGE', amount: 500, mode: 'actual' },
            { chargeType: 'DETENTION', amount: 300, mode: 'forecast' },
          ],
        },
      }
      const result = getCostDetailsText(row)
      expect(result).toContain('滞港费（实际）：$500.00')
      expect(result).toContain('滞箱费（预计）：$300.00')
      expect(result).toMatch(/<br\/>/)
    })

    it('should return default message when no items', () => {
      expect(getCostDetailsText({ costBreakdown: { items: [] } })).toBe('暂无费用明细')
      expect(getCostDetailsText({})).toBe('暂无费用明细')
    })

    it('should use custom currency prefix', () => {
      const row = {
        countryCurrency: 'EUR',
        costBreakdown: {
          items: [{ chargeType: 'DEMURRAGE', amount: 100, mode: 'actual' }],
        },
      }
      const result = getCostDetailsText(row)
      expect(result).toContain('€100.00')
    })
  })
})
