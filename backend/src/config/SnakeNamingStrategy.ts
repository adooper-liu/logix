/**
 * Snake Case Naming Strategy
 * TypeORM命名策略：将驼峰命名转换为蛇形命名
 *
 * Examples:
 * - orderNumber → order_number
 * - containerTypeCode → container_type_code
 * - nameCn → name_cn
 */

import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';
import { snakeCase } from 'typeorm/util/StringUtils';

export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  tableName(className: string, customName: string): string {
    return customName || snakeCase(className);
  }

  columnName(
    propertyName: string,
    customName: string,
    embeddedPrefixes: string[]
  ): string {
    return (
      customName ||
      embeddedPrefixes
        .concat(propertyName)
        .map(prefix => snakeCase(prefix))
        .join('_')
    );
  }

  relationName(propertyName: string): string {
    return snakeCase(propertyName);
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return snakeCase(`${relationName}_${referencedColumnName}`);
  }

  joinTableName(
    firstTableName: string,
    secondTableName: string,
    firstPropertyName: string,
    secondPropertyName: string
  ): string {
    return snakeCase(
      `${firstTableName}_${firstPropertyName.replace(/\d+/g, '')}_${secondTableName}_${secondPropertyName.replace(
        /\d+/g,
        ''
      )}`
    );
  }

  joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    return snakeCase(`${tableName}_${columnName || propertyName}`);
  }

  classTableInheritanceParentColumnName(parentTableName: string, parentTableNameAsDefined: string): string {
    return snakeCase(`${parentTableNameAsDefined}${parentTableNameAsDefined ? '_' : ''}id`);
  }
}
