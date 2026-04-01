import { describe, it, expect } from 'vitest'
import {
  SimplifiedStatus,
  SimplifiedStatusText,
  SimplifiedStatusType,
  SimplifiedStatusClass,
  getLogisticsStatusText,
  getLogisticsStatusType,
  getLogisticsStatusClass,
  isValidSimplifiedTransition,
  isCompletedStatus,
  isInProgressStatus,
  isInitialStatus,
  SimplifiedStatusTransitions,
} from '../utils/logisticsStatusMachine'

describe('logisticsStatusMachine', () => {
  describe('SimplifiedStatusText', () => {
    it('should return correct Chinese text for each status', () => {
      expect(SimplifiedStatusText[SimplifiedStatus.NOT_SHIPPED]).toBe('未出运')
      expect(SimplifiedStatusText[SimplifiedStatus.SHIPPED]).toBe('已出运')
      expect(SimplifiedStatusText[SimplifiedStatus.IN_TRANSIT]).toBe('在途')
      expect(SimplifiedStatusText[SimplifiedStatus.AT_PORT]).toBe('已到目的港')
      expect(SimplifiedStatusText[SimplifiedStatus.PICKED_UP]).toBe('已提柜')
      expect(SimplifiedStatusText[SimplifiedStatus.UNLOADED]).toBe('已卸柜')
      expect(SimplifiedStatusText[SimplifiedStatus.RETURNED_EMPTY]).toBe('已还箱')
    })
  })

  describe('SimplifiedStatusType', () => {
    it('should return correct Element Plus type for each status', () => {
      expect(SimplifiedStatusType[SimplifiedStatus.NOT_SHIPPED]).toBe('info')
      expect(SimplifiedStatusType[SimplifiedStatus.IN_TRANSIT]).toBe('success')
      expect(SimplifiedStatusType[SimplifiedStatus.AT_PORT]).toBe('warning')
      expect(SimplifiedStatusType[SimplifiedStatus.PICKED_UP]).toBe('warning')
    })
  })

  describe('SimplifiedStatusClass', () => {
    it('should return correct CSS class for each status', () => {
      expect(SimplifiedStatusClass[SimplifiedStatus.NOT_SHIPPED]).toBe('status-not-shipped')
      expect(SimplifiedStatusClass[SimplifiedStatus.SHIPPED]).toBe('status-shipped')
      expect(SimplifiedStatusClass[SimplifiedStatus.IN_TRANSIT]).toBe('status-in-transit')
    })
  })

  describe('getLogisticsStatusText', () => {
    it('should return correct text for valid status', () => {
      expect(getLogisticsStatusText('in_transit')).toBe('在途')
      expect(getLogisticsStatusText('at_port')).toBe('已到目的港')
    })

    it('should return original value for invalid status', () => {
      expect(getLogisticsStatusText('invalid_status')).toBe('invalid_status')
      expect(getLogisticsStatusText('')).toBe('')
    })
  })

  describe('getLogisticsStatusType', () => {
    it('should return correct type for valid status', () => {
      expect(getLogisticsStatusType('shipped')).toBe('primary')
      expect(getLogisticsStatusType('returned_empty')).toBe('success')
    })

    it('should return default info type for invalid status', () => {
      expect(getLogisticsStatusType('invalid')).toBe('info')
    })
  })

  describe('getLogisticsStatusClass', () => {
    it('should return correct class for valid status', () => {
      expect(getLogisticsStatusClass('picked_up')).toBe('status-picked-up')
      expect(getLogisticsStatusClass('unloaded')).toBe('status-unloaded')
    })

    it('should return unknown class for invalid status', () => {
      expect(getLogisticsStatusClass('invalid')).toBe('status-unknown')
    })
  })

  describe('isValidSimplifiedTransition', () => {
    it('should return true for valid transitions', () => {
      expect(
        isValidSimplifiedTransition(SimplifiedStatus.NOT_SHIPPED, SimplifiedStatus.SHIPPED)
      ).toBe(true)
      expect(
        isValidSimplifiedTransition(SimplifiedStatus.SHIPPED, SimplifiedStatus.IN_TRANSIT)
      ).toBe(true)
    })

    it('should return false for invalid transitions', () => {
      expect(
        isValidSimplifiedTransition(SimplifiedStatus.NOT_SHIPPED, SimplifiedStatus.RETURNED_EMPTY)
      ).toBe(false)
    })
  })

  describe('isCompletedStatus', () => {
    it('should return true for completed statuses', () => {
      expect(isCompletedStatus(SimplifiedStatus.RETURNED_EMPTY)).toBe(true)
    })

    it('should return false for in-progress statuses', () => {
      expect(isCompletedStatus(SimplifiedStatus.IN_TRANSIT)).toBe(false)
    })
  })

  describe('isInProgressStatus', () => {
    it('should return true for in-progress statuses', () => {
      expect(isInProgressStatus(SimplifiedStatus.IN_TRANSIT)).toBe(true)
      expect(isInProgressStatus(SimplifiedStatus.AT_PORT)).toBe(true)
    })

    it('should return false for completed statuses', () => {
      expect(isInProgressStatus(SimplifiedStatus.RETURNED_EMPTY)).toBe(false)
    })
  })

  describe('isInitialStatus', () => {
    it('should return true for initial status', () => {
      expect(isInitialStatus(SimplifiedStatus.NOT_SHIPPED)).toBe(true)
    })

    it('should return false for other statuses', () => {
      expect(isInitialStatus(SimplifiedStatus.SHIPPED)).toBe(false)
    })
  })
})
