/**
 * 字典服务（口径统一）
 * 港口、船公司、货代、海外公司下拉数据与名称解析
 */

import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'

export interface DictItem {
  code: string
  name: string
  nameEn?: string
  country?: string
}

export interface DictListResponse {
  success: boolean
  data: DictItem[]
}

export interface ResolveDemurrageCodesResponse {
  success: boolean
  data?: {
    destination_port_code?: string | null
    shipping_company_code?: string | null
    origin_forwarder_code?: string | null
    foreign_company_code?: string | null
  }
  warnings?: string[]
}

class DictService {
  private api = axios.create({
    baseURL: API_BASE,
    timeout: 15000
  })

  async getPorts(): Promise<DictListResponse> {
    const { data } = await this.api.get('/dict/ports')
    return data
  }

  async getShippingCompanies(): Promise<DictListResponse> {
    const { data } = await this.api.get('/dict/shipping-companies')
    return data
  }

  async getFreightForwarders(): Promise<DictListResponse> {
    const { data } = await this.api.get('/dict/freight-forwarders')
    return data
  }

  async getOverseasCompanies(): Promise<DictListResponse> {
    const { data } = await this.api.get('/dict/overseas-companies')
    return data
  }

  // 带国家过滤的仓库列表
  async getWarehouses(country?: string): Promise<DictListResponse> {
    const params = country ? { country } : {}
    const { data } = await this.api.get('/dict/warehouses', { params })
    return data
  }

  // 带国家过滤的车队列表
  async getTruckingCompanies(country?: string): Promise<DictListResponse> {
    const params = country ? { country } : {}
    const { data } = await this.api.get('/dict/trucking-companies', { params })
    return data
  }

  // 带国家过滤的清关公司列表
  async getCustomsBrokers(country?: string): Promise<DictListResponse> {
    const params = country ? { country } : {}
    const { data } = await this.api.get('/dict/customs-brokers', { params })
    return data
  }

  async resolveDemurrageCodes(params: {
    destination_port_code?: string
    destination_port_name?: string
    shipping_company_code?: string
    shipping_company_name?: string
    origin_forwarder_code?: string
    origin_forwarder_name?: string
    foreign_company_code?: string
    foreign_company_name?: string
  }): Promise<ResolveDemurrageCodesResponse> {
    const { data } = await this.api.post('/dict/resolve-demurrage-codes', params)
    return data
  }
}

export const dictService = new DictService()
