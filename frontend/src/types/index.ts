// 用户信息类型
export interface UserInfo {
  id: number
  username: string
  email: string
  role: string
}

// 集装箱信息类型
export interface Container {
  id: string
  containerNumber: string
  orderNumber: string
  status: string
  location: string
  lastUpdated: string
  cargoDescription?: string
  weight?: number
}

// API响应类型
export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// 分页参数类型
export interface PaginationParams {
  page: number
  pageSize: number
  total?: number
}

// 分页响应类型
export interface PaginatedResponse<T> {
  items: T[]
  pagination: PaginationParams
}