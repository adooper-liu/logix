/**
 * LogiX 自定义命名规则 ESLint 插件
 * 
 * 功能：
 * - 检查实体类名是否与数据库表名对应
 * - 检查字典实体是否使用 Dict 前缀
 * - 检查实体属性名是否符合 snake_case -> camelCase 转换规则
 */

module.exports = {
  rules: {
    // 检查 TypeORM 实体类名是否符合规范
    'entity-class-name': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Ensure TypeORM entity class names follow naming conventions',
          category: 'Best Practices',
          recommended: true
        },
        fixable: null,
        schema: []
      },
      create(context) {
        return {
          ClassDeclaration(node) {
            const decorators = node.decorators || [];
            const isEntity = decorators.some(dec => {
              return dec.expression &&
                     dec.expression.callee &&
                     dec.expression.callee.name === 'Entity';
            });

            if (!isEntity) return;

            const className = node.id.name;
            
            // 检查字典实体：必须以 Dict 开头
            const isDictEntity = decorators.some(dec => {
              return dec.expression &&
                     dec.expression.arguments &&
                     dec.expression.arguments[0] &&
                     (dec.expression.arguments[0].value || '').startsWith('dict_');
            });

            if (isDictEntity) {
              if (!className.startsWith('Dict')) {
                context.report({
                  node: node.id,
                  message: `Dictionary entity class name must start with 'Dict'. Found: '${className}'. Expected: 'Dict${className}'`
                });
              }
              return;
            }

            // 检查普通实体：必须是 PascalCase
            if (!/^[A-Z][a-zA-Z0-9]*$/.test(className)) {
              context.report({
                node: node.id,
                message: `Entity class name must be PascalCase. Found: '${className}'`
              });
            }
          }
        };
      }
    },

    // 检查实体属性名是否符合数据库字段命名规范
    'entity-property-name': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Ensure entity property names follow camelCase convention (mapping from snake_case)',
          category: 'Best Practices',
          recommended: false
        },
        fixable: null,
        schema: []
      },
      create(context) {
        return {
          ClassProperty(node) {
            // 只检查实体类中的属性
            const classNode = node.parent;
            const decorators = classNode.decorators || [];
            const isEntity = decorators.some(dec => {
              return dec.expression &&
                     dec.expression.callee &&
                     dec.expression.callee.name === 'Entity';
            });

            if (!isEntity) return;

            const propertyName = node.key.name;
            
            // 忽略静态属性和方法
            if (node.static || node.typeAnnotation?.type === 'TSFunctionType') {
              return;
            }

            // 检查是否是 camelCase（允许 snake_case 用于数据库列名映射）
            // 这里我们只警告，不强制要求
            if (/^[a-z][a-zA-Z0-9]*$/.test(propertyName) === false) {
              // 如果是 snake_case，建议使用 @Column({ name: 'xxx' }) 注解
              const columnDecorator = node.decorators?.find(dec => 
                dec.expression?.callee?.name === 'Column'
              );
              
              if (!columnDecorator && propertyName.includes('_')) {
                context.report({
                  node: node.key,
                  message: `Property name '${propertyName}' uses snake_case. Use camelCase or add @Column({ name: '${propertyName}' }) decorator.`
                });
              }
            }
          }
        };
      }
    },

    // 检查表名是否符合 snake_case
    'table-name-snake-case': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Ensure table names in @Entity decorator use snake_case',
          category: 'Best Practices',
          recommended: true
        },
        fixable: null,
        schema: []
      },
      create(context) {
        return {
          ClassDeclaration(node) {
            const decorators = node.decorators || [];
            const entityDecorator = decorators.find(dec => {
              return dec.expression &&
                     dec.expression.callee &&
                     dec.expression.callee.name === 'Entity';
            });

            if (!entityDecorator) return;

            // 检查 @Entity('table_name') 中的表名
            const arg = entityDecorator.expression.arguments?.[0];
            if (arg && arg.type === 'Literal' && typeof arg.value === 'string') {
              const tableName = arg.value;
              
              // 表名必须是 snake_case
              if (!/^[a-z][a-z0-9_]*$/.test(tableName)) {
                context.report({
                  node: arg,
                  message: `Table name must be snake_case. Found: '${tableName}'`
                });
              }
            }
          }
        };
      }
    },

    // 检查接口名是否符合 PascalCase + I 前缀
    'interface-name-with-prefix': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Ensure interface names follow PascalCase with I prefix',
          category: 'Best Practices',
          recommended: true
        },
        fixable: null,
        schema: []
      },
      create(context) {
        return {
          TSInterfaceDeclaration(node) {
            const interfaceName = node.id.name;
            
            if (!/^I[A-Z][a-zA-Z0-9]*$/.test(interfaceName)) {
              context.report({
                node: node.id,
                message: `Interface name must start with 'I' and be PascalCase. Found: '${interfaceName}'. Expected: 'I${interfaceName}'`
              });
            }
          }
        };
      }
    }
  }
};
