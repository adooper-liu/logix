import { describe, expect, it } from 'vitest'
import { snakeToCamel } from './snakeToCamel'

describe('snakeToCamel', () => {
  it('maps warehouse-trucking API rows into form camelCase fields', () => {
    const row = {
      id: 12,
      country: 'US',
      warehouse_code: 'WH01',
      warehouse_name: 'LA Warehouse',
      trucking_company_id: 'TC01',
      trucking_company_name: 'Fleet A',
      mapping_type: 'DEFAULT',
      is_default: true,
      is_active: true,
      transport_fee: 125.5,
      remarks: 'keep me',
    }

    const mapped = snakeToCamel(row)

    expect(mapped).toEqual({
      id: 12,
      country: 'US',
      warehouseCode: 'WH01',
      warehouseName: 'LA Warehouse',
      truckingCompanyId: 'TC01',
      truckingCompanyName: 'Fleet A',
      mappingType: 'DEFAULT',
      isDefault: true,
      isActive: true,
      transportFee: 125.5,
      remarks: 'keep me',
    })
  })

  it('maps trucking-port fee fields used by cost optimizer', () => {
    const row = {
      port_code: 'USLAX',
      standard_rate: 80,
      yard_operation_fee: 35.25,
      yard_capacity: 10,
    }

    expect(snakeToCamel(row)).toEqual({
      portCode: 'USLAX',
      standardRate: 80,
      yardOperationFee: 35.25,
      yardCapacity: 10,
    })
  })
})
