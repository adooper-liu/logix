/**
 * GraphQL Schema Definition
 * 物流状态可视化 GraphQL Schema
 */

export const typeDefs = `#graphql
  # 标准化状态枚举
  enum StandardStatus {
    NOT_SHIPPED
    EMPTY_PICKED_UP
    GATE_IN
    LOADED
    DEPARTED
    SAILING
    TRANSIT_ARRIVED
    TRANSIT_DEPARTED
    ARRIVED
    DISCHARGED
    AVAILABLE
    GATE_OUT
    DELIVERY_ARRIVED
    STRIPPED
    RETURNED_EMPTY
    COMPLETED
    CUSTOMS_HOLD
    CARRIER_HOLD
    TERMINAL_HOLD
    CHARGES_HOLD
    DUMPED
    DELAYED
    DETENTION
    OVERDUE
    CONGESTION
    HOLD
    UNKNOWN
  }

  # 节点状态枚举
  enum NodeStatus {
    COMPLETED
    IN_PROGRESS
    PENDING
  }

  # 路径状态枚举
  enum PathStatus {
    ON_TIME
    DELAYED
    HOLD
    COMPLETED
  }

  # 地理位置类型
  enum LocationType {
    PORT
    TERMINAL
    WAREHOUSE
    CUSTOMS
  }

  # 地理位置信息
  type Location {
    id: ID!
    name: String!
    code: String!
    type: LocationType!
    country: String
    latitude: Float
    longitude: Float
  }

  # 状态节点
  type StatusNode {
    id: ID!
    status: StandardStatus!
    description: String!
    timestamp: DateTime!
    location: Location
    nodeStatus: NodeStatus!
    isAlert: Boolean!
    rawData: JSON
  }

  # 物流状态路径
  type StatusPath {
    id: ID!
    containerNumber: String!
    nodes: [StatusNode!]!
    overallStatus: PathStatus!
    eta: DateTime
    startedAt: DateTime
    completedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # 状态事件（原始数据）
  type StatusEvent {
    id: ID!
    containerNumber: String!
    eventCode: String!
    eventName: String!
    eventTime: DateTime!
    location: Location
    vessel: Vessel
    remarks: String
    rawData: JSON
    createdAt: DateTime!
  }

  # 船舶信息
  type Vessel {
    name: String!
    voyageNumber: String!
  }

  # 查询结果（包含分页信息）
  type StatusPathConnection {
    edges: [StatusPathEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  # 路径边
  type StatusPathEdge {
    node: StatusPath!
    cursor: String!
  }

  # 分页信息
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  # 日期时间标量
  scalar DateTime

  # JSON 标量
  scalar JSON

  # 查询根类型
  type Query {
    # 根据集装箱号获取物流路径
    getStatusPathByContainer(containerNumber: String!): StatusPath

    # 根据提单号获取物流路径
    getStatusPathByBL(billOfLadingNumber: String!): StatusPath

    # 根据订舱号获取物流路径
    getStatusPathByBooking(bookingNumber: String!): StatusPath

    # 获取所有物流路径（支持分页）
    getStatusPaths(
      first: Int
      after: String
      last: Int
      before: String
      filter: StatusPathFilter
    ): StatusPathConnection!

    # 获取状态事件列表
    getStatusEvents(
      containerNumber: String
      limit: Int
      offset: Int
    ): [StatusEvent!]!

    # 获取路径验证结果
    validateStatusPath(pathId: ID!): ValidationResult!
  }

  # 物流路径过滤器
  input StatusPathFilter {
    containerNumber: String
    overallStatus: PathStatus
    startDate: DateTime
    endDate: DateTime
  }

  # 验证结果
  type ValidationResult {
    isValid: Boolean!
    errors: [String!]!
    warnings: [String!]!
  }

  # 变更根类型
  type Mutation {
    # 创建新的物流路径
    createStatusPath(input: CreateStatusPathInput!): StatusPath!

    # 更新物流路径
    updateStatusPath(id: ID!, input: UpdateStatusPathInput!): StatusPath!

    # 删除物流路径
    deleteStatusPath(id: ID!): Boolean!

    # 添加状态节点
    addStatusNode(pathId: ID!, input: CreateStatusNodeInput!): StatusPath!

    # 同步外部数据（如飞驼API）
    syncExternalData(
      source: String!
      data: JSON!
      containerNumber: String!
    ): StatusPath!

    # 批量同步外部数据
    batchSyncExternalData(
      source: String!
      dataList: [JSON!]!
    ): BatchSyncResult!
  }

  # 创建物流路径输入
  input CreateStatusPathInput {
    containerNumber: String!
    nodes: [CreateStatusNodeInput!]
    eta: DateTime
  }

  # 更新物流路径输入
  input UpdateStatusPathInput {
    nodes: [UpdateStatusNodeInput!]
    eta: DateTime
    overallStatus: PathStatus
  }

  # 创建状态节点输入
  input CreateStatusNodeInput {
    status: StandardStatus!
    description: String!
    timestamp: DateTime!
    locationId: ID
    rawData: JSON
  }

  # 更新状态节点输入
  input UpdateStatusNodeInput {
    id: ID!
    status: StandardStatus
    description: String
    timestamp: DateTime
    locationId: ID
    rawData: JSON
  }

  # 批量同步结果
  type BatchSyncResult {
    successCount: Int!
    failureCount: Int!
    results: [SyncResult!]!
  }

  # 单个同步结果
  type SyncResult {
    containerNumber: String!
    success: Boolean!
    message: String
    pathId: ID
  }

  # 订阅根类型（实时更新）
  type Subscription {
    # 订阅路径更新
    pathUpdated(containerNumber: String!): StatusPath!

    # 订阅状态节点添加
    statusNodeAdded(containerNumber: String!): StatusNode!
  }
`;
