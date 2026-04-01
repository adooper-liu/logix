# Markdown 渲染测试文档

这是一个用于测试 Markdown 渲染器功能的文档。

## 1. 文本格式

### 粗体和斜体

这是 **粗体文本**，这是 _斜体文本_，这是 **_粗斜体文本_**。

### 行内代码

这是一些 `行内代码` 示例。

## 2. 代码块

### TypeScript

```typescript
function greet(name: string): string {
  return `Hello, ${name}!`
}

console.log(greet('World'))
```

### JavaScript

```javascript
const numbers = [1, 2, 3, 4, 5]
const doubled = numbers.map(n => n * 2)
console.log(doubled) // [2, 4, 6, 8, 10]
```

## 3. 列表

### 无序列表

- 第一项
- 第二项
  - 嵌套项 1
  - 嵌套项 2
- 第三项

### 有序列表

1. 第一步
2. 第二步
3. 第三步

## 4. 表格

| 列 1   | 列 2   | 列 3   |
| ------ | ------ | ------ |
| 数据 1 | 数据 2 | 数据 3 |
| 数据 4 | 数据 5 | 数据 6 |
| 数据 7 | 数据 8 | 数据 9 |

## 5. 引用

> 这是一个引用块。
> 可以有多行内容。

## 6. 链接

### 内部文档链接

- [时间概念说明](/docs/help/时间概念说明-历时倒计时超期.md)
- [物流节点历时与超期标签说明](/docs/logistics/物流节点历时与超期标签说明.md)

### 外部链接

- [Vue.js 官方文档](https://vuejs.org/)
- [Element Plus 文档](https://element-plus.org/)

### 锚点链接

跳转到 [1. 文本格式](#1-文本格式)

## 7. 图片

![示例图片](https://via.placeholder.com/400x200?text=Example+Image)

## 8. 分隔线

---

## 9. 混合格式

这是一个包含 **粗体**、_斜体_、`代码` 和 [链接](https://example.com) 的段落。

---

**测试完成！** 如果你能看到格式化的内容，说明 Markdown 渲染器工作正常。
