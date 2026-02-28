/**
 * LogiX Frontend 自定义命名规则 ESLint 插件
 * 
 * 功能：
 * - 检查 Vue 组件名是否符合 PascalCase
 * - 检查组合式函数是否符合 use + PascalCase
 * - 检查 API 请求函数是否符合 fetchXxx/updateXxx 模式
 * - 检查 CSS 类名是否符合 kebab-case
 */

module.exports = {
  rules: {
    // 检查 Vue 组件文件名是否符合 PascalCase
    'vue-component-filename': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Ensure Vue component file names follow PascalCase convention',
          category: 'Best Practices',
          recommended: true
        },
        fixable: null,
        schema: []
      },
      create(context) {
        const filename = context.getFilename();
        
        // 只检查 .vue 文件
        if (!filename.endsWith('.vue')) {
          return {};
        }

        const basename = filename.split('/').pop().replace('.vue', '');
        
        // 组件名必须是 PascalCase
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(basename)) {
          context.report({
            loc: { line: 0, column: 0 },
            message: `Vue component file name must be PascalCase. Found: '${basename}.vue'`
          });
        }

        return {};
      }
    },

    // 检查组合式函数命名
    'composable-function-name': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Ensure composable functions follow useXxx naming convention',
          category: 'Best Practices',
          recommended: true
        },
        fixable: null,
        schema: []
      },
      create(context) {
        return {
          FunctionDeclaration(node) {
            const functionName = node.id?.name;
            
            // 检查文件名是否以 use 开头
            const filename = context.getFilename();
            const isComposableFile = 
              filename.includes('/composables/') || 
              filename.includes('\\composables\\') ||
              filename.endsWith('.ts') && filename.toLowerCase().includes('use');

            if (!isComposableFile) return;

            if (functionName && !/^use[A-Z][a-zA-Z0-9]*$/.test(functionName)) {
              context.report({
                node: node.id,
                message: `Composable function name must start with 'use' and be PascalCase. Found: '${functionName}'. Expected: 'use${functionName.charAt(0).toUpperCase()}${functionName.slice(1)}'`
              });
            }
          },
          VariableDeclaration(node) {
            const filename = context.getFilename();
            const isComposableFile = 
              filename.includes('/composables/') || 
              filename.includes('\\composables\\') ||
              filename.endsWith('.ts') && filename.toLowerCase().includes('use');

            if (!isComposableFile) return;

            node.declarations.forEach(decl => {
              if (decl.init?.type === 'ArrowFunctionExpression' && decl.id?.name) {
                const functionName = decl.id.name;
                if (!/^use[A-Z][a-zA-Z0-9]*$/.test(functionName)) {
                  context.report({
                    node: decl.id,
                    message: `Composable function name must start with 'use' and be PascalCase. Found: '${functionName}'. Expected: 'use${functionName.charAt(0).toUpperCase()}${functionName.slice(1)}'`
                  });
                }
              }
            });
          }
        };
      }
    },

    // 检查 API 请求函数命名
    'api-function-naming': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Ensure API functions follow fetch/update/create/delete naming convention',
          category: 'Best Practices',
          recommended: false
        },
        fixable: null,
        schema: []
      },
      create(context) {
        const filename = context.getFilename();
        const isApiFile = 
          filename.includes('/api/') || 
          filename.includes('\\api\\') ||
          filename.includes('/services/') ||
          filename.includes('\\services\\');

        if (!isApiFile) return {};

        return {
          FunctionDeclaration(node) {
            checkFunctionNaming(node.id?.name, context, node.id);
          },
          VariableDeclaration(node) {
            node.declarations.forEach(decl => {
              if (decl.init?.type === 'ArrowFunctionExpression') {
                checkFunctionNaming(decl.id?.name, context, decl.id);
              }
            });
          }
        };
      }
    },

    // 检查模板中的 CSS 类名是否符合 kebab-case
    'template-class-name-kebab': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Ensure CSS class names in templates use kebab-case',
          category: 'Best Practices',
          recommended: false
        },
        fixable: null,
        schema: []
      },
      create(context) {
        return {
          'VAttribute[key.name="class"] > VLiteral'(node) {
            const classNames = node.value.split(/\s+/);
            
            classNames.forEach(className => {
              // 跳过动态绑定 :class
              if (!className || className.startsWith('{') || className.startsWith('[')) {
                return;
              }
              
              // 检查是否是 kebab-case
              if (!/^[a-z][a-z0-9-]*$/.test(className)) {
                context.report({
                  node,
                  message: `CSS class name should be kebab-case. Found: '${className}'`
                });
              }
            });
          }
        };
      }
    }
  }
};

// 辅助函数：检查 API 函数命名
function checkFunctionNaming(functionName, context, node) {
  if (!functionName) return;

  const patterns = {
    get: /^get[A-Z]|fetch[A-Z]/,
    post: /^post[A-Z]|create[A-Z]/,
    put: /^put[A-Z]|update[A-Z]/,
    patch: /^patch[A-Z]/,
    delete: /^delete[A-Z]/
  };

  const matched = Object.entries(patterns).find(([_, pattern]) => pattern.test(functionName));

  if (!matched) {
    context.report({
      node,
      message: `API function should use naming pattern: get/fetchXxx, createXxx, updateXxx, deleteXxx. Found: '${functionName}'`
    });
  }
}
