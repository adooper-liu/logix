/**
 * 港口操作查询构建器
 * 负责构建复杂的港口操作子查询，避免代码重复
 */

import { SelectQueryBuilder } from 'typeorm';

/**
 * 港口操作查询构建器
 * 提供常用的港口操作子查询模板
 */
export class PortOperationQueryBuilder {
  /**
   * 获取目的港最新港口操作的子查询（含 ATA）
   * 用于需要目的港实际到港时间的查询
   */
  static getLatestDestinationPortWithAtaAlias(): string {
    return `(
      SELECT po1.container_number, po1.ata as latest_ata
      FROM process_port_operations po1
      WHERE po1.port_type = 'destination'
      AND po1.ata IS NOT NULL
      AND po1.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po1.container_number
        AND po2.port_type = 'destination'
      )
    )`;
  }

  /**
   * 获取目的港最新港口操作的子查询（ETA，且尚未到目的港）
   * 必须 ata/available_time 均为空，否则与「已到目的港」及状态机 4/4a 互斥，避免与按 ATA 统计重复计数
   */
  static getLatestDestinationPortWithEtaAlias(): string {
    return `(
      SELECT po1.container_number, po1.eta as latest_eta
      FROM process_port_operations po1
      WHERE po1.port_type = 'destination'
      AND po1.ata IS NULL
      AND po1.available_time IS NULL
      AND po1.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po1.container_number
        AND po2.port_type = 'destination'
      )
    )`;
  }

  /**
   * 获取目的港最新港口操作的子查询（仅 container_number）
   * 用于需要过滤目的港但不引用时间的查询
   */
  static getLatestDestinationPortAlias(): string {
    return `(
      SELECT po1.container_number
      FROM process_port_operations po1
      WHERE po1.port_type = 'destination'
      AND po1.ata IS NOT NULL
      AND po1.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po1.container_number
        AND po2.port_type = 'destination'
      )
    )`;
  }

  /**
   * 获取目的港最新港口操作的子查询（含 lastFreeDate）
   * 用于需要最晚提柜日期的查询
   */
  static getLatestDestinationPortWithLastFreeDateAlias(): string {
    return `(
      SELECT po1.container_number, po1.last_free_date as last_free_date
      FROM process_port_operations po1
      WHERE po1.port_type = 'destination'
      AND po1.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po1.container_number
        AND po2.port_type = 'destination'
      )
    )`;
  }

  /**
   * 获取目的港无 ATA 和 ETA 的记录
   * 用于查询"其他记录"
   */
  static getDestinationPortWithoutTimeAlias(): string {
    return `(
      SELECT po1.container_number
      FROM process_port_operations po1
      WHERE po1.port_type = 'destination'
      AND po1.ata IS NULL
      AND po1.eta IS NULL
      AND po1.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po1.container_number
        AND po2.port_type = 'destination'
      )
    )`;
  }

  /**
   * 获取已到达中转港但未到达目的港的货柜
   */
  static getTransitArrivalAlias(): string {
    return `(
      SELECT po1.container_number
      FROM process_port_operations po1
      WHERE po1.port_type = 'transit'
      AND NOT EXISTS (
        SELECT 1
        FROM process_port_operations po2
        WHERE po2.container_number = po1.container_number
        AND po2.port_type = 'destination'
        AND po2.ata IS NOT NULL
      )
    )`;
  }

  /**
   * 为查询添加最新目的港操作的内连接（含 ATA）
   */
  static joinLatestDestinationWithAta(
    query: SelectQueryBuilder<any>,
    alias: string = 'latest_po'
  ): SelectQueryBuilder<any> {
    return query.innerJoin(
      this.getLatestDestinationPortWithAtaAlias(),
      alias,
      `${alias}.container_number = container.containerNumber`
    );
  }

  /**
   * 为查询添加最新目的港操作的内连接（含 ETA）
   */
  static joinLatestDestinationWithEta(
    query: SelectQueryBuilder<any>,
    alias: string = 'latest_po'
  ): SelectQueryBuilder<any> {
    return query.innerJoin(
      this.getLatestDestinationPortWithEtaAlias(),
      alias,
      `${alias}.container_number = container.containerNumber`
    );
  }

  /**
   * 为查询添加最新目的港操作的内连接（不含时间）
   */
  static joinLatestDestination(
    query: SelectQueryBuilder<any>,
    alias: string = 'latest_po'
  ): SelectQueryBuilder<any> {
    return query.innerJoin(
      this.getLatestDestinationPortAlias(),
      alias,
      `${alias}.container_number = container.containerNumber`
    );
  }

  /**
   * 为查询添加目的港无时间记录的内连接
   */
  static joinDestinationWithoutTime(
    query: SelectQueryBuilder<any>,
    alias: string = 'dest_po'
  ): SelectQueryBuilder<any> {
    return query.innerJoin(
      this.getDestinationPortWithoutTimeAlias(),
      alias,
      `${alias}.container_number = container.containerNumber`
    );
  }

  /**
   * 为查询添加中转港到达的内连接
   */
  static joinTransitArrival(
    query: SelectQueryBuilder<any>,
    alias: string = 'transit_po'
  ): SelectQueryBuilder<any> {
    return query.innerJoin(
      this.getTransitArrivalAlias(),
      alias,
      `${alias}.container_number = container.containerNumber`
    );
  }

  /**
   * 为查询添加最新目的港操作的内连接（含 lastFreeDate）
   */
  static joinLatestDestinationWithLastFreeDate(
    query: SelectQueryBuilder<any>,
    alias: string = 'latest_po'
  ): SelectQueryBuilder<any> {
    return query.innerJoin(
      this.getLatestDestinationPortWithLastFreeDateAlias(),
      alias,
      `${alias}.container_number = container.containerNumber`
    );
  }
}
